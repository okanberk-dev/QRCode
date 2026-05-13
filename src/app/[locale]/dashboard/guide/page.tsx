'use client';

import { use } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  Link2,
  Mail,
  MessageSquare,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle2,
  Users,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import { Eyebrow, PageHeader } from '@/components/ui';

interface Step {
  icon: React.ReactNode;
  num: string;
  titleTr: string;
  titleEn: string;
  bodyTr: string;
  bodyEn: string;
  bulletsTr?: string[];
  bulletsEn?: string[];
  link?: string;
  linkLabelTr?: string;
  linkLabelEn?: string;
}

interface Tip {
  icon: React.ReactNode;
  titleTr: string;
  titleEn: string;
  bodyTr: string;
  bodyEn: string;
}

interface SectorGuide {
  slug: string;
  labelTr: string;
  labelEn: string;
}

export default function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = use(params);
  const locale: Locale = rawLocale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  // Sıralı 6 adım — kanonik onboarding akışı, panel'in mevcut yapısıyla
  // birebir hizalı (CLAUDE.md §19.5 activation checklist + §15 Pulse AI +
  // §21.6 weekly digest + §23 Pulse panel scope).
  const steps: Step[] = [
    {
      num: '01',
      icon: <Building2 size={18} strokeWidth={2} />,
      titleTr: 'İşletmeni ekle ve platformları bağla',
      titleEn: 'Add your business and connect platforms',
      bodyTr:
        'Çoklu konum yönetebilirsin. İşletmeyi ekledikten sonra Ayarlar → Platform Bağlantıları sekmesinden Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor ve listemizde olmayan diğer platformların review URL\'lerini yapıştır.',
      bodyEn:
        'You can manage multiple locations. After adding a business, paste your Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor — or any custom platform — review URLs from Settings → Platform Links.',
      bulletsTr: [
        'Marka rengini de buradan ayarla — QR sihirbazında otomatik öne çıkar.',
        '"Tümünü yeniden test et" ile bağlı linklerin canlı sağlığını gör.',
      ],
      bulletsEn: [
        'Set your brand colour here too — it shows up in the QR wizard automatically.',
        'Use "Retest all" to verify every linked URL in seconds.',
      ],
      link: `/${locale}/dashboard/restaurants`,
      linkLabelTr: 'İşletmeleri yönet',
      linkLabelEn: 'Manage businesses',
    },
    {
      num: '02',
      icon: <QrCode size={18} strokeWidth={2} />,
      titleTr: 'QR sihirbazıyla 3 adımda kod oluştur',
      titleEn: 'Create a QR in 3 wizard steps',
      bodyTr:
        'Sol menüdeki "QR oluştur" butonuna tıkla. Sihirbaz seni Hedef → Renk → Önizle adımlarından geçirir. Renk adımında 6 hazır şablon, marka rengin ve özel HEX seçici var; canlı önizleme her tıklamada güncellenir.',
      bodyEn:
        'Tap "Create QR" in the sidebar. The wizard walks you through Target → Colour → Preview. The colour step ships 6 presets, your brand colour and a custom HEX picker — live preview updates on every tap.',
      bulletsTr: [
        'Yüksek puan yönlendirmesi: varsayılan platform veya tek-platform sabit pin.',
        'WCAG kontrast kontrolü 3:1 altında otomatik blok — basılan QR taranabilir kalır.',
      ],
      bulletsEn: [
        'High-rating redirect: default platform or pin to a single platform.',
        'WCAG contrast guard auto-blocks below 3:1 — printed QRs stay scannable.',
      ],
      link: `/${locale}/dashboard/qr?new=1`,
      linkLabelTr: 'QR sihirbazını aç',
      linkLabelEn: 'Open QR wizard',
    },
    {
      num: '03',
      icon: <Inbox size={18} strokeWidth={2} />,
      titleTr: 'Düşük puan yorumlarını Pulse AI ile yanıtla',
      titleEn: 'Reply to low-rating reviews with Pulse AI',
      bodyTr:
        '1–3 yıldız müşteri yorumları gelen kutuna düşer. "Pulse AI önerisi" otomatik bir taslak hazırlar; "Kullan & gönder" ile tek tıkla iletebilir veya "Düzenle" ile metni özelleştirebilirsin. Yüksek puanlar zaten platforma yönlendirilir.',
      bodyEn:
        '1–3 star reviews land in your inbox. "Pulse AI suggestion" prepares a draft automatically; click "Use & send" to ship in one tap or "Edit" to personalize. High ratings already redirect to the platform.',
      bulletsTr: [
        'Tonu Hesabım → Pulse AI sekmesinden seç (samimi / resmi / özür).',
        'Hesabım → Pulse AI sekmesinden taslak otomasyonunu kapatabilirsin.',
      ],
      bulletsEn: [
        'Pick the tone from Account → Pulse AI (warm / formal / apologetic).',
        'Disable auto-drafts from Account → Pulse AI when you want manual control.',
      ],
      link: `/${locale}/dashboard/feedbacks`,
      linkLabelTr: 'Gelen kutusunu aç',
      linkLabelEn: 'Open inbox',
    },
    {
      num: '04',
      icon: <BarChart3 size={18} strokeWidth={2} />,
      titleTr: 'Analitik ve AI içgörüleri incele',
      titleEn: 'Review analytics and AI inferences',
      bodyTr:
        'Dönüşüm oranı, yanıt performansı, saat-bazlı dağılım ve aspect kırılımı (yemek/servis/atmosfer). "Müşterinin en sık dile getirdiği" bölümünde Pulse AI yorumlarından ortak temaları çıkarır ve haftalık çıkarım yapar.',
      bodyEn:
        'Conversion rate, response performance, hourly distribution and aspect breakdown (food/service/atmosphere). "Most-mentioned themes" pulls common patterns from comments via Pulse AI with a weekly synthesis.',
      bulletsTr: [
        'Müşteriler sekmesinde sık dönen müşteri (LTV, segment, churn) görünür.',
        '14-haftalık trend ve gün × saat ısı haritası en yoğun dönemleri ortaya çıkarır.',
      ],
      bulletsEn: [
        'The Customers tab surfaces returning customers (LTV, segment, churn).',
        '14-week trend and day × hour heatmap reveal your busiest windows.',
      ],
      link: `/${locale}/dashboard/analytics`,
      linkLabelTr: 'Analitiği aç',
      linkLabelEn: 'Open analytics',
    },
    {
      num: '05',
      icon: <Mail size={18} strokeWidth={2} />,
      titleTr: 'Haftalık raporu Pazartesi sabahı al',
      titleEn: 'Get the weekly report on Monday morning',
      bodyTr:
        'Pazartesi 09:00 UTC\'de haftalık özet maili gelir: yorum sayısı, ortalama puan, dağılım, aspect ortalamaları + Pulse AI çıkarımı (haftanın ana sinyali) ve önümüzdeki hafta için somut öneri. Hesap → Bildirim sekmesinden açıp/kapatabilirsin.',
      bodyEn:
        'Every Monday 09:00 UTC the weekly digest arrives: review count, average rating, distribution, aspect averages + a Pulse AI inference (key signal) and a concrete recommendation for next week. Toggle from Account → Notifications.',
      link: `/${locale}/dashboard/account?section=notifications`,
      linkLabelTr: 'Bildirim ayarları',
      linkLabelEn: 'Notification settings',
    },
    {
      num: '06',
      icon: <UserCircle2 size={18} strokeWidth={2} />,
      titleTr: 'Hesabını ve ekibini ayarla',
      titleEn: 'Set up your account and team',
      bodyTr:
        'Hesabım sayfasında plan durumu, üyelik tarihi ve aktivite özeti. Pulse AI sekmesinden taslakların varsayılan tonunu (samimi/resmi/özür) seç. Ekip → davetiye ile yöneticiler ekleyip rol ata.',
      bodyEn:
        'Account page shows plan status, member since date and activity summary. Pulse AI tab lets you pick the default tone (warm/formal/apologetic). Team → invite to add managers with roles.',
      link: `/${locale}/dashboard/account`,
      linkLabelTr: 'Hesabıma git',
      linkLabelEn: 'Open account',
    },
  ];

  const tips: Tip[] = [
    {
      icon: <Clock size={14} strokeWidth={2} />,
      titleTr: 'İlk 24 saatte yanıtla',
      titleEn: 'Respond within 24 hours',
      bodyTr:
        'Düşük puan yorumlara hızlı dönüş müşteri sadakatini güçlendirir. Pulse AI taslağı hazır geldiği için tek tıkla gönderebilirsin.',
      bodyEn:
        'Quick replies on low ratings boost customer loyalty. With Pulse AI drafts ready, you can ship in one click.',
    },
    {
      icon: <Palette size={14} strokeWidth={2} />,
      titleTr: 'QR\'da marka rengini kullan',
      titleEn: 'Use your brand colour on the QR',
      bodyTr:
        'Sihirbazda "Marka" şablonu işletme renginle dolar. Kontrast 3:1 altına düşerse otomatik uyarı gelir; yüksek kontrast = daha güvenli tarama.',
      bodyEn:
        'The wizard\'s "Brand" preset uses your workspace colour. Contrast below 3:1 triggers an auto-warning; higher contrast = safer scans.',
    },
    {
      icon: <Link2 size={14} strokeWidth={2} />,
      titleTr: 'Platform linklerini doğrula',
      titleEn: 'Verify your platform links',
      bodyTr:
        '"Tümünü yeniden test et" butonu tüm bağlı platformların erişilebilirliğini saniyeler içinde kontrol eder. Bozuk link kaybedilen yönlendirme demek.',
      bodyEn:
        'The "Retest all" button checks reachability of every linked platform in seconds. A broken link is a lost redirect.',
    },
    {
      icon: <Star size={14} strokeWidth={2} />,
      titleTr: 'Yüksek puanları platformlara yönlendir',
      titleEn: 'Route high ratings to platforms',
      bodyTr:
        'Varsayılan platform seçilince 4–5 yıldızlı müşteriler doğrudan Google / Yemeksepeti gibi seçtiğin yere gider. Müşteriye yorum yazma özgürlüğü her zaman korunur.',
      bodyEn:
        'When a default platform is set, 4–5 star customers go straight to Google / Yemeksepeti or your chosen target. The customer always keeps the right to write the review wherever they want.',
    },
    {
      icon: <ShieldCheck size={14} strokeWidth={2} />,
      titleTr: 'KVKK rızası açık olsun',
      titleEn: 'Keep KVKK consent transparent',
      bodyTr:
        'Müşteri formunda açık rıza checkbox\'ı her zaman opt-in. Bildirim e-posta adresini Ayarlar → Genel\'den güncel tut.',
      bodyEn:
        'The consent checkbox on the customer form is always opt-in. Keep your notification email up-to-date in Settings → General.',
    },
    {
      icon: <MessageSquare size={14} strokeWidth={2} />,
      titleTr: 'Müşteriye direkt e-posta yaz',
      titleEn: 'Email customers directly',
      bodyTr:
        'Müşteri e-posta bıraktıysa yanıt formunda "E-posta gönder" seçeneği aktif olur — müşteri inbox\'ında ekibinin sesini duyar.',
      bodyEn:
        'If the customer left an email, the reply form unlocks "Send email" — the response lands directly in their inbox.',
    },
  ];

  // Sektör spesifik yardım sayfaları (CLAUDE.md §22 — yardım merkezi). Yeni
  // sahibin "ben hangi sektörden öğreneceğim" sorusuna direkt link.
  const sectorGuides: SectorGuide[] = [
    { slug: 'restaurants', labelTr: 'Restoran', labelEn: 'Restaurant' },
    { slug: 'hotels', labelTr: 'Otel', labelEn: 'Hotel' },
    { slug: 'healthcare', labelTr: 'Sağlık', labelEn: 'Healthcare' },
    { slug: 'beauty-salon', labelTr: 'Güzellik', labelEn: 'Beauty' },
    { slug: 'retail', labelTr: 'Perakende', labelEn: 'Retail' },
    { slug: 'delivery', labelTr: 'Paket servis', labelEn: 'Delivery' },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'KILAVUZ' : 'GUIDE'}
        title={isTr ? 'Buaze\'yi nasıl kullanırım?' : 'How to use Buaze'}
        description={
          isTr
            ? '6 adımda paneli en verimli şekilde kullan, Pulse AI\'dan ve haftalık raporlardan yararlan.'
            : 'Six steps to use the panel productively, get the most out of Pulse AI and the weekly digest.'
        }
      />

      {/* TL;DR — 3 saniyede özet. Yeni QR sihirbazı + dashboard activation
          checklist için doğrudan giriş noktası. Lime accent gradient,
          panel'in birincil aksiyonunu görsel öne çıkarır. */}
      <section
        aria-label={isTr ? 'Hızlı başlangıç' : 'Quick start'}
        className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-gradient-to-br from-white via-[#FAFAFA] to-[#EAF9B8]/40"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-start gap-3 lg:max-w-[640px]">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
              <Wand2 size={18} strokeWidth={2.2} />
            </span>
            <div>
              <Eyebrow color="#0A0A0A">
                {isTr ? '3 SANİYE ÖZET' : '3-SECOND SUMMARY'}
              </Eyebrow>
              <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px] text-[#0A0A0A]">
                {isTr ? 'QR oluştur · Yapıştır · Cevapla' : 'Create QR · Stick · Reply'}
              </h2>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'Sihirbazda 3 adımda QR çıkar (renk + önizleme dahil). Masaya/menüye yapıştır. Müşteri 4–5★ verirse seçtiğin platforma gider, düşük puan gelen kutuna düşer ve Pulse AI yanıt taslağını hazırlar.'
                  : 'Spin a QR in 3 wizard steps (colour + preview included). Stick it on the table or menu. 4–5★ goes to your platform, lower scores hit the inbox where Pulse AI prepares a reply draft.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
            <Link
              href={`/${locale}/dashboard/qr?new=1`}
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 text-[12.5px]"
            >
              <Wand2 size={13} strokeWidth={2.2} />
              {isTr ? 'QR sihirbazı' : 'QR wizard'}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 text-[12.5px]"
            >
              <CheckCircle2 size={13} strokeWidth={2.2} />
              {isTr ? 'Aktivasyon listesi' : 'Activation list'}
            </Link>
          </div>
        </div>
      </section>

      {/* Adım kartları — 2-col grid (sm+), her kart adım numarası + ikon +
          başlık + açıklama + sub-bullet'lar + ilgili sayfaya link. Pulse
          bz-card primitive (CLAUDE.md §23.2). */}
      <section
        aria-label={isTr ? 'Adımlar' : 'Steps'}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
      >
        {steps.map((step) => (
          <article
            key={step.num}
            className="bz-card flex flex-col gap-3 p-5 sm:p-6 transition-all hover:border-[#0A0A0A]"
          >
            <header className="flex items-start justify-between gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
                {step.icon}
              </span>
              <span className="bz-mono text-[11px] font-semibold tracking-[0.18em] text-[#A3A3A3]">
                {step.num}
              </span>
            </header>
            <div className="flex-1">
              <h3 className="bz-h-tight text-[16px] sm:text-[17px] text-[#0A0A0A]">
                {isTr ? step.titleTr : step.titleEn}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-[#525252]">
                {isTr ? step.bodyTr : step.bodyEn}
              </p>
              {(isTr ? step.bulletsTr : step.bulletsEn)?.length ? (
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {(isTr ? step.bulletsTr : step.bulletsEn)!.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-1.5 text-[12px] leading-[1.55] text-[#525252]"
                    >
                      <CheckCircle2
                        size={11}
                        strokeWidth={2.4}
                        className="mt-1 shrink-0 text-[#A8D62E]"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {step.link && (
              <Link
                href={step.link}
                className="mt-1 inline-flex items-center gap-1.5 self-start text-[12px] font-medium text-[#0A0A0A] transition-colors hover:text-[#A8D62E]"
              >
                {isTr ? step.linkLabelTr : step.linkLabelEn}
                <ArrowRight size={12} strokeWidth={2} />
              </Link>
            )}
          </article>
        ))}
      </section>

      {/* Pro tips — graphite hero card, 2x3 grid (sm+). Owner için pratik
          kısa kurallar. CLAUDE.md §11 Pulse Voice — net + actionable. */}
      <section
        aria-label={isTr ? 'İpuçları' : 'Tips'}
        className="overflow-hidden rounded-2xl bg-[#0A0A0A] text-white"
      >
        <div className="border-b border-white/10 p-5 sm:p-6">
          <Eyebrow color="#C6F24E">{isTr ? 'PRATİK KURALLAR' : 'PRACTICAL RULES'}</Eyebrow>
          <h2 className="bz-h-tight mt-1.5 text-[20px] sm:text-[22px]">
            {isTr ? 'Hızlı ve net 6 ipucu' : 'Six fast and clear tips'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip, i) => (
            <div
              key={tip.titleEn}
              className={`flex flex-col gap-2 p-5 sm:p-6 ${
                i % 2 === 1 ? 'sm:border-l sm:border-white/10' : ''
              } ${i % 3 === 2 ? 'lg:border-l lg:border-white/10' : ''} ${
                i >= 2 ? 'border-t border-white/10' : ''
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-[#C6F24E]">
                {tip.icon}
                <span className="bz-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                  {isTr ? tip.titleTr : tip.titleEn}
                </span>
              </span>
              <p className="text-[13px] leading-[1.6] text-white/75">
                {isTr ? tip.bodyTr : tip.bodyEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sektör rehberleri — yardım merkezi sektör sayfalarına chip row
          (CLAUDE.md §22). Yeni sahip "benim sektörümde nasıl?" sorusuna
          tek tık cevap alır. */}
      <section
        aria-label={isTr ? 'Sektör rehberleri' : 'Sector guides'}
        className="bz-card-soft flex flex-col gap-3 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0A0A0A]">
            <Sparkles size={16} strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="bz-h-tight text-[15px] text-[#0A0A0A]">
              {isTr ? 'Sektörüne özel rehberler' : 'Sector-specific guides'}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-[1.55] text-[#525252]">
              {isTr
                ? 'Restoran, otel, klinik, salon — sektörünün operasyon ipuçları yardım merkezinde.'
                : 'Restaurant, hotel, clinic, salon — operational tips per sector live in the help center.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sectorGuides.map((s) => (
            <Link
              key={s.slug}
              href={`/${locale}/solutions/${s.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA]"
            >
              {isTr ? s.labelTr : s.labelEn}
              <ArrowRight size={11} strokeWidth={2} className="text-[#A3A3A3]" />
            </Link>
          ))}
        </div>
      </section>

      {/* Yardım CTA — kullanıcı sıkışırsa nereye dönsün */}
      <section className="bz-card-soft flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0A0A0A]">
            <Bell size={16} strokeWidth={2} />
          </span>
          <div>
            <p className="bz-h-tight text-[15px] text-[#0A0A0A]">
              {isTr ? 'Hâlâ sorun yaşıyor musun?' : 'Still stuck?'}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-[1.55] text-[#525252]">
              {isTr
                ? 'Yardım merkezi makaleleri ve sektör-özel kılavuzlar elinin altında.'
                : 'Help center articles and sector-specific guides are at hand.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/help`}
            className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px]"
          >
            <CalendarDays size={12} strokeWidth={2} />
            {isTr ? 'Yardım merkezi' : 'Help center'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
          >
            <Users size={12} strokeWidth={2} />
            {isTr ? 'Ekibe yaz' : 'Contact us'}
          </Link>
        </div>
      </section>
    </div>
  );
}
