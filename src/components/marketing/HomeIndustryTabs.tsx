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

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 top-24 h-32 w-32 rounded-full bg-[#C6F24E]/25 blur-3xl lg:hidden"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.76fr_1.24fr] lg:gap-6">
        <div className="rounded-[26px] border border-[#EDEDED] bg-white/80 p-2 shadow-[0_24px_60px_-54px_rgba(10,10,10,0.55)] backdrop-blur sm:p-3 lg:rounded-[30px] lg:p-4">
          <div
            role="tablist"
            aria-label={isTr ? 'Sektör seçimi' : 'Industry selector'}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto lg:grid lg:snap-none lg:grid-cols-1 lg:overflow-visible"
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
                  className={`group flex min-h-[76px] w-[min(82vw,360px)] shrink-0 snap-start items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-all duration-300 lg:w-full ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white shadow-[0_18px_38px_-28px_rgba(10,10,10,0.9)]'
                      : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EDEDED]'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                      isActive ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]'
                    }`}
                  >
                    <ItemIcon size={19} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] font-semibold ${isActive ? 'text-white' : 'text-[#0A0A0A]'}`}>
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
                </button>
              );
            })}
          </div>
        </div>

        <article
          id="industry-panel"
          role="tabpanel"
          className="relative overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white p-5 shadow-[0_28px_70px_-58px_rgba(10,10,10,0.55)] sm:p-7 lg:min-h-[424px] lg:rounded-[34px] lg:p-9"
        >
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#C6F24E]/30 blur-[70px]"
          />
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[20px] bg-[#C6F24E] text-[#0A0A0A] sm:h-14 sm:w-14">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'AKTİF SEKTÖR' : 'ACTIVE INDUSTRY'}
                  </p>
                  <h3
                    className="mt-1 truncate text-[28px] font-medium leading-none tracking-[-0.035em] text-[#0A0A0A] sm:text-[38px]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {sector.label[isTr ? 'tr' : 'en']}
                  </h3>
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                <span className="pulse-eyebrow text-[#737373]">
                  {sector.count[isTr ? 'tr' : 'en']}
                </span>
              </div>
            </div>

            <p className="mt-6 max-w-[760px] text-[16px] leading-[1.7] text-[#525252] sm:text-[18px]">
              {sector.body[isTr ? 'tr' : 'en']}
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  label: isTr ? 'Temas noktası' : 'Touchpoints',
                  value: '3+',
                },
                {
                  label: isTr ? 'Panel görünümü' : 'Dashboard view',
                  value: isTr ? 'Tek' : 'One',
                },
                {
                  label: isTr ? 'Kurulum ritmi' : 'Setup rhythm',
                  value: isTr ? '24sa' : '24h',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <div
                    className="text-[28px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {item.value}
                  </div>
                  <div className="pulse-eyebrow mt-2 text-[#737373]">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-[22px] bg-[#0A0A0A] p-4 text-white sm:p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#C6F24E]" />
                <p className="text-[14px] leading-[1.65] text-white/78 sm:text-[15px]">
                  {sector.outcome[isTr ? 'tr' : 'en']}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {sector.touchpoints[isTr ? 'tr' : 'en'].map((item) => (
                  <span key={item} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href={`/${locale}${sector.href}`}
              className="mt-6 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 py-3 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] sm:w-auto"
            >
              {isTr ? 'Sektör detayını gör' : 'View industry page'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
