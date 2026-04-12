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
    <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB] flex-1 font-sans p-6 text-[#111827]">
      <div className="w-full max-w-sm">
        {/* Header/Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#111827]">
              <span className="text-[#FDBF1D] font-black text-xl leading-none">B</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#111827]">Buaze</span>
          </Link>
        </div>

        <div className="w-full p-8 sm:p-10 bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100">
          <div className="flex justify-center mx-auto mb-6">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#111827] shadow-inner border border-gray-100">
              <ShieldCheck size={28} />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-center text-[#111827] mb-2">Yönetici Girişi</h2>
          <p className="text-sm font-bold text-gray-400 text-center mb-8">Sistem paneline hoş geldiniz</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Kullanıcı Adı</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
                placeholder="yönetici"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Şifre</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#111827] hover:bg-black text-white font-black px-4 py-4 rounded-2xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-gray-200 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Güvenli Giriş Yap'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link href="/tr/auth/login" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">
            Müşteri misiniz? Buradan giriş yapın <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
