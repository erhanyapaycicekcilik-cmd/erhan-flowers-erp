import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('auth')
  auth(@Body() body: { password: string }) {
    const secret = process.env.ADMIN_SECRET_PASSWORD;
    if (!secret || body.password !== secret) {
      return { ok: false };
    }
    return { ok: true, token: secret };
  }

  @Get('users')
  async listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
  }

  @Post('users')
  async createUser(@Body() body: { email: string; name: string; password: string; role: string }) {
    const hash = await bcrypt.hash(body.password, 10);
    return this.prisma.user.create({
      data: { email: body.email, name: body.name, passwordHash: hash, role: body.role as 'OWNER' | 'MANAGER' | 'STAFF' },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  @Put('users/:id/password')
  async resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    const hash = await bcrypt.hash(body.password, 10);
    await this.prisma.user.update({ where: { id: Number(id) }, data: { passwordHash: hash } });
    return { ok: true };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id: Number(id) } });
    return { ok: true };
  }
}
