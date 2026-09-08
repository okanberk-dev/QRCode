import { ExternalLink } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

// Stage 83 §38.163 — ISR (1 day) for legal/regulatory content. Save endpoints
// hook revalidatePath() to invalidate immediately on edit (CLAUDE.md §38.163).
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  // SEO-tuned metadata overrides the on-page t.google_compliance_page_title
  // string (used as H1 + body context). Keep both surfaces in sync if the
  // policy framing changes — search snippets and on-page heading should
  // tell the same story.
  const title = isTr
    ? 'Google Yorum Politikası Uyumu — Sahte yorum yok, teşvik yok'
    : 'Google Review Policy Compliance — No fake reviews, no incentives';
  const description = isTr
    ? 'Buaze, Google yorum politikalarına tam uyum sağlar: sahte yorum yok, teşvik yok, müşteri agency korunur. Şeffaf ve dürüst geri bildirim ekosistemini koruruz.'
    : 'Buaze strictly adheres to Google review policies: no fake reviews, no incentives, customer agency preserved. We protect a transparent, honest feedback ecosystem.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://www.buaze.com/${locale}/google-compliance`,
      languages: {
        tr: 'https://www.buaze.com/tr/google-compliance',
        en: 'https://www.buaze.com/en/google-compliance',
        'x-default': 'https://www.buaze.com/tr/google-compliance',
      },
    },
    openGraph: {
      title,
      description,
      url: `https://www.buaze.com/${locale}/google-compliance`,
      images: [{ url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function GoogleCompliancePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const points = [
    { title: t.google_compliance_point1_title, desc: t.google_compliance_point1_desc },
    { title: t.google_compliance_point2_title, desc: t.google_compliance_point2_desc },
    { title: t.google_compliance_point3_title, desc: t.google_compliance_point3_desc },
  ];

  // FAQ — locale-aware. Mirrors CLAUDE.md §19.1.1 compliance copy
  // parity (audit fix 2026-05): every answer reinforces customer
  // agency and explicitly disclaims the four review-gating signals
  // (block / hide / star-branching / incentive). Same questions get
  // emitted as FAQPage JSON-LD below for AI search engines.
  const faqs: FaqItem[] = isTr
    ? [
        {
          q: 'Buaze müşteri yorumlarını engelliyor veya gizliyor mu?',
          a: 'Hayır. Buaze hiçbir müşteri yorumunu engellemez, gizlemez veya manipüle etmez. Müşterileriniz Google, Yemeksepeti, Getir, Trendyol GO ve diğer herkese açık platformlara her zaman istedikleri yorumu yazma hakkına sahiptir. Buaze yalnızca müşteri tercihiyle yönlendirme yapar; yorum içeriğine müdahale etmez.',
        },
        {
          q: 'Düşük puan veren müşterilere Google bağlantısı gösterilmiyor mu?',
          a: 'Gösteriliyor. Akışta her müşteriye herkese açık platform bağlantıları sunulur. Düşük puan veren müşteriler ek olarak ekibinizle özel paylaşım yapma seçeneği görür; pratikte ~%85\'i bu özel kanalı tercih eder. Tercih müşteriye aittir; Buaze yıldıza göre erişimi kısıtlamaz.',
        },
        {
          q: 'Buaze pozitif yorum için teşvik (indirim, hediye) sunuyor mu?',
          a: 'Hayır. Buaze hiçbir teşvik, indirim, ikram veya kupon sunmaz. Google\'ın yorum politikası bu tür incentive\'leri açıkça yasaklar; biz de aynı politikayı uygularız. İşletme sahibi tarafından oluşturulabilecek herhangi bir teşvik, müşteriye yorum yazdırmaya bağlı olarak verilemez (CLAUDE.md §19.1).',
        },
        {
          q: 'Müşteri verilerim KVKK ve GDPR ile uyumlu mu saklanıyor?',
          a: 'Evet. Müşteri verileri AB ve ABD\'de bulunan altyapı sağlayıcılarında işlenir; sağlayıcıların tam listesi ve bulundukları ülkeler Veri İşleyici Sözleşmesi\'nde yer alır, yurt dışı aktarım KVKK m. 9 açık rızasına dayanır. KVKK aydınlatma metni her form altında görünür ve onay açık (opt-in) şekilde alınır. Pazarlama izni ayrıca onaylanır — hizmet onayıyla aynı checkbox\'a bundle edilmez. IP adresleri 90 gün sonra otomatik anonimleştirilir, müşteri talep ederse kişisel verileri silinir veya export edilir.',
        },
        {
          q: 'Buaze Google\'ın resmi iş ortağı mı?',
          a: 'Hayır, Buaze bağımsız bir SaaS platformudur ve Google\'ın resmi partner programının parçası değildir. Akışımız Google\'ın yorum politikalarına uygun şekilde tasarlanmıştır; Buaze.com sayfalarında Google ürünlerine yapılan referanslar (Google İşletme, Google Maps) tanımlama amaçlıdır.',
        },
        {
          q: 'Pulse AI yanıt taslakları Google\'ın yorum politikasına uygun mu?',
          a: 'Evet. Pulse AI sadece **işletme tarafının yanıtı** için taslak üretir — müşteri tarafından yazılan yorumun içeriğini değiştirmez veya manipüle etmez. Üretilen taslak yayınlanmadan önce işletme sahibi tarafından düzenlenir ve onaylanır. Hiçbir AI taslağı otomatik olarak gönderilmez; her yanıt insan onayından geçer.',
        },
      ]
    : [
        {
          q: 'Does Buaze block or hide customer reviews?',
          a: 'No. Buaze never blocks, hides, or manipulates customer reviews. Your customers always retain the right to post on Google, Yemeksepeti, Getir, Trendyol GO, and other public platforms. Buaze only routes by customer preference; we never alter review content.',
        },
        {
          q: 'Are customers giving low ratings denied access to the Google link?',
          a: 'No. Public-platform links are surfaced to every customer in the flow. Customers giving low ratings additionally see an option to share privately with your team; in practice, ~85% of them choose this private channel. The choice belongs to the customer; Buaze does not gate access by star rating.',
        },
        {
          q: 'Does Buaze offer incentives (discounts, gifts) for positive reviews?',
          a: 'No. Buaze never offers any incentive, discount, freebie, or coupon. Google\'s review policy explicitly prohibits such incentives, and we apply the same policy. Any incentive a business owner may create cannot be conditioned on a customer leaving a review (CLAUDE.md §19.1).',
        },
        {
          q: 'Is my customer data stored in compliance with KVKK and GDPR?',
          a: 'Yes. Customer data is processed by infrastructure providers located in the EU and the USA; the full provider list and their locations are set out in the Data Processing Agreement, and cross-border transfers rely on explicit consent under KVKK art. 9. The KVKK notice is visible under every form and consent is collected explicitly (opt-in). Marketing consent is collected separately — never bundled into the same checkbox as service consent. IP addresses are automatically anonymized after 90 days; on customer request, personal data is deleted or exported.',
        },
        {
          q: 'Is Buaze an official Google partner?',
          a: 'No. Buaze is an independent SaaS platform and is not part of Google\'s official partner program. Our flow is designed to comply with Google\'s review policies; references to Google products (Google Business, Google Maps) on Buaze.com are descriptive only.',
        },
        {
          q: 'Are Pulse AI reply drafts compliant with Google\'s review policy?',
          a: 'Yes. Pulse AI only generates drafts for the **business-side reply** — it never modifies or manipulates the content of a review written by a customer. The generated draft is edited and approved by the business owner before it is published. No AI draft is sent automatically; every reply passes through human approval.',
        },
      ];

  // FAQPage JSON-LD — emitted alongside the visible accordion. Same
  // questions feed both surfaces so AI search engines (Perplexity, Bing
  // Chat, Gemini AIO) and Google Rich Results pull from one source of
  // truth. CLAUDE.md §35.6 schema matrix updated to include this entry.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        // FAQPage schema — feeds Google Rich Results + AI search engines.
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-20 pb-[60px] sm:pb-20 border-b border-[#EDEDED]">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="gcGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gcGrid)" />
        </svg>
        <div className="relative max-w-[820px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] pulse-heartbeat" />
            <span className="pulse-eyebrow text-[#0A0A0A]">{t.google_compliance_badge}</span>
          </div>
          <h1 className="mt-5 text-[38px] sm:text-[52px] font-medium leading-[0.95] tracking-[-0.03em] text-[#0A0A0A]">
            {t.google_compliance_page_title}
          </h1>
          <p className="mt-5 text-[15px] sm:text-[18px] text-[#525252] leading-[1.6] max-w-[640px] mx-auto">
            {t.google_compliance_page_subtitle}
          </p>
        </div>
      </section>

      {/* ─── Points ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {points.map((point, i) => (
            <div key={i} className="bz-card p-6 sm:p-7">
              <span className="pulse-eyebrow text-[#A8D62E]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-[19px] font-medium text-[#0A0A0A] tracking-[-0.01em] leading-tight">
                {point.title}
              </h3>
              <p className="mt-3 text-[14px] text-[#525252] leading-[1.65]">{point.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Policy card ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="max-w-[1000px] mx-auto bg-[#0A0A0A] text-white rounded-3xl p-6 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[360px] h-[360px] bg-[#C6F24E]/12 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative max-w-[620px]">
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'POLİTİKA BİLGİSİ' : 'POLICY INFORMATION'}
            </span>
            <h2 className="mt-4 text-[24px] sm:text-[36px] font-medium text-white tracking-[-0.02em] leading-[1.1]">
              {t.google_compliance_policy_title}
            </h2>
            <p className="mt-4 text-[15px] sm:text-[16px] text-white/70 leading-[1.7]">
              {t.google_compliance_policy_desc}
            </p>
            <Link
              href="https://support.google.com/contributionpolicy/answer/7400114?hl=en"
              target="_blank"
              className="inline-flex items-center gap-2 mt-7 bg-[#C6F24E] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.google_compliance_link_text}
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24" id="faq">
        <div className="max-w-[820px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">
            {isTr ? 'SIKÇA SORULAN SORULAR' : 'FREQUENTLY ASKED QUESTIONS'}
          </span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">
            {isTr
              ? 'Politika ve uyumluluk hakkında merak edilenler'
              : 'Common questions about policy and compliance'}
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16px] text-[#525252] leading-[1.6]">
            {isTr
              ? 'Buaze akışının Google yorum politikalarına nasıl uyduğunu, müşteri verilerinizin nasıl korunduğunu ve Pulse AI yanıt taslaklarının neden uyumlu olduğunu açıklıyoruz.'
              : 'How the Buaze flow aligns with Google\'s review policies, how your customer data is protected, and why Pulse AI reply drafts are compliant.'}
          </p>
          <div className="mt-8">
            <FaqAccordion faqs={faqs} defaultOpen={[0]} />
          </div>
        </div>
      </section>

      {/* ─── Closing quote ─── */}
      <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[720px] mx-auto text-center">
          <div className="flex justify-center gap-1 text-[#C6F24E] text-[18px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <p className="mt-6 text-[17px] sm:text-[20px] text-[#0A0A0A] leading-[1.5] font-medium tracking-[-0.01em]">
            {isTr
              ? '"İşletmenizin başarısı, müşterilerinizle kurduğunuz gerçek ve güvene dayalı bağdadır. Buaze olarak bu bağı teknolojiyle korumayı taahhüt ediyoruz."'
              : '"Your business success lies in the genuine, trust-based bond you build with your customers. As Buaze, we commit to protecting this bond through technology."'}
          </p>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
