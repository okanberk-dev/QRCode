'use client';

import { use } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
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
import { PageHeader } from '@/components/ui';

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
        'Birden fazla işletme yönetebilirsin. İşletmeyi ekledikten sonra sol menüdeki Platform bağlantıları sayfasından Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor ve diğer platformlardaki yorum sayfalarının bağlantılarını ekle.',
      bodyEn:
        'You can manage multiple businesses. After adding one, open Platform links in the sidebar and add the review page links for Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor and other platforms.',
      bulletsTr: [
        'Marka rengini işletme ayarlarından belirle — QR sihirbazında hazır şablon olarak çıkar.',
        'Platform bağlantıları sayfasındaki "Tümünü kontrol et" ile bağlantıların çalışıp çalışmadığını gör.',
      ],
      bulletsEn: [
        'Set your brand colour in the business settings — it appears as a preset in the QR wizard.',
        'Use "Check all" on the Platform links page to see whether every link still works.',
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
        'Sol menüdeki "QR oluştur" butonuna tıkla. Sihirbaz seni Hedef → Renk → Önizle adımlarından geçirir. Renk adımında 6 hazır şablon, marka rengin ve özel renk seçici var; önizleme her seçimde güncellenir.',
      bodyEn:
        'Tap "Create QR" in the sidebar. The wizard walks you through Target → Colour → Preview. The colour step offers 6 presets, your brand colour and a custom colour picker — the preview updates with every choice.',
      bulletsTr: [
        'Hangi platformun yorum bağlantısının sunulacağını seç: varsayılan platform veya tek bir platform.',
        'Renk kontrastı çok düşükse sihirbaz uyarır — basılan QR taranabilir kalır.',
      ],
      bulletsEn: [
        'Choose which platform\'s review link is offered: your default platform or a single platform.',
        'The wizard warns you when colour contrast is too low — printed QRs stay scannable.',
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
        'Müşterilerin bıraktığı yorumlar Yorumlar sayfasında toplanır. Pulse AI yeni gelen yorumlar için yanıt taslağı hazırlar; önce düşük puanlılara bak, metni gözden geçirip istersen düzenle, sonra gönder.',
      bodyEn:
        'Customer feedback collects on the Reviews page. Pulse AI prepares reply drafts for new reviews; start with the low-rating ones, review the text, edit it if you like, then send it.',
      bulletsTr: [
        'Tonu Hesabım → Pulse AI sekmesinden seç (samimi / resmi / özür).',
        'Hesabım → Pulse AI sekmesinden taslak otomasyonunu kapatabilirsin.',
      ],
      bulletsEn: [
        'Pick the tone from Account → Pulse AI (warm / formal / apologetic).',
        'Disable auto-drafts from Account → Pulse AI when you want manual control.',
      ],
      link: `/${locale}/dashboard/feedbacks`,
      linkLabelTr: 'Yorumları aç',
      linkLabelEn: 'Open reviews',
    },
    {
      num: '04',
      icon: <BarChart3 size={18} strokeWidth={2} />,
      titleTr: 'Analitik ve AI içgörüleri incele',
      titleEn: 'Review analytics and AI inferences',
      bodyTr:
        'Yanıt performansı, saatlik dağılım ve konu kırılımı (yemek/servis/atmosfer). "En çok bahsedilenler" bölümünde Pulse AI yorumlardaki ortak konuları çıkarır ve haftalık bir özet sunar.',
      bodyEn:
        'Response performance, hourly distribution and topic breakdown (food/service/atmosphere). In "Top mentions", Pulse AI pulls out common topics from the comments and adds a weekly summary.',
      bulletsTr: [
        'Müşteriler sayfasında tekrar gelen müşterileri ve kaybetme riski olanları görürsün.',
        '14 haftalık trend ve gün × saat ısı haritası en yoğun dönemleri gösterir.',
      ],
      bulletsEn: [
        'The Customers page shows returning customers and those you are at risk of losing.',
        'The 14-week trend and day × hour heatmap show your busiest times.',
      ],
      link: `/${locale}/dashboard/analytics`,
      linkLabelTr: 'Analitiği aç',
      linkLabelEn: 'Open analytics',
    },
    {
      num: '05',
      icon: <Mail size={18} strokeWidth={2} />,
      titleTr: 'Haftalık raporu her pazartesi al',
      titleEn: 'Get the weekly report every Monday',
      bodyTr:
        'Her pazartesi öğle saatlerinde (Türkiye saati) haftalık özet e-postası gelir: yorum sayısı, ortalama puan, puan dağılımı, Pulse AI\'ın haftanın öne çıkan konusu ve önümüzdeki hafta için somut bir öneri. Hesabım → Bildirimler sekmesinden açıp kapatabilirsin.',
      bodyEn:
        'Every Monday around noon (Istanbul time) the weekly summary email arrives: review count, average rating, rating distribution, Pulse AI\'s key topic of the week and a concrete tip for next week. Turn it on or off in Account → Notifications.',
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
        'Hesabım sayfasında plan durumu, üyelik tarihi ve aktivite özeti yer alır. Pulse AI sekmesinden taslakların varsayılan tonunu (samimi/resmi/özür) seç. Ekip & Roller sekmesinden ekip arkadaşlarını davet edip rol ata.',
      bodyEn:
        'The Account page shows your plan, member-since date and an activity summary. Pick the default draft tone (warm/formal/apologetic) in the Pulse AI tab. Invite teammates and assign roles in Team & roles.',
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
        'Düşük puanlı yorumlara hızlı dönüş müşteri sadakatini güçlendirir. Pulse AI taslağı hazır beklediği için yanıtlaman dakikalar sürer.',
      bodyEn:
        'Quick replies to low ratings build customer loyalty. With a Pulse AI draft waiting, replying takes minutes.',
    },
    {
      icon: <Palette size={14} strokeWidth={2} />,
      titleTr: 'QR\'da marka rengini kullan',
      titleEn: 'Use your brand colour on the QR',
      bodyTr:
        'Sihirbazdaki "Marka" şablonu işletmenin rengini kullanır. Kontrast düşükse sihirbaz uyarır; yüksek kontrast daha kolay tarama demektir.',
      bodyEn:
        'The wizard\'s "Brand" preset uses your business colour. It warns you when contrast is low; higher contrast means easier scanning.',
    },
    {
      icon: <Link2 size={14} strokeWidth={2} />,
      titleTr: 'Platform linklerini doğrula',
      titleEn: 'Verify your platform links',
      bodyTr:
        'Platform bağlantıları sayfasındaki "Tümünü kontrol et" butonu bağlı tüm platformları saniyeler içinde kontrol eder. Bozuk bir bağlantı, kaçan bir yorum demektir.',
      bodyEn:
        'The "Check all" button on the Platform links page checks every linked platform in seconds. A broken link means a missed review.',
    },
    {
      icon: <Star size={14} strokeWidth={2} />,
      titleTr: 'Varsayılan platformunu seç',
      titleEn: 'Pick a default platform',
      bodyTr:
        'Memnun kalan müşterilere Google veya Yemeksepeti gibi seçtiğin platformun yorum bağlantısı sunulur. Her müşteri istediği yere yorum yazma hakkını korur.',
      bodyEn:
        'Happy customers are offered the review link of the platform you choose, such as Google or Yemeksepeti. Every customer keeps the right to post a review wherever they want.',
    },
    {
      icon: <ShieldCheck size={14} strokeWidth={2} />,
      titleTr: 'KVKK rızası açık olsun',
      titleEn: 'Keep KVKK consent transparent',
      bodyTr:
        'Müşteri formundaki pazarlama izni her zaman isteğe bağlıdır; kutu işaretsiz gelir. Bildirim e-posta adresini işletme Ayarlar → Genel sekmesinden güncel tut.',
      bodyEn:
        'Marketing consent on the customer form is always optional — the box starts unticked. Keep your notification email up to date in the business Settings → General tab.',
    },
    {
      icon: <MessageSquare size={14} strokeWidth={2} />,
      titleTr: 'Müşteriye direkt e-posta yaz',
      titleEn: 'Email customers directly',
      bodyTr:
        'Müşteri e-posta adresi bıraktıysa yanıt formunda "Müşteriye e-posta gönder" seçeneği açılır — yanıtın doğrudan müşterinin gelen kutusuna gider.',
      bodyEn:
        'If the customer left an email address, the reply form offers "Email the customer" — your reply goes straight to their inbox.',
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
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
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
        className="overflow-hidden rounded-[24px] border border-pn-line bg-gradient-to-br from-white via-pn-canvas to-pn-accent-soft/40"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-start gap-3 lg:max-w-[640px]">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white">
              <Wand2 size={18} strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="bz-h-tight text-[18px] sm:text-[20px] text-pn-ink">
                {isTr ? 'QR oluştur · Yapıştır · Cevapla' : 'Create QR · Stick · Reply'}
              </h2>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'Sihirbazda 3 adımda QR oluştur (renk ve önizleme dahil), masaya veya menüye yapıştır. Memnun müşterilere seçtiğin platformun yorum bağlantısı sunulur; düşük puan verenler önce sana özel geri bildirim bırakabilir ve Pulse AI yanıt taslağını hazırlar.'
                  : 'Create a QR in 3 wizard steps (colour and preview included) and stick it on the table or menu. Happy customers are offered your chosen platform\'s review link; lower scores can leave private feedback first, and Pulse AI drafts your reply.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
            <Link
              href={`/${locale}/dashboard/qr?new=1`}
              className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 text-[13px] sm:min-h-[36px]"
            >
              <Wand2 size={13} strokeWidth={2.2} />
              {isTr ? 'QR sihirbazı' : 'QR wizard'}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-1.5 text-[13px] sm:min-h-[36px]"
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
            className="bz-card flex flex-col gap-3 p-5 sm:p-6"
          >
            <header className="flex items-start justify-between gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pn-accent-soft text-pn-ink">
                {step.icon}
              </span>
              <span className="tabular-nums text-[12px] font-medium text-[#A3A3A3]">
                {step.num}
              </span>
            </header>
            <div className="flex-1">
              <h3 className="bz-h-tight text-[16px] sm:text-[17px] text-pn-ink">
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
                        className="mt-1 shrink-0 text-pn-accent-ink"
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
                className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded text-[13px] font-medium text-pn-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink sm:min-h-[32px]"
              >
                {isTr ? step.linkLabelTr : step.linkLabelEn}
                <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </article>
        ))}
      </section>

      {/* Pro tips — graphite hero card, 2x3 grid (sm+). Owner için pratik
          kısa kurallar. CLAUDE.md §11 Pulse Voice — net + actionable. */}
      <section
        aria-label={isTr ? 'İpuçları' : 'Tips'}
        className="overflow-hidden rounded-[24px] bg-[#3B1F8F] text-white"
      >
        <div className="border-b border-white/10 p-5 sm:p-6">
          <h2 className="bz-h-tight text-[20px] sm:text-[22px]">
            {isTr ? 'Hızlı ve net 6 ipucu' : 'Six fast and clear tips'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip, i) => (
            <div
              key={tip.titleEn}
              // Dividers per breakpoint: 1 col → top lines, 2 cols (sm) and
              // 3 cols (lg) → top line from the 2nd row + left line between
              // columns. The old mix left row 2 at lg without its divider.
              className={`flex flex-col gap-2 border-white/10 p-5 sm:p-6 ${i > 0 ? 'border-t' : ''} ${
                i < 2 ? 'sm:border-t-0' : 'sm:border-t'
              } ${i % 2 === 1 ? 'sm:border-l' : 'sm:border-l-0'} ${
                i < 3 ? 'lg:border-t-0' : 'lg:border-t'
              } ${i % 3 !== 0 ? 'lg:border-l' : 'lg:border-l-0'}`}
            >
              <h3 className="flex items-center gap-1.5 text-[14px] font-medium text-white">
                <span className="shrink-0 text-white" aria-hidden="true">
                  {tip.icon}
                </span>
                {isTr ? tip.titleTr : tip.titleEn}
              </h3>
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
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink">
            <Sparkles size={16} strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="bz-h-tight text-[15px] text-pn-ink">
              {isTr ? 'Sektörüne özel rehberler' : 'Sector-specific guides'}
            </p>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-[#525252]">
              {isTr
                ? 'Restoran, otel, klinik, salon — sektörüne özel ipuçlarını sektör sayfalarında bulabilirsin.'
                : 'Restaurant, hotel, clinic, salon — find tips for your sector on the sector pages.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sectorGuides.map((s) => (
            <Link
              key={s.slug}
              href={`/${locale}/solutions/${s.slug}`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-pn-line bg-white px-3 py-1.5 text-[12px] font-medium text-pn-ink transition-colors hover:border-pn-ink hover:bg-pn-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink sm:min-h-[32px]"
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
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink">
            <Bell size={16} strokeWidth={2} />
          </span>
          <div>
            <p className="bz-h-tight text-[15px] text-pn-ink">
              {isTr ? 'Hâlâ sorun yaşıyor musun?' : 'Still stuck?'}
            </p>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-[#525252]">
              {isTr
                ? 'Yardım merkezindeki makalelere göz at veya ekibimize yaz.'
                : 'Browse the help center articles or write to our team.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/help`}
            className="bz-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 text-[12px] sm:min-h-[36px]"
          >
            <BookOpen size={12} strokeWidth={2} />
            {isTr ? 'Yardım merkezi' : 'Help center'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="bz-btn-primary inline-flex min-h-[44px] items-center gap-1.5 text-[12px] sm:min-h-[36px]"
          >
            <Users size={12} strokeWidth={2} />
            {isTr ? 'Ekibe yaz' : 'Contact us'}
          </Link>
        </div>
      </section>
    </div>
  );
}
