'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { api } from '@/lib/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function ClaudeChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const result = await api<{ reply: string }>('/market-intelligence/chat', {
        method: 'POST',
        json: { message: trimmed, history: messages },
      });
      setMessages([...nextMessages, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sohbet isteği tamamlanamadı.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90"
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={18} />
        Claude'a Sor
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onMouseDown={() => setOpen(false)}>
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="font-black">Claude — Rakip Analizi</div>
                <div className="text-xs text-slate-500">Güncel rapor ve performans verine göre yanıtlar</div>
              </div>
              <button type="button" className="btn btn-secondary min-h-9 px-3" onClick={() => setOpen(false)} aria-label="Kapat">
                <X size={16} />
              </button>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">
                  Örn: "En çok favorilenen ama az satan ürünüm hangisi?" ya da "Bugünkü rakip raporunda öne çıkan zayıf yönümüz ne?"
                </p>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6 ${
                    message.role === 'user' ? 'ml-auto bg-brand text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {sending && <div className="max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">Yazıyor...</div>}
              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            </div>

            <form onSubmit={submit} className="flex shrink-0 gap-2 border-t border-line p-3">
              <input
                className="field flex-1"
                placeholder="Bir soru yazın..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={sending}
              />
              <button type="submit" className="btn btn-primary min-h-9 px-3" disabled={sending || !input.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
