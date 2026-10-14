'use client';

// Denetim Merkezi — owner denetim detayı (spec §3.2).
//
// Sunucudan gelir (ilk boyamada iskelet yok). Yukarıdan aşağıya: geri bağlantısı,
// başlık + tek birincil eylem + menü, (yeni oluşturulduysa) "Hazır" bandı,
// paylaşım kartı, özet, maddeler, son yanıtlar. Link kartı iki görünümde de
// ekranın üst yarısındadır. Arşivlenmiş denetimde link / düzenleme yoktur.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Copy as CopyIcon,
  Download,
  Link2,
  MoreHorizontal,
  Pause,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  PulseMenu,
  PulseMenuDivider,
  PulseMenuItem,
  useConfirmDialog,
} from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type { AuditDetail } from '@/lib/audits/queries';
import { humanQuestionType } from '@/lib/audits/kind';
import { parseAuditErrorResponse, summarizeAuditError } from '@/lib/audits/error-humanizer';
import ShareLinksPanel, { SHARE_CARD_ID, SHARE_COPY_BUTTON_ID } from './ShareLinksPanel';
import { useShareLinks } from './useShareLinks';
import {
  deleteConfirmCopy,
  formatResponseStamp,
  itemsHeading,
  kindBadgeKind,
  kindLabel,
  pauseConfirmCopy,
  restoreConfirmCopy,
  statusBadgeKind,
  statusLabel,
  summaryLine,
} from './audit-ui';

interface Props {
  locale: Locale;
  detail: AuditDetail;
  appUrl: string;
  /** Salt-okunur (viewer) ekip üyesi false → yazma düğmeleri ve link kartı yok. */
  canWrite: boolean;
}

const QUESTION_PREVIEW = 5;

/** Paneldeki tüm kaydırılabilir üst öğeleri (ve sayfayı) en başa alır. */
function resetPanelScroll() {
  let el: HTMLElement | null = document.getElementById('panel-main-content');
  while (el) {
    const overflowY = window.getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop !== 0) el.scrollTop = 0;
    el = el.parentElement;
  }
  window.scrollTo(0, 0);
}

export default function AuditDetailClient({ locale, detail, appUrl, canWrite }: Props) {
  const isTr = locale === 'tr';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { template, recentResponses, lastResponseAt } = detail;
  const archived = template.status === 'archived';
  const live = template.status === 'live';
  const hasResponses = template._count.responses > 0;
  const justCreated = searchParams.get('share') === '1' && !archived && canWrite;

  const base = `/${locale}/dashboard/audits`;
  const resultsHref = `${base}/${template.id}/results`;
  const editHref = `${base}/${template.id}/edit`;
  const csvHref = `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}/responses/export`;
  const api = `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}`;

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Düzenleme ekranı kaydedince `?saved=1` ile döner: bir kez "Kaydedildi." göster,
  // sonra adresten kaldır (yenilemede eski bir kayıt bildirimi tekrar çıkmasın).
  const justSaved = searchParams.get('saved') === '1';

  // Oluşturucudan gelince sayfa en üstten açılsın. Masaüstünde kabuğun kendi kaydırma
  // alanı var; Next.js yönlendirmede onu sıfırlamaz → paylaşım kartı ekran dışında kalırdı.
  useEffect(() => {
    if (justCreated || justSaved) resetPanelScroll();
  }, [justCreated, justSaved]);

  useEffect(() => {
    if (!justSaved) return;
    setNotice(isTr ? 'Kaydedildi.' : 'Saved.');
    const params = new URLSearchParams(window.location.search);
    params.delete('saved');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [justSaved, isTr]);
  const [showAll, setShowAll] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();
  const busyRef = useRef(false);

  const controller = useShareLinks({
    restaurantId: template.restaurantId,
    templateId: template.id,
    kind: template.kind,
    locale,
    // Salt-okunur üyeler link almaz → hook ilk çekimi yapmasın.
    initialLinks: canWrite ? detail.assignments : [],
    isPublished: template.isPublished,
    onPublished: () => router.refresh(),
  });

  // Fork kaynağı hâlâ yayında + yanıt yok (reset rotasının kuralı).
  const canRestore =
    canWrite &&
    !archived &&
    !!template.forkedFromId &&
    !!template.forkedFrom?.isPublished &&
    !!template.forkedFrom?.isActive &&
    !hasResponses;

  async function run(
    fn: () => Promise<Response>,
    onOk: (res: Response) => void | Promise<void>,
  ): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(summarizeAuditError(parsed));
        return;
      }
      await onOk(res);
    } catch {
      setError(isTr ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function focusShareCard() {
    const target = document.getElementById(SHARE_COPY_BUTTON_ID) ?? document.getElementById(SHARE_CARD_ID);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (target as HTMLElement | null)?.focus?.({ preventScroll: true });
  }

  function handleDuplicate() {
    void run(
      () => fetch(`${api}/duplicate`, { method: 'POST' }),
      async (res) => {
        const json = (await res.json().catch(() => ({}))) as { data?: { id?: string } };
        if (json.data?.id) router.push(`${base}/${json.data.id}`);
        else router.refresh();
      },
    );
  }

  function askPause() {
    const copy = pauseConfirmCopy(locale);
    askConfirm({
      title: copy.title,
      body: copy.body,
      variant: 'danger',
      confirmLabel: copy.confirm,
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: () =>
        run(
          () =>
            fetch(api, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ publish: false }),
            }),
          () => {
            setNotice(isTr ? 'Denetim duraklatıldı.' : 'Audit paused.');
            router.refresh();
          },
        ),
    });
  }

  function askRestore() {
    const copy = restoreConfirmCopy(locale);
    askConfirm({
      title: copy.title,
      body: copy.body,
      variant: 'danger',
      confirmLabel: copy.confirm,
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: () =>
        run(
          () => fetch(`${api}/reset`, { method: 'POST' }),
          () => {
            setNotice(
              isTr
                ? "Hazır şablona dönüldü. Denetim duraklatıldı; hazır olunca 'Yeniden başlat'a bas."
                : "Restored the ready-made version. The audit is paused; press 'Restart' when ready.",
            );
            router.refresh();
          },
        ),
    });
  }

  function askDelete() {
    const copy = deleteConfirmCopy(hasResponses, locale);
    askConfirm({
      title: copy.title,
      body: copy.body,
      variant: 'danger',
      confirmLabel: copy.confirm,
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: () =>
        run(
          () => fetch(api, { method: 'DELETE' }),
          () => {
            router.push(base);
          },
        ),
    });
  }

  // ─── Birincil eylem ───────────────────────────────────────────────────
  let primary: { label: string; onClick: () => void; disabled?: boolean } | null = null;
  if (canWrite && !archived) {
    if (live) {
      primary = { label: isTr ? 'Linki paylaş' : 'Share link', onClick: focusShareCard };
    } else if (template.status === 'paused') {
      primary = {
        label: isTr ? 'Yeniden başlat' : 'Restart',
        onClick: () => void controller.publishAndGetLink(),
        disabled: template.questions.length === 0,
      };
    } else {
      primary = {
        label: isTr ? 'Yayınla ve linki al' : 'Publish and get link',
        onClick: () => void controller.publishAndGetLink(),
        disabled: template.questions.length === 0,
      };
    }
  }

  const heading = itemsHeading(template.kind, locale);
  const visibleQuestions = showAll ? template.questions : template.questions.slice(0, QUESTION_PREVIEW);

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-6 sm:px-7 lg:py-8">
      <div>
        <Link
          href={base}
          className="inline-flex min-h-11 items-center gap-1 text-[13px] text-[#737373] hover:text-[#0A0A0A] sm:min-h-0 sm:text-[12px]"
        >
          <ArrowLeft size={13} aria-hidden="true" /> {isTr ? 'Denetim Merkezi' : 'Audit Center'}
        </Link>
      </div>

      {/* Başlık */}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1
            className="bz-h-tight-2 min-w-0 truncate"
            style={{ fontSize: 'clamp(24px, 4vw, 32px)', lineHeight: 1.15 }}
            title={template.title}
          >
            {template.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge kind={kindBadgeKind(template.kind)} dot={false}>
              {kindLabel(template.kind, locale)}
            </Badge>
            <Badge kind={statusBadgeKind(template.status)}>{statusLabel(template.status, locale)}</Badge>
          </div>
          {template.description && (
            <p className="mt-3 max-w-2xl whitespace-pre-line break-words text-[13px] leading-[1.55] text-[#525252]">
              {template.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {primary && (
            <button
              type="button"
              className="bz-btn-primary min-h-11 sm:min-h-9"
              onClick={primary.onClick}
              disabled={primary.disabled || busy || controller.busy !== null}
            >
              <Link2 size={14} aria-hidden="true" /> {controller.busy === 'publish' ? (isTr ? 'Yayınlanıyor…' : 'Publishing…') : primary.label}
            </button>
          )}
          <Link href={resultsHref} className="bz-btn-ghost min-h-11 sm:min-h-9">
            {isTr ? `Sonuçlar (${template._count.responses})` : `Results (${template._count.responses})`}
          </Link>

          {canWrite && (
            <PulseMenu
              trigger={
                <button
                  type="button"
                  className="bz-btn-icon h-11 w-11 sm:h-9 sm:w-9"
                  aria-label={isTr ? 'Diğer işlemler' : 'More actions'}
                  disabled={busy}
                >
                  <MoreHorizontal size={16} aria-hidden="true" />
                </button>
              }
            >
              {!archived && (
                <PulseMenuItem icon={<Pencil size={14} />} onSelect={() => router.push(editHref)}>
                  {isTr ? 'Düzenle' : 'Edit'}
                </PulseMenuItem>
              )}
              <PulseMenuItem icon={<CopyIcon size={14} />} onSelect={handleDuplicate}>
                {isTr ? 'Kopyala' : 'Duplicate'}
              </PulseMenuItem>
              {hasResponses && (
                <PulseMenuItem
                  icon={<Download size={14} />}
                  onSelect={() => window.location.assign(csvHref)}
                >
                  {isTr ? 'Tablo olarak indir (CSV)' : 'Download as table (CSV)'}
                </PulseMenuItem>
              )}
              {canRestore && (
                <PulseMenuItem icon={<RotateCcw size={14} />} onSelect={askRestore}>
                  {isTr ? 'Hazır şablona geri dön' : 'Restore the ready-made version'}
                </PulseMenuItem>
              )}
              {live && (
                <PulseMenuItem icon={<Pause size={14} />} onSelect={askPause}>
                  {isTr ? 'Duraklat' : 'Pause'}
                </PulseMenuItem>
              )}
              {!archived && (
                <>
                  <PulseMenuDivider />
                  <PulseMenuItem icon={<Trash2 size={14} />} danger onSelect={askDelete}>
                    {isTr ? 'Sil' : 'Delete'}
                  </PulseMenuItem>
                </>
              )}
            </PulseMenu>
          )}
        </div>
      </header>

      {primary?.disabled && template.questions.length === 0 && (
        <p className="-mt-2 text-[12px] text-[#737373]">
          {isTr ? 'Yayınlamak için önce ' : 'To publish, first '}
          <Link href={editHref} className="font-semibold underline">
            {isTr ? 'madde ekle' : 'add an item'}
          </Link>
          .
        </p>
      )}

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {archived && (
        <AlertBanner kind="info">
          {isTr
            ? 'Bu denetim arşivlendi. Linkler kapandı, yanıtlar korunuyor.'
            : 'This audit is archived. Its links are closed; responses are kept.'}
        </AlertBanner>
      )}

      {justCreated && live && (
        <AlertBanner kind="success">
          {isTr
            ? 'Hazır. Linki kopyalayıp ekibine gönder.'
            : 'Ready. Copy the link and send it to your team.'}
        </AlertBanner>
      )}

      {canWrite && !archived && (
        <ShareLinksPanel
          id={SHARE_CARD_ID}
          controller={controller}
          title={template.title}
          appUrl={appUrl}
          kind={template.kind}
          locale={locale}
          questionCount={template.questions.length}
          autoFocusCopy={justCreated}
        />
      )}

      {/* Özet */}
      <p className="text-[13px] text-[#525252]">
        {summaryLine(template.questions.length, template._count.responses, lastResponseAt, locale)}
        {template.passingScore != null && (
          <span className="text-[#737373]">
            {' · '}
            {isTr ? `Geçme puanı ${template.passingScore}` : `Pass mark ${template.passingScore}`}
          </span>
        )}
      </p>

      {/* Maddeler / Sorular */}
      <section aria-labelledby="audit-items-h" className="space-y-2">
        <h2 id="audit-items-h" className="bz-h-tight text-[16px]">
          {heading}
        </h2>
        {template.questions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-4 py-5 text-center text-[13px] text-[#737373]">
            {isTr ? 'Henüz madde yok.' : 'No items yet.'}
          </p>
        ) : (
          <>
            <ol className="space-y-1.5">
              {visibleQuestions.map((q, i) => (
                <li
                  key={q.id}
                  className="flex items-start gap-2.5 rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5"
                >
                  <span className="bz-mono mt-0.5 w-5 shrink-0 text-right text-[12px] text-[#737373]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[14px] leading-snug text-[#0A0A0A]">{q.prompt}</p>
                    <p className="mt-1 text-[11.5px] text-[#737373]">
                      {humanQuestionType(q.type, locale)}
                      {!q.isRequired && (isTr ? ' · zorunlu değil' : ' · not required')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {template.questions.length > QUESTION_PREVIEW && (
              <button
                type="button"
                className="bz-btn-ghost min-h-11 sm:min-h-9"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
              >
                {showAll
                  ? isTr
                    ? 'Daha az göster'
                    : 'Show less'
                  : isTr
                    ? `Tümünü göster (${template.questions.length})`
                    : `Show all (${template.questions.length})`}
              </button>
            )}
          </>
        )}
      </section>

      {/* Son yanıtlar */}
      <section aria-labelledby="audit-recent-h" className="space-y-2">
        <h2 id="audit-recent-h" className="bz-h-tight text-[16px]">
          {isTr ? 'Son yanıtlar' : 'Recent responses'}
        </h2>
        {recentResponses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-4 py-5 text-center text-[13px] text-[#737373]">
            {isTr ? 'Henüz yanıt yok.' : 'No responses yet.'}
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {recentResponses.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`${base}/${template.id}/responses/${r.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 hover:bg-[#FAFAFA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6F24E]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[#0A0A0A]">
                        {r.respondentName?.trim() || (isTr ? 'Anonim' : 'Anonymous')}
                      </span>
                      <span className="block text-[12px] text-[#737373]">
                        {formatResponseStamp(r.completedAt ?? r.createdAt, locale)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {template.passingScore != null && r.passed !== null && (
                        <Badge kind={r.passed ? 'ok' : 'danger'} dot={false}>
                          {r.passed ? (isTr ? 'Geçti' : 'Passed') : isTr ? 'Kaldı' : 'Failed'}
                        </Badge>
                      )}
                      <span className="bz-mono text-[13px] text-[#0A0A0A]">
                        {r.score !== null ? `${Math.round(r.score)}/100` : '—'}
                      </span>
                      <ChevronRight size={14} aria-hidden="true" className="text-[#A3A3A3]" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={resultsHref}
              className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#0A0A0A] hover:underline sm:min-h-9"
            >
              {isTr ? 'Tüm sonuçlar' : 'All results'} <span aria-hidden="true">→</span>
            </Link>
          </>
        )}
      </section>

      {confirmEl}
    </div>
  );
}
