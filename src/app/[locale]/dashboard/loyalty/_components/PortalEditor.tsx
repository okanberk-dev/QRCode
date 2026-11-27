'use client';

// "Müşteri paneli" tab (CLAUDE.md §61): the business designs the page its
// customers see at /l/<slug> — theme, logo, cover, welcome text, offers,
// which blocks show, and the data-controller details for the legal texts.
// The phone on the right is the real renderer (LoyaltyPortalFrame).
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { AlertBanner, APSwitch } from '@/components/ui';
import LoyaltyPortalFrame from '@/components/loyalty/LoyaltyPortalFrame';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import { PORTAL_LIMITS as P, portalPalette, type LoyaltyPortal, type PortalTheme } from '@/lib/loyalty-portal';
import type { PortalBusinessDto } from '@/lib/loyalty-server';
import { loyaltyFetch, loyaltyMessage, type ProgramDto } from './loyalty-client';

interface Props {
  locale: 'tr' | 'en';
  restaurantId: string;
  program: ProgramDto;
  business: PortalBusinessDto | null;
  baseUrl: string;
  canManage: boolean;
  onSaved: (program: ProgramDto) => void;
}

const THEMES: Array<{ id: PortalTheme; tr: string; en: string; hintTr: string; hintEn: string }> = [
  { id: 'light', tr: 'Açık', en: 'Light', hintTr: 'Beyaz zemin, sade', hintEn: 'White, simple' },
  { id: 'brand', tr: 'Marka rengi', en: 'Brand colour', hintTr: 'Kart renginin açık tonu', hintEn: 'Tint of the card colour' },
  { id: 'dark', tr: 'Koyu', en: 'Dark', hintTr: 'Akşam, bar, kahve', hintEn: 'Evening, bar, coffee' },
];

function emptyOffer(i: number) {
  return { id: `offer-${Date.now().toString(36)}-${i}`, title: '', body: '', badge: null as string | null };
}

export default function PortalEditor({ locale, restaurantId, program, business, baseUrl, canManage, onSaved }: Props) {
  const tr = locale === 'tr';
  const [draft, setDraft] = useState<LoyaltyPortal>(program.portal);
  const [saved, setSaved] = useState<LoyaltyPortal>(program.portal);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<null | 'logo' | 'cover'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const portalUrl = `${baseUrl}/l/${program.slug}`;

  const set = <K extends keyof LoyaltyPortal>(key: K, value: LoyaltyPortal[K]) => {
    setNotice(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const upload = async (kind: 'logo' | 'cover', file: File | undefined) => {
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/restaurants/${restaurantId}/loyalty/portal/image?kind=${kind}`, { method: 'POST', body });
      const data = (await res.json().catch(() => null)) as { url?: string; code?: string } | null;
      if (!res.ok || !data?.url) throw Object.assign(new Error('upload'), { code: data?.code ?? 'IMAGE_UNPROCESSABLE' });
      set(kind === 'logo' ? 'logoUrl' : 'coverUrl', data.url);
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'IMAGE_UNPROCESSABLE';
      setError(loyaltyMessageFromCode(code, locale));
    } finally {
      setUploading(null);
      if (logoInput.current) logoInput.current.value = '';
      if (coverInput.current) coverInput.current.value = '';
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const offers = draft.offers.filter((o) => o.title.trim());
      const { program: next } = await loyaltyFetch<{ program: ProgramDto }>(`/api/restaurants/${restaurantId}/loyalty/portal`, {
        method: 'PUT',
        body: JSON.stringify({
          theme: draft.theme,
          logoUrl: draft.logoUrl,
          coverUrl: draft.coverUrl,
          headline: draft.headline?.trim() || null,
          welcome: draft.welcome?.trim() || null,
          offers: offers.map((o) => ({ id: o.id, title: o.title.trim(), body: o.body.trim(), badge: o.badge?.trim() || null })),
          showMenu: draft.showMenu,
          showContact: draft.showContact,
          showSocial: draft.showSocial,
          legalName: draft.legalName?.trim() || null,
          legalAddress: draft.legalAddress?.trim() || null,
          legalEmail: draft.legalEmail?.trim() || null,
        }),
      });
      setDraft(next.portal);
      setSaved(next.portal);
      onSaved(next);
      setNotice(tr ? 'Müşteri paneli kaydedildi; müşterileriniz hemen görür.' : 'Saved — customers see it right away.');
    } catch (err) {
      setError(loyaltyMessage(err, locale));
    } finally {
      setBusy(false);
    }
  };

  const moveOffer = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.offers.length) return;
    const next = [...draft.offers];
    [next[i], next[j]] = [next[j], next[i]];
    set('offers', next);
  };

  const label = 'mb-1.5 block text-[13px] font-medium text-[#262626]';
  const hint = 'mt-1 text-[12px] text-[#737373]';
  const card = 'bz-card space-y-4 p-4 sm:p-5';
  const disabled = !canManage;

  const previewBusiness = business ?? {
    name: '—',
    menuUrl: null,
    address: null,
    phone: null,
    website: null,
    instagramUrl: null,
    facebookUrl: null,
    whatsappUrl: null,
  };

  return (
    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-[24px] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 max-sm:bg-[#F6F6F6]">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-pn-ink">{tr ? 'Müşterilerinizin gördüğü sayfa' : 'The page your customers see'}</p>
            <p className="truncate text-[13px] text-[#737373]">{portalUrl}</p>
          </div>
          <a href={`/l/${program.slug}`} target="_blank" rel="noopener" className="bz-btn-ghost shrink-0">
            <ExternalLink size={14} className="mr-1.5 inline" aria-hidden /> {tr ? 'Sayfayı aç' : 'Open page'}
          </a>
        </div>

        {!canManage && (
          <AlertBanner kind="info">{tr ? 'Müşteri panelini işletme sahibi ya da yönetici düzenler.' : 'The owner or a manager edits the customer panel.'}</AlertBanner>
        )}

        <section className={card}>
          <h3 className="text-[15px] font-medium">{tr ? 'Görünüm' : 'Look'}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr ? 'Tema' : 'Theme'}>
            {THEMES.map((th) => {
              const pal = portalPalette(th.id, program.accentColor);
              const on = draft.theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => set('theme', th.id)}
                  className={`rounded-[20px] border p-3 text-left transition ${on ? 'border-pn-accent ring-2 ring-pn-accent' : 'border-pn-line hover:border-[#A3A3A3]'}`}
                >
                  <span className="flex h-12 overflow-hidden rounded-[14px] border border-black/5" style={{ background: pal.bg }} aria-hidden>
                    <span className="h-full w-1/3" style={{ background: pal.band }} />
                    <span className="m-2 flex-1 rounded-[10px]" style={{ background: pal.surface, border: `1px solid ${pal.border}` }} />
                    <span className="my-3 mr-2 w-6 rounded-full" style={{ background: pal.accent }} />
                  </span>
                  <span className="mt-2 block text-[14px] font-medium">{tr ? th.tr : th.en}</span>
                  <span className="block text-[12px] text-[#737373]">{tr ? th.hintTr : th.hintEn}</span>
                </button>
              );
            })}
          </div>
          <p className={hint}>
            {tr ? 'Düğme ve bant rengi, Program sekmesindeki kart renginden gelir.' : 'Buttons and the band use the card colour from the Programme tab.'}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageField
              tr={tr}
              title={tr ? 'Logo' : 'Logo'}
              hintText={tr ? 'Kare, en az 256 px. PNG / JPG / WebP.' : 'Square, at least 256 px. PNG / JPG / WebP.'}
              url={draft.logoUrl}
              square
              busy={uploading === 'logo'}
              disabled={disabled}
              inputRef={logoInput}
              onPick={(f) => void upload('logo', f)}
              onRemove={() => set('logoUrl', null)}
            />
            <ImageField
              tr={tr}
              title={tr ? 'Kapak fotoğrafı' : 'Cover photo'}
              hintText={tr ? 'Yatay (16:9). Mekânınız, vitrininiz ya da ürününüz.' : 'Landscape (16:9). Your place, window or product.'}
              url={draft.coverUrl}
              busy={uploading === 'cover'}
              disabled={disabled}
              inputRef={coverInput}
              onPick={(f) => void upload('cover', f)}
              onRemove={() => set('coverUrl', null)}
            />
          </div>
        </section>

        <section className={card}>
          <h3 className="text-[15px] font-medium">{tr ? 'Karşılama' : 'Welcome'}</h3>
          <div>
            <label htmlFor="portal-headline" className={label}>
              {tr ? 'Başlık' : 'Headline'}
            </label>
            <input
              id="portal-headline"
              value={draft.headline ?? ''}
              maxLength={P.headlineMax}
              disabled={disabled}
              onChange={(e) => set('headline', e.target.value)}
              className="bz-input w-full"
              placeholder={program.name}
            />
            <p className={hint}>{tr ? 'Boş bırakılırsa kart adı görünür.' : 'Empty → the card name shows.'}</p>
          </div>
          <div>
            <label htmlFor="portal-welcome" className={label}>
              {tr ? 'Karşılama metni' : 'Welcome text'}
            </label>
            <textarea
              id="portal-welcome"
              value={draft.welcome ?? ''}
              maxLength={P.welcomeMax}
              disabled={disabled}
              rows={3}
              onChange={(e) => set('welcome', e.target.value)}
              className="bz-input w-full resize-y py-2"
              placeholder={tr ? 'Örn. Her kahvenize bir damga; 10. kahve bizden. Mahallemize hoş geldiniz!' : 'E.g. A stamp for every coffee; the 10th is on us.'}
            />
            <p className={`${hint} text-right tabular-nums`}>
              {(draft.welcome ?? '').length}/{P.welcomeMax}
            </p>
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-medium">{tr ? 'Kampanyalar ve haberler' : 'Offers and news'}</h3>
            <span className="text-[12px] text-[#737373]">
              {draft.offers.length}/{P.offersMax}
            </span>
          </div>
          <p className={hint}>
            {tr
              ? 'Kısa duyurular: yeni ürün, haftanın menüsü, mutlu saatler. Yorum ya da puan karşılığı ödül yazmayın (Google kuralları).'
              : 'Short notes: a new product, this week’s menu, happy hour. Never offer anything for a review or rating (Google rules).'}
          </p>
          {draft.offers.map((o, i) => (
            <div key={o.id} className="space-y-2 rounded-[16px] bg-pn-canvas p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
                <input
                  value={o.title}
                  maxLength={P.offerTitleMax}
                  disabled={disabled}
                  onChange={(e) => set('offers', draft.offers.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className="bz-input w-full"
                  placeholder={tr ? 'Başlık' : 'Title'}
                  aria-label={tr ? 'Kampanya başlığı' : 'Offer title'}
                />
                <input
                  value={o.badge ?? ''}
                  maxLength={P.badgeMax}
                  disabled={disabled}
                  onChange={(e) => set('offers', draft.offers.map((x, j) => (j === i ? { ...x, badge: e.target.value || null } : x)))}
                  className="bz-input w-full"
                  placeholder={tr ? 'Etiket (Yeni)' : 'Label (New)'}
                  aria-label={tr ? 'Etiket' : 'Label'}
                />
              </div>
              <textarea
                value={o.body}
                maxLength={P.offerBodyMax}
                disabled={disabled}
                rows={2}
                onChange={(e) => set('offers', draft.offers.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                className="bz-input w-full resize-y py-2"
                placeholder={tr ? 'Kısa açıklama' : 'Short description'}
                aria-label={tr ? 'Açıklama' : 'Description'}
              />
              <div className="flex justify-end gap-1">
                <button type="button" className="bz-btn-icon" disabled={disabled || i === 0} onClick={() => moveOffer(i, -1)} aria-label={tr ? 'Yukarı taşı' : 'Move up'}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="bz-btn-icon" disabled={disabled || i === draft.offers.length - 1} onClick={() => moveOffer(i, 1)} aria-label={tr ? 'Aşağı taşı' : 'Move down'}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" className="bz-btn-icon" disabled={disabled} onClick={() => set('offers', draft.offers.filter((_, j) => j !== i))} aria-label={tr ? 'Kaldır' : 'Remove'}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {draft.offers.length < P.offersMax && (
            <button type="button" className="bz-btn-ghost" disabled={disabled} onClick={() => set('offers', [...draft.offers, emptyOffer(draft.offers.length)])}>
              <Plus size={14} className="mr-1 inline" aria-hidden /> {tr ? 'Kampanya ekle' : 'Add offer'}
            </button>
          )}
        </section>

        <section className={card}>
          <h3 className="text-[15px] font-medium">{tr ? 'Gösterilecek bloklar' : 'Blocks to show'}</h3>
          <APSwitch
            checked={draft.showMenu}
            onChange={(v) => set('showMenu', v)}
            disabled={disabled}
            label={tr ? 'Menü düğmesi' : 'Menu button'}
            sublabel={business?.menuUrl ? (tr ? 'Yayındaki dijital menünüze gider.' : 'Opens your published digital menu.') : tr ? 'Menünüz yayında değil; düğme görünmez.' : 'Your menu is not published; the button stays hidden.'}
          />
          <APSwitch
            checked={draft.showContact}
            onChange={(v) => set('showContact', v)}
            disabled={disabled}
            label={tr ? 'Ara, yol tarifi, web sitesi' : 'Call, directions, website'}
            sublabel={tr ? 'İşletme ayarlarındaki adres, telefon ve web sitesi.' : 'Address, phone and website from the business settings.'}
          />
          <APSwitch
            checked={draft.showSocial}
            onChange={(v) => set('showSocial', v)}
            disabled={disabled}
            label={tr ? 'Instagram, Facebook, WhatsApp' : 'Instagram, Facebook, WhatsApp'}
            sublabel={tr ? 'Platform bağlantılarındaki sosyal hesaplar.' : 'Social links from Platform links.'}
          />
        </section>

        <section className={card}>
          <h3 className="text-[15px] font-medium">{tr ? 'Yasal bilgiler (veri sorumlusu)' : 'Legal details (data controller)'}</h3>
          <p className={hint}>
            {tr
              ? 'Üye bilgilerinin (ad, soyad, telefon) veri sorumlusu işletmenizdir. Bu bilgiler üyelik koşullarında ve aydınlatma metninde görünür. Boş alanlar işletme adı ve adresinizle dolar.'
              : 'Your business is the data controller of member data (name, phone). These details appear in the membership terms and privacy notice. Empty fields use your business name and address.'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="portal-legal-name" className={label}>
                {tr ? 'Ticari unvan' : 'Legal name'}
              </label>
              <input id="portal-legal-name" value={draft.legalName ?? ''} maxLength={P.legalNameMax} disabled={disabled} onChange={(e) => set('legalName', e.target.value)} className="bz-input w-full" placeholder={business?.name ?? ''} />
            </div>
            <div>
              <label htmlFor="portal-legal-email" className={label}>
                {tr ? 'KVKK başvuru e-postası' : 'Privacy request e-mail'}
              </label>
              <input id="portal-legal-email" type="email" value={draft.legalEmail ?? ''} disabled={disabled} onChange={(e) => set('legalEmail', e.target.value)} className="bz-input w-full" inputMode="email" autoCapitalize="off" spellCheck={false} />
            </div>
          </div>
          <div>
            <label htmlFor="portal-legal-address" className={label}>
              {tr ? 'Adres' : 'Address'}
            </label>
            <input id="portal-legal-address" value={draft.legalAddress ?? ''} maxLength={P.legalAddressMax} disabled={disabled} onChange={(e) => set('legalAddress', e.target.value)} className="bz-input w-full" placeholder={business?.address ?? ''} />
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <a href={`/l/${program.slug}/kosullar`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
              {tr ? 'Üyelik koşullarınız' : 'Your membership terms'}
            </a>
            <a href={`/l/${program.slug}/aydinlatma`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
              {tr ? 'Aydınlatma metniniz' : 'Your privacy notice'}
            </a>
            <a href={`/${locale}/sadakat-isletme-eki`} target="_blank" rel="noopener" className="underline underline-offset-2">
              {tr ? 'Sadakat programı işletme eki' : 'Loyalty business addendum'}
            </a>
          </p>
        </section>

        {error && (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}
        {canManage && (
          <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-20 flex flex-col gap-2 rounded-[24px] bg-white p-2 pl-4 shadow-[0_14px_36px_-16px_rgba(17,17,16,0.28)] sm:flex-row sm:items-center sm:justify-between sm:rounded-[28px] lg:bottom-3">
            <span className="text-[13px] text-[#525252]">
              {notice ?? (dirty ? (tr ? 'Kaydedilmemiş değişiklikler var.' : 'You have unsaved changes.') : tr ? 'Değişiklik yok.' : 'No changes.')}
            </span>
            <div className="flex gap-2">
              {dirty && (
                <button type="button" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#F6F6F6] px-5 text-[14px] font-medium text-pn-ink transition-colors hover:bg-[#EBEBEB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:opacity-50 sm:flex-none" onClick={() => setDraft(saved)} disabled={busy}>
                  {tr ? 'Vazgeç' : 'Discard'}
                </button>
              )}
              <button type="button" className="bz-btn-primary inline-flex min-h-[44px] flex-1 items-center justify-center sm:flex-none" onClick={() => void save()} disabled={busy || !dirty || uploading !== null}>
                {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                {tr ? 'Kaydet' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start" aria-label={tr ? 'Önizleme' : 'Preview'}>
        <p className="mb-2 text-center text-[14px] font-medium text-pn-ink">{tr ? 'Canlı önizleme' : 'Live preview'}</p>
        <div className="mx-auto h-[720px] w-full max-w-[360px] overflow-hidden rounded-[40px] border-[10px] border-pn-ink bg-pn-ink shadow-[0_30px_60px_-30px_rgba(10,10,10,0.6)]">
          <div className="h-full overflow-y-auto overscroll-contain rounded-[30px] [scrollbar-width:none]">
            <LoyaltyPortalFrame
              locale={locale}
              slug={program.slug}
              portal={draft}
              business={previewBusiness}
              accentColor={program.accentColor}
              programName={program.name}
              preview
            >
              <div className="space-y-3">
                <LoyaltyCardFace
                  businessName={previewBusiness.name}
                  programName={program.name}
                  kind={program.kind}
                  balance={program.welcomeBonus}
                  rewards={program.rewards}
                  accentColor={program.accentColor}
                  locale={locale}
                />
                <div
                  className="flex min-h-[50px] items-center justify-center rounded-[24px] text-[15px] font-medium"
                  style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
                >
                  {tr ? 'Kartımı aç' : 'Open my card'}
                </div>
              </div>
            </LoyaltyPortalFrame>
          </div>
        </div>
      </aside>
    </div>
  );
}

function loyaltyMessageFromCode(code: string, locale: 'tr' | 'en'): string {
  const tr = locale === 'tr';
  if (code === 'IMAGE_TOO_LARGE') return tr ? 'Görsel çok büyük (en çok 6 MB).' : 'The image is too large (max 6 MB).';
  if (code === 'MANAGER_ONLY') return tr ? 'Bu işlem için yönetici yetkisi gerekir.' : 'This needs a manager.';
  return tr ? 'Görsel okunamadı. JPG, PNG ya da WebP deneyin.' : 'Could not read the image. Try JPG, PNG or WebP.';
}

function ImageField({
  tr,
  title,
  hintText,
  url,
  square = false,
  busy,
  disabled,
  inputRef,
  onPick,
  onRemove,
}: {
  tr: boolean;
  title: string;
  hintText: string;
  url: string | null;
  square?: boolean;
  busy: boolean;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (f: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-[#262626]">{title}</p>
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-pn-line-strong bg-pn-canvas ${square ? 'h-16 w-16' : 'h-16 w-28'}`}
        >
          {url ? (
            <img src={url} alt="" className={`h-full w-full ${square ? 'object-contain' : 'object-cover'}`} />
          ) : (
            <ImagePlus size={18} className="text-[#A3A3A3]" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="bz-btn-ghost" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
            {busy && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
            {url ? (tr ? 'Değiştir' : 'Change') : tr ? 'Yükle' : 'Upload'}
          </button>
          {url && (
            <button type="button" className="bz-btn-ghost" disabled={disabled || busy} onClick={onRemove}>
              {tr ? 'Kaldır' : 'Remove'}
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
      <p className="mt-1 text-[12px] text-[#737373]">{hintText}</p>
    </div>
  );
}
