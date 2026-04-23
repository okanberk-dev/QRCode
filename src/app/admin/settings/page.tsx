'use client';

import { useState } from 'react';
import {
  Bell,
  Briefcase,
  Building2,
  CreditCard,
  Key,
  Palette,
  Plug,
  Users,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';

type TabId = 'account' | 'brand' | 'integrations' | 'automation' | 'team' | 'billing' | 'notifications' | 'api';

export default function AdminSettingsPage() {
  return (
    <SuperadminBlock>
      <AdminSettingsBody />
    </SuperadminBlock>
  );
}

function AdminSettingsBody() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [tab, setTab] = useState<TabId>('account');

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { id: 'account', label: isTr ? 'Hesap' : 'Account', icon: Briefcase },
    { id: 'brand', label: isTr ? 'Marka' : 'Brand', icon: Palette },
    { id: 'integrations', label: isTr ? 'Entegrasyonlar' : 'Integrations', icon: Plug },
    { id: 'automation', label: isTr ? 'Otomasyon' : 'Automation', icon: Workflow },
    { id: 'team', label: isTr ? 'Ekip' : 'Team', icon: Users },
    { id: 'billing', label: isTr ? 'Faturalandırma' : 'Billing', icon: CreditCard },
    { id: 'notifications', label: isTr ? 'Bildirimler' : 'Notifications', icon: Bell },
    { id: 'api', label: 'API', icon: Key },
  ];

  return (
    <div className="space-y-4">
      <header>
        <p className="pulse-eyebrow text-[#737373]">{isTr ? 'PANEL / AYARLAR' : 'PANEL / SETTINGS'}</p>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
          {isTr ? 'Çalışma alanı ayarları' : 'Workspace settings'}
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-[#EDEDED] bg-white p-2">
          <nav className="space-y-0.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    active
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <Icon size={14} strokeWidth={2} />
                  <span className="font-medium">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
          {tab === 'account' && <AccountPanel isTr={isTr} />}
          {tab === 'brand' && (
            <Placeholder
              icon={Palette}
              title={isTr ? 'Marka kimliği' : 'Brand identity'}
              body={
                isTr
                  ? 'Logo, renk, yazı tipi ve QR şablonu burada yönetilecek. Restoran seviyesinde marka ayarı için İşletmeler → Detay → Menü tema paneline bakabilirsin.'
                  : 'Logo, color, font and QR template settings land here. Restaurant-level brand config is in Restaurants → Detail → Menu theme panel.'
              }
            />
          )}
          {tab === 'integrations' && (
            <Placeholder
              icon={Plug}
              title={isTr ? 'Entegrasyonlar' : 'Integrations'}
              body={
                isTr
                  ? 'Google Business Profile, Slack, Zapier ve webhook bağlantıları buraya gelecek. OAuth akışı backend bağlandıktan sonra aktif olur.'
                  : 'Google Business Profile, Slack, Zapier and webhook connections will live here once the OAuth backend ships.'
              }
              cta={{ label: isTr ? 'Google bağlantı isteği' : 'Request Google connect', onClick: () => connect('google') }}
            />
          )}
          {tab === 'automation' && (
            <Placeholder
              icon={Workflow}
              title={isTr ? 'Otomasyon kuralları' : 'Automation rules'}
              body={
                isTr
                  ? 'Puan eşiği, anahtar kelime veya platforma göre otomatik yanıt / atama / webhook kuralları. API hazır (/api/automations), UI listesi bir sonraki aşamada eklenir.'
                  : 'Rating, keyword, or platform-based auto-reply/assign/webhook rules. API is live (/api/automations); list UI ships next.'
              }
            />
          )}
          {tab === 'team' && (
            <Placeholder
              icon={Users}
              title={isTr ? 'Ekip & roller' : 'Team & roles'}
              body={
                isTr
                  ? 'Kullanıcı daveti, rol yönetimi ve konum bazlı erişim. Ayrıntı için sol menüden “Ekip” bölümüne geç.'
                  : 'Invite teammates, manage roles, and scope by location. See the "Team" entry in the sidebar for full management.'
              }
              cta={{ label: isTr ? 'Ekip sayfasına git' : 'Go to Team page', href: '/admin/team' }}
            />
          )}
          {tab === 'billing' && (
            <Placeholder
              icon={CreditCard}
              title={isTr ? 'Faturalandırma' : 'Billing'}
              body={
                isTr
                  ? 'Plan, ödeme yöntemi ve fatura geçmişi “Faturalandırma” sayfasında listelenir.'
                  : 'Plan, payment method and invoice history live on the "Billing" page.'
              }
              cta={{ label: isTr ? 'Faturalandırmayı aç' : 'Open billing', href: '/admin/billing' }}
            />
          )}
          {tab === 'notifications' && (
            <Placeholder
              icon={Bell}
              title={isTr ? 'Bildirim tercihleri' : 'Notification preferences'}
              body={
                isTr
                  ? 'E-posta, SMS, Slack ve webhook tercihleri “Bildirimler” sayfasından yönetilir.'
                  : 'Email, SMS, Slack and webhook preferences live on the "Notifications" page.'
              }
              cta={{ label: isTr ? 'Bildirimleri aç' : 'Open notifications', href: '/admin/notifications' }}
            />
          )}
          {tab === 'api' && (
            <Placeholder
              icon={Key}
              title={isTr ? 'API & Webhook' : 'API & Webhooks'}
              body={
                isTr
                  ? 'Kişisel API anahtarları oluştur, webhook hedefleri tanımla. /api/api-keys uç noktası hazır, UI sonraki aşamada.'
                  : 'Personal API tokens and webhook targets. /api/api-keys endpoint is live; UI ships next.'
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

async function connect(provider: 'google') {
  try {
    const res = await fetch(`/api/integrations/${provider}/connect`, { method: 'POST' });
    if (res.status === 501) {
      alert('Yakında bağlanacak.');
    }
  } catch {
    /* noop */
  }
}

function Placeholder({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  body: string;
  cta?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <h2 className="text-[20px] font-medium text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#525252]">{body}</p>
      </div>
      {cta && (cta.href ? (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A0A0A] bg-white px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
        >
          {cta.label}
        </Link>
      ) : (
        <button
          onClick={cta.onClick}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A0A0A] bg-white px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
        >
          {cta.label}
        </button>
      ))}
    </div>
  );
}

function AccountPanel({ isTr }: { isTr: boolean }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-medium text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
          {isTr ? 'Hesap' : 'Account'}
        </h2>
        <p className="mt-1 text-[13px] text-[#525252]">
          {isTr
            ? 'Profil bilgilerini ve şifreni mevcut "Profilim" sayfasından yönetebilirsin.'
            : 'Profile details and password are managed on the "Profile" page.'}
        </p>
      </div>
      <Link
        href="/admin/profile"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
      >
        <Building2 size={12} /> {isTr ? 'Profilim' : 'My profile'}
      </Link>

      <div className="rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4 text-[12px] text-[#737373]">
        {isTr
          ? 'Çalışma alanı adı, saat dilimi ve varsayılan dil gibi hesap geneli ayarlar — backend modeli hazırlandığında buradan yönetilecek.'
          : 'Workspace name, timezone and default language settings — available once the backend model is ready.'}
      </div>
    </div>
  );
}
