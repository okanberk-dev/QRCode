import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, Check, ChevronRight, Scale, ShieldCheck, Sparkles, BarChart3 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildSolutionSchema } from '@/lib/solution-schema';
import { getRelatedSolutions } from '@/lib/related-solutions';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Hukuk Ofisi İtibar Yönetimi — Buaze'
      : 'Law Firm Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil.'
      : 'Collect feedback from clients after every consultation. Rise in Google search rankings. Ethics-compliant, reputable digital presence.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/law-firms`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/law-firms',
        en: 'https://buaze.com/en/solutions/law-firms',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/law-firms` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:LegalSolutionPage (lines 131-195).
 * 2-column hero with document+seal SVG, 4-bullet compliance list, 3-stat grid.
 */
export default async function LawFirmsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const bullets = isTr
    ? [
        'Avukatlık meslek kurallarına uyumlu',
        'Yanıltıcı reklam yok',
        'Müvekkil sırrı korunur',
        'Organik SEO artışı',
      ]
    : [
        'Bar-ethics compliant',
        'No misleading advertising',
        'Client confidentiality preserved',
        'Organic SEO growth',
      ];

  const stats = isTr
    ? [
        { value: '+1.2', label: 'Ortalama Google puan artışı' },
        { value: '+90', label: '90 günde yeni yorum' },
        { value: '%38', label: 'Müvekkil başvuru artışı' },
      ]
    : [
        { value: '+1.2', label: 'Avg. Google rating lift' },
        { value: '+90', label: 'New reviews in 90 days' },
        { value: '38%', label: 'Client inquiry growth' },
      ];

  const benefits = isTr
    ? [
        { Icon: Scale, h: 'Etik kurallarla uyumlu akış', d: 'Hukuki vekalet ilişkisi sonrası müvekkilden geri bildirim toplamak Türkiye Barolar Birliği reklam yasakları ile uyumlu — danışmanlık kalitesi ve hizmet süreci hakkında, hukuki sonuç vaadi yok.' },
        { Icon: ShieldCheck, h: 'KVKK + müvekkil gizliliği', d: 'Müvekkil verisi EU veri merkezinde, IP 90 gün retention. Form alanları yalnız deneyim puanı + opsiyonel yorum + opsiyonel iletişim — dava bilgisi, taraf ismi, hukuki detay yok.' },
        { Icon: Sparkles, h: 'Pulse AI yanıt taslağı (mesleki ton)', d: 'Hukuki ton: ölçülü, profesyonel, dava ayrıntısına girmeyen yanıtlar. Avukat onaylar, otomatik gönderim yok — Baro etik kurallarına uygunluk korunur.' },
        { Icon: BarChart3, h: 'Avukat + uzmanlık alanı analitiği', d: 'Hangi avukat, hangi uzmanlık (ceza, aile, ticaret), hangi dönem etiketlenir. Müvekkil memnuniyeti uzmanlık bazlı ayrılır; ortak yönetim doğrudan veriden görür.' },
      ]
    : [
        { Icon: Scale, h: 'Bar-association-compliant flow', d: 'Collecting client feedback after a consultation complies with Türkiye Barolar Birliği advertising restrictions — it covers consultation quality and service process, never legal-outcome promises.' },
        { Icon: ShieldCheck, h: 'KVKK + client confidentiality', d: 'Client data stored in an EU data center, IP retained for 90 days. Form fields only collect experience rating + optional comment + optional contact — no case info, party names, or legal detail.' },
        { Icon: Sparkles, h: 'Pulse AI reply drafts (professional tone)', d: 'Legal tone: measured, professional, no case detail. The lawyer approves; nothing auto-sent — bar association ethics are preserved.' },
        { Icon: BarChart3, h: 'Lawyer + practice-area analytics', d: 'Which lawyer, which practice area (criminal, family, commercial), which period is tagged. Client satisfaction splits by practice area; managing partners see it directly from data.' },
      ];

  const faqs: FaqItem[] = isTr
    ? [
        { q: 'Hukuk ofisi için Buaze Türkiye Barolar Birliği reklam yasaklarına uygun mu?', a: 'Akış müvekkilden danışmanlık kalitesi + hizmet süreci hakkında geri bildirim toplar — hukuki sonuç vaadi, dava kazanma garantisi, başarı oranı gibi reklam yasakları kapsamındaki ifadeler form\'da yer almaz. Yorum yanıt taslakları da bu kurallara uygun (mesleki ton, dava ayrıntısı yok).' },
        { q: 'Müvekkil gizliliği nasıl korunuyor?', a: 'Form alanları sadece deneyim puanı + opsiyonel yorum + opsiyonel iletişim bilgisi (e-posta veya telefon) toplar. Dava bilgisi, taraf isimleri, davanın konusu gibi gizli alanlar yer almaz. Müvekkil verileri EU veri merkezinde saklanır, KVKK aydınlatma metni form altında görünür ve onay açık (opt-in) şekilde alınır.' },
        { q: 'Avukat performansını takip eder miyim?', a: 'Evet. QR oluştururken avukat etiketi (Buaze branch field veya custom URL parametresi) ekleyebilirsin; yorum geldiğinde hangi avukat + hangi uzmanlık alanı + ay loglanır. Yönetim ortağı analytics raporundan müvekkil memnuniyetini avukat bazlı ayrıştırabilir.' },
        { q: 'Düşük puan veren müvekkil ne olur?', a: 'Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren müvekkiller ek olarak hukuk ofisinizle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Müvekkil her zaman herkese açık platforma yorum yazma hakkını korur; siz sorunu özelden (ek danışmanlık, faturalama netleştirme, vb.) çözme şansı kazanırsınız.' },
        { q: 'Birden fazla avukat / şube nasıl yönetilir?', a: 'Her şube için ayrı işletme oluştur veya tek işletme + avukat etiketleri kullan. Analytics avukat ve şube bazlı ayrılır. Yönetim ortağı: hangi şubenin müvekkil memnuniyeti yüksek, hangi avukatın yanıt süresi düşük — doğrudan görür.' },
      ]
    : [
        { q: 'Is Buaze compliant with the Bar Association advertising rules for law firms?', a: 'The flow collects feedback from clients about consultation quality + service process — never about case outcomes, win promises, or success rates that fall under advertising restrictions. The reply drafts also follow these rules (professional tone, no case detail).' },
        { q: 'How is client confidentiality protected?', a: 'Form fields only collect experience rating + optional comment + optional contact (email or phone). No case info, party names, or case subject — those confidential fields do not exist. Client data is stored in an EU data center, the KVKK notice is visible under the form, and consent is opt-in.' },
        { q: 'Can I track lawyer performance?', a: 'Yes. When generating the QR you can add a lawyer tag (Buaze branch field or a custom URL parameter); when the review arrives, which lawyer + which practice area + month is logged. Managing partners can split client satisfaction per lawyer in the analytics report.' },
        { q: 'What happens to clients giving low ratings?', a: 'Buaze never blocks or hides any review. Clients giving low ratings additionally see an option to share privately with your firm — in practice ~85% choose this private channel. The client always retains the right to post on any public platform; you gain a chance to resolve the issue privately first (additional consultation, billing clarification, etc.).' },
        { q: 'How do I manage multiple lawyers / branches?', a: 'Either create a separate business per branch or use a single business + lawyer tags. Analytics splits per lawyer and per branch. Managing partners see directly: which branch has higher client satisfaction, which lawyer has the longest reply latency.' },
      ];

  const relatedSolutions = getRelatedSolutions('law-firms', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'law-firms',
    industryLabel: isTr ? 'Hukuk Ofisi' : 'Law Firm',
    serviceName: isTr ? 'Hukuk Ofisi İtibar Yönetimi' : 'Law Firm Reputation Management',
    description: isTr
      ? 'Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil.'
      : 'Collect feedback from clients after every consultation. Rise in Google search rankings. Ethics-compliant, reputable digital presence.',
    faqs,
  });

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — white bg, 2-column with document+seal SVG */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · HUKUK OFİSİ' : 'SECTOR · LAW FIRM'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Müvekkil güveni
                  <br />
                  en güçlü
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">referanstır.</span>
                </>
              ) : (
                <>
                  Client trust is
                  <br />
                  the strongest
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">reference.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil oluşturun.'
                : 'Collect feedback after every consultation. Climb Google search rankings. Build an ethics-compliant, respected digital presence.'}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <div key={b} className="flex items-center gap-2 text-[13px] text-[#1A1A1A]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  {b}
                </div>
              ))}
            </div>

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

          {/* Document + seal illustration (1:1 with design SVG) */}
          <div className="flex justify-center lg:justify-end">
            <svg
              viewBox="0 0 320 300"
              className="h-auto w-full max-w-[400px]"
              aria-hidden
            >
              <rect x="60" y="20" width="200" height="260" rx="8" fill="#FAFAFA" stroke="#0A0A0A" strokeWidth="2" />
              <rect x="60" y="20" width="200" height="32" rx="8" fill="#0A0A0A" />
              <rect x="60" y="36" width="200" height="16" fill="#0A0A0A" />
              <rect x="80" y="70" width="100" height="6" rx="3" fill="#0A0A0A" />
              <rect x="80" y="84" width="140" height="4" rx="2" fill="#D4D4D4" />
              <rect x="80" y="96" width="120" height="4" rx="2" fill="#D4D4D4" />
              <rect x="80" y="118" width="120" height="6" rx="3" fill="#0A0A0A" />
              <rect x="80" y="132" width="150" height="4" rx="2" fill="#D4D4D4" />
              <rect x="80" y="144" width="100" height="4" rx="2" fill="#D4D4D4" />
              <path
                d="M80 195 Q100 185 120 195 Q140 205 160 195"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line x1="80" y1="210" x2="200" y2="210" stroke="#0A0A0A" strokeWidth="1" />
              <circle cx="240" cy="240" r="32" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
              <path
                d="M228 240 L236 248 L252 232"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                return (
                  <circle
                    key={i}
                    cx={240 + Math.cos(a) * 26}
                    cy={240 + Math.sin(a) * 26}
                    r="2"
                    fill="#0A0A0A"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>

      {/* Benefits — 4-tile grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] max-w-[680px]">
            {isTr ? 'Hukuk ofisi operasyonuna özel dört kazanç' : 'Four wins built for law firms'}
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
            {isTr ? 'Hukuk ofisi için merak edilenler' : 'Common questions for law firms'}
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
            {isTr ? 'Hukuk büronuzun nabzını dinleyin.' : "Listen to your firm's pulse."}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? 'KVKK & GDPR uyumlu · 14 gün ücretsiz · Kredi kartı istemiyoruz'
              : 'KVKK & GDPR compliant · 14-day free · No credit card'}
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
