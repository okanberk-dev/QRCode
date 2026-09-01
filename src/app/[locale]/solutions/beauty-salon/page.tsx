import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, ChevronRight, Scissors, Calendar, Sparkles, BarChart3 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
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
      ? 'Güzellik & Spa İtibar Yönetimi'
      : 'Beauty & Spa Reputation Management';
  const description =
    locale === 'tr'
      ? "Hizmet biter bitmez müşteriniz QR'ı tarar. Instagram, Google ve Foursquare'de puanınız organik büyür."
      : "The moment service ends, your customer scans the QR. Ratings grow organically on Instagram, Google and Foursquare.";
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/beauty-salon`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/beauty-salon',
        en: 'https://buaze.com/en/solutions/beauty-salon',
        'x-default': 'https://buaze.com/tr/solutions/beauty-salon',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://buaze.com/${locale}/solutions/beauty-salon`,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:SpaSolutionPage (lines 200-241).
 * Light gray hero + mountain illustration + 4-stat grid + 3-feature grid.
 */
export default async function BeautySalonSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '4.9', label: 'Usta bazlı müşteri skoru' },
        { value: '+148%', label: 'Instagram yorum artışı' },
        { value: '%72', label: 'Tekrar randevu oranı' },
        { value: '%18', label: 'Yorum→randevu dönüşüm' },
      ]
    : [
        { value: '4.9', label: 'Per-stylist customer score' },
        { value: '+148%', label: 'Instagram review growth' },
        { value: '72%', label: 'Repeat booking rate' },
        { value: '18%', label: 'Review → booking conversion' },
      ];

  const features = isTr
    ? [
        { t: 'Usta bazlı QR', d: 'Her ustanın masa/bölümüne özel QR. Kim hangi yorumu aldı, tek bakışta.' },
        { t: 'Instagram entegrasyonu', d: "Güzellik sektörünün önde gelen platformu. DM yorumlarını inbox'a çek." },
        { t: 'Randevu tetikleyici', d: 'Randevu yazılımınızla bağlan — hizmet bitince otomatik yorum daveti.' },
      ]
    : [
        { t: 'Per-stylist QR', d: 'Each stylist has their own station QR. Who received which review — at a glance.' },
        { t: 'Instagram integration', d: 'The leading platform for beauty. Pull DM reviews into your inbox.' },
        { t: 'Booking trigger', d: 'Connect to your booking software — auto-send review invites when service ends.' },
      ];

  const benefits = isTr
    ? [
        { Icon: Scissors, h: 'Hizmet bitiminde anlık geri bildirim', d: 'Boya, manikür, makyaj uygulaması biter bitmez müşteri QR\'ı tarar — deneyim tazeyken puan ve yorum, randevu kapısından çıktıktan sonra "unutuldu" yok.' },
        { Icon: Calendar, h: 'Stilist + hizmet bazlı atama', d: 'Yorum geldiğinde hangi stilist, hangi hizmet (saç, cilt, makyaj), hangi gün etiketlenir. Stilist performansı sektörde en kritik veri — Buaze bunu doğrudan görselleştirir.' },
        { Icon: Sparkles, h: 'Pulse AI yanıt taslağı', d: 'Kişisel ton: "Boya tonum istediğim gibi olmadı" yorumuna teknik nezaket; "İlgi gerçekten farklıydı" yorumuna içten teşekkür. Sahip onaylar, otomatik gönderim yok.' },
        { Icon: BarChart3, h: 'Çoklu platform yönlendirme', d: 'Google + Instagram link + Foursquare aynı akışta. Müşteri seçtiği platforma yorum yazar; tercih müşteride kalır, yıldız bazlı kısıtlama yok.' },
      ]
    : [
        { Icon: Scissors, h: 'Live feedback the moment service ends', d: 'The instant a coloring, manicure, or makeup application is done, the customer scans the QR — rating and review while the experience is fresh, before "I\'ll do it later" sets in.' },
        { Icon: Calendar, h: 'Stylist + service-level tagging', d: 'When a review arrives, the stylist, the service (hair, skincare, makeup), and the day are all tagged. Stylist performance is the single most important metric in this sector — Buaze surfaces it directly.' },
        { Icon: Sparkles, h: 'Pulse AI reply drafts', d: 'Tone-aware: technical politeness for "the color shade was off"; warm thanks for "the care was something else". Owner approves; nothing auto-sent.' },
        { Icon: BarChart3, h: 'Multi-platform routing', d: 'Google + Instagram link + Foursquare in one flow. The customer posts on the platform of their choice; the choice stays with the customer, no star-rating gate.' },
      ];

  const faqs: FaqItem[] = isTr
    ? [
        { q: 'Güzellik salonu için Buaze nasıl çalışır?', a: 'Hizmet bittikten sonra (boya, manikür, makyaj, cilt bakımı) müşteriye QR kart sunulur — masada, aynada veya bekleme alanında. Müşteri tarar, deneyimini puanlar ve seçtiğin platformlara (Google, Instagram, Foursquare) yönlendirilir. İlk gün ilk yorumlar genelde aynı seansta gelir.' },
        { q: 'Stilist bazlı performansı görebiliyor muyum?', a: 'Evet. QR oluştururken stilist etiketi (Buaze branch field veya custom URL parametresi) ekleyebilirsin; yorum geldiğinde hangi stilist + hangi hizmet ile geldiği loglanır. Analytics raporunda stilist bazlı ortalama puan, yorum sayısı ve düşük puan oranları görünür.' },
        { q: 'Düşük puan veren müşteri kaybolur mu?', a: 'Hayır. Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren müşteriler ek olarak ekibinizle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Müşteri her zaman herkese açık platforma yorum yazma hakkını korur; siz sorunu özelden (renk düzeltme, hizmet tekrarı vb.) çözme şansı kazanırsınız.' },
        { q: 'Instagram entegrasyonu var mı?', a: 'Müşteriye akış sırasında Instagram profil bağlantısı sunulur (DM\'le yorum yazma daveti). Instagram\'dan gelen DM yorumlarını otomatik çekecek bir API entegrasyonu yok — Instagram bu API\'yi 3rd-party\'lere açık tutmuyor; ama yönlendirme akışı çalışıyor ve müşteri Instagram tag\'i sayesinde organik kazanım sağlar.' },
        { q: 'Birden fazla şubem var, nasıl yönetirim?', a: 'Her şube için ayrı işletme oluşturabilir veya tek işletme + şube etiketleri kullanabilirsin. Analytics şube bazlı ayrılır; merkez ekibinin "şube X gerileme yaşıyor, kuruluşa müdahale gerek" gibi kararları doğrudan veriden almasını sağlar.' },
      ]
    : [
        { q: 'How does Buaze work for a beauty salon?', a: 'After the service is done (coloring, manicure, makeup, skincare), present a QR card to the customer — at the chair, on the mirror, or in the waiting area. The customer scans, rates the experience, and is routed to the platforms you have selected (Google, Instagram, Foursquare). Same-session reviews are common on day one.' },
        { q: 'Can I see per-stylist performance?', a: 'Yes. When generating the QR, you can add a stylist tag (Buaze branch field or a custom URL parameter); when the review arrives, which stylist + which service is logged with it. The analytics report shows per-stylist average rating, review volume, and low-rating ratio.' },
        { q: 'Do customers giving low ratings simply disappear?', a: 'No. Buaze never blocks or hides any review. Customers giving low ratings additionally see an option to share privately with your team — in practice ~85% choose this private channel. The customer always retains the right to post on a public platform; you gain a chance to resolve the issue privately first (color correction, service redo, etc.).' },
        { q: 'Is there an Instagram integration?', a: 'The flow surfaces an Instagram profile link to the customer (a DM-review invitation). There is no API integration that auto-pulls DM reviews — Instagram does not expose that API to third parties — but the routing flow works and the Instagram tag drives organic acquisition.' },
        { q: 'I have multiple branches — how do I manage them?', a: 'Either create a separate business per branch or use a single business + branch tags. Analytics splits per branch, allowing the central team to make decisions like "branch X is regressing, intervention needed at onboarding" directly from data.' },
      ];

  const relatedSolutions = getRelatedSolutions('beauty-salon', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'beauty-salon',
    industryLabel: isTr ? 'Güzellik & Spa' : 'Beauty & Spa',
    serviceName: isTr ? 'Güzellik & Spa İtibar Yönetimi' : 'Beauty & Spa Reputation Management',
    description: isTr
      ? "Hizmet biter bitmez müşteriniz QR'ı tarar. Instagram, Google ve Foursquare'de puanınız organik büyür."
      : 'The moment service ends, your customer scans the QR. Ratings grow organically on Instagram, Google and Foursquare.',
    faqs,
  });

  const howTo = buildHowToSchema({
    locale,
    name: isTr ? 'Güzellik salonu ve spa için Buaze yorum akışını kurma' : 'Set up the Buaze review flow for a beauty salon or spa',
    description: isTr
      ? 'Hizmet bitiminde QR ile yorum toplayıp Instagram, Google ve Foursquare\'de organik puan büyütmek için adımlar.'
      : 'Steps to collect reviews via QR at service end and grow ratings organically on Instagram, Google and Foursquare.',
    url: `https://buaze.com/${locale}/solutions/beauty-salon`,
    steps: isTr
      ? [
          { name: 'Salonu tanımla', text: 'Salon adı, kategori, Instagram/Google bağlantıları ve bildirim e-postasını panelde gir; uzman/seans bazlı raporlama için etiket alanlarını planla.' },
          { name: 'Hizmet sonu QR’ını yerleştir', text: 'Resepsiyon tezgahında veya hizmet sonrası ayna önüne QR sticker yerleştir; uzman etiketi için URL parametresi kullan.' },
          { name: 'Uzman ve resepsiyonu davet et', text: 'Uzmanları (kuaför, terapist, estetisyen) ve resepsiyonu Buaze ekibine ekle; her uzman kendi yorumlarını görsün, salon sahibi toplu performansı izlesin.' },
          { name: 'Pulse AI ile sıcak tonda yanıt yaz', text: 'Pulse AI yanıtları "warm" tonda taslak üretir — salon sahibi onaylar, gönderir; uzman bazlı analitiklerden hangi seansın çevresinde memnuniyet düştüğünü oku.' },
        ]
      : [
          { name: 'Identify the salon', text: 'Enter salon name, category, Instagram/Google links and notification email; plan tag fields for specialist/session-level reporting.' },
          { name: 'Place the post-service QR', text: 'Place the QR sticker at reception or on the mirror; use a URL parameter for the specialist tag.' },
          { name: 'Invite specialists and reception', text: 'Add specialists (stylists, therapists, aestheticians) and reception to your Buaze team; each specialist sees their own reviews while the owner tracks aggregate performance.' },
          { name: 'Reply warmly via Pulse AI', text: 'Pulse AI drafts replies in a warm tone — owner approves and sends; read per-specialist analytics to spot where satisfaction dipped.' },
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
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · GÜZELLİK & SPA' : 'SECTOR · BEAUTY & SPA'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Randevu sonrası
                  <br />
                  en güçlü
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">an.</span>
                </>
              ) : (
                <>
                  The strongest
                  <br />
                  moment is right
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">after.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? "Hizmet biter bitmez müşteriniz QR'ı tarar. Instagram, Google ve Foursquare'de puanınız organik büyür. Usta bazlı performans raporları."
                : 'The moment service ends, your customer scans the QR. Ratings grow organically on Instagram, Google and Foursquare. Per-stylist performance reports.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* IllusMountain — exact SVG from .design/site/site-shared.jsx:143-165 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 240 220" className="h-auto w-full max-w-[280px]" aria-hidden>
              {/* Back mountain */}
              <path d="M0 200 L70 80 L130 150 L180 100 L240 200 Z" fill="#E4E4E4" />
              {/* Snow caps */}
              <path
                d="M60 95 L70 80 L82 98 L75 100 L70 95 L65 100 Z"
                fill="#FFFFFF"
                stroke="#0A0A0A"
                strokeWidth="1.2"
              />
              <path
                d="M170 110 L180 100 L192 115 L185 117 L180 113 L175 117 Z"
                fill="#FFFFFF"
                stroke="#0A0A0A"
                strokeWidth="1.2"
              />
              {/* Front mountain */}
              <path d="M20 200 L90 110 L130 165 L200 200 Z" fill="#0A0A0A" />
              {/* Flag */}
              <path
                d="M90 110 L90 55"
                stroke="#0A0A0A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M90 55 L130 62 L122 70 L130 78 L90 72 Z"
                fill="#C6F24E"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Trail with pulse dots */}
              <path
                d="M20 200 Q50 180 70 170 Q85 160 90 110"
                fill="none"
                stroke="#C6F24E"
                strokeWidth="2.5"
                strokeDasharray="3 4"
              />
              <circle cx="50" cy="185" r="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
              <circle cx="72" cy="165" r="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
              <circle cx="88" cy="130" r="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
              {/* Sun */}
              <circle cx="195" cy="60" r="18" fill="#C6F24E" />
              {/* Cloud */}
              <path
                d="M30 60 Q25 50 35 48 Q38 38 50 42 Q58 38 62 48 Q72 50 68 58 Q65 65 50 64 Q40 65 30 60 Z"
                fill="#FFFFFF"
                stroke="#0A0A0A"
                strokeWidth="1.5"
              />
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
                  className="text-[32px] sm:text-[36px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A]"
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

      {/* 3-feature grid */}
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
            {isTr ? 'Güzellik salonu operasyonuna özel dört kazanç' : 'Four wins built for beauty salon operations'}
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
            {isTr ? 'Güzellik salonu için merak edilenler' : 'Common questions for beauty salons'}
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
            {isTr ? 'Her randevu, bir yıldız.' : 'Every appointment, a star.'}
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
