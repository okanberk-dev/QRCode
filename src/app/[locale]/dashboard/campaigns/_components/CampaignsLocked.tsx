'use client';

// Stage 30 §38.106 — Campaign feature locked screen.
//
// Restaurant.campaignsEnabled === false durumunda owner panel'de feature
// görünür kalır (sidebar nav + page route mount) ama interactive surface
// CampaignsLocked screen ile değiştirilir. Pro framing — admin'in
// tanımladığı user'lar kullanabilir; ücretsiz user'lar feature'ı keşfeder
// + Buaze ekibi ile iletişime geçme CTA'sı görür.
//
// Pulse design: graphite hero card + lime accent + 3 benefit list +
// "Pro / Enterprise" pill badge + primary CTA (mailto:) + secondary CTA
// (faq/help link).

import Link from 'next/link';
import {
  Lock,
  Mail,
  Send,
  Sparkles,
  Users,
  CheckCheck,
} from 'lucide-react';
import { Badge, PageHeader } from '@/components/ui';

interface Props {
  locale: 'tr' | 'en';
  /** Restoran adı — multi-restaurant durumda hangi restoran için kapalı
   *  olduğunu UI'da netleştirir; tek-restoranlı owner için da context. */
  restaurantName?: string | null;
  /** Multi-restaurant: birden fazla restoranı varsa "şu an seçili olan
   *  X restoranı için" framing daha net. */
  hasMultiple?: boolean;
}

export default function CampaignsLocked({ locale, restaurantName, hasMultiple }: Props) {
  const isTr = locale !== 'en';
  const supportEmail = 'support@buaze.com';
  const subject = isTr
    ? 'Kampanya özelliği için erişim talebi'
    : 'Campaign feature access request';
  const body = isTr
    ? `Merhaba Buaze ekibi,\n\nKampanya gönderim özelliğini açtırmak istiyorum.${
        restaurantName ? `\n\nİşletme: ${restaurantName}` : ''
      }\n\nTeşekkürler.`
    : `Hi Buaze team,\n\nI'd like to enable the campaign feature for my account.${
        restaurantName ? `\n\nBusiness: ${restaurantName}` : ''
      }\n\nThanks.`;
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const benefits = isTr
    ? [
        {
          icon: Send,
          title: 'Tek tıkla toplu mail',
          body: 'Pazarlama onayı veren müşterilerine kampanya konusu + içeriği yaz, Buaze otomatik teslim eder.',
        },
        {
          icon: CheckCheck,
          title: 'Admin onayı koruması',
          body: 'Her kampanya gönderimden önce Buaze ekibi tarafından kontrol edilir; spam / KVKK ihlali engellenir.',
        },
        {
          icon: Users,
          title: 'Segment & metrik',
          body: 'Kampanya sonrası teslim edildi/başarısız/aboneliği iptal sayıları + per-recipient log raporları.',
        },
      ]
    : [
        {
          icon: Send,
          title: 'One-click bulk mail',
          body: 'Write a campaign subject + body to your opted-in customers; Buaze auto-delivers.',
        },
        {
          icon: CheckCheck,
          title: 'Admin moderation',
          body: 'Every campaign is reviewed by the Buaze team before sending; spam / GDPR risk is blocked.',
        },
        {
          icon: Users,
          title: 'Segments & metrics',
          body: 'Per-campaign delivered / failed / unsubscribed counts + per-recipient logs.',
        },
      ];

  return (
    <div className="mx-auto max-w-[960px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
      <PageHeader
        eyebrow={isTr ? 'CRM / KAMPANYALAR' : 'CRM / CAMPAIGNS'}
        title={isTr ? 'Kampanyalar' : 'Campaigns'}
        description={
          isTr
            ? 'Müşterilerine doğrudan e-posta kampanyaları gönder.'
            : 'Send email campaigns directly to your customers.'
        }
        actions={<Badge kind="warn">{isTr ? 'Pro özellik' : 'Pro feature'}</Badge>}
      />

      {/* Hero locked card */}
      <section
        className="relative overflow-hidden rounded-[20px] bg-[#0A0A0A] p-7 sm:p-10 text-white"
        aria-labelledby="campaigns-locked-heading"
      >
        {/* Lime corner accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 text-[#C6F24E]"
        >
          <Sparkles size={16} />
        </span>

        <div className="flex flex-col gap-4 max-w-[520px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/70 self-start">
            <Lock size={11} />
            {isTr ? 'ERİŞİMİN AÇIK DEĞİL' : 'ACCESS NOT ENABLED'}
          </span>

          <h2
            id="campaigns-locked-heading"
            className="bz-h-tight-2 text-[28px] sm:text-[34px] leading-[1.1]"
          >
            {isTr
              ? 'Kampanya gönderimi yakında senin için de aktif.'
              : 'Campaign sending is coming up for you too.'}
          </h2>

          <p className="text-[14px] leading-[1.65] text-white/70">
            {hasMultiple && restaurantName ? (
              isTr ? (
                <>
                  <span className="text-white">{restaurantName}</span> için
                  kampanya özelliği henüz açılmadı. Buaze ekibi entitled olan
                  her işletme için bu özelliği manuel olarak aktif eder.
                </>
              ) : (
                <>
                  The campaign feature is not enabled for{' '}
                  <span className="text-white">{restaurantName}</span> yet.
                  Buaze enables this feature manually per business after
                  approval.
                </>
              )
            ) : isTr ? (
              'Buaze ekibi entitled olan her işletme için bu özelliği manuel olarak aktif eder. Şu an hesabın için kapalı.'
            ) : (
              'Buaze enables this feature manually per business after approval. It is currently disabled for your account.'
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={mailto}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
            >
              <Mail size={14} />
              {isTr ? 'Buaze ekibine ulaş' : 'Contact Buaze team'}
            </a>
            <Link
              href={`/${locale}/help`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-[13px] text-white/80 hover:bg-white/5 transition-colors"
            >
              {isTr ? 'Nasıl çalışır?' : 'How does it work?'}
            </Link>
          </div>
        </div>
      </section>

      {/* 3 benefit cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {benefits.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.title} className="bz-card p-5">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A] mb-3"
                aria-hidden
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <div className="bz-h-tight text-[14.5px] mb-1.5">{b.title}</div>
              <p className="text-[12.5px] leading-[1.6] text-[#525252]">{b.body}</p>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[11.5px] text-[#737373] text-center">
        {isTr
          ? 'Kampanya gönderimi yalnızca pazarlama onayı veren müşterilere uygulanır. KVKK & RFC 8058 uyumlu unsubscribe link'
          : 'Campaign sending applies only to opted-in customers. KVKK & RFC 8058 compliant unsubscribe link'}
        {' · '}
        {isTr ? 'Buaze admin onayından geçer.' : 'Subject to Buaze admin approval.'}
      </p>
    </div>
  );
}
