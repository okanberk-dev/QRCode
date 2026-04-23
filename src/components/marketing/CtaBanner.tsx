import { CtaButton } from '@/components/ui/CtaButton';
import type { Locale } from '@/lib/translations';

interface CtaBannerProps {
  locale: Locale;
}

export default function CtaBanner({ locale }: CtaBannerProps) {
  const base = `/${locale}`;
  return (
    <div className="max-w-[1000px] w-full mx-auto my-16 p-8 sm:p-20 bg-[#FFFFFF] rounded-[40px] border border-[#0A0A0A] shadow-md flex flex-col items-center text-center">
      <h2 className="text-[32px] sm:text-[44px] font-extrabold text-[#0A0A0A] tracking-tight leading-none mb-6">
        {locale === 'tr' ? 'İtibar yönetimi konusunda ne kadar ciddisiniz?' : 'How serious are you about review management?'}
      </h2>
      <p className="text-[17px] text-[#1A1A1A] mb-10 font-bold max-w-lg">
        {locale === 'tr' 
          ? '14 gün boyunca ücretsiz deneyin. Kredi kartı veya taahhüt gerekmez.' 
          : 'Try it free on a 14 day trial. No credit card required, no strings attached.'}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <CtaButton variant="primary" href={`${base}/auth/register`}>
          {locale === 'tr' ? 'Hemen başlayın!' : 'Get started now!'}
        </CtaButton>
        <CtaButton variant="secondary" href={`${base}/pricing`}>
          {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
        </CtaButton>
      </div>
    </div>
  );
}
