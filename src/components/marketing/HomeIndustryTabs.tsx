'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  GraduationCap,
  Hotel,
  Scale,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Utensils,
  Activity,
  LayoutDashboard,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

interface Sector {
  id: string;
  href: string;
  icon: LucideIcon;
  label: { tr: string; en: string };
  count: { tr: string; en: string };
  body: { tr: string; en: string };
  outcome: { tr: string; en: string };
  touchpoints: { tr: string[]; en: string[] };
}

const SECTORS: Sector[] = [
  {
    id: 'restaurant',
    href: '/solutions/restaurants',
    icon: Utensils,
    label: { tr: 'Restoran & Kafe', en: 'Restaurant & Café' },
    count: { tr: '1.200+ nokta', en: '1,200+ venues' },
    body: {
      tr: 'Masa, fatura, kapı çıkışı ve paket servis temaslarını tek QR operasyonuna bağlayın.',
      en: 'Connect table, receipt, exit and delivery touchpoints into one QR operation.',
    },
    outcome: {
      tr: 'Şube, masa ve platform kırılımı tek panelde görünür.',
      en: 'Branch, table and platform performance stays visible in one dashboard.',
    },
    touchpoints: {
      tr: ['Masa QR', 'Fatura QR', 'Paket kartı'],
      en: ['Table QR', 'Receipt QR', 'Delivery card'],
    },
  },
  {
    id: 'hotel',
    href: '/solutions/hotels',
    icon: Hotel,
    label: { tr: 'Otel', en: 'Hotel' },
    count: { tr: '340+ tesis', en: '340+ properties' },
    body: {
      tr: 'Check-out, oda kartı ve restoran masası gibi doğal anlarda misafir deneyimini yakalayın.',
      en: 'Capture guest experience at natural moments like checkout, key cards and restaurant tables.',
    },
    outcome: {
      tr: 'Booking, Tripadvisor ve Google sinyalleri aynı raporda birleşir.',
      en: 'Booking, Tripadvisor and Google signals meet in one report.',
    },
    touchpoints: {
      tr: ['Oda kartı', 'Check-out', 'Lobi QR'],
      en: ['Key card', 'Checkout', 'Lobby QR'],
    },
  },
  {
    id: 'clinic',
    href: '/solutions/healthcare',
    icon: Stethoscope,
    label: { tr: 'Klinik & Uygulama', en: 'Clinic & Practice' },
    count: { tr: '520+ sağlayıcı', en: '520+ providers' },
    body: {
      tr: 'Randevu sonrası tarafsız geri bildirim isteyin; ekip takiplerini hassas veriden ayırın.',
      en: 'Request neutral post-appointment feedback and keep team follow-up separate from sensitive data.',
    },
    outcome: {
      tr: 'Hasta memnuniyeti erken ölçülür, ekip aksiyonu gecikmez.',
      en: 'Patient satisfaction is measured earlier and team action does not wait.',
    },
    touchpoints: {
      tr: ['SMS linki', 'Resepsiyon', 'Kontrol sonrası'],
      en: ['SMS link', 'Reception', 'After follow-up'],
    },
  },
  {
    id: 'legal',
    href: '/solutions/law-firms',
    icon: Scale,
    label: { tr: 'Hukuk Ofisi', en: 'Legal' },
    count: { tr: '180+ büro', en: '180+ offices' },
    body: {
      tr: 'Danışmanlık veya dosya kapanışı sonrası güven sinyalini düzenli hale getirin.',
      en: 'Make trust signals consistent after consultations or case closures.',
    },
    outcome: {
      tr: 'Profesyonel yanıt dili ve takip notları tek akışta tutulur.',
      en: 'Professional reply language and follow-up notes stay in one flow.',
    },
    touchpoints: {
      tr: ['Danışma sonrası', 'Ofis çıkışı', 'E-posta imzası'],
      en: ['Post-consultation', 'Office exit', 'Email signature'],
    },
  },
  {
    id: 'spa',
    href: '/solutions/beauty-salon',
    icon: Sparkles,
    label: { tr: 'Güzellik & Spa', en: 'Beauty & Spa' },
    count: { tr: '410+ salon', en: '410+ salons' },
    body: {
      tr: 'Seans sonrası memnuniyeti yakalayın; Instagram, Google ve tekrar randevu akışını besleyin.',
      en: 'Capture post-session satisfaction and feed Instagram, Google and rebooking flows.',
    },
    outcome: {
      tr: 'Tekrarlı randevu ve görünür yorum ritmi birlikte büyür.',
      en: 'Repeat bookings and visible review rhythm grow together.',
    },
    touchpoints: {
      tr: ['Seans sonu', 'Resepsiyon', 'Randevu mesajı'],
      en: ['Session end', 'Reception', 'Booking message'],
    },
  },
  {
    id: 'retail',
    href: '/solutions/retail',
    icon: ShoppingBag,
    label: { tr: 'Perakende', en: 'Retail' },
    count: { tr: '260+ mağaza', en: '260+ stores' },
    body: {
      tr: 'Kasa, poşet ve e-fatura temaslarını mağaza bazlı geri bildirim hattına dönüştürün.',
      en: 'Turn register, bag and e-receipt touchpoints into store-level feedback lines.',
    },
    outcome: {
      tr: 'Mağaza memnuniyeti, personel notları ve Google görünürlüğü ayrışır.',
      en: 'Store satisfaction, staff notes and Google visibility become measurable.',
    },
    touchpoints: {
      tr: ['Kasa önü', 'Poşet içi', 'E-fatura'],
      en: ['Register', 'In-bag', 'E-receipt'],
    },
  },
  {
    id: 'fitness',
    href: '/solutions/gym',
    icon: Dumbbell,
    label: { tr: 'Spor & Fitness', en: 'Sports & Fitness' },
    count: { tr: '140+ tesis', en: '140+ facilities' },
    body: {
      tr: 'Ders sonu, üyelik yenileme ve stüdyo çıkışında üye deneyimini düzenli ölçün.',
      en: 'Measure member experience after classes, renewals and studio exits.',
    },
    outcome: {
      tr: 'Sadakat sinyali ve yorum akışı aynı ritme girer.',
      en: 'Retention signals and review flow move into the same rhythm.',
    },
    touchpoints: {
      tr: ['Ders sonu', 'Üyelik yenileme', 'Stüdyo çıkışı'],
      en: ['Class end', 'Renewal', 'Studio exit'],
    },
  },
  {
    id: 'education',
    href: '/solutions/schools',
    icon: GraduationCap,
    label: { tr: 'Eğitim', en: 'Education' },
    count: { tr: '90+ kurum', en: '90+ institutions' },
    body: {
      tr: 'Kurs bitimi, tanışma günü ve veli iletişiminde geri bildirimi ölçülebilir hale getirin.',
      en: 'Make feedback measurable after courses, open days and parent communication.',
    },
    outcome: {
      tr: 'Veli ve öğrenci yorumları aynı yönetim ritmine bağlanır.',
      en: 'Parent and student feedback joins the same management rhythm.',
    },
    touchpoints: {
      tr: ['Kurs bitimi', 'Tanışma günü', 'Veli mesajı'],
      en: ['Course end', 'Open day', 'Parent message'],
    },
  },
];

interface Props {
  locale: 'tr' | 'en';
}

export default function HomeIndustryTabs({ locale }: Props) {
  const [active, setActive] = useState(0);
  const isTr = locale === 'tr';
  const sector = SECTORS[active];
  const Icon = sector.icon;

  const stats = [
    {
      icon: Activity,
      label: isTr ? 'Temas noktası' : 'Touchpoints',
      value: '3+',
    },
    {
      icon: LayoutDashboard,
      label: isTr ? 'Panel görünümü' : 'Dashboard view',
      value: isTr ? 'Tek' : 'One',
    },
    {
      icon: Timer,
      label: isTr ? 'Kurulum ritmi' : 'Setup rhythm',
      value: isTr ? '24sa' : '24h',
    },
  ];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 top-20 h-28 w-28 rounded-full bg-[#C6F24E]/25 blur-3xl lg:hidden"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:gap-6">
        {/* Left rail — tab list */}
        <div className="rounded-[24px] border border-[#EDEDED] bg-white p-2 shadow-[0_24px_60px_-54px_rgba(10,10,10,0.55)] sm:p-2.5 lg:rounded-[26px] lg:p-3">
          <div
            role="tablist"
            aria-label={isTr ? 'Sektör seçimi' : 'Industry selector'}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto lg:grid lg:snap-none lg:grid-cols-1 lg:gap-1.5 lg:overflow-visible"
          >
            {SECTORS.map((item, idx) => {
              const ItemIcon = item.icon;
              const isActive = idx === active;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="industry-panel"
                  onClick={() => setActive(idx)}
                  className={`group relative flex min-h-[64px] w-[min(78vw,320px)] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 text-left transition-all duration-300 lg:w-full ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white shadow-[0_18px_38px_-28px_rgba(10,10,10,0.9)]'
                      : 'bg-[#FAFAFA] text-[#525252] hover:bg-[#F2F2F2] hover:translate-x-[1px]'
                  }`}
                >
                  {/* Active accent bar */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 h-7 -translate-y-1/2 rounded-r-full bg-[#C6F24E] transition-all duration-300 ${
                      isActive ? 'w-[3px] opacity-100' : 'w-[3px] opacity-0'
                    }`}
                  />

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-all duration-300 ${
                      isActive
                        ? 'bg-[#C6F24E] text-[#0A0A0A]'
                        : 'bg-white text-[#0A0A0A] ring-1 ring-[#EDEDED] group-hover:ring-[#0A0A0A]/15'
                    }`}
                  >
                    <ItemIcon size={17} strokeWidth={2.2} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] font-semibold leading-tight ${
                        isActive ? 'text-white' : 'text-[#0A0A0A]'
                      }`}
                    >
                      {item.label[isTr ? 'tr' : 'en']}
                    </span>
                    <span
                      className={`pulse-eyebrow mt-1 block truncate ${
                        isActive ? 'text-[#C6F24E]' : 'text-[#737373]'
                      }`}
                    >
                      {item.count[isTr ? 'tr' : 'en']}
                    </span>
                  </span>

                  {/* Trailing arrow — appears on hover for inactive, always for active */}
                  <ArrowRight
                    size={14}
                    className={`shrink-0 transition-all duration-300 ${
                      isActive
                        ? 'translate-x-0 text-[#C6F24E] opacity-100'
                        : '-translate-x-1 text-[#A3A3A3] opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right detail panel */}
        <article
          id="industry-panel"
          role="tabpanel"
          className="relative overflow-hidden rounded-[24px] border border-[#EDEDED] bg-white p-5 shadow-[0_28px_70px_-58px_rgba(10,10,10,0.55)] sm:p-7 lg:min-h-[380px] lg:rounded-[28px] lg:p-8"
        >
          {/* Decorative orbs */}
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#C6F24E]/30 blur-[60px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-12 h-44 w-44 rounded-full bg-[#0A0A0A]/[0.04] blur-[70px]"
          />

          <div className="relative">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-[#C6F24E] text-[#0A0A0A] sm:h-14 sm:w-14">
                  <Icon size={22} strokeWidth={2.2} />
                  <span
                    aria-hidden
                    className="pulse-heartbeat absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#0A0A0A] ring-2 ring-white"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'AKTİF SEKTÖR' : 'ACTIVE INDUSTRY'}
                  </p>
                  <h3
                    className="mt-1.5 text-[24px] font-medium leading-[1.05] tracking-[-0.035em] text-[#0A0A0A] sm:text-[32px]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {sector.label[isTr ? 'tr' : 'en']}
                  </h3>
                </div>
              </div>

              <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2">
                <span className="pulse-heartbeat h-2 w-2 rounded-full bg-[#C6F24E]" />
                <span className="pulse-eyebrow text-[#525252]">
                  {sector.count[isTr ? 'tr' : 'en']}
                </span>
              </div>
            </div>

            {/* Body */}
            <p className="mt-5 max-w-[760px] text-[14.5px] leading-[1.65] text-[#525252] sm:text-[15.5px]">
              {sector.body[isTr ? 'tr' : 'en']}
            </p>

            {/* Stat grid */}
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {stats.map((item) => {
                const StatIcon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="group relative overflow-hidden rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-3.5 transition-colors duration-300 hover:border-[#0A0A0A]/15 hover:bg-white"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-full w-[2px] bg-[#C6F24E] opacity-70"
                    />
                    <div className="flex items-center justify-between">
                      <div
                        className="text-[24px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {item.value}
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#0A0A0A] ring-1 ring-[#EDEDED] transition-colors group-hover:bg-[#EAF9B8] group-hover:ring-[#C6F24E]">
                        <StatIcon size={13} strokeWidth={2.2} />
                      </span>
                    </div>
                    <div className="pulse-eyebrow mt-2 text-[#737373]">{item.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Outcome card (dark) */}
            <div className="relative mt-5 overflow-hidden rounded-[18px] bg-[#0A0A0A] p-4 text-white sm:p-5">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-[3px] bg-[#C6F24E]"
              />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C6F24E]/15 ring-1 ring-[#C6F24E]/30">
                  <CheckCircle2 size={14} className="text-[#C6F24E]" strokeWidth={2.4} />
                </div>
                <p className="text-[13.5px] leading-[1.6] text-white/85 sm:text-[14.5px]">
                  {sector.outcome[isTr ? 'tr' : 'en']}
                </p>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {sector.touchpoints[isTr ? 'tr' : 'en'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-[#C6F24E]/40 hover:bg-[#C6F24E]/10 hover:text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/${locale}${sector.href}`}
              className="group/cta mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13.5px] font-semibold text-[#0A0A0A] shadow-[0_10px_30px_-18px_rgba(168,214,46,0.7)] transition-all duration-200 hover:bg-[#A8D62E] hover:shadow-[0_14px_36px_-18px_rgba(168,214,46,0.85)] active:scale-[0.98] sm:w-auto"
            >
              {isTr ? 'Sektör detayını gör' : 'View industry page'}
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
              />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
