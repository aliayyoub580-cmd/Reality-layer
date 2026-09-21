'use client';

import { useState } from 'react';
import { Bot, Send, X, Sparkles, User, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantDrawerProps {
  projectId: string;
}

export function AiAssistantDrawer({ projectId }: AiAssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hello! I am your **RealityLayer AI Advisor**. Ask me anything about your digital twin's health score, structure bottlenecks, crawl depth, or optimization tactics.",
    },
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: json.data.reply },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an issue analyzing your request. Please try again.',
          },
        ]);
      }
    } catch (err) {
      console.error('AI chat failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Network error communicating with the advisor service.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-60 z-30">
      {/* Drawer Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles size={14} className="text-amber-300" />
          <span>Ask AI Advisor</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col h-[480px] w-[380px] rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-amber-300">
                <Sparkles size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-none">RealityLayer AI Advisor</h3>
                <span className="text-[10px] text-neutral-400">Digital Twin Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-neutral-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex gap-2',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-50 text-indigo-600">
                    <Bot size={12} />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-xl px-3 py-2 leading-relaxed max-w-[85%]',
                    m.role === 'user'
                      ? 'bg-neutral-900 text-white font-normal'
                      : 'bg-neutral-100 text-neutral-800 whitespace-pre-line'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Bot size={12} className="animate-pulse text-indigo-500" />
                <span>Advisor thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-neutral-100 bg-neutral-50/60 px-3 py-2 text-[10px]">
            <button
              onClick={() => setInput('How can I improve my health score?')}
              className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-neutral-600 hover:bg-neutral-100"
            >
              Improve score?
            </button>
            <button
              onClick={() => setInput('Explain my orphan pages')}
              className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-neutral-600 hover:bg-neutral-100"
            >
              Orphan pages?
            </button>
            <button
              onClick={() => setInput('What are the top priority issues?')}
              className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-neutral-600 hover:bg-neutral-100"
            >
              Priority fixes?
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="border-t border-neutral-200 bg-white p-2.5 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about pages, health, structure..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white disabled:opacity-50 hover:bg-neutral-800"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
