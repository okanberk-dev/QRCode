import { Clock, Zap, Check } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui';

export default function TrialExpiredPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#FAFAFA] p-6">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
          {/* Top dark hero */}
          <div className="bg-[#0A0A0A] px-8 py-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C6F24E]/20">
              <Clock size={32} className="text-[#C6F24E]" />
            </div>
            <h1 className="bz-h-tight-2 mb-1 text-[22px] text-white">
              Deneme süreniz doldu
            </h1>
            <p className="text-[13px] leading-[1.55] text-white/65">
              14 günlük ücretsiz deneme süreniz sona ermiştir
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6 p-8">
            <p className="text-center text-[13px] leading-[1.65] text-[#525252]">
              Buaze&apos;yi kullanmaya devam etmek için bir plan seçin. Tüm
              değerlendirme verileriniz ve restoran ayarlarınız güvende.
            </p>

            {/* Plan options */}
            <div className="space-y-3">
              <div className="rounded-2xl border-2 border-[#C6F24E] bg-[#EAF9B8]/40 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="bz-h-tight text-[15px] text-[#0A0A0A]">
                    Aylık Plan
                  </span>
                  <Badge kind="lime">Popüler</Badge>
                </div>
                <p
                  className="text-[26px] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, letterSpacing: '-0.025em' }}
                >
                  ₺299
                  <span className="ml-1 text-[13px] font-normal text-[#737373]">
                    / ay
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    'Sınırsız QR kodu',
                    'Anlık e-posta bildirimleri',
                    'Detaylı analitik',
                    'Google yorum yönlendirme',
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-[12.5px] text-[#1A1A1A]"
                    >
                      <Check
                        size={13}
                        strokeWidth={2.5}
                        className="shrink-0 text-[#A8D62E]"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#EDEDED] bg-white p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="bz-h-tight text-[15px] text-[#0A0A0A]">
                    Yıllık Plan
                  </span>
                  <Badge kind="ok">%30 indirim</Badge>
                </div>
                <p
                  className="text-[26px] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, letterSpacing: '-0.025em' }}
                >
                  ₺209
                  <span className="ml-1 text-[13px] font-normal text-[#737373]">
                    / ay (yıllık)
                  </span>
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href="mailto:hello@buaze.com?subject=Plan Yükseltme Talebi"
              className="bz-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-[14px]"
            >
              <Zap size={16} className="text-[#C6F24E]" />
              Planı yükselt — hello@buaze.com
            </a>

            <p className="text-center text-[12px] text-[#737373]">
              Sorularınız için{' '}
              <a
                href="mailto:hello@buaze.com"
                className="font-medium text-[#0A0A0A] underline underline-offset-2 hover:text-[#525252]"
              >
                hello@buaze.com
              </a>{' '}
              adresine yazabilirsiniz.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/admin"
            className="text-[12px] text-[#737373] underline underline-offset-2 hover:text-[#0A0A0A]"
          >
            Farklı hesapla giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}
