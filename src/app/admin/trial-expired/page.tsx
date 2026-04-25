import { Clock, Zap, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function TrialExpiredPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#FFFFFF] p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#EDEDED] overflow-hidden">
          {/* Top banner */}
          <div className="bg-[#0A0A0A] px-8 py-8 text-center text-white">
            <div className="w-16 h-16 bg-[#C6F24E]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-[#C6F24E]" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">Deneme Süreniz Doldu</h1>
            <p className="text-white/65 text-sm">14 günlük ücretsiz deneme süreniz sona ermiştir</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-[#1A1A1A] text-sm text-center leading-relaxed mb-6">
              Buaze&apos;yi kullanmaya devam etmek için bir plan seçin. Tüm değerlendirme verileriniz ve restoran ayarlarınız güvende.
            </p>

            {/* Plan options */}
            <div className="space-y-3 mb-6">
              <div className="border-2 border-[#C6F24E] rounded-2xl p-4 bg-[#C6F24E]/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#0A0A0A]">Aylık Plan</span>
                  <span className="bg-[#C6F24E] text-[#0A0A0A] text-xs font-semibold px-2 py-0.5 rounded-full">Popüler</span>
                </div>
                <p className="text-2xl font-semibold text-[#0A0A0A]">₺299 <span className="text-sm font-normal text-[#6B7280]">/ ay</span></p>
                <div className="mt-3 space-y-1.5">
                  {['Sınırsız QR Kodu', 'Anlık E-posta Bildirimleri', 'Detaylı Analitik', 'Google Yorum Yönlendirme'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#1A1A1A]">
                      <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#EDEDED] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#0A0A0A]">Yıllık Plan</span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">%30 İndirim</span>
                </div>
                <p className="text-2xl font-semibold text-[#0A0A0A]">₺209 <span className="text-sm font-normal text-[#6B7280]">/ ay (yıllık)</span></p>
              </div>
            </div>

            {/* CTA */}
            <a
              href="mailto:hello@buaze.com?subject=Plan Yükseltme Talebi"
              className="flex items-center justify-center gap-2 w-full bg-[#0A0A0A] hover:bg-[#1f2937] text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg hover:shadow-xl"
            >
              <Zap size={16} className="text-[#C6F24E]" />
              Planı Yükselt — hello@buaze.com
            </a>

            <p className="text-xs text-center text-[#6B7280] mt-4">
              Sorularınız için <a href="mailto:hello@buaze.com" className="underline hover:text-[#1A1A1A]">hello@buaze.com</a> adresine yazabilirsiniz.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/admin" className="text-xs text-[#6B7280] hover:text-[#1A1A1A] underline">
            Farklı hesapla giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}
