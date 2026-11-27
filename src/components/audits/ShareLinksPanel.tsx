'use client';

// Denetim Merkezi — paylaşım linki kartı (eski "Atama" akışının yerine, spec §3.3).
//
// Tek bileşen iki yerde kullanılır: detay sayfasında kart olarak, listedeki
// `ShareLinksModal` içinde düz. Veriyi ve eylemleri `useShareLinks` denetleyicisi
// verir; burası yalnız sunar. Yalnız yazma yetkisi olanlara ve arşivlenmemiş
// denetimlere mount edilir (salt-okunur üyeler link token'ı hiç almaz).

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  Share2,
} from 'lucide-react';
import { AlertBanner, APSwitch, Badge, Field, useConfirmDialog } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { AuditAssignmentRow } from '@/lib/audits/queries';
import type { AuditKind } from '@/lib/audits/kind';
import { isReusable, isUsedUp } from '@/lib/audits/assignment-state';
import { defaultOnceForKind } from '@/lib/audits/wizard-state';
import {
  buildMailtoHref,
  buildShareUrl,
  buildWhatsAppHref,
  responsesCount,
  revokeLinkConfirmCopy,
  shareLinkLabel,
  type UiLocale,
} from './audit-ui';
import Disclosure from './Disclosure';
import type { ShareLinksController } from './useShareLinks';

/** Kopyala düğmesinin sabit id'si. */
export const SHARE_COPY_BUTTON_ID = 'audit-share-copy';
/** Detay sayfasındaki paylaşım kartının sabit id'si. */
export const SHARE_CARD_ID = 'audit-share-card';

export interface ShareLinksPanelProps {
  controller: ShareLinksController;
  /** Denetim başlığı — paylaşım metninde ("Başlık: link"). */
  title: string;
  appUrl: string;
  kind: AuditKind;
  locale: UiLocale;
  /** Taslakta 0 madde varsa yayınla düğmesi kapalı ("Önce madde ekle"). */
  questionCount: number;
  /** `card`: detay sayfasında çerçeveli; `plain`: modal içinde. */
  variant?: 'card' | 'plain';
  /** Varsayılan link görünür olunca Kopyala düğmesine odaklan (`?share=1`, modal). */
  autoFocusCopy?: boolean;
  /** Daha önce yayınlanıp duraklatılmış denetim: düğme "Yeniden başlat" der. */
  paused?: boolean;
  /** Verilirse "Önce madde ekle" bu adrese giden bağlantı olur (detay sayfası). */
  addItemHref?: string;
  id?: string;
}

/** Panoya kopyalar; olmazsa kutuyu seçili bırakır (kullanıcı Ctrl/Cmd+C ile kopyalar). */
async function copyToClipboard(text: string, input: HTMLInputElement | null): Promise<'copied' | 'selected'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    /* izin yok / güvenli bağlam değil → eski yol */
  }
  if (input) {
    input.focus();
    input.select();
    try {
      if (document.execCommand('copy')) return 'copied';
    } catch {
      /* ignore */
    }
  }
  return 'selected';
}

export default function ShareLinksPanel({
  controller,
  title,
  appUrl,
  kind,
  locale,
  questionCount,
  variant = 'card',
  autoFocusCopy = false,
  paused = false,
  addItemHref,
  id,
}: ShareLinksPanelProps) {
  const isTr = locale === 'tr';
  const baseId = useId();
  const othersId = `${baseId}-others`;
  const newId = `${baseId}-new`;
  const headingId = `${baseId}-h`;

  const { published, links, loading, busy, error, defaultLink, others } = controller;

  const inputRef = useRef<HTMLInputElement>(null);
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manualHint, setManualHint] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOnce, setNewOnce] = useState(() => defaultOnceForKind(kind));
  const [live, setLive] = useState('');
  const [confirmEl, askConfirm] = useConfirmDialog();

  // `navigator.share` yalnız mount'tan sonra okunur (SSR/hidrasyon uyumu).
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  // Tür değişince (ör. ilk seçenekli soru eklenince) anahtarın varsayılanı da değişir;
  // yalnız kullanıcı henüz dokunmadıysa — form kapalıyken senkron tut.
  useEffect(() => {
    if (!newOpen) setNewOnce(defaultOnceForKind(kind));
  }, [kind, newOpen]);

  const defaultUrl = defaultLink?.token ? buildShareUrl(appUrl, defaultLink.token) : '';

  useEffect(() => {
    // preventScroll: sayfa zaten başta; odak kayması paneli ekran dışına itmesin.
    if (autoFocusCopy && defaultUrl) copyBtnRef.current?.focus({ preventScroll: true });
  }, [autoFocusCopy, defaultUrl]);

  async function copy(linkId: string, url: string, input: HTMLInputElement | null) {
    const result = await copyToClipboard(url, input);
    if (result === 'copied') {
      setManualHint(false);
      setCopiedId(linkId);
      setLive(isTr ? 'Link kopyalandı.' : 'Link copied.');
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId((c) => (c === linkId ? null : c)), 2000);
    } else {
      setManualHint(true);
      setLive(isTr ? 'Link seçildi. Kopyalamak için Ctrl+C veya Cmd+C bas.' : 'Link selected. Press Ctrl+C or Cmd+C to copy.');
    }
  }

  async function nativeShare(url: string) {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      /* kullanıcı paylaşımı kapattı */
    }
  }

  function askRevoke(link: AuditAssignmentRow) {
    const copy = revokeLinkConfirmCopy(locale);
    askConfirm({
      title: copy.title,
      body: copy.body,
      variant: 'danger',
      confirmLabel: copy.confirm,
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        const ok = await controller.revokeLink(link.id);
        if (ok) setLive(isTr ? 'Link kapatıldı.' : 'Link closed.');
      },
    });
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const ok = await controller.createLink({ name: newName, once: newOnce });
    if (ok) {
      setNewName('');
      setNewOpen(false);
      setOthersOpen(true);
      setLive(isTr ? 'Yeni link oluşturuldu.' : 'New link created.');
    }
  }

  const sectionCls =
    variant === 'card' ? 'bz-card space-y-4 p-4 sm:p-5' : 'space-y-4';
  const showHeading = variant === 'card';

  // ─── Yayında değil ────────────────────────────────────────────────────
  if (!published) {
    return (
      <section id={id} aria-labelledby={showHeading ? headingId : undefined} className={sectionCls}>
        {showHeading && (
          <h2 id={headingId} className="bz-h-tight text-[16px]">
            {isTr ? 'Paylaşım linki' : 'Share link'}
          </h2>
        )}
        <AlertBanner kind="warn">
          {paused
            ? isTr
              ? 'Bu denetim duraklatıldı. Yeniden başlatınca linkler yine çalışır.'
              : 'This audit is paused. Links work again once you restart it.'
            : isTr
              ? 'Bu denetim yayında değil. Yayınlayınca linkler çalışır.'
              : 'This audit is not live. Links work once you publish it.'}
        </AlertBanner>
        {error && (
          <AlertBanner kind="danger" onDismiss={controller.clearError}>
            {error}
          </AlertBanner>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="bz-btn-primary min-h-11 sm:min-h-0"
            onClick={() => void controller.publishAndGetLink()}
            disabled={busy !== null || questionCount === 0}
          >
            {busy === 'publish'
              ? isTr
                ? 'Yayınlanıyor…'
                : 'Publishing…'
              : paused
                ? isTr
                  ? 'Yeniden başlat'
                  : 'Restart'
                : isTr
                  ? 'Yayınla ve linki al'
                  : 'Publish and get link'}
          </button>
          {questionCount === 0 &&
            (addItemHref ? (
              <Link
                href={addItemHref}
                className="inline-flex min-h-11 items-center text-[13px] font-medium text-pn-ink underline underline-offset-2 sm:min-h-0"
              >
                {isTr ? 'Önce madde ekle' : 'Add an item first'}
              </Link>
            ) : (
              <span className="text-[12px] text-[#737373]">
                {isTr ? 'Önce madde ekle.' : 'Add an item first.'}
              </span>
            ))}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {live}
        </p>
      </section>
    );
  }

  // ─── Yayında ──────────────────────────────────────────────────────────
  const noDefault = !defaultLink;

  return (
    <section id={id} aria-labelledby={showHeading ? headingId : undefined} className={sectionCls}>
      {showHeading && (
        <h2 id={headingId} className="bz-h-tight text-[16px]">
          {isTr ? 'Paylaşım linki' : 'Share link'}
        </h2>
      )}

      {error && (
        <AlertBanner kind="danger" onDismiss={controller.clearError}>
          {error}
        </AlertBanner>
      )}

      {loading && links === null ? (
        <div className="space-y-2" aria-hidden="true">
          <SkBox className="h-11 w-full" />
          <SkBox className="h-9 w-2/3" />
        </div>
      ) : noDefault ? (
        <div className="space-y-2">
          <button
            type="button"
            className="bz-btn-primary min-h-11 sm:min-h-0"
            onClick={() => void controller.createLink({ once: false })}
            disabled={busy !== null}
          >
            <Link2 size={14} aria-hidden="true" />
            {busy === 'create' ? (isTr ? 'Oluşturuluyor…' : 'Creating…') : isTr ? 'Link oluştur' : 'Create link'}
          </button>
          <p className="text-[12px] text-[#737373]">
            {isTr
              ? 'Link oluşturunca kopyalayıp ekibine gönderebilirsin.'
              : 'Once the link exists, copy it and send it to your team.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-[10px] border border-pn-line bg-pn-canvas p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputRef}
              readOnly
              value={defaultUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={isTr ? 'Paylaşım linki' : 'Share link'}
              className="bz-input bz-mono min-w-0 flex-1"
            />
            <button
              ref={copyBtnRef}
              id={SHARE_COPY_BUTTON_ID}
              type="button"
              className="bz-btn-primary min-h-11 shrink-0 sm:min-h-0"
              onClick={() => void copy(defaultLink.id, defaultUrl, inputRef.current)}
            >
              {copiedId === defaultLink.id ? (
                <>
                  <Check size={14} aria-hidden="true" /> {isTr ? 'Kopyalandı' : 'Copied'}
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" /> {isTr ? 'Kopyala' : 'Copy'}
                </>
              )}
            </button>
          </div>

          {manualHint && (
            <p className="text-[12px] font-medium text-[#92400E]">
              {isTr
                ? 'Link seçildi. Kopyalamak için Ctrl+C (Mac’te Cmd+C) bas.'
                : 'The link is selected. Press Ctrl+C (Cmd+C on Mac) to copy.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canNativeShare ? (
              <button
                type="button"
                className="bz-btn-ghost min-h-11 sm:min-h-9"
                onClick={() => void nativeShare(defaultUrl)}
              >
                <Share2 size={14} aria-hidden="true" /> {isTr ? 'Paylaş…' : 'Share…'}
              </button>
            ) : (
              <>
                <a
                  href={buildWhatsAppHref(title, defaultUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bz-btn-ghost min-h-11 sm:min-h-9"
                >
                  <MessageCircle size={14} aria-hidden="true" />
                  {isTr ? 'WhatsApp ile gönder' : 'Send on WhatsApp'}
                </a>
                <a
                  href={buildMailtoHref(title, defaultUrl, locale)}
                  className="bz-btn-ghost min-h-11 sm:min-h-9"
                >
                  <Mail size={14} aria-hidden="true" />
                  {isTr ? 'E-posta ile gönder' : 'Send by e-mail'}
                </a>
              </>
            )}
          </div>

          <p className="text-[12px] leading-[1.5] text-[#737373]">
            {isTr
              ? 'Bu linki açan herkes denetimi telefonundan doldurabilir. Giriş gerekmez.'
              : 'Anyone with this link can fill the audit on their phone. No login needed.'}
          </p>
        </div>
      )}

      {/* Diğer linkler */}
      {others.length > 0 && (
        <div>
          <Disclosure open={othersOpen} onToggle={() => setOthersOpen((v) => !v)} controls={othersId}>
            {isTr ? `Diğer linkler (${others.length})` : `Other links (${others.length})`}
          </Disclosure>
          {othersOpen && (
            <ul id={othersId} className="mt-1 space-y-2">
              {others.map((a) => {
                const used = isUsedUp({ status: a.status, recurrence: a.recurrence });
                const url = a.token ? buildShareUrl(appUrl, a.token) : '';
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[20px] border border-pn-line bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-pn-ink">
                        {shareLinkLabel(a, locale)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[#737373]">
                        <Badge kind={isReusable(a.recurrence) ? 'ok' : 'info'} dot={false}>
                          {isReusable(a.recurrence)
                            ? isTr ? 'Sürekli' : 'Reusable'
                            : isTr ? 'Tek seferlik' : 'One-time'}
                        </Badge>
                        {used && (
                          <Badge kind="warn" dot={false}>
                            {isTr ? 'Kullanıldı' : 'Used'}
                          </Badge>
                        )}
                        <span>{responsesCount(a._count.responses, locale)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!used && url && (
                        <button
                          type="button"
                          className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8"
                          onClick={() => void copy(a.id, url, null)}
                          aria-label={
                            copiedId === a.id
                              ? isTr ? 'Kopyalandı' : 'Copied'
                              : isTr ? `Linki kopyala: ${shareLinkLabel(a, locale)}` : `Copy link: ${shareLinkLabel(a, locale)}`
                          }
                        >
                          {copiedId === a.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                        </button>
                      )}
                      <button
                        type="button"
                        className="bz-btn-ghost min-h-11 text-[#B91C1C] sm:min-h-8"
                        onClick={() => askRevoke(a)}
                        disabled={busy !== null}
                      >
                        {isTr ? 'Linki kapat' : 'Close link'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Yeni link oluştur */}
      {(defaultLink || others.length > 0) && (
        <div className="border-t border-pn-line pt-1">
          <Disclosure open={newOpen} onToggle={() => setNewOpen((v) => !v)} controls={newId}>
            <Plus size={14} aria-hidden="true" /> {isTr ? 'Yeni link oluştur' : 'Create a new link'}
          </Disclosure>
          {newOpen && (
            <form id={newId} onSubmit={submitNew} className="mt-2 space-y-3">
              <Field
                label={isTr ? 'Link adı (isteğe bağlı)' : 'Link name (optional)'}
                hint={
                  isTr
                    ? "Sadece sen görürsün. Örn. 'Mutfak tableti' veya 'Ayşe — kasiyer adayı'."
                    : "Only you see this. E.g. 'Kitchen tablet' or 'Ayşe — cashier candidate'."
                }
              >
                <input
                  className="bz-input"
                  value={newName}
                  maxLength={200}
                  onChange={(e) => setNewName(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </Field>
              <div className="space-y-1.5">
                <APSwitch
                  checked={newOnce}
                  onChange={setNewOnce}
                  label={isTr ? 'Tek seferlik olsun' : 'Make it one-time'}
                />
                <p className="text-[12px] leading-[1.5] text-[#737373]">
                  {isTr
                    ? 'Kapalıyken herkes istediği kadar doldurabilir (günlük kontrol listesi). Açıkken ilk yanıttan sonra link kapanır (örn. her aday için ayrı link).'
                    : 'Off: anyone can fill it as often as they like (daily checklist). On: the link closes after the first response (e.g. one link per candidate).'}
                </p>
                {kind === 'quiz' && (
                  <p className="text-[12px] leading-[1.5] text-[#737373]">
                    {isTr
                      ? "Test sonucu doldurana gösterilmez; yanıtları sen Sonuçlar'da görürsün."
                      : 'The test result is not shown to the person who fills it; you see the answers under Results.'}
                  </p>
                )}
              </div>
              <button type="submit" className="bz-btn-primary min-h-11 sm:min-h-0" disabled={busy !== null}>
                {busy === 'create' ? (isTr ? 'Oluşturuluyor…' : 'Creating…') : isTr ? 'Link oluştur' : 'Create link'}
              </button>
            </form>
          )}
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {live}
      </p>
      {confirmEl}
    </section>
  );
}
