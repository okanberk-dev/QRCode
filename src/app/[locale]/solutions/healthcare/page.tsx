import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, ChevronRight, ShieldCheck, Stethoscope, Sparkles, BarChart3 } from 'lucide-react';
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
      ? 'Klinik & Sağlık İtibar Yönetimi — Buaze'
      : 'Clinic & Healthcare Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin.'
      : 'KVKK-compliant patient feedback. Collect experience after treatment via QR and strengthen your Google profile.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/healthcare`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/healthcare',
        en: 'https://buaze.com/en/solutions/healthcare',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/healthcare` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:ClinicSolutionPage (lines 80-128).
 * Light gray hero + shield illustration + KVKK callout + 3-stat grid +
 * 4-feature 2-col grid.
 */
export default async function ClinicSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '+62%', label: 'Randevu artışı (90 gün)' },
        { value: '4.8/5', label: 'Google ort. puan' },
        { value: '%94', label: 'Hasta memnuniyet skoru' },
      ]
    : [
        { value: '+62%', label: 'Appointment growth (90 days)' },
        { value: '4.8/5', label: 'Avg. Google rating' },
        { value: '94%', label: 'Patient satisfaction' },
      ];

  const features = isTr
    ? [
        { t: 'Tedavi sonrası anket', d: 'Randevu sisteminden otomatik tetiklenebilir. Hastaya SMS/QR ile gönderilir.' },
        { t: 'Doktor bazlı raporlama', d: 'Her hekimin bireysel memnuniyet skoru ve yorum dağılımı ayrı görünür.' },
        { t: "Google bağlantısı + opsiyonel iç kanal", d: "Her hastaya Google yorum bağlantısı sunulur; isteyen aynı akışta kliniğe özel geri bildirim de bırakır — KVKK ve Google politikalarıyla uyumlu." },
        { t: 'Çok dilli destek', d: 'Medikal turizm için otomatik dil tespiti, Arapça dahil 12 dil.' },
      ]
    : [
        { t: 'Post-treatment survey', d: 'Auto-triggered from your scheduling system; delivered to the patient via SMS/QR.' },
        { t: 'Per-doctor reporting', d: 'Each clinician sees their own satisfaction score and review distribution.' },
        { t: 'Google link + optional private channel', d: 'Every patient sees the public Google review link; private feedback to the clinic is an optional extra step in the same flow — KVKK and Google policy compliant.' },
        { t: 'Multilingual support', d: 'Auto language detection for medical tourism — 12 languages including Arabic.' },
      ];

  const benefits = isTr
    ? [
        { Icon: ShieldCheck, h: 'KVKK uyumlu hasta deneyimi', d: 'Hasta verisi EU veri merkezinde, IP 90 gün retention, açık rıza opt-in. Aydınlatma metni form altında görünür; hasta onayı zorunlu.' },
        { Icon: Stethoscope, h: 'Hekim + branş bazlı atama', d: 'Yorum geldiğinde hangi hekim, hangi branş, hangi muayene tipi etiketlenir. Branş bazlı ortalama puan + memnuniyet skoru — klinik yönetimi için doğrudan operasyonel veri.' },
        { Icon: Sparkles, h: 'Pulse AI yanıt taslağı', d: 'Sağlık-spesifik ton: profesyonel, empatik, tıbbi ayrıntıya girmeyen yanıtlar. Sahip onaylar, otomatik gönderim yok — KVKK ve hasta gizliliği ihlalini önler.' },
        { Icon: BarChart3, h: 'Çoklu lokasyon + şube analitiği', d: 'Aynı klinik zincirinin birden fazla şubesi varsa şube bazlı puan, randevu hacmi ve bekleme süresi memnuniyet korelasyonu görselleştirilir.' },
      ]
    : [
        { Icon: ShieldCheck, h: 'KVKK / GDPR-compliant patient experience', d: 'Patient data stored in an EU data center, IP retained for 90 days, opt-in consent. Privacy notice visible under the form; patient consent is required.' },
        { Icon: Stethoscope, h: 'Physician + specialty tagging', d: 'When a review arrives, the physician, specialty, and visit type are tagged. Specialty-level average rating + satisfaction score — direct operational data for clinic management.' },
        { Icon: Sparkles, h: 'Pulse AI reply drafts', d: 'Healthcare-specific tone: professional, empathetic, without medical detail. Owner approves; nothing auto-sent — prevents privacy violations.' },
        { Icon: BarChart3, h: 'Multi-location + branch analytics', d: 'For clinic chains with multiple branches, per-branch rating, appointment volume, and wait-time-vs-satisfaction correlation are visualized.' },
      ];

  const faqs: FaqItem[] = isTr
    ? [
        { q: 'Klinik için Buaze KVKK ile uyumlu mu?', a: 'Evet. Hasta verileri EU veri merkezinde (Frankfurt) saklanır; KVKK aydınlatma metni feedback form altında görünür ve onay açık (opt-in) şekilde alınır. IP adresleri 90 gün sonra otomatik anonimleştirilir. Pazarlama izni hizmet onayından ayrı toplanır. Hasta talep ederse veriler silinir veya export edilir.' },
        { q: 'Hekim performansını takip eder miyim?', a: 'Evet. QR oluştururken hekim etiketi (Buaze branch field veya custom URL parametresi) ekleyebilirsin; yorum geldiğinde hangi hekim + hangi branş + muayene saati loglanır. Analytics raporunda hekim bazlı ortalama puan, yorum sayısı ve memnuniyet trendleri görünür.' },
        { q: 'Düşük puan veren hasta kaybolur mu?', a: 'Hayır. Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren hastalar ek olarak kliniğinizle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Hasta her zaman herkese açık platforma yorum yazma hakkını korur; siz sorunu özelden (randevu yeniden planlama, ek konsültasyon, vb.) çözme şansı kazanırsınız.' },
        { q: 'Hassas tıbbi veri toplar mı?', a: 'Hayır. Form sadece deneyim puanı + opsiyonel yorum + opsiyonel iletişim bilgisi (e-posta veya telefon, KVKK onaylı) toplar. Tedavi detayları, tanı, ilaç bilgisi gibi tıbbi veriler form alanlarında yer almaz. Pulse AI yanıtları da tıbbi ayrıntıya girmez — sadece hizmet kalitesi tonunda yanıt verir.' },
        { q: 'Birden fazla şubem / muayenehanem var, nasıl yönetilir?', a: 'Her şube için ayrı işletme oluştur veya tek işletme + şube etiketleri kullan. Analytics şube bazlı ayrılır: hangi şubenin ortalama puanı yüksek, hangi şubede bekleme süresi memnuniyeti olumsuz etkiliyor — merkezi yönetim doğrudan veriden görür.' },
      ]
    : [
        { q: 'Is Buaze KVKK / GDPR-compliant for clinics?', a: 'Yes. Patient data is stored in an EU data center (Frankfurt); the KVKK / GDPR notice is visible under the feedback form and consent is opt-in. IP addresses are automatically anonymized after 90 days. Marketing consent is collected separately from service consent. On patient request, data is deleted or exported.' },
        { q: 'Can I track physician performance?', a: 'Yes. When generating the QR you can add a physician tag (Buaze branch field or a custom URL parameter); when the review arrives, which physician + which specialty + visit time is logged with it. The analytics report shows per-physician average rating, review volume, and satisfaction trends.' },
        { q: 'Will low-rating patients simply disappear?', a: 'No. Buaze never blocks or hides any review. Patients giving low ratings additionally see an option to share privately with your clinic — in practice ~85% choose this private channel. The patient always retains the right to post on any public platform; you gain a chance to resolve the issue privately first (rescheduling, extra consultation, etc.).' },
        { q: 'Does Buaze collect sensitive medical data?', a: 'No. The form only collects an experience rating + optional comment + optional contact (email or phone, KVKK-consented). Treatment details, diagnoses, medication information — no medical fields exist. Pulse AI replies also avoid medical detail — they respond in a service-quality tone only.' },
        { q: 'I have multiple branches / offices — how do I manage them?', a: 'Either create a separate business per branch or use a single business + branch tags. Analytics splits per branch: which branch has the highest average rating, where wait time hurts satisfaction — central management sees it directly from data.' },
      ];

  const relatedSolutions = getRelatedSolutions('healthcare', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'healthcare',
    industryLabel: isTr ? 'Klinik & Sağlık' : 'Clinic & Healthcare',
    serviceName: isTr ? 'Klinik & Sağlık İtibar Yönetimi' : 'Clinic & Healthcare Reputation Management',
    description: isTr
      ? 'KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin.'
      : 'KVKK-compliant patient feedback. Collect experience after treatment via QR and strengthen your Google profile.',
    faqs,
  });

  const howTo = buildHowToSchema({
    locale,
    name: isTr ? 'Klinik ve sağlıkta Buaze yorum akışını kurma' : 'Set up the Buaze review flow for a clinic',
    description: isTr
      ? 'KVKK uyumlu hasta geri bildirimi için QR akışını kurmak ve yorumları yanıtlamak için adımlar.'
      : 'Steps to set up a KVKK-compliant patient feedback QR flow and reply to reviews.',
    url: `https://buaze.com/${locale}/solutions/healthcare`,
    steps: isTr
      ? [
          { name: 'Kliniği KVKK uyumlu tanımla', text: 'İşletme adı, kategori ve KVKK aydınlatma metnini panelde onayla; bildirim e-postası ve Google yorum bağlantısını ekle.' },
          { name: 'QR’ı resepsiyon veya muayene sonrası yerleştir', text: 'Resepsiyon tezgahı, muayene odası çıkışı veya tedavi sonrası bilgilendirme broşürüne QR koy; hekim etiketi için URL parametresi kullan.' },
          { name: 'Hekim ve resepsiyonu ekibe ekle', text: 'Hekim, resepsiyon ve klinik müdürünü Buaze ekibine davet et; rol bazlı görünürlük tıbbi olmayan veriyi merkezde tutar.' },
          { name: 'Pulse AI ile hassas yanıt yaz', text: 'Pulse AI yanıtları tıbbi ayrıntıya girmez, sadece hizmet kalitesi tonunda yanıt verir — operatör onaylar ve gönderir; hekim/şube bazlı analitiklerden örüntüleri oku.' },
        ]
      : [
          { name: 'Set up the clinic KVKK-compliant', text: 'Confirm clinic name, category and the KVKK notice in the panel; add the notification email and Google review link.' },
          { name: 'Place the QR at reception or post-visit', text: 'Place the QR at the reception desk, exit of the exam room, or in a post-treatment information leaflet; use a URL parameter for the physician tag.' },
          { name: 'Invite physicians and reception', text: 'Invite physicians, reception and the clinic manager to your Buaze team; role-based visibility keeps non-medical data centralized.' },
          { name: 'Reply gently via Pulse AI', text: 'Pulse AI replies stay in a service-quality tone with no medical detail — operator approves and sends; read physician/branch analytics to spot patterns.' },
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
              {isTr ? 'SEKTÖR · KLİNİK & SAĞLIK' : 'SECTOR · CLINIC & HEALTHCARE'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Hasta güveni,
                  <br />
                  dijitale
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">taşınır.</span>
                </>
              ) : (
                <>
                  Patient trust,
                  <br />
                  carried into the
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">digital.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin. Sağlık sektörüne özel hassas akış.'
                : 'KVKK-compliant patient feedback. Capture experience after treatment via QR and strengthen your Google profile. A flow tailored to healthcare.'}
            </p>

            {/* KVKK callout */}
            <div className="mt-5 max-w-[480px] rounded-[10px] bg-[#EAF9B8] p-4 text-[13px] leading-[1.5] text-[#0A0A0A]">
              <strong>{isTr ? 'KVKK Notu:' : 'KVKK Note:'}</strong>{' '}
              {isTr
                ? 'Hasta verileri hiçbir zaman üçüncü tarafla paylaşılmaz. Anket ve yorum akışları anonimleştirilebilir.'
                : 'Patient data is never shared with third parties. Survey and review flows can be anonymised.'}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* IllusShield — exact SVG from .design/site/site-shared.jsx:270-285 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 200 240" className="h-auto w-full max-w-[260px]" aria-hidden>
              <path
                d="M100 15 L175 40 L175 120 Q175 180 100 225 Q25 180 25 120 L25 40 Z"
                fill="#FFFFFF"
                stroke="#0A0A0A"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M100 25 L165 47 L165 120 Q165 172 100 212 Q35 172 35 120 L35 47 Z"
                fill="#C6F24E"
                opacity="0.15"
              />
              {/* Check */}
              <circle cx="100" cy="110" r="34" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
              <path
                d="M82 110 L95 123 L118 98"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              <circle cx="65" cy="165" r="3" fill="#0A0A0A" />
              <circle cx="100" cy="175" r="3" fill="#0A0A0A" />
              <circle cx="135" cy="165" r="3" fill="#0A0A0A" />
              {/* Ribbon */}
              <rect x="70" y="45" width="60" height="14" rx="3" fill="#0A0A0A" />
              <text
                x="100"
                y="56"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="9"
                fill="#C6F24E"
                fontWeight="600"
                letterSpacing="0.1em"
              >
                GOOGLE SAFE
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="bz-card p-6">
                <div
                  className="text-[40px] sm:text-[48px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
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

      {/* 4-feature 2-col grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-6">
              <h3
                className="text-[22px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
              >
                {f.t}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.55] text-[#525252]">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits — 4-tile grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] max-w-[680px]">
            {isTr ? 'Klinik operasyonuna özel dört kazanç' : 'Four wins built for clinic operations'}
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
            {isTr ? 'Klinik kurulumu için merak edilenler' : 'Common questions for clinic setup'}
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
            {isTr ? 'Her hasta, saygı ile.' : 'Every patient, with respect.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? 'KVKK uyumlu · 14 gün ücretsiz · Kredi kartı istemiyoruz'
              : 'KVKK-compliant · 14-day free · No credit card'}
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
