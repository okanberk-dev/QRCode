import { Clock, Zap, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function TrialExpiredPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#F8F6F1] p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E8ECF2] overflow-hidden">
          {/* Top banner */}
          <div className="bg-[#1A2332] px-8 py-8 text-center">
            <div className="w-16 h-16 bg-[#F4B400]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-[#F4B400]" />
            </div>
            <h1 className="text-xl font-extrabold text-white mb-1">Deneme Süreniz Doldu</h1>
            <p className="text-[#6B7280] text-sm">14 günlük ücretsiz deneme süreniz sona ermiştir</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-[#2A3444] text-sm text-center leading-relaxed mb-6">
              Buaze&apos;yi kullanmaya devam etmek için bir plan seçin. Tüm değerlendirme verileriniz ve restoran ayarlarınız güvende.
            </p>

            {/* Plan options */}
            <div className="space-y-3 mb-6">
              <div className="border-2 border-[#F4B400] rounded-2xl p-4 bg-[#F4B400]/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#1A2332]">Aylık Plan</span>
                  <span className="bg-[#F4B400] text-[#1A2332] text-xs font-black px-2 py-0.5 rounded-full">Popüler</span>
                </div>
                <p className="text-2xl font-black text-[#1A2332]">₺299 <span className="text-sm font-normal text-[#6B7280]">/ ay</span></p>
                <div className="mt-3 space-y-1.5">
                  {['Sınırsız QR Kodu', 'Anlık E-posta Bildirimleri', 'Detaylı Analitik', 'Google Yorum Yönlendirme'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#2A3444]">
                      <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#E8ECF2] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#1A2332]">Yıllık Plan</span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">%30 İndirim</span>
                </div>
                <p className="text-2xl font-black text-[#1A2332]">₺209 <span className="text-sm font-normal text-[#6B7280]">/ ay (yıllık)</span></p>
              </div>
            </div>

            {/* CTA */}
            <a
              href="mailto:hello@buaze.com?subject=Plan Yükseltme Talebi"
              className="flex items-center justify-center gap-2 w-full bg-[#1A2332] hover:bg-[#1f2937] text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg hover:shadow-xl"
            >
              <Zap size={16} className="text-[#F4B400]" />
              Planı Yükselt — hello@buaze.com
            </a>

            <p className="text-xs text-center text-[#6B7280] mt-4">
              Sorularınız için <a href="mailto:hello@buaze.com" className="underline hover:text-[#2A3444]">hello@buaze.com</a> adresine yazabilirsiniz.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/admin" className="text-xs text-[#6B7280] hover:text-[#2A3444] underline">
            Farklı hesapla giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}
