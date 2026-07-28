import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffTaskEventsService } from './staff-task-events.service';

type CurrentUser = { id: number; role: string };

const guardedCompletionTasks = new Set(['QUALITY_CONTROL', 'PACKAGING']);

@Injectable()
export class StaffTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: StaffTaskEventsService,
  ) {}

  async listTasks(user: CurrentUser) {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        t.id, t.task_type AS "taskType", t.status, t.assignment_group AS "assignmentGroup",
        t.assigned_user_id AS "assignedUserId", t.priority, t.due_at AS "dueAt",
        t.seen_at AS "seenAt", t.started_at AS "startedAt", t.completed_at AS "completedAt",
        t.blocked_reason AS "blockedReason", t.created_at AS "createdAt",
        s.id AS "saleId", s.sale_number AS "saleNumber", s.channel, s.delivery_due_at AS "deliveryDueAt",
        i.id AS "saleItemId", i.product_name_snapshot AS "productName", i.barcode,
        i.quantity, COALESCE(v.images->>0, NULL) AS "imageUrl"
      FROM production_staff_tasks t
      JOIN retail_sales s ON s.id = t.sale_id
      LEFT JOIN retail_sale_items i ON i.id = t.sale_item_id
      LEFT JOIN trendyol_product_variants v ON v.id = i.variant_id
      WHERE (${user.role} = 'OWNER' OR t.assigned_user_id = ${user.id} OR t.assignment_group IS NULL)
      ORDER BY
        CASE t.status WHEN 'NEW' THEN 1 WHEN 'SEEN' THEN 2 WHEN 'STARTED' THEN 3 WHEN 'BLOCKED' THEN 4 ELSE 5 END,
        COALESCE(t.due_at, t.created_at) ASC,
        t.id DESC
      LIMIT 200
    `;
  }

  async markSeen(taskId: number, user: CurrentUser) {
    return this.setStatus(taskId, user, 'SEEN');
  }

  async start(taskId: number, user: CurrentUser) {
    return this.setStatus(taskId, user, 'STARTED');
  }

  async block(taskId: number, user: CurrentUser, reason: string) {
    if (!reason.trim()) throw new BadRequestException('Sorun açıklaması zorunludur.');
    await this.assertTaskAccess(taskId, user);
    await this.prisma.$executeRaw`
      UPDATE production_staff_tasks
      SET status = 'BLOCKED', blocked_reason = ${reason.trim()}, updated_at = NOW()
      WHERE id = ${taskId}
    `;
    this.events.emit('task-updated', { taskId, status: 'BLOCKED' });
    return this.getTask(taskId);
  }

  async complete(taskId: number, user: CurrentUser) {
    const task = await this.assertTaskAccess(taskId, user);
    if (guardedCompletionTasks.has(String(task.task_type))) {
      const proof = await this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM production_task_proofs
        WHERE task_id = ${taskId} AND barcode_verified = true AND photo_path IS NOT NULL
        LIMIT 1
      `;
      if (!proof[0]) {
        throw new BadRequestException('Bu görev tamamlanmadan önce fotoğraf ve barkod doğrulaması zorunludur.');
      }
    }
    await this.prisma.$executeRaw`
      UPDATE production_staff_tasks
      SET status = 'COMPLETED', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE id = ${taskId}
    `;
    this.events.emit('task-updated', { taskId, status: 'COMPLETED' });
    return this.getTask(taskId);
  }

  async addProof(taskId: number, user: CurrentUser, file: Express.Multer.File | undefined, barcode: string) {
    const task = await this.assertTaskAccess(taskId, user);
    const expectedBarcode = String(task.barcode ?? '').trim();
    const verified = !expectedBarcode || expectedBarcode === barcode.trim();
    if (!barcode.trim()) throw new BadRequestException('Barkod doğrulaması zorunludur.');
    if (!verified) throw new BadRequestException('Girilen barkod bu görevdeki ürün barkodu ile eşleşmiyor.');
    if (!file?.filename) throw new BadRequestException('Fotoğraf yüklenmelidir.');

    const photoPath = `/uploads/task-proofs/${file.filename}`;
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO production_task_proofs (
        task_id, sale_id, sale_item_id, product_name_snapshot, barcode, photo_path, barcode_verified, uploaded_by_id, created_at
      )
      VALUES (
        ${taskId}, ${Number(task.sale_id)}, ${task.sale_item_id ? Number(task.sale_item_id) : null},
        ${String(task.product_name_snapshot ?? 'Ürün')}, ${barcode.trim()}, ${photoPath}, true, ${user.id}, NOW()
      )
      RETURNING id, task_id AS "taskId", photo_path AS "photoPath", barcode, barcode_verified AS "barcodeVerified", created_at AS "createdAt"
    `;
    this.events.emit('task-proof-added', { taskId, proofId: rows[0]?.id });
    return rows[0];
  }

  async createTasksForSale(tx: Prisma.TransactionClient, saleId: number) {
    const items = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, product_name_snapshot, barcode, quantity, variant_id
      FROM retail_sale_items
      WHERE sale_id = ${saleId}
    `;

    const created: Array<Record<string, unknown>> = [];
    for (const item of items) {
      const taskTypes = this.taskTypesForItem(String(item.product_name_snapshot ?? ''));
      for (const taskType of taskTypes) {
        const assignmentGroup = this.assignmentGroup(taskType);
        const eventKey = `${saleId}:${Number(item.id)}:${taskType}`;
        const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
          INSERT INTO production_staff_tasks (
            sale_id, sale_item_id, task_type, status, assignment_group, priority, due_at, created_at, updated_at
          )
          SELECT ${saleId}, ${Number(item.id)}, ${taskType}, 'NEW', ${assignmentGroup}, 'NORMAL',
            (SELECT delivery_due_at FROM retail_sales WHERE id = ${saleId}), NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM production_staff_tasks
            WHERE sale_id = ${saleId} AND sale_item_id = ${Number(item.id)} AND task_type = ${taskType}
          )
          RETURNING id, task_type AS "taskType"
        `;
        if (rows[0]) created.push({ ...rows[0], eventKey });
      }
    }

    if (created.length) this.events.emit('task-created', { saleId, count: created.length });
    return created;
  }

  private async setStatus(taskId: number, user: CurrentUser, status: 'SEEN' | 'STARTED') {
    await this.assertTaskAccess(taskId, user);
    const timestampColumn = status === 'SEEN' ? Prisma.raw('seen_at') : Prisma.raw('started_at');
    await this.prisma.$executeRaw`
      UPDATE production_staff_tasks
      SET status = ${status}, ${timestampColumn} = COALESCE(${timestampColumn}, NOW()), updated_at = NOW()
      WHERE id = ${taskId} AND status <> 'COMPLETED'
    `;
    this.events.emit('task-updated', { taskId, status });
    return this.getTask(taskId);
  }

  private async assertTaskAccess(taskId: number, user: CurrentUser) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT t.*, i.product_name_snapshot, i.barcode
      FROM production_staff_tasks t
      LEFT JOIN retail_sale_items i ON i.id = t.sale_item_id
      WHERE t.id = ${taskId}
      LIMIT 1
    `;
    const task = rows[0];
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    if (user.role !== 'OWNER' && task.assigned_user_id && Number(task.assigned_user_id) !== user.id) {
      throw new BadRequestException('Bu görevi görme yetkiniz yok.');
    }
    return task;
  }

  private async getTask(taskId: number) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, task_type AS "taskType", status, assignment_group AS "assignmentGroup",
        seen_at AS "seenAt", started_at AS "startedAt", completed_at AS "completedAt", blocked_reason AS "blockedReason"
      FROM production_staff_tasks WHERE id = ${taskId} LIMIT 1
    `;
    return rows[0];
  }

  private taskTypesForItem(productName: string) {
    const text = productName.toLocaleLowerCase('tr-TR');
    const tasks = new Set<string>();
    if (/(bambu|seperatör|separatör|paravan)/i.test(text)) tasks.add('BAMBOO_PREPARATION');
    if (/(ficus|benjamin|areka|ağaç|agac|strelitzia|zeytin|palmiye|sakura)/i.test(text)) tasks.add('TREE_ASSEMBLY');
    if (/(saksı|saksi|vega|lilyum|küre|kure|luna|metal)/i.test(text)) tasks.add('POT_PREPARATION');
    if (/(demet|dal|çiçek|cicek|buket)/i.test(text)) tasks.add('BUNDLE_PREPARATION');
    if (!tasks.size) tasks.add('TREE_ASSEMBLY');
    tasks.add('QUALITY_CONTROL');
    tasks.add('PACKAGING');
    return Array.from(tasks);
  }

  private assignmentGroup(taskType: string) {
    const map: Record<string, string> = {
      BAMBOO_PREPARATION: 'BAMBOO_STAFF',
      TREE_ASSEMBLY: 'TREE_STAFF',
      POT_PREPARATION: 'POT_STAFF',
      BUNDLE_PREPARATION: 'BUNDLE_STAFF',
      PACKAGING: 'PACKAGING_STAFF',
      QUALITY_CONTROL: 'QUALITY_CONTROL',
      DELIVERY_PREPARATION: 'STORE_SALES',
    };
    return map[taskType] ?? 'STORE_SALES';
  }
}
