'use client';

// Staff mode of the customer's card (CLAUDE.md §61). The card link opens as
// the counter screen when the person opening it is signed in to the panel
// with access to this business — typically the owner scanning the
// customer's QR with the phone's own camera. Same counter as the panel
// (MemberActions + history); the phone keeps nothing of the customer.
import { useEffect, useState } from 'react';
import { ArrowUpRight, Camera, Eye } from 'lucide-react';
// The panel's "Pano" look (purple pn-* tokens, pill bz-* buttons) for the
// panel components shown here. Every rule is scoped to `.bz-panel`, so the
// customer card pages under /l are not affected; the CSS ships only in this
// staff-mode chunk.
import '@/components/panel/pano/pano.css';
import { AlertBanner } from '@/components/ui';
import SoundToggle from '@/components/loyalty/SoundToggle';
import StaffArrival from '@/components/loyalty/StaffArrival';
import { formatMemberCode } from '@/lib/loyalty';
import MemberActions from '@/app/[locale]/dashboard/loyalty/_components/MemberActions';
import type { AccessDto, MemberDto, ProgramDto } from '@/app/[locale]/dashboard/loyalty/_components/loyalty-client';

export default function StaffCounterView({
  locale,
  restaurantId,
  restaurantName,
  moduleEnabled,
  panelHref,
  customerHref,
  program,
  member: initialMember,
  access,
  arrival,
}: {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  moduleEnabled: boolean;
  panelHref: string;
  customerHref: string;
  program: ProgramDto;
  member: MemberDto;
  access: AccessDto;
  /** Play the "card read" moment (not when coming back from the customer view). */
  arrival: boolean;
}) {
  const tr = locale === 'tr';
  const [member, setMember] = useState(initialMember);
  // The /l root layout says lang="tr"; follow the page language (§52).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  // Module switched off by the plan: read only (the API would refuse anyway).
  const effectiveAccess: AccessDto = moduleEnabled ? access : { read: access.read, operate: false, manage: false };

  return (
    <div className="bz-panel min-h-dvh bg-[#F6F6F6]">
      {arrival && <StaffArrival locale={locale} customerName={initialMember.firstName ?? initialMember.name} code={formatMemberCode(initialMember.code)} />}

      <header className="sticky top-0 z-30 bg-[#5D3EBC] text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-16 max-w-[760px] items-center gap-2.5 px-4">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#5D3EBC]">
            <span className="pulse-heartbeat h-1.5 w-1.5 rounded-full bg-[#5D3EBC]" aria-hidden="true" />
            {tr ? 'Kasa modu' : 'Staff mode'}
          </span>
          <p className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-white/90">{restaurantName}</p>
          <SoundToggle locale={locale} variant="dark" />
          <a
            href={panelHref}
            className="bzl-tap inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-white/15 px-4 text-[13.5px] font-medium text-white transition-colors duration-200 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Panel
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] space-y-3 px-4 pt-4" style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 20px))' }}>
        {!moduleEnabled && (
          <AlertBanner kind="warn">
            {tr ? 'Sadakat kartı bu işletmenin paketinde kapalı: kasa işlemi yapılamaz.' : 'The loyalty card is off in this business’s plan: no counter actions.'}
          </AlertBanner>
        )}
        {moduleEnabled && !access.operate && (
          <AlertBanner kind="info">{tr ? 'Görüntüleme yetkiniz var: bu kartta işlem yapamazsınız.' : 'You have view-only access: no actions on this card.'}</AlertBanner>
        )}

        <section className="bz-card bzl-rise p-4 sm:p-5">
          <MemberActions
            locale={locale}
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            program={program}
            member={member}
            access={effectiveAccess}
            onChange={setMember}
            withHistory
          />
        </section>

        <a
          href={customerHref}
          className="bz-btn-ghost bzl-tap flex min-h-[46px] w-full items-center justify-center gap-2 bg-white text-[14px]"
        >
          <Eye size={16} aria-hidden="true" /> {tr ? 'Müşterinin gördüğü kartı aç' : 'Open the customer’s view'}
        </a>

        <p className="flex items-start justify-center gap-2 px-2 pt-1 text-center text-[13px] leading-relaxed text-[#6B6B6B]">
          <Camera size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {tr
            ? 'Sonraki müşteri için telefonun kamerasıyla onun kartını okutun; kart bu ekranda açılır.'
            : 'For the next customer, scan their card with the phone’s camera; it opens on this screen.'}
        </p>
      </main>
    </div>
  );
}
