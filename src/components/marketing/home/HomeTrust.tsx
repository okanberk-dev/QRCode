import Link from 'next/link';
import { ArrowRight, Check, Database, MessageSquareText } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { DATA_COPY } from '@/lib/legal/subprocessors';

/**
 * Trust — the homepage's single place for the review rules and data
 * handling. Behaviour only, never a certification (spec D2): no "uyumlu",
 * no seals. The review flow is described with the owner's threshold (D1),
 * and the AI provider is named because data handling is discussed here.
 */

const COPY = {
  tr: {
    eyebrow: 'Güven ve veri',
    title: 'Google kuralları ve KVKK: Buaze neyi yapar, neyi yapmaz',
    lead: 'Yorum akışının nasıl çalıştığını ve müşteri verilerini nasıl işlediğimizi açıkça yazıyoruz.',
    reviews: {
      title: 'Yorum akışı',
      items: [
        'Herkese açık yorum bağlantısı her puanda gösterilir.',
        'Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir. Eşiği 4 ya da 5 yıldız olarak siz seçersiniz; varsayılan 5 yıldızdır.',
        'Buaze yorum silmez, gizlemez veya değiştirmez.',
        'Sahte yorum yazmaz, yazdırmaz.',
        'Yorum karşılığında indirim, hediye veya ödül sunmaz.',
      ],
      links: [{ path: '/google-compliance', label: 'Google yorum kuralları ve Buaze' }],
    },
    data: {
      title: 'Müşteri verisi',
      items: [
        'Müşteri formunda KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır.',
        'IP adresleri 90 gün sonra anonimleştirilir.',
        DATA_COPY.hosting.tr,
        `Pulse AI taslakları ve analitikteki yapay zekâ konu özetleri için ${DATA_COPY.aiSent.tr}.`,
        'Hesap verilerinizi JSON olarak indirebilirsiniz; hesabınızı silerseniz 30 gün içinde geri alabilirsiniz.',
      ],
      links: [
        { path: '/kvkk', label: 'KVKK aydınlatma metni' },
        { path: '/veri-isleyici-sozlesmesi', label: 'Veri İşleyici Sözleşmesi' },
      ],
    },
  },
  en: {
    eyebrow: 'Trust and data',
    title: "Google's rules and data protection: what Buaze does and doesn't do",
    lead: 'We explain plainly how the review flow works and how we handle customer data.',
    reviews: {
      title: 'The review flow',
      items: [
        'The public review link is shown at every rating.',
        'Below your threshold, the customer can send you private feedback first. You set the threshold at 4 or 5 stars; the default is 5.',
        'Buaze does not delete, hide or edit reviews.',
        'It does not write fake reviews or have them written.',
        'It offers no discount, gift or reward in exchange for a review.',
      ],
      links: [{ path: '/google-compliance', label: "Google's review rules and Buaze" }],
    },
    data: {
      title: 'Customer data',
      items: [
        "The customer form asks for consent under KVKK, Turkey's data protection law; marketing consent is separate and off by default.",
        'IP addresses are anonymised after 90 days.',
        DATA_COPY.hosting.en,
        `For Pulse AI drafts and the AI topic summaries in analytics, ${DATA_COPY.aiSent.en}.`,
        'You can export your account data as JSON, and if you delete your account you can undo it within 30 days.',
      ],
      links: [
        { path: '/privacy', label: 'Privacy policy' },
        { path: '/veri-isleyici-sozlesmesi', label: 'Data Processing Agreement' },
      ],
    },
  },
} as const;

export default function HomeTrust({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const columns = [
    { key: 'reviews', icon: MessageSquareText, ...copy.reviews },
    { key: 'data', icon: Database, ...copy.data },
  ];

  return (
    <section id="trust" aria-labelledby="trust-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
        <SectionHeader id="trust-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-2">
          {columns.map((column) => {
            const Icon = column.icon;
            return (
              <article
                key={column.key}
                className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EAF9B8] text-[#0A0A0A]"
                  >
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A] sm:text-[24px]">{column.title}</h3>
                </div>
                <ul className="mt-6 space-y-4">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] leading-[1.6] text-[#333333]">
                      <span
                        aria-hidden="true"
                        className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]"
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-x-6 pt-5">
                  {column.links.map((link) => (
                    <Link
                      key={link.label}
                      href={`/${locale}${link.path}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      {link.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
