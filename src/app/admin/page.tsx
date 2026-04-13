'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch (err) {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FCFBF7] flex-1 font-sans p-6 text-[#1f1e1d]">
      <div className="w-full max-w-sm">
        {/* Header/Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#111827] border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] group-hover:translate-y-0.5 group-hover:shadow-[0_2px_0_0_#1f1e1d] transition-all">
              <span className="text-[#FDBF1D] font-black text-xl leading-none">B</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#111827]">Buaze</span>
          </Link>
        </div>

        <div className="w-full p-8 sm:p-10 bg-white rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <div className="flex justify-center mx-auto mb-8">
            <div className="w-16 h-16 bg-[#FDBF1D]/10 text-[#ea580c] rounded-3xl flex items-center justify-center border-2 border-[#1f1e1d] shadow-[4px_4px_0_0_#1f1e1d]">
              <ShieldCheck size={32} strokeWidth={2.5} />
            </div>
          </div>
          
          <h2 className="text-[28px] font-black text-center text-[#1f1e1d] tracking-tight leading-tight mb-2">Yönetici Girişi</h2>
          <p className="text-sm font-bold text-[#6b6760] text-center mb-10 tracking-tight">Sistem paneline hoş geldiniz</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black text-center mb-8 border-2 border-red-500/20 shadow-[0_3px_0_0_#ef4444]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">Kullanıcı Adı</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm"
                placeholder="yönetici"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">Şifre</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#FDBF1D] text-[#111827] font-black py-4 rounded-2xl border-[3px] border-[#1f1e1d] shadow-[0_6px_0_0_#1f1e1d] hover:bg-[#EAB308] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'GÜVENLİ GİRİŞ YAP'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-10 text-center">
          <Link href="/tr/auth/login" className="inline-flex items-center gap-2 text-[13px] font-black text-[#6b6760] hover:text-[#ea580c] transition-colors border-b-2 border-transparent hover:border-[#ea580c]/30 pb-1">
            Müşteri misiniz? Buradan giriş yapın <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
