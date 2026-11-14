import { Clock, ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';

/**
 * Shown to owners whose 14-day trial has ended. No prices here: plans and
 * USD prices live in the database and are shown on /pricing, so this page
 * links there instead of repeating numbers that can go out of date.
 */
export default function TrialExpiredPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#FFFFFF] p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-[#EDEDED] overflow-hidden">
          <div className="bg-[#0A0A0A] px-8 py-8 text-center text-white">
            <div className="w-16 h-16 bg-[#C6F24E]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-[#C6F24E]" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">Deneme süreniz doldu</h1>
            <p className="text-white/70 text-sm">14 günlük ücretsiz deneme süreniz sona erdi.</p>
          </div>

          <div className="p-8">
            <p className="text-[#1A1A1A] text-sm text-center leading-relaxed mb-6">
              Buaze&apos;yi kullanmaya devam etmek için bir plan seçin. İşletme ayarlarınız ve
              geri bildirimleriniz silinmez; plan seçtiğinizde kaldığınız yerden devam edersiniz.
            </p>

            <Link
              href="/tr/pricing"
              className="bz-btn-primary w-full rounded-2xl text-sm"
            >
              Planları ve fiyatları görün
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Plan%20se%C3%A7imi`}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#EDEDED] px-4 py-3 text-sm font-medium text-[#0A0A0A] hover:border-[#0A0A0A]"
            >
              <Mail size={16} aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>

            <p className="text-xs text-center text-[#737373] mt-4">{SUPPORT_HOURS.tr}</p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/admin" className="text-xs text-[#737373] hover:text-[#1A1A1A] underline">
            Farklı hesapla giriş yapın
          </Link>
        </div>
      </div>
    </div>
  );
}
