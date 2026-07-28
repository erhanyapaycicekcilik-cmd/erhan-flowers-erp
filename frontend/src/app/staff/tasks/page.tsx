'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Camera, CheckCircle2, Play, ScanLine } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiBaseUrl } from '@/lib/api';

type StaffTask = {
  id: number;
  taskType: string;
  status: string;
  saleNumber: string;
  productName?: string | null;
  imageUrl?: string | null;
  barcode?: string | null;
  quantity?: number | string | null;
  deliveryDueAt?: string | null;
};

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [message, setMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [proof, setProof] = useState<Record<number, { barcode: string; file?: File }>>({});
  const audioContextRef = useRef<AudioContext | null>(null);

  const grouped = useMemo(() => ({
    newTasks: tasks.filter((task) => task.status === 'NEW' || task.status === 'SEEN'),
    active: tasks.filter((task) => task.status === 'STARTED' || task.status === 'BLOCKED'),
    completedToday: tasks.filter((task) => task.status === 'COMPLETED' && isToday(task.deliveryDueAt)),
  }), [tasks]);

  function load() {
    api<StaffTask[]>('/staff/tasks').then(setTasks).catch((error) => setMessage(error instanceof Error ? error.message : 'Görevler yüklenemedi.'));
  }

  useEffect(() => {
    load();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    if (!token) return;
    const stream = new EventSource(`${apiBaseUrl}/staff/tasks/events?token=${encodeURIComponent(token)}&heartbeat=1`);
    stream.addEventListener('task-created', () => {
      setMessage('Yeni görev geldi.');
      playSound();
      load();
    });
    stream.addEventListener('task-updated', () => load());
    stream.addEventListener('task-proof-added', () => load());
    stream.onerror = () => setMessage('Canlı bağlantı yeniden deneniyor.');
    return () => stream.close();
  }, [soundEnabled]);

  async function action(taskId: number, name: 'seen' | 'start' | 'complete') {
    try {
      await api(`/staff/tasks/${taskId}/${name}`, { method: 'POST' });
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem yapılamadı.');
    }
  }

  async function block(taskId: number) {
    const reason = window.prompt('Sorun açıklaması');
    if (!reason) return;
    try {
      await api(`/staff/tasks/${taskId}/block`, { method: 'POST', json: { reason } });
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sorun kaydedilemedi.');
    }
  }

  async function uploadProof(task: StaffTask) {
    const current = proof[task.id];
    const form = new FormData();
    if (current?.file) form.append('file', current.file);
    form.append('barcode', current?.barcode || '');
    try {
      await api(`/staff/tasks/${task.id}/proofs`, { method: 'POST', body: form });
      setMessage('Kanıt kaydedildi.');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kanıt kaydedilemedi.');
    }
  }

  function updateProof(taskId: number, next: Partial<{ barcode: string; file: File }>) {
    setProof((current) => ({ ...current, [taskId]: { barcode: current[taskId]?.barcode || '', file: current[taskId]?.file, ...next } }));
  }

  function enableSound() {
    audioContextRef.current = new AudioContext();
    setSoundEnabled(true);
  }

  function playSound() {
    if (!soundEnabled || !audioContextRef.current) return;
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.value = 0.04;
    oscillator.frequency.value = 880;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  }

  return (
    <AdminShell title="Personel Görevleri">
      <div className="mx-auto max-w-3xl space-y-4">
        {message && <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}
        <button className="btn btn-secondary w-full justify-center sm:w-auto" onClick={enableSound}>
          <Bell size={17} />
          Sesli Bildirimi Aç
        </button>
        <TaskSection title="Yeni Görevler" rows={grouped.newTasks} proof={proof} onAction={action} onBlock={block} onProofChange={updateProof} onUploadProof={uploadProof} />
        <TaskSection title="Devam Edenler" rows={grouped.active} proof={proof} onAction={action} onBlock={block} onProofChange={updateProof} onUploadProof={uploadProof} />
        <TaskSection title="Bugün Tamamlananlar" rows={grouped.completedToday} proof={proof} onAction={action} onBlock={block} onProofChange={updateProof} onUploadProof={uploadProof} />
      </div>
    </AdminShell>
  );
}

function TaskSection({ title, rows, proof, onAction, onBlock, onProofChange, onUploadProof }: {
  title: string;
  rows: StaffTask[];
  proof: Record<number, { barcode: string; file?: File }>;
  onAction: (taskId: number, name: 'seen' | 'start' | 'complete') => void;
  onBlock: (taskId: number) => void;
  onProofChange: (taskId: number, next: Partial<{ barcode: string; file: File }>) => void;
  onUploadProof: (task: StaffTask) => void;
}) {
  return (
    <section className="panel p-4">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">
        {rows.map((task) => (
          <article key={task.id} className="rounded border border-line bg-white p-3">
            <div className="flex gap-3">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded border border-line bg-slate-50">
                {task.imageUrl ? <img src={task.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">Görsel yok</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-brand">{task.saleNumber}</div>
                <h3 className="line-clamp-2 font-bold text-ink">{task.productName || 'Ürün'}</h3>
                <div className="mt-1 text-xs text-slate-500">{task.taskType} · {task.status}</div>
                <div className="mt-1 text-xs text-slate-500">Adet: {String(task.quantity || '-')} · Barkod: {task.barcode || '-'}</div>
              </div>
            </div>

            {(task.taskType === 'QUALITY_CONTROL' || task.taskType === 'PACKAGING') && task.status !== 'COMPLETED' && (
              <div className="mt-3 grid gap-2">
                <input className="field" placeholder="Barkodu okut veya yaz" value={proof[task.id]?.barcode || ''} onChange={(event) => onProofChange(task.id, { barcode: event.target.value })} />
                <input className="field" type="file" accept="image/*" capture="environment" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files?.[0] && onProofChange(task.id, { file: event.target.files[0] })} />
                <button className="btn btn-secondary justify-center" onClick={() => onUploadProof(task)}>
                  <Camera size={17} />
                  Fotoğraf ve Barkod Kaydet
                </button>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button className="btn btn-secondary justify-center" onClick={() => onAction(task.id, 'seen')}>
                <ScanLine size={16} />
                Gördüm
              </button>
              <button className="btn btn-primary justify-center" onClick={() => onAction(task.id, 'start')}>
                <Play size={16} />
                Başla
              </button>
              <button className="btn btn-secondary justify-center" onClick={() => onAction(task.id, 'complete')}>
                <CheckCircle2 size={16} />
                Tamamlandı
              </button>
              <button className="btn btn-secondary justify-center text-red-700" onClick={() => onBlock(task.id)}>
                <AlertTriangle size={16} />
                Sorun
              </button>
            </div>
          </article>
        ))}
        {!rows.length && <div className="rounded border border-dashed border-line p-4 text-center text-sm text-slate-500">Görev yok.</div>}
      </div>
    </section>
  );
}

function isToday(value?: string | null) {
  if (!value) return true;
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
