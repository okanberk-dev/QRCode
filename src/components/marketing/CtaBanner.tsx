import Link from 'next/link';
import type { Locale } from '@/lib/translations';

interface CtaBannerProps {
  locale: Locale;
}

export default function CtaBanner({ locale }: CtaBannerProps) {
  return (
    <div className="max-w-[1000px] w-full mx-auto my-16 p-8 sm:p-14 bg-[#F7F4F0] rounded-3xl border border-[#e8e4de] flex flex-col items-center text-center">
      <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[#1f1e1d] tracking-[-0.02em] mb-4">
        {locale === 'tr' ? 'İtibar yönetimi konusunda ne kadar ciddisiniz?' : 'How serious are you about review management?'}
      </h2>
      <p className="text-[16px] text-[#6b6760] mb-8 font-medium">
        {locale === 'tr' 
          ? '14 gün boyunca ücretsiz deneyin. Kredi kartı veya taahhüt gerekmez.' 
          : 'Try it free on a 14 day trial or book a custom demo. No strings attached.'}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Link
          href={`/${locale}/auth/register`}
          className="px-8 py-3.5 bg-[#ea580c] text-white font-extrabold text-[15px] rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#c2410c] transition-all active:translate-y-[4px] active:shadow-none"
        >
          {locale === 'tr' ? 'Hemen başlayın!' : 'Get started now!'}
        </Link>
        <Link
          href={`/${locale}/pricing`}
          className="text-[15px] font-bold text-[#6b6760] underline underline-offset-4 decoration-[#ada89f] hover:text-[#1f1e1d] hover:decoration-[#1f1e1d] transition-all"
        >
          {locale === 'tr' ? 'Fiyatları incele' : 'View pricing'}
        </Link>
      </div>
    </div>
  );
}
