'use client';

import { use } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Inbox,
  Link2,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle2,
  Users,
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
      link: `/${locale}/dashboard/restaurants`,
      linkLabelTr: 'İşletmeleri yönet',
      linkLabelEn: 'Manage businesses',
    },
    {
      num: '02',
      icon: <QrCode size={18} strokeWidth={2} />,
      titleTr: 'QR kodlarını oluştur ve sergile',
      titleEn: 'Create QR codes and display them',
      bodyTr:
        'Genel QR ya da masa/platform-özel QR oluştur. Yüksek çözünürlük SVG/PNG indir, masalara, menüye veya kasa yanına yerleştir. QR taranınca müşteri saniyeler içinde yorum ekranına ulaşır.',
      bodyEn:
        'Create a general QR or a per-table/per-platform QR. Download high-res SVG/PNG, place on tables, menus or near checkout. Scanning sends the customer to the feedback screen in seconds.',
      link: `/${locale}/dashboard/qr`,
      linkLabelTr: 'QR oluşturucu',
      linkLabelEn: 'QR generator',
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
      icon: <Sparkles size={14} strokeWidth={2} />,
      titleTr: 'İlk 24 saatte yanıtla',
      titleEn: 'Respond within 24 hours',
      bodyTr:
        'Düşük puan yorumlara hızlı dönüş müşteri sadakatini güçlendirir. Pulse AI taslağı hazır geldiği için tek tıkla gönderebilirsin.',
      bodyEn:
        'Quick replies on low ratings boost customer loyalty. With Pulse AI drafts ready, you can ship in one click.',
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

      {/* Adım kartları — 2-col grid (sm+), her kart adım numarası + ikon +
          başlık + açıklama + ilgili sayfaya link. Pulse bz-card primitive
          (CLAUDE.md §23.2). */}
      <section aria-label={isTr ? 'Adımlar' : 'Steps'} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

      {/* Pro tips — graphite hero card, 2x2 grid (sm+). Owner için pratik
          kısa kurallar. CLAUDE.md §11 Pulse Voice — net + actionable. */}
      <section
        aria-label={isTr ? 'İpuçları' : 'Tips'}
        className="overflow-hidden rounded-2xl bg-[#0A0A0A] text-white"
      >
        <div className="border-b border-white/10 p-5 sm:p-6">
          <Eyebrow color="#C6F24E">{isTr ? 'PRATİK KURALLAR' : 'PRACTICAL RULES'}</Eyebrow>
          <h2 className="bz-h-tight mt-1.5 text-[20px] sm:text-[22px]">
            {isTr ? 'Hızlı ve net 4 ipucu' : 'Four fast and clear tips'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {tips.map((tip, i) => (
            <div
              key={tip.titleEn}
              className={`flex flex-col gap-2 p-5 sm:p-6 ${i >= 2 ? 'sm:border-t sm:border-white/10' : ''}`}
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
