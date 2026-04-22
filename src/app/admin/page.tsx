'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, rememberMe })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.');
        setLoading(false);
        return;
      }

      const redirectPath = searchParams.get('redirect');
      if (redirectPath) {
        // Need to decode since we encoded it in middleware
        router.push(decodeURIComponent(redirectPath));
      } else {
        router.push('/admin/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F6F1] flex-1 font-sans p-6 text-[#1A2332]">
      <div className="w-full max-w-sm">
        {/* Header/Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#1A2332] border-2 border-[#1A2332] shadow-sm group-hover:translate-y-0.5 group-hover:shadow-sm transition-all">
              <span className="text-[#F4B400] font-black text-xl leading-none">B</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#1A2332]">Buaze</span>
          </Link>
        </div>

        <div className="w-full p-8 sm:p-10 bg-white rounded-[32px] border border-[#1A2332] shadow-md">
          <div className="flex justify-center mx-auto mb-8">
            <div className="w-16 h-16 bg-[#F4B400]/10 text-[#F4B400] rounded-3xl flex items-center justify-center border-2 border-[#1A2332] shadow-md">
              <ShieldCheck size={32} strokeWidth={2} />
            </div>
          </div>
          
          <h2 className="text-[28px] font-extrabold text-center text-[#1A2332] tracking-tight leading-tight mb-2">Yönetici Girişi</h2>
          <p className="text-sm font-bold text-[#2A3444] text-center mb-10 tracking-tight">Sistem paneline hoş geldiniz</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black text-center mb-8 border-2 border-red-500/20 shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">Kullanıcı Adı</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm"
                placeholder="Kullanıcı adı"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">Şifre</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm"
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-[#1A2332] text-[#1A2332] focus:ring-[#F4B400] accent-[#F4B400]"
              />
              <label htmlFor="rememberMe" className="text-xs font-bold text-[#2A3444] cursor-pointer">
                Beni hatırla
              </label>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#F4B400] text-[#1A2332] font-black py-4 rounded-2xl border border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'GÜVENLİ GİRİŞ YAP'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-10 text-center">
          <Link href="/tr/auth/login" className="inline-flex items-center gap-2 text-[13px] font-black text-[#2A3444] hover:text-[#F4B400] transition-colors border-b-2 border-transparent hover:border-[#F4B400]/30 pb-1">
            Müşteri misiniz? Buradan giriş yapın <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
