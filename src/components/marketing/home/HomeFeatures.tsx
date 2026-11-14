import Link from 'next/link';
import { ArrowRight, BarChart3, Mail, QrCode, Sparkles, UtensilsCrossed, Users, type LucideIcon } from 'lucide-react';
import SectionHeader from './SectionHeader';

/**
 * "Neler elde edersiniz" — the single feature grid of the homepage (it
 * replaces the old feature cards, dark-section checklist and bento). Each
 * capability is described once, with numbers from truth.json's verifiable
 * list only. Cards link to a feature page only where one exists, so no href
 * repeats inside the list.
 */

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  link?: { href: string; label: string };
}

function features(locale: 'tr' | 'en'): Feature[] {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return [
      {
        icon: QrCode,
        title: 'QR geri bildirim',
        body: 'İşletme başına istediğiniz kadar QR kod oluşturun; 6 hazır renkten birini ya da marka renginizi seçin. QR kod sizin Buaze sayfanızı açtığı için müşterinin yönlendirileceği platformu panelden değiştirdiğinizde yeniden basmanız gerekmez.',
        link: { href: `${base}/features/review-management`, label: 'Yorum yönetimini inceleyin' },
      },
      {
        icon: Mail,
        title: 'E-posta uyarıları',
        body: '1–3 yıldızlık her yeni geri bildirimde anında e-posta alırsınız; panelde bildirim zili de yanar. Her pazartesi bir haftalık özet e-postası gelir; iki e-postayı da ayarlardan kapatabilirsiniz.',
      },
      {
        icon: Sparkles,
        title: 'Pulse AI yanıt taslakları',
        body: 'Pulse AI her geri bildirim için sıcak, resmi veya özür dileyen tonda, Türkçe ya da İngilizce 2–4 cümlelik bir taslak hazırlar. Taslağı düzenlersiniz; hiçbir yanıt siz onaylamadan gönderilmez.',
        link: { href: `${base}/features/pulse-ai`, label: "Pulse AI'ı inceleyin" },
      },
      {
        icon: BarChart3,
        title: 'Analitik',
        body: 'Son 7, 30 veya 90 günü, 12 ayı ya da seçtiğiniz aralığı inceleyin: ortalama puan, yorum sayısı, puanlardan tahmini NPS, platform ve gün-saat dağılımı. Raporu CSV olarak indirebilirsiniz.',
        link: { href: `${base}/features/analytics-reports`, label: 'Analitiği inceleyin' },
      },
      {
        icon: UtensilsCrossed,
        title: 'QR Menü',
        body: 'Sürükle-bırak dijital menü: 7 tema, ürün görselleri, 12 rozet, 12 alerjen etiketi ve menüye özel QR kod. Menü analitiğinde en çok bakılan ürünleri görürsünüz.',
        link: { href: `${base}/features/menu`, label: "QR Menü'yü inceleyin" },
      },
      {
        icon: Users,
        title: 'Ekip ve çoklu işletme',
        body: 'Ekip arkadaşlarınızı yönetici, personel veya görüntüleyici rolüyle davet edin. Birden çok işletmeniz varsa tek hesaptan aralarında geçiş yapar, son 30 günü yan yana karşılaştırırsınız.',
      },
    ];
  }
  return [
    {
      icon: QrCode,
      title: 'QR feedback',
      body: 'Create as many QR codes per business as you need, in one of 6 preset colors or your brand color. Because the QR code opens your Buaze page, you can change the platform customers are sent to in the panel without reprinting.',
      link: { href: `${base}/features/review-management`, label: 'Explore review management' },
    },
    {
      icon: Mail,
      title: 'E-mail alerts',
      body: 'Whenever new 1–3★ feedback comes in, you get an instant e-mail and the bell lights up in the panel. A weekly summary e-mail arrives every Monday; you can switch off both e-mails in settings.',
    },
    {
      icon: Sparkles,
      title: 'Pulse AI reply drafts',
      body: 'Pulse AI drafts a 2–4 sentence reply to each piece of feedback, in a warm, formal or apologetic tone, in Turkish or English. You edit the draft, and nothing is sent until you approve it.',
      link: { href: `${base}/features/pulse-ai`, label: 'Explore Pulse AI' },
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      body: 'Look at the last 7, 30 or 90 days, 12 months or a range you pick: average rating, review count, NPS estimated from ratings, and platform and day-and-hour breakdowns. Export the report as CSV.',
      link: { href: `${base}/features/analytics-reports`, label: 'Explore analytics' },
    },
    {
      icon: UtensilsCrossed,
      title: 'QR Menu',
      body: 'A drag-and-drop digital menu with 7 themes, product photos, 12 badges, 12 allergen labels and its own QR code. Menu analytics show which items get the most views.',
      link: { href: `${base}/features/menu`, label: 'Explore QR Menu' },
    },
    {
      icon: Users,
      title: 'Team and multiple businesses',
      body: 'Invite teammates as managers, staff or viewers. If you run several businesses, switch between them in one account and compare the last 30 days side by side.',
    },
  ];
}

const COPY = {
  tr: {
    eyebrow: 'Özellikler',
    title: 'Geri bildirimi toplayın, yanıtlayın ve izleyin',
    lead: 'QR kodlarınızdan gelen her geri bildirim panelinize düşer. Bu araçlarla yanıtlar, takip eder ve işi ekibinizle paylaşırsınız.',
    all: 'Tüm özellikleri inceleyin',
  },
  en: {
    eyebrow: 'Features',
    title: 'Collect, answer and track feedback',
    lead: 'Every piece of feedback from your QR codes lands in your panel. These tools help you reply, follow up and share the work with your team.',
    all: 'See all features',
  },
} as const;

export default function HomeFeatures({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];

  return (
    <section id="features" aria-labelledby="features-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
        <SectionHeader id="features-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {features(locale).map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EAF9B8] text-[#0A0A0A]"
                >
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-[20px] leading-[1.2] text-[#0A0A0A] sm:text-[22px]">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{feature.body}</p>
                {feature.link ? (
                  <div className="mt-auto pt-3">
                    <Link
                      href={feature.link.href}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      {feature.link.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href={`/${locale}/features`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#D4D4D4] bg-white px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            {copy.all}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
