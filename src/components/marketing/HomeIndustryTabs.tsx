'use client';

import { useState } from 'react';

interface Sector {
  id: string;
  label: { tr: string; en: string };
  count: { tr: string; en: string };
  body: { tr: string; en: string };
}

const SECTORS: Sector[] = [
  {
    id: 'restaurant',
    label: { tr: 'Restoran & Kafe', en: 'Restaurant & Café' },
    count: { tr: '1.200+ nokta', en: '1,200+ venues' },
    body: {
      tr: 'Masa QR, fatura QR, kapıda veda, paket siparişte — dört temas noktası, tek panel.',
      en: 'Table QR, receipt QR, door exit, delivery pack — four touchpoints in one panel.',
    },
  },
  {
    id: 'hotel',
    label: { tr: 'Otel', en: 'Hotel' },
    count: { tr: '340+ tesis', en: '340+ properties' },
    body: {
      tr: 'Check-out sonrası, oda kartında, restoran masasında — konuğu yakalayıp Booking + Tripadvisor\'a taşı.',
      en: 'Post-checkout, on key cards, at the restaurant table — turn the stay into Booking + Tripadvisor reviews.',
    },
  },
  {
    id: 'clinic',
    label: { tr: 'Klinik & Uygulama', en: 'Clinic & Practice' },
    count: { tr: '520+ sağlayıcı', en: '520+ providers' },
    body: {
      tr: 'Randevu sonrası otomatik mesaj + klinikte QR. Google Maps\'te yükselen yıldız ortalaması.',
      en: 'Post-appointment messaging + in-clinic QR. Rising star averages across Google Maps.',
    },
  },
  {
    id: 'legal',
    label: { tr: 'Hukuk Ofisi', en: 'Legal' },
    count: { tr: '180+ büro', en: '180+ offices' },
    body: {
      tr: 'Dava kapanışında veya ofis çıkışında QR. Güven sinyali = yeni müvekkil.',
      en: 'QR at case closure or office exit. Trust signal equals new clients.',
    },
  },
  {
    id: 'spa',
    label: { tr: 'Güzellik & Spa', en: 'Beauty & Spa' },
    count: { tr: '410+ salon', en: '410+ salons' },
    body: {
      tr: 'Seans sonunda, resepsiyonda. Instagram + Google dopingi — her ikisini tek QR\'dan besle.',
      en: 'End of session, at the reception. Boost Instagram + Google from a single QR.',
    },
  },
  {
    id: 'retail',
    label: { tr: 'Perakende', en: 'Retail' },
    count: { tr: '260+ mağaza', en: '260+ stores' },
    body: {
      tr: 'Kasa yanında, poşet içinde, e-fatura PDF\'inde. Omnichannel için tek QR yeter.',
      en: 'At the register, in the bag, on the e-receipt PDF. One QR for omnichannel.',
    },
  },
  {
    id: 'fitness',
    label: { tr: 'Spor & Fitness', en: 'Sports & Fitness' },
    count: { tr: '140+ tesis', en: '140+ facilities' },
    body: {
      tr: 'Üyelik yenileme, ders sonu, stüdyo çıkışı. Üye sadakati = yıldız ortalaması.',
      en: 'Membership renewal, class end, studio exit. Retention equals rating.',
    },
  },
  {
    id: 'education',
    label: { tr: 'Eğitim', en: 'Education' },
    count: { tr: '90+ kurum', en: '90+ institutions' },
    body: {
      tr: 'Kurs sonu, tanışma günü, eğitim setinde. Veli + öğrenci yorumu tek hatta.',
      en: 'Course end, open day, in the training kit. Parent + student reviews on one line.',
    },
  },
];

interface Props {
  locale: 'tr' | 'en';
}

/**
 * Industry tab strip — click / keyboard-nav through 8 sectors. Mirrors
 * `activeSector` block in `.design/site/site-homepage-v3.jsx:409`.
 */
export default function HomeIndustryTabs({ locale }: Props) {
  const [active, setActive] = useState(0);
  const isTr = locale === 'tr';
  const s = SECTORS[active];

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex min-w-max gap-2 border-b border-[#EDEDED] pb-3 sm:min-w-0 sm:flex-wrap sm:border-b-0 sm:pb-0">
          {SECTORS.map((sector, idx) => (
            <button
              key={sector.id}
              onClick={() => setActive(idx)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                idx === active
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EDEDED]'
              }`}
            >
              {sector.label[isTr ? 'tr' : 'en']}
              <span
                className={`pulse-eyebrow rounded-full px-1.5 py-0.5 ${
                  idx === active ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-white text-[#737373]'
                }`}
              >
                {sector.count[isTr ? 'tr' : 'en']}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-8">
        <p
          className="text-[22px] font-medium leading-tight tracking-tight text-[#0A0A0A] sm:text-[26px]"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          {s.label[isTr ? 'tr' : 'en']}
        </p>
        <p className="mt-3 max-w-[640px] text-[14px] leading-[1.65] text-[#525252] sm:text-[15px]">
          {s.body[isTr ? 'tr' : 'en']}
        </p>
      </div>
    </div>
  );
}
