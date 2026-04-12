'use client';

import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar />

      <section className="pt-48 pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            
            <div className="space-y-12">
               <div className="space-y-4">
                  <h1 className="text-5xl sm:text-7xl font-black tracking-tight">Hadi Konuşalım</h1>
                  <p className="text-xl text-gray-500 font-bold">Sorularınız mı var veya özel bir demo mu istiyorsunuz? Yardım etmek için buradayız.</p>
               </div>

               <div className="space-y-8">
                  <div className="flex items-center gap-6 group">
                     <div className="w-14 h-14 rounded-2xl bg-[#FDBF1D]/10 text-[#FDBF1D] flex items-center justify-center group-hover:bg-[#FDBF1D] group-hover:text-white transition-all duration-300">
                        <Mail size={24} />
                     </div>
                     <div>
                        <p className="text-xs uppercase font-black text-gray-400 tracking-widest">E-posta Gönder</p>
                        <p className="text-lg font-black italic">okanberk16@gmail.com</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-6 group">
                     <div className="w-14 h-14 rounded-2xl bg-[#79C5D1]/10 text-[#79C5D1] flex items-center justify-center group-hover:bg-[#79C5D1] group-hover:text-white transition-all duration-300">
                        <Phone size={24} />
                     </div>
                     <div>
                        <p className="text-xs uppercase font-black text-gray-400 tracking-widest">Bizi Arayın</p>
                        <p className="text-lg font-black italic">+90 (555) 000 00 00</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-6 group">
                     <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-[#111827] group-hover:text-white transition-all duration-300">
                        <MapPin size={24} />
                     </div>
                     <div>
                        <p className="text-xs uppercase font-black text-gray-400 tracking-widest">Merkez Ofis</p>
                        <p className="text-lg font-black italic">Bursa, Türkiye</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="relative">
               <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 relative z-10 transition-transform hover:scale-[1.01] duration-500">
                  {sent ? (
                    <div className="py-20 text-center space-y-6 animate-fade-in">
                       <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                          <Send size={40} />
                       </div>
                       <h3 className="text-3xl font-black">Mesajınız Gönderildi!</h3>
                       <p className="text-gray-500 font-bold font-medium">24 saat içinde size geri dönüş yapacağız.</p>
                       <button onClick={() => setSent(false)} className="text-sm font-black text-[#79C5D1] hover:underline">Yeni bir mesaj gönder</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-gray-400">Ad Soyad</label>
                             <input required type="text" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#79C5D1] focus:ring-4 focus:ring-[#79C5D1]/10 outline-none transition-all font-bold text-sm" placeholder="Can Demir" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-gray-400">E-posta Adresi</label>
                             <input required type="email" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#79C5D1] focus:ring-4 focus:ring-[#79C5D1]/10 outline-none transition-all font-bold text-sm" placeholder="can@sirket.com" />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400">İşletme Adı</label>
                          <input type="text" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#79C5D1] focus:ring-4 focus:ring-[#79C5D1]/10 outline-none transition-all font-bold text-sm" placeholder="Lezzet Restaurant" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Mesajınız</label>
                          <textarea required rows={5} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#79C5D1] focus:ring-4 focus:ring-[#79C5D1]/10 outline-none transition-all font-bold text-sm resize-none" placeholder="Size nasıl yardımcı olabiliriz?" />
                       </div>
                       <button 
                         disabled={loading}
                         className="w-full py-5 bg-[#111827] text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                       >
                         {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                         Mesaj Gönder
                       </button>
                    </form>
                  )}
               </div>
               <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#FDBF1D]/5 blur-[80px] rounded-full -z-10" />
            </div>

          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
