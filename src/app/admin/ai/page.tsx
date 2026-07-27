'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIPage() {
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: "Salom! Men sizning AI biznes yordamchingizman. Do'kon savdolari va davomat haqida xohlagan savolingizni bering." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: "Xatolik yuz berdi: " + (data.error || 'Nomaʼlum xato') }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Tarmoq xatosi yuz berdi." }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center gap-3 shrink-0">
        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-lg">AI Analitik</h2>
          <p className="text-xs text-blue-100 opacity-90">Gemini 1.5 tomonidan ishlaydi</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
              msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
            }`}>
              {msg.role === 'user' ? (
                msg.text
              ) : (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 rounded-tl-sm flex gap-1 items-center">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI dan so'rang..."
            className="flex-1 bg-slate-100 border-none outline-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
