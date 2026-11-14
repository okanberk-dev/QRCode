import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  Camera,
  Check,
  Copy,
  ListChecks,
  Mail,
  MessageSquareText,
  QrCode,
  Sparkles,
  Star,
  Type,
} from 'lucide-react';

/**
 * Sample screens for the feature pages (spec §4 "Mockups"). Plain HTML/CSS,
 * generic data — no real-looking names, places or statistics, no "live"
 * badges, no third-party reviews or logos shown as imported. Each mirrors a
 * real panel screen closely enough to be honest; FeaturePageLayout frames it
 * with the "Örnek ekran / Sample screen" label and hides it from screen
 * readers (the page copy describes the same feature in text).
 *
 * Server components only — nothing here is interactive (buttons are spans).
 */

type Locale = 'tr' | 'en';

function RatingBadge({ rating }: { rating: number }) {
  const tone =
    rating <= 2
      ? 'bg-[#FEE2E2] text-[#991B1B]'
      : rating === 3
        ? 'bg-[#FEF3C7] text-[#92400E]'
        : 'bg-[#EAF9B8] text-[#3F5408]';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center gap-0.5 rounded-[10px] text-[13px] font-semibold ${tone}`}
    >
      {rating}
      <Star size={10} strokeWidth={0} fill="currentColor" />
    </span>
  );
}

function Stars({ filled, size = 13 }: { filled: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.8}
          fill={i < filled ? '#0A0A0A' : 'none'}
          color={i < filled ? '#0A0A0A' : '#A3A3A3'}
        />
      ))}
    </span>
  );
}

function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${
        active ? 'bg-[#0A0A0A] text-white' : 'border border-[#E5E5E5] bg-white text-[#525252]'
      }`}
    >
      {children}
    </span>
  );
}

/* ─── Yorum yönetimi: gelen kutusu ─────────────────────────────────────── */

export function InboxMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const rows = [
    {
      rating: 2,
      name: tr ? 'Anonim müşteri' : 'Anonymous customer',
      time: tr ? '8 dk' : '8 min',
      comment: tr ? 'Yemekler lezzetliydi ama siparişimiz geç geldi.' : 'The food was tasty, but our order came late.',
      source: 'qr' as const,
      status: { label: tr ? 'Yanıt bekliyor' : 'Awaiting reply', tone: 'bg-[#FEF3C7] text-[#92400E]' },
      unread: true,
    },
    {
      rating: 5,
      name: tr ? 'Müşteri' : 'Customer',
      time: tr ? '1 sa' : '1 hr',
      comment: null,
      source: 'redirect' as const,
      status: null,
      unread: false,
    },
    {
      rating: 3,
      name: tr ? 'Misafir' : 'Guest',
      time: tr ? '3 sa' : '3 hr',
      comment: tr ? 'Masalar biraz daha temiz olabilirdi.' : 'The tables could have been cleaner.',
      source: 'qr' as const,
      status: { label: tr ? 'Yanıtlandı' : 'Replied', tone: 'bg-[#DCFCE7] text-[#166534]' },
      unread: false,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[#F2F2F2] px-4 py-3 sm:px-5">
        <span className="text-[14px] font-semibold text-[#0A0A0A]">{tr ? 'Yorumlar' : 'Reviews'}</span>
        <span className="text-[12px] text-[#737373]">{tr ? 'Son 30 gün' : 'Last 30 days'}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pt-3 sm:px-5">
        <Chip active>{tr ? 'Tümü' : 'All'}</Chip>
        <Chip>{tr ? 'Okunmamış' : 'Unread'}</Chip>
        <Chip>{tr ? 'Düşük puan' : 'Low rating'}</Chip>
        <Chip>{tr ? 'Yanıtlandı' : 'Replied'}</Chip>
      </div>
      <ul className="mt-2">
        {rows.map((row) => (
          <li key={row.name} className="flex items-start gap-3 border-b border-[#F5F5F5] px-4 py-3.5 sm:px-5">
            <RatingBadge rating={row.rating} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {row.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" /> : null}
                <span className="truncate text-[13px] font-semibold text-[#0A0A0A]">{row.name}</span>
                <span className="ml-auto shrink-0 text-[12px] text-[#737373]">{row.time}</span>
              </div>
              <p className="mt-1 text-[13px] leading-[1.5] text-[#525252]">
                {row.comment ?? <span className="italic text-[#A3A3A3]">{tr ? 'Yorum yazılmadı' : 'No comment'}</span>}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-[#737373]">
                {row.source === 'qr' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <QrCode size={13} strokeWidth={2} />
                    Buaze QR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowUpRight size={13} strokeWidth={2} />
                    {tr ? 'Google yorum sayfasına yönlendirildi' : 'Sent to the Google review page'}
                  </span>
                )}
                {row.status ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.status.tone}`}>
                    {row.status.label}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-[#525252] sm:px-5">
        <Mail size={14} strokeWidth={2} className="shrink-0 text-[#0A0A0A]" />
        <span className="min-w-0 flex-1">{tr ? '1–3 yıldızda anında e-posta' : 'Instant e-mail for 1–3★'}</span>
        <span className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-[#C6F24E]">
          <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-[#0A0A0A]" />
        </span>
      </div>
    </div>
  );
}

/* ─── Pulse AI: taslak kartı ───────────────────────────────────────────── */

export function PulseAiMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const tones = tr ? ['Sıcak', 'Resmi', 'Özür dileyen'] : ['Warm', 'Formal', 'Apologetic'];
  return (
    <div className="space-y-3.5 p-4 sm:p-5">
      <div className="rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-3.5">
        <div className="flex items-center gap-2.5">
          <RatingBadge rating={2} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0A0A0A]">{tr ? 'Anonim müşteri' : 'Anonymous customer'}</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-[#737373]">
              <QrCode size={12} strokeWidth={2} />
              Buaze QR · {tr ? '12 dk' : '12 min'}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-[1.55] text-[#1A1A1A]">
          {tr
            ? 'Yemekler güzeldi ama siparişimiz çok geç geldi.'
            : 'The food was good, but our order took far too long.'}
        </p>
      </div>

      <div>
        <p className="text-[12px] text-[#737373]">{tr ? 'Ton' : 'Tone'}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {tones.map((tone, i) => (
            <Chip key={tone} active={i === 0}>
              {tone}
            </Chip>
          ))}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#C6F24E] bg-white p-3.5 shadow-[0_0_0_3px_rgba(198,242,78,0.18)]">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#3F5408]">
          <Sparkles size={13} strokeWidth={2} />
          {tr ? 'Pulse AI önerisi' : 'Pulse AI suggestion'}
        </p>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#1A1A1A]">
          {tr
            ? 'Merhaba, geri bildiriminiz için teşekkür ederiz. Siparişinizin geç gelmesi bizi de üzdü; bekleme süresini ekibimizle konuşacağız. Sizi yeniden ağırlamaktan memnuniyet duyarız.'
            : 'Hello, thank you for your feedback. We are sorry your order arrived late; we will talk about the waiting time with our team. We would be glad to welcome you back.'}
        </p>
      </div>

      <p className="flex items-start gap-2 text-[12px] leading-[1.5] text-[#525252]">
        <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-[#0A0A0A]">
          <Check size={11} strokeWidth={3} color="#FFFFFF" />
        </span>
        {tr ? 'Bu yanıtın içeriğinden sorumlu olduğumu onaylıyorum.' : 'I confirm I am responsible for this reply.'}
      </p>

      <div className="flex gap-2">
        <span className="inline-flex items-center justify-center rounded-full border border-[#D4D4D4] px-4 py-2 text-[13px] font-medium text-[#0A0A0A]">
          {tr ? 'Yanıta aktar' : 'Copy to reply'}
        </span>
        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-[13px] font-semibold text-white">
          <Mail size={13} strokeWidth={2} />
          {tr ? 'Olduğu gibi gönder' : 'Send as is'}
        </span>
      </div>
    </div>
  );
}

/* ─── Analitik: göstergeler ve gün × saat ─────────────────────────────── */

// Deterministic sample intensities (0–4) for 7 days × 12 two-hour slots:
// quiet mornings, a lunch and an evening peak, busier weekends.
const HEAT: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 1, 2, 3, 1, 1, 2, 3, 1],
  [0, 0, 0, 0, 1, 2, 2, 1, 1, 2, 3, 1],
  [0, 0, 0, 1, 1, 3, 2, 1, 2, 3, 3, 1],
  [0, 0, 0, 0, 1, 2, 3, 1, 1, 3, 3, 2],
  [0, 0, 0, 1, 2, 3, 3, 2, 2, 4, 4, 2],
  [0, 0, 0, 1, 2, 4, 3, 2, 3, 4, 4, 3],
  [0, 0, 0, 1, 3, 4, 3, 2, 2, 3, 3, 1],
];
const HEAT_FILL = ['#F2F2F2', '#E3F6A8', '#C6F24E', '#8DB31F', '#3F5408'];

export function AnalyticsMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const periods = tr ? ['7g', '30g', '90g', '12 ay', 'Özel'] : ['7d', '30d', '90d', '12m', 'Custom'];
  const days = tr ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const kpis = tr
    ? [
        { label: 'Toplam yorum', value: '126', sub: 'önceki dönem 112' },
        { label: 'Ortalama puan', value: '4,4', sub: 'hedef 4,5' },
        { label: 'Tahmini NPS', value: '31', sub: 'puanlardan' },
      ]
    : [
        { label: 'Total reviews', value: '126', sub: 'previous 112' },
        { label: 'Avg rating', value: '4.4', sub: 'target 4.5' },
        { label: 'Est. NPS', value: '31', sub: 'from ratings' },
      ];

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-[#0A0A0A]">{tr ? 'Analitik' : 'Analytics'}</span>
        <div className="flex flex-wrap gap-1">
          {periods.map((p, i) => (
            <Chip key={p} active={i === 1}>
              {p}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-2.5 sm:p-3">
            <p className="text-[11px] leading-[1.3] text-[#737373]">{kpi.label}</p>
            <p className="bz-h-tight mt-1.5 text-[22px] leading-none text-[#0A0A0A]">{kpi.value}</p>
            <p className="mt-1.5 text-[11px] leading-[1.3] text-[#737373]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[12px] border border-[#EDEDED] p-3">
        <p className="text-[12px] font-medium text-[#0A0A0A]">{tr ? 'Gün × saat yoğunluğu' : 'Day × hour activity'}</p>
        <div className="mt-2.5 space-y-[3px]">
          {HEAT.map((row, d) => (
            <div key={days[d]} className="flex items-center gap-[3px]">
              <span className="w-8 shrink-0 text-[11px] text-[#737373]">{days[d]}</span>
              {row.map((level, h) => (
                <span
                  key={h}
                  className="h-3.5 flex-1 rounded-[3px]"
                  style={{ backgroundColor: HEAT_FILL[level] }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between pl-[35px] text-[11px] text-[#737373]">
          <span>00</span>
          <span>12</span>
          <span>23</span>
        </div>
      </div>
    </div>
  );
}

/* ─── QR Menü: müşterinin gördüğü menü ─────────────────────────────────── */

export function MenuMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const categories = tr ? ['Kahvaltı', 'Ana yemek', 'Tatlı', 'İçecek'] : ['Breakfast', 'Mains', 'Desserts', 'Drinks'];
  const items = [
    {
      name: 'Menemen',
      price: '₺185',
      badge: { label: tr ? 'Popüler' : 'Popular', tone: 'border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]' },
      allergens: tr ? 'Yumurta, Süt / laktoz' : 'Egg, Milk / lactose',
      soldOut: false,
    },
    {
      name: tr ? 'Serpme kahvaltı' : 'Breakfast spread',
      price: '₺640',
      badge: { label: tr ? 'Şef Önerisi' : "Chef's Pick", tone: 'bg-[#0A0A0A] text-[#C6F24E]' },
      allergens: tr ? 'Gluten, Süt / laktoz, Yumurta' : 'Gluten, Milk / lactose, Egg',
      soldOut: false,
    },
    {
      name: 'Simit',
      price: '₺35',
      badge: null,
      allergens: tr ? 'Gluten, Susam' : 'Gluten, Sesame',
      soldOut: true,
    },
  ];

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-[15px] font-semibold text-[#C6F24E]">
          {tr ? 'Ö' : 'S'}
        </span>
        <div>
          <p className="text-[15px] font-semibold leading-tight text-[#0A0A0A]">{tr ? 'Örnek Kafe' : 'Sample Café'}</p>
          <p className="mt-0.5 text-[12px] text-[#737373]">{tr ? 'Dijital menü' : 'Digital menu'}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {categories.map((c, i) => (
          <Chip key={c} active={i === 0}>
            {c}
          </Chip>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-[#F2F2F2]">
        {items.map((item) => (
          <li key={item.name} className={`py-3 ${item.soldOut ? 'opacity-60' : ''}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold text-[#0A0A0A]">{item.name}</span>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#0A0A0A]">{item.price}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.badge ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.badge.tone}`}>
                  {item.badge.label}
                </span>
              ) : null}
              {item.soldOut ? (
                <span className="rounded-full bg-[#F2F2F2] px-2 py-0.5 text-[11px] font-semibold text-[#525252]">
                  {tr ? 'Tükendi' : 'Out of stock'}
                </span>
              ) : null}
              <span className="text-[12px] text-[#737373]">{item.allergens}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#0A0A0A]">
          <QrCode size={14} strokeWidth={2} />
          {tr ? 'Menü QR kodu' : 'Menu QR code'}
        </span>
        <span className="text-[#525252]">PNG · SVG</span>
      </div>
    </div>
  );
}

/* ─── Denetim Merkezi: doldurulmuş kontrol listesi ─────────────────────── */

export function AuditMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const yes = tr ? 'Evet' : 'Yes';
  const no = tr ? 'Hayır' : 'No';
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-tight text-[#0A0A0A]">
            {tr ? 'Mutfak açılış kontrolü' : 'Kitchen opening check'}
          </p>
          <p className="mt-1 text-[12px] text-[#737373]">
            {tr ? 'Kontrol listesi · 4 madde · geçme puanı 80' : 'Checklist · 4 items · pass mark 80'}
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F2F2F2] px-2.5 py-1 text-[11px] font-semibold text-[#525252]">
          {tr ? 'Geçti / Kaldı' : 'Pass / Fail'}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {[
          tr ? 'Soğuk dolap sıcaklığı kaydedildi' : 'Fridge temperature recorded',
          tr ? 'Tezgâh ve yüzeyler temiz' : 'Counters and surfaces clean',
        ].map((q) => (
          <li key={q} className="flex items-center justify-between gap-3 rounded-[12px] border border-[#EDEDED] px-3 py-2.5">
            <span className="min-w-0 text-[13px] text-[#1A1A1A]">{q}</span>
            <span className="flex shrink-0 overflow-hidden rounded-full border border-[#E5E5E5] text-[12px] font-medium">
              <span className="bg-[#0A0A0A] px-2.5 py-1 text-white">{yes}</span>
              <span className="px-2.5 py-1 text-[#525252]">{no}</span>
            </span>
          </li>
        ))}
        <li className="rounded-[12px] border border-[#EDEDED] px-3 py-2.5">
          <span className="text-[13px] text-[#1A1A1A]">{tr ? 'Personel hijyeni (1–5)' : 'Staff hygiene (1–5)'}</span>
          <span className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`flex h-7 w-7 items-center justify-center rounded-[8px] text-[12px] font-semibold ${
                  n === 4 ? 'bg-[#0A0A0A] text-white' : 'border border-[#E5E5E5] text-[#525252]'
                }`}
              >
                {n}
              </span>
            ))}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-[12px] border border-[#EDEDED] px-3 py-2.5">
          <span className="min-w-0 text-[13px] text-[#1A1A1A]">{tr ? 'Hazırlık alanının fotoğrafı' : 'Photo of the prep area'}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#3F5408]">
            <Camera size={14} strokeWidth={2} />
            {tr ? 'Eklendi' : 'Added'}
          </span>
        </li>
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] bg-[#0A0A0A] px-4 py-3">
        <span className="text-[12px] text-white/75">{tr ? 'Puan' : 'Score'}</span>
        <span className="flex items-center gap-2">
          <span className="bz-h-tight text-[24px] leading-none text-white">93</span>
          <span className="rounded-full bg-[#C6F24E] px-2 py-0.5 text-[11px] font-semibold text-[#0A0A0A]">
            {tr ? 'Geçti' : 'Passed'}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ─── Anketler: anket düzenleyici ──────────────────────────────────────── */

export function SurveyMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const questions = [
    {
      icon: Star,
      type: tr ? 'Yıldız' : 'Stars',
      text: tr ? 'Yemeklerin lezzetini nasıl değerlendirirsiniz?' : 'How would you rate the taste of the food?',
      extra: <Stars filled={4} size={12} />,
    },
    {
      icon: Sparkles,
      type: tr ? '0–10 tavsiye' : '0–10 recommend',
      text: tr ? 'Bizi bir arkadaşınıza ne kadar önerirsiniz?' : 'How likely are you to recommend us to a friend?',
      extra: null,
    },
    {
      icon: ListChecks,
      type: tr ? 'Çoktan seçmeli' : 'Multiple choice',
      text: tr ? 'Siparişiniz ne kadar sürede geldi?' : 'How quickly did your order arrive?',
      extra: (
        <span className="flex flex-wrap gap-1">
          {(tr ? ['Çok hızlı', 'Makul', 'Biraz uzun', 'Çok uzun'] : ['Very fast', 'Reasonable', 'A bit long', 'Too long']).map(
            (o) => (
              <span key={o} className="rounded-full border border-[#E5E5E5] px-2 py-0.5 text-[11px] text-[#525252]">
                {o}
              </span>
            ),
          )}
        </span>
      ),
    },
    {
      icon: Type,
      type: tr ? 'Uzun metin' : 'Long text',
      text: tr ? 'Ekibimize iletmek istediğiniz bir not var mı?' : 'Any note for our team?',
      extra: null,
    },
  ];

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-tight text-[#0A0A0A]">
            {tr ? 'Bugünkü ziyaretiniz nasıldı?' : 'How was your visit today?'}
          </p>
          <p className="mt-1 text-[12px] text-[#737373]">
            {tr ? 'Şablon: Masa servisi sonrası · adım adım' : 'Template: After table service · step by step'}
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[#EAF9B8] px-2.5 py-1 text-[11px] font-semibold text-[#3F5408]">
          {tr ? 'Yayında' : 'Published'}
        </span>
      </div>

      <ol className="mt-4 space-y-2">
        {questions.map((q, i) => {
          const Icon = q.icon;
          return (
            <li key={q.text} className="rounded-[12px] border border-[#EDEDED] px-3 py-2.5">
              <span className="flex items-center gap-2 text-[11px] font-medium text-[#737373]">
                <span className="font-mono text-[#0A0A0A]">{i + 1}</span>
                <Icon size={12} strokeWidth={2} />
                {q.type}
              </span>
              <span className="mt-1 block text-[13px] leading-[1.45] text-[#1A1A1A]">{q.text}</span>
              {q.extra ? <span className="mt-1.5 block">{q.extra}</span> : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#0A0A0A] px-3 py-1.5 font-medium text-white">
          <QrCode size={13} strokeWidth={2} />
          {tr ? 'QR kod' : 'QR code'}
          <span className="text-white/70">PNG · SVG</span>
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#D4D4D4] px-3 py-1.5 font-medium text-[#0A0A0A]">
          <Copy size={13} strokeWidth={2} />
          {tr ? 'Bağlantıyı kopyala' : 'Copy link'}
        </span>
      </div>
    </div>
  );
}

/* ─── Hub: panel bölümleri ─────────────────────────────────────────────── */

export function HubMock({ locale }: { locale: Locale }) {
  const tr = locale === 'tr';
  const nav = tr
    ? ['Yorumlar', 'Google Yorumları', 'Analitik', 'QR', 'Menü', 'Anketler', 'Denetim Merkezi']
    : ['Reviews', 'Google Reviews', 'Analytics', 'QR', 'Menu', 'Surveys', 'Audit Center'];
  return (
    <div className="flex">
      <ul className="hidden w-[150px] shrink-0 space-y-1 border-r border-[#F2F2F2] p-3 sm:block">
        {nav.map((item, i) => (
          <li
            key={item}
            className={`whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium ${
              i === 0 ? 'bg-[#F2F2F2] text-[#0A0A0A]' : 'text-[#737373]'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
      <div className="min-w-0 flex-1 space-y-2.5 p-4">
        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#EDEDED] p-3">
          <RatingBadge rating={2} />
          <span className="min-w-0 flex-1 text-[12px] leading-[1.45] text-[#1A1A1A]">
            {tr ? 'Siparişimiz geç geldi.' : 'Our order came late.'}
          </span>
          <MessageSquareText size={15} strokeWidth={2} className="shrink-0 text-[#737373]" />
        </div>
        <div className="rounded-[12px] border border-[#C6F24E] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#3F5408]">
            <Sparkles size={12} strokeWidth={2} />
            {tr ? 'Pulse AI önerisi' : 'Pulse AI suggestion'}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.5] text-[#1A1A1A]">
            {tr ? 'Geri bildiriminiz için teşekkür ederiz…' : 'Thank you for your feedback…'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[12px] border border-[#EDEDED] p-3">
            <p className="text-[11px] text-[#737373]">{tr ? 'Ortalama puan' : 'Avg rating'}</p>
            <p className="bz-h-tight mt-1 text-[20px] leading-none text-[#0A0A0A]">{tr ? '4,4' : '4.4'}</p>
          </div>
          <div className="rounded-[12px] border border-[#EDEDED] p-3">
            <p className="text-[11px] text-[#737373]">{tr ? 'Menü' : 'Menu'}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-[#0A0A0A]">
              <QrCode size={13} strokeWidth={2} />
              PNG · SVG
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
