import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, ChevronRight, Hotel, Globe, Sparkles, BarChart3 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import PlatformLogo from '@/components/marketing/PlatformLogo';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildSolutionSchema } from '@/lib/solution-schema';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getRelatedSolutions } from '@/lib/related-solutions';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Otel & Konaklama İtibar Yönetimi — Buaze'
      : 'Hotel & Hospitality Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? "Booking.com, Tripadvisor, Airbnb ve Google — dört platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör."
      : 'Booking.com, Tripadvisor, Airbnb and Google — manage all four from one panel. Collect reviews at check-out with room QRs.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/hotels`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/hotels',
        en: 'https://buaze.com/en/solutions/hotels',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/hotels` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:HotelSolutionPage (lines 22-75).
 * Light gray hero (#FAFAFA) + lighthouse illustration + PlatformLogo row
 * + 4-stat grid + 6-feature grid.
 */
export default async function HotelsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '8.2→9.1', label: 'Booking puanı artışı (ort.)' },
        { value: '+92%', label: 'Tripadvisor yorum artışı' },
        { value: '%57', label: 'Oda QR dönüşüm oranı' },
        { value: '22sn', label: 'Check-out→yorum süresi' },
      ]
    : [
        { value: '8.2→9.1', label: 'Avg. Booking rating lift' },
        { value: '+92%', label: 'Tripadvisor review growth' },
        { value: '57%', label: 'Room QR conversion' },
        { value: '22s', label: 'Check-out → review time' },
      ];

  const features = isTr
    ? [
        { t: 'Oda QR sistemi', d: 'Her oda numarası kendi QR koduna sahip. Misafir tararken oda bilgisi otomatik eşleşir.' },
        { t: 'Check-out tetikleyici', d: 'PMS entegrasyonu ile check-out anında SMS/WhatsApp ile yorum daveti.' },
        { t: 'Dil tespiti', d: 'Misafirin tarayıcı diline göre form otomatik dil değiştirir. 12 dil desteği.' },
        { t: 'Personel skoru', d: 'Resepsiyonist, temizlik, restoran — her departman ayrı raporlanır.' },
        { t: 'OTA entegrasyonu', d: 'Booking.com, Airbnb, Expedia, Agoda — yorumları panele çeker, yanıt şablonları çalışır.' },
        { t: 'Misafir profili', d: 'Tekrar gelen misafiri tanı, geçmiş yorumlarıyla bağlantı kur.' },
      ]
    : [
        { t: 'Room-level QR', d: 'Each room has its own QR; guest scans auto-match the room.' },
        { t: 'Check-out trigger', d: 'PMS integration sends an SMS/WhatsApp review invite at check-out.' },
        { t: 'Language detection', d: 'Form auto-switches by browser language — 12 languages supported.' },
        { t: 'Staff scoring', d: 'Front desk, housekeeping, F&B — each department reported separately.' },
        { t: 'OTA integration', d: 'Booking.com, Airbnb, Expedia, Agoda — reviews pulled in; reply templates ready.' },
        { t: 'Guest profile', d: 'Recognise returning guests and tie them back to prior reviews.' },
      ];

  const benefits = isTr
    ? [
        { Icon: Hotel, h: 'Oda + check-out QR\'ları', d: 'Her oda için ayrı QR (oda numarası URL\'de) + check-out tezgahında genel QR. Misafir hâlâ tesisteyken yorum bırakır — 3 hafta sonra Booking review değil, anlık deneyim.' },
        { Icon: Globe, h: 'Booking + Tripadvisor + Airbnb + Google', d: 'Dört platformu tek akışta sun. Misafir tercih ettiği platforma yönlendirilir; her misafir istediği yere yorum yazma hakkını korur, yıldız bazlı kısıtlama yok.' },
        { Icon: Sparkles, h: 'Pulse AI çoklu-dil yanıt taslağı', d: 'Misafirin yorumunun dilini algılar (TR / EN / DE / RU), kültürel ton uygun yanıt taslağı üretir. İşletme onaylar, otomatik gönderim yok.' },
        { Icon: BarChart3, h: 'Kat / oda tipi analitiği', d: 'Hangi katta, hangi oda tipinde (deluxe / standart / suite) memnuniyet düşük? Klima şikayeti hangi yöne bakan odalarda yoğun? Operasyonel kararı veriyle al.' },
      ]
    : [
        { Icon: Hotel, h: 'Room + check-out QRs', d: 'A separate QR per room (room number in URL) + a general QR at the check-out desk. Guests leave reviews while still on premise — instant experience, not a Booking review three weeks later.' },
        { Icon: Globe, h: 'Booking + Tripadvisor + Airbnb + Google', d: 'Surface all four platforms in one flow. The guest is routed to their preferred platform; every guest keeps the right to post anywhere, no star-rating gate.' },
        { Icon: Sparkles, h: 'Pulse AI multi-language reply drafts', d: 'Detects the language of the guest review (TR / EN / DE / RU), produces a culturally appropriate reply draft. Owner approves; nothing auto-sent.' },
        { Icon: BarChart3, h: 'Floor / room-type analytics', d: 'Which floor, which room type (deluxe / standard / suite) has the lowest satisfaction? Which orientation gets the most AC complaints? Make operational calls from data.' },
      ];

  const faqs: FaqItem[] = isTr
    ? [
        { q: 'Otel için Buaze nasıl çalışır?', a: 'Her oda için bir QR sticker (oda numarası URL\'ye gömülü) + check-out tezgahında bir genel QR yerleştirirsin. Misafir QR\'ı tarar, deneyimini puanlar ve seçtiğin platformlara (Booking, Tripadvisor, Airbnb, Google) yönlendirilir. Misafir tesiste deneyim taze, yorum oranı 3 hafta sonra gönderilen Booking mailine kıyasla 5-10× yüksek.' },
        { q: 'Booking.com / Tripadvisor / Airbnb yorumlarını da topluyor mu?', a: 'Evet. Owner panelden bu platformların herkese açık yorum bağlantılarını eklersin; akış misafire seçtiğin platformları sunar. Misafir tercih ettiği platforma yorum yazar. Booking gibi closed-loop platformlarda link doğrudan booking ID\'siyle eşleşmez (Booking bunu API\'de açmıyor) — ama misafire bağlantı sunulur.' },
        { q: 'Oda numarası bazlı analitik var mı?', a: 'Evet. QR\'a oda numarası URL parametresi ekleyebilirsin (örn. `?room=412`); yorum geldiğinde oda numarası + kat + oda tipi loglanır. Analytics raporunda hangi katlarda memnuniyet düşük, hangi odalarda klima/gürültü/manzara şikayeti yoğun — operasyonel ekip görür.' },
        { q: 'Düşük puan veren misafir Booking\'e yorum yazmaz mı?', a: 'Hayır. Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren misafirler ek olarak otelinizle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Misafir her zaman herkese açık platformlara (Booking, Tripadvisor, Google) yorum yazma hakkını korur; siz sorunu özelden (oda değişimi, fatura iadesi vb.) çözme şansı kazanırsınız.' },
        { q: 'Çoklu-dil destek var mı?', a: 'Evet. Misafir yorumunu hangi dilde yazarsa, Pulse AI o dilde yanıt taslağı üretir (TR, EN, DE, RU şu an desteklenen). Genelde otel müşteri profili çok-dilli, bu kritik — manuel çeviri yapmak yanıt süresini saatlerce uzatıyor.' },
      ]
    : [
        { q: 'How does Buaze work for a hotel?', a: 'You place a QR sticker per room (with the room number embedded in the URL) + a general QR at the check-out desk. The guest scans, rates the experience, and is routed to the platforms you have selected (Booking, Tripadvisor, Airbnb, Google). The experience is fresh — review rates are 5-10× higher than the Booking email sent three weeks later.' },
        { q: 'Does it also collect Booking.com / Tripadvisor / Airbnb reviews?', a: 'Yes. You add the public review links of these platforms in the owner panel; the flow surfaces the platforms you select to the guest. The guest posts on their preferred platform. For closed-loop platforms like Booking, the link does not match a specific booking ID (Booking does not expose that API) — but the public link is presented to the guest.' },
        { q: 'Is there room-number-level analytics?', a: 'Yes. You can add a room number URL parameter to the QR (e.g. `?room=412`); when a review arrives, the room number + floor + room type are logged. The analytics report shows where satisfaction drops by floor, where AC / noise / view complaints concentrate — visible to the operational team.' },
        { q: 'Will guests giving low ratings simply not post on Booking?', a: 'No. Buaze never blocks or hides any review. Guests giving low ratings additionally see an option to share privately with your hotel — in practice ~85% choose this private channel. The guest always retains the right to post on any public platform (Booking, Tripadvisor, Google); you simply gain a chance to resolve the issue privately first (room change, refund, etc.).' },
        { q: 'Is there multi-language support?', a: 'Yes. Pulse AI detects the language the guest writes in (TR, EN, DE, RU currently supported) and produces a reply draft in that language. Hotels typically have a multi-language guest profile — this is critical, manual translation adds hours to reply latency.' },
      ];

  const relatedSolutions = getRelatedSolutions('hotels', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'hotels',
    industryLabel: isTr ? 'Otel & Konaklama' : 'Hotel & Hospitality',
    serviceName: isTr ? 'Otel & Konaklama İtibar Yönetimi' : 'Hotel & Hospitality Reputation Management',
    description: isTr
      ? "Booking.com, Tripadvisor, Airbnb ve Google — dört platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör."
      : 'Booking.com, Tripadvisor, Airbnb and Google — manage all four from one panel. Collect reviews at check-out with room QRs.',
    faqs,
  });

  const howTo = buildHowToSchema({
    locale,
    name: isTr ? 'Otelde Buaze yorum akışını kurma' : 'Set up the Buaze review flow for a hotel',
    description: isTr
      ? 'Oda ve check-out QR’larıyla Booking, Tripadvisor, Airbnb ve Google yorumlarını tek panelden yönetmek için adımlar.'
      : 'Steps to manage Booking, Tripadvisor, Airbnb and Google reviews from one panel via room and check-out QRs.',
    url: `https://buaze.com/${locale}/solutions/hotels`,
    steps: isTr
      ? [
          { name: 'Tesisi tanımla', text: 'Buaze panelinde otel adı, kategori, adres ve resepsiyon e-postasını gir; Booking, Tripadvisor, Airbnb ve Google yorum bağlantılarını ekle.' },
          { name: 'QR’ları doğru noktalara yerleştir', text: 'Her oda için oda numaralı QR sticker + check-out tezgahında genel QR + kahvaltı/SPA gibi temas noktalarında ek QR’lar yerleştir.' },
          { name: 'Resepsiyon ve operasyonu davet et', text: 'Resepsiyon, kat hizmetleri ve F&B sorumlularını Buaze ekibine ekle; oda/kat bazlı düşük puanları doğru ekip görsün.' },
          { name: 'Pulse AI ile çoklu dil yanıt yaz', text: 'Misafir TR/EN/DE/RU hangisinde yazarsa Pulse AI o dilde yanıt taslağı üretir — resepsiyon onaylar, gönderir; oda numarası bazlı analitiklerden örüntüleri oku.' },
        ]
      : [
          { name: 'Identify the property', text: 'In the Buaze panel, enter hotel name, category, address and front-desk email; add your Booking, Tripadvisor, Airbnb and Google review links.' },
          { name: 'Place QRs at the right touchpoints', text: 'Place a room-numbered QR sticker in every room + a general QR at the check-out desk + extra QRs at breakfast/spa touchpoints if relevant.' },
          { name: 'Invite front desk and operations', text: 'Add front-desk, housekeeping and F&B leads to your Buaze team so the right owner sees room/floor-level low ratings.' },
          { name: 'Reply in any language via Pulse AI', text: 'Whichever language the guest writes in (TR/EN/DE/RU), Pulse AI drafts the reply in that language — front desk approves and sends; read room-level analytics to spot patterns.' },
        ],
  });
  if (howTo) jsonLd.push(howTo);

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — light gray bg */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · OTEL & KONAKLAMA' : 'SECTOR · HOTEL & HOSPITALITY'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Misafirin sesi,
                  <br />
                  her platformda
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">yankılanır.</span>
                </>
              ) : (
                <>
                  Your guests&apos; voice,
                  <br />
                  echoed on
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">every platform.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? "Booking.com, Tripadvisor, Airbnb ve Google — dört platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör."
                : 'Booking.com, Tripadvisor, Airbnb and Google — run all four from one panel. Room QRs capture feedback at check-out; you see the negative ones first.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'BAĞLANTI' : 'CONNECT'}
              </span>
              {(['booking', 'tripadvisor', 'google'] as const).map((id) => (
                <PlatformLogo key={id} id={id} size={36} rounded={8} />
              ))}
            </div>
          </div>

          {/* IllusLighthouse — exact SVG from .design/site/site-shared.jsx:114-140 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 240 260" className="h-auto w-full max-w-[280px]" aria-hidden>
              {/* Waves */}
              <path d="M0 220 Q30 215 60 220 T120 220 T180 220 T240 220 L240 260 L0 260 Z" fill="#EAF9B8" />
              <path d="M0 234 Q30 229 60 234 T120 234 T180 234 T240 234 L240 260 L0 260 Z" fill="#C6F24E" opacity="0.6" />
              {/* Rock base */}
              <path d="M70 220 L170 220 L160 205 L80 205 Z" fill="#0A0A0A" />
              {/* Tower */}
              <path d="M100 205 L100 90 L140 90 L140 205 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
              <path
                d="M100 120 L140 120 M100 150 L140 150 M100 180 L140 180"
                stroke="#0A0A0A"
                strokeWidth="1.2"
              />
              {/* Light chamber */}
              <rect x="94" y="70" width="52" height="24" fill="#0A0A0A" />
              <rect x="98" y="74" width="44" height="16" fill="#C6F24E" />
              {/* Roof */}
              <path d="M92 70 L148 70 L142 55 L98 55 Z" fill="#0A0A0A" />
              {/* Spike */}
              <path d="M120 55 L120 38" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="120" cy="32" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              {/* Light beams */}
              <path d="M148 82 L215 50 L215 98 Z" fill="#C6F24E" opacity="0.35" />
              <path d="M92 82 L25 50 L25 98 Z" fill="#C6F24E" opacity="0.2" />
              {/* Stars */}
              <circle cx="200" cy="30" r="2" fill="#0A0A0A" />
              <circle cx="180" cy="18" r="1.5" fill="#0A0A0A" />
              <circle cx="40" cy="25" r="1.5" fill="#0A0A0A" />
            </svg>
          </div>
        </div>
      </section>

      {/* 4-stat grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bz-card p-5 sm:p-6">
                <div
                  className="text-[28px] sm:text-[34px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {s.value}
                </div>
                <div className="pulse-eyebrow mt-2 text-[#737373]">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Stage 95 §38.175 — cohort disclosure per CLAUDE.md §35.8. */}
          <p className="mt-8 text-center text-[11px] text-[#737373] max-w-[720px] mx-auto leading-[1.55]">
            {isTr
              ? '* Metrikler Buaze müşteri kohortunda ilk 90 gün ortalamasıdır; sonuçlar sektöre, lokasyona ve operasyon disiplinine göre değişir.'
              : '* Metrics reflect the Buaze customer cohort first 90-day average; results vary by sector, location and operational discipline.'}
          </p>
        </div>
      </section>

      {/* 6-feature grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="rounded-[14px] border border-[#EDEDED] bg-white p-6">
              <h3
                className="text-[20px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
              >
                {f.t}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits — 4-tile grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] max-w-[680px]">
            {isTr ? 'Otel operasyonuna özel dört kazanç' : 'Four wins built for hotel operations'}
          </h2>
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bz-card p-6 sm:p-7">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]"><b.Icon size={16} /></div>
                <h3 className="bz-h-tight mt-4 text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">{b.h}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[820px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'SIKÇA SORULAN SORULAR' : 'FREQUENTLY ASKED QUESTIONS'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">
            {isTr ? 'Otel kurulumu için merak edilenler' : 'Common questions for hotels'}
          </h2>
          <div className="mt-8"><FaqAccordion faqs={faqs} defaultOpen={[0]} /></div>
        </div>
      </section>

      {/* Resources / Related Solutions */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'İLGİLİ KAYNAKLAR' : 'RELATED RESOURCES'}</span>
          <h2 className="mt-3 text-[24px] sm:text-[32px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">{isTr ? 'Daha fazlasını keşfet' : 'Explore more'}</h2>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: `${base}/pricing`, tr: 'Fiyatlandırma', en: 'Pricing' },
              { href: `${base}/roi`, tr: 'ROI Hesaplayıcı', en: 'ROI Calculator' },
              { href: `${base}/solutions/qr-generator`, tr: 'Ücretsiz QR Oluştur', en: 'Free QR Generator' },
              { href: `${base}/google-compliance`, tr: 'Google Uyumluluğu', en: 'Google Compliance' },
              { href: isTr ? `${base}/help/platform-baglantilarini-saglikli-tutma` : `${base}/help/how-to-keep-platform-links-healthy`, tr: 'Platform Bağlantılarını Sağlıklı Tut', en: 'Keep Platform Links Healthy' },
            ].map((r) => (
              <Link key={r.href} href={r.href} className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors">
                <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">{isTr ? r.tr : r.en}</span>
                <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
              </Link>
            ))}
          </div>
          {relatedSolutions.length > 0 && (
            <>
              <h3 className="bz-h-tight mt-12 text-[18px] sm:text-[20px] text-[#0A0A0A]">{isTr ? 'Diğer sektörler' : 'Other sectors'}</h3>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedSolutions.map((sol) => (
                  <Link key={sol.slug} href={`${base}/solutions/${sol.slug}`} className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors">
                    <span className="shrink-0 w-9 h-9 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]"><sol.Icon size={16} /></span>
                    <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">{isTr ? sol.tr : sol.en}</span>
                    <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
          >
            {isTr ? 'Her oda, bir yıldız.' : 'Every room, a star.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · 5 dakikada kurulum'
              : '14-day free · No credit card · 5-minute setup'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
