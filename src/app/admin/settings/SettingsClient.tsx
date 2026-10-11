'use client';

import { useEffect, useState } from 'react';
import {
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
import { AlertBanner, PageHeader } from '@/components/ui';

type TabId = 'account' | 'brand' | 'integrations' | 'automation' | 'team' | 'billing' | 'api';

// Rendered inside <SuperadminBlock> by the server page (page.tsx), which
// resolves the admin role from the cookie.
export default function SettingsClient() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [tab, setTab] = useState<TabId>('account');
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationsNotice, setIntegrationsNotice] = useState<string | null>(null);

  // The Google OAuth callback returns here with `?google=<status>`; surface
  // the outcome instead of dropping the admin back on a silent page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;
    setTab('integrations');
    if (status === 'connected') {
      setIntegrationsNotice(isTr ? 'Google hesabın bağlandı.' : 'Your Google account is connected.');
    } else if (status === 'cancelled') {
      setIntegrationsError(isTr ? 'Google bağlantısı iptal edildi.' : 'Google connection was cancelled.');
    } else {
      setIntegrationsError(
        isTr
          ? 'Google bağlantısı tamamlanamadı. Lütfen tekrar dene.'
          : 'The Google connection could not be completed. Please try again.',
      );
    }
    params.delete('google');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async (provider: 'google') => {
    setIntegrationsError(null);
    setIntegrationsNotice(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Without returnTo the callback lands on the owner dashboard
        // (/tr/dashboard/account), which an admin session cannot open.
        body: JSON.stringify({ returnTo: '/admin/settings' }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      if (data?.configured === false) {
        setIntegrationsError(
          isTr
            ? 'Google bağlantısı bu ortamda henüz yapılandırılmamış.'
            : 'Google connection is not configured in this environment yet.',
        );
        return;
      }
      setIntegrationsError(isTr ? 'Bağlantı başlatılamadı.' : 'Connection could not be started.');
    } catch {
      setIntegrationsError(isTr ? 'Bağlantı hatası.' : 'Connection error.');
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { id: 'account', label: isTr ? 'Hesap' : 'Account', icon: Briefcase },
    { id: 'brand', label: isTr ? 'Marka' : 'Brand', icon: Palette },
    { id: 'integrations', label: isTr ? 'Entegrasyonlar' : 'Integrations', icon: Plug },
    { id: 'automation', label: isTr ? 'Otomasyon' : 'Automation', icon: Workflow },
    { id: 'team', label: isTr ? 'Ekip' : 'Team', icon: Users },
    { id: 'billing', label: isTr ? 'Faturalandırma' : 'Billing', icon: CreditCard },
    { id: 'api', label: 'API', icon: Key },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'AYARLAR' : 'SETTINGS'}
        title={isTr ? 'Çalışma alanı ayarları' : 'Workspace settings'}
        description={
          isTr
            ? 'Hesap, marka, entegrasyon, ekip ve fatura tercihlerini buradan yönet.'
            : 'Manage account, brand, integrations, team, and billing preferences.'
        }
      />

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-[#EDEDED] bg-white p-2">
          <nav
            className="space-y-0.5"
            role="tablist"
            aria-orientation="vertical"
            aria-label={isTr ? 'Ayar bölümleri' : 'Settings sections'}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
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

        <section role="tabpanel" className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
          {tab === 'account' && <AccountPanel isTr={isTr} />}
          {tab === 'brand' && (
            <Placeholder
              icon={Palette}
              title={isTr ? 'Marka kimliği' : 'Brand identity'}
              body={
                isTr
                  ? 'Logo, renk, yazı tipi ve QR şablonu burada yönetilecek. İşletme seviyesinde marka ayarı için İşletmeler → Detay → Menü tema paneline bakabilirsin.'
                  : 'Logo, color, font and QR template settings land here. Restaurant-level brand config is in Restaurants → Detail → Menu theme panel.'
              }
            />
          )}
          {tab === 'integrations' && (
            <div className="space-y-4">
              {integrationsError && (
                <AlertBanner kind="danger" onDismiss={() => setIntegrationsError(null)}>
                  {integrationsError}
                </AlertBanner>
              )}
              {integrationsNotice && (
                <AlertBanner kind="success" onDismiss={() => setIntegrationsNotice(null)}>
                  {integrationsNotice}
                </AlertBanner>
              )}
              <Placeholder
                icon={Plug}
                title={isTr ? 'Entegrasyonlar' : 'Integrations'}
                body={
                  isTr
                    ? 'Google İşletme Profili hesabını bağlayarak yorumlarını panelden takip edebilirsin. Zapier ve webhook bağlantıları yakında burada olacak.'
                    : 'Connect your Google Business Profile account to follow your reviews from the panel. Zapier and webhook connections are coming here soon.'
                }
                cta={{ label: isTr ? 'Google hesabını bağla' : 'Connect Google account', onClick: () => handleConnect('google') }}
              />
            </div>
          )}
          {tab === 'automation' && (
            <Placeholder
              icon={Workflow}
              title={isTr ? 'Otomasyon kuralları' : 'Automation rules'}
              body={
                isTr
                  ? 'Puan eşiği, anahtar kelime veya platforma göre otomatik yanıt / atama / webhook kuralları. Bu özellik planlanıyor; hazır olduğunda burada yönetilecek.'
                  : 'Rating, keyword, or platform-based auto-reply/assign/webhook rules. This feature is planned — it will be managed here once it ships.'
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
          {tab === 'api' && (
            <Placeholder
              icon={Key}
              title={isTr ? 'API & Webhook' : 'API & Webhooks'}
              body={
                isTr
                  ? 'Kişisel API anahtarları oluştur, yenile ve iptal et. Anahtar yönetimi hazır — “API & Webhook” sayfasından yönet. Webhook hedefleri (olay → dış adres) yakında.'
                  : 'Create, rotate, and revoke personal API tokens. Key management is live — manage it on the “API & Webhooks” page. Webhook targets (event → external URL) are coming soon.'
              }
              cta={{ label: isTr ? 'API & Webhook sayfasını aç' : 'Open API & Webhooks', href: '/admin/api' }}
            />
          )}
        </section>
      </div>
    </div>
  );
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
        <h2 className="text-[20px] font-medium text-[#0A0A0A]">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#525252]">{body}</p>
      </div>
      {cta && (cta.href ? (
        <Link
          href={cta.href}
          className="bz-btn"
        >
          {cta.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={cta.onClick}
          className="bz-btn"
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
        <h2 className="text-[20px] font-medium text-[#0A0A0A]">
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
          ? 'Çalışma alanı adı, saat dilimi ve varsayılan dil gibi hesap geneli ayarlar yakında buradan yönetilecek.'
          : 'Workspace name, timezone and default language settings will be managed here soon.'}
      </div>
    </div>
  );
}
