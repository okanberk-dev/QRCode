'use client';

import { ArrowRight, Star, QrCode, TrendingUp, ShieldCheck, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#202124] selection:bg-[#1a73e8] selection:text-white font-sans">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#1a73e8] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-xl">
              QR
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">ReviewFlow</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Nasıl Çalışır?</a>
            <a href="#pricing" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Fiyatlandırma</a>
            <Link 
              href="/admin" 
              className="text-sm font-semibold bg-[#1a73e8] hover:bg-[#185abc] text-white px-5 py-2.5 rounded-full transition-all shadow-md shadow-blue-500/20"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-br from-blue-100/50 to-purple-50/50 blur-[100px] -z-10 rounded-full" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-2 animate-fade-in">
            <Star size={16} className="fill-current" /> Google'da Zirveye Çıkın
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] animate-slide-up">
            Müşteri Yorumlarını <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a73e8] to-[#9333ea]">Kontrol Altına Alın</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
            Masalarınızdaki akıllı QR kodları sayesinde mutlu müşterileri doğrudan Google Haritalar'a yönlendirin. Şikayeti olan müşterileri ise sadece sizin görebileceğiniz kapalı sisteme alın.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <a 
              href="mailto:okanberk16@gmail.com?subject=ReviewFlow%20Aboneli%C4%9Fi"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-8 py-4 rounded-full text-base font-semibold transition-all transform hover:scale-105 shadow-xl shadow-blue-500/30"
            >
              Hemen Başlayın <ArrowRight size={18} />
            </a>
            <a 
              href="#pricing"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-full text-base font-semibold transition-all border border-gray-200"
            >
              Planları İncele
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-24 px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Mükemmel İtibar Yönetimi</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Yüksek teknoloji altyapımızla restoranınızın dijital dünyadaki kaderini siz belirleyin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <QrCode size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Dinamik QR Kodlar</h3>
              <p className="text-gray-600 leading-relaxed">
                Her masaya özel veya dilediğiniz şubeye özel sınırsız QR doğrulama noktası yaratın. Renklerini ve temalarını markanıza göre özelleştirin.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 transform md:-translate-y-4">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Akıllı Google Yönlendirmesi</h3>
              <p className="text-gray-600 leading-relaxed">
                Uygulama üzerinden 4 veya 5 yıldız veren konuklarınız doğrudan Google My Business sayfanıza aktarılır. Puanınız hızla artar.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Kriz Yönetimi</h3>
              <p className="text-gray-600 leading-relaxed">
                Uygulama içi 1, 2, 3 yıldız veren müşteriler dışarıya yönlendirilmez. Yorumları doğrudan anlık olarak şube müdürünüzün e-postasına düşer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-[#fafbfc]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Şeffaf Fiyatlandırma</h2>
            <p className="text-gray-500 mb-8 max-w-xl mx-auto text-lg">İşletme hacminiz ne olursa olsun uygun, sürpriz maliyeti olmayan paketler.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-colors">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aylık Plan</h3>
              <p className="text-gray-500 mb-6 min-h-[48px]">Her zaman esnek olun, istediğiniz zaman iptal edin.</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-gray-900">₺500</span>
                <span className="text-gray-500 font-medium"> / ay</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-600"><CheckCircle2 className="text-green-500" size={20} /> Limitsiz QR Taraması</li>
                <li className="flex items-center gap-3 text-gray-600"><CheckCircle2 className="text-green-500" size={20} /> Akıllı Filtreleme Sistemi</li>
                <li className="flex items-center gap-3 text-gray-600"><CheckCircle2 className="text-green-500" size={20} /> Anlık Email Bildirimi</li>
                <li className="flex items-center gap-3 text-gray-600"><CheckCircle2 className="text-green-500" size={20} /> Rol Bazlı Yönetim Paneli</li>
              </ul>
              <a href="mailto:okanberk16@gmail.com?subject=Ayl%C4%B1k%20Abonelik" className="w-full block text-center py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:border-gray-300 hover:bg-gray-50 transition-all">
                Seç ve Başla
              </a>
            </div>

            {/* Yearly Plan */}
            <div className="bg-gray-900 p-8 rounded-3xl border-2 border-[#1a73e8] shadow-2xl shadow-blue-500/20 flex flex-col relative transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#1a73e8] to-[#9333ea] text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full">
                En Popüler & Karlı
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Yıllık Plan</h3>
              <p className="text-gray-400 mb-6 min-h-[48px]">Uzun vadeli düşünün, %16 net indirimle kâr edin.</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-white">₺5.000</span>
                <span className="text-gray-400 font-medium"> / yıl</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="text-[#1a73e8]" size={20} /> <strong>2 Ay Karşılıksız Hediye</strong></li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="text-[#1a73e8]" size={20} /> Limitsiz QR Taraması</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="text-[#1a73e8]" size={20} /> Akıllı Filtreleme Sistemi</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="text-[#1a73e8]" size={20} /> Rol Bazlı Yönetim Paneli</li>
              </ul>
              <a href="mailto:okanberk16@gmail.com?subject=Y%C4%B1ll%C4%B1k%20Abonelik" className="w-full block text-center py-3.5 rounded-xl bg-gradient-to-r from-[#1a73e8] to-[#2563eb] hover:from-[#1557b0] hover:to-[#1d4ed8] text-white font-bold transition-all shadow-lg">
                Fırsatı Yakala
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Mail className="text-[#1a73e8]" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Hazır Mısınız?</h2>
          <p className="text-gray-500 mb-8 max-w-lg">Kurulum ortalama 10 dakika sürmektedir. Hemen bizimle iletişime geçin, restoranınızı akıllandırın.</p>
          <a 
            href="mailto:okanberk16@gmail.com?subject=Sistem%20Kurulumu"
            className="flex items-center gap-2 bg-[#202124] hover:bg-black text-white px-8 py-4 rounded-full text-base font-semibold transition-all shadow-lg"
          >
            Sistem Kurulumu İstiyorum
          </a>
          
          <div className="w-full border-t border-gray-200 mt-20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2026 ReviewFlow. Tüm hakları saklıdır.</p>
            <div className="flex gap-6">
              <Link href="/kvkk" className="text-sm text-gray-400 hover:text-gray-900">KVKK</Link>
              <Link href="/gizlilik" className="text-sm text-gray-400 hover:text-gray-900">Gizlilik</Link>
              <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-900 font-medium">Yetkili Girişi</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
