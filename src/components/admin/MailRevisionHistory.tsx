'use client';

import { useEffect, useState } from 'react';
import { GitCompare, History, Loader2, RotateCcw, X } from 'lucide-react';
import MailRevisionDiff from './MailRevisionDiff';
import { useConfirmDialog } from '@/components/ui';

interface Revision {
  id: string;
  editType: 'created' | 'updated' | 'deleted' | 'reverted';
  content: unknown;
  editedById: string | null;
  // AdminUser model has no `email` field — UI only uses `username`.
  // `email` kept as nullable for backwards compat with old API responses.
  editor: { id: string; username: string; email: string | null } | null;
  createdAt: string;
}

interface Props {
  templateKey: string;
  locale: string;
  open: boolean;
  onClose: () => void;
  onReverted: () => void;
  /**
   * Audit Fix E: parent editor'ün unsaved draft'ı varsa revert dialog'a
   * ekstra uyarı satırı eklenir. Aksi halde admin "Bu sürüme dön" tıklayıp
   * draft değişikliklerini farkında olmadan kaybedebilir.
   */
  hasUnsavedDraft?: boolean;
}

const EDIT_TYPE_LABELS: Record<string, string> = {
  created: 'Oluşturuldu',
  updated: 'Güncellendi',
  deleted: 'Silindi (varsayılana dön)',
  reverted: 'Geri alındı',
};

const EDIT_TYPE_BG: Record<string, string> = {
  created: 'bg-[#EAF9B8] text-[#0A0A0A]',
  updated: 'bg-[#FAFAFA] text-[#0A0A0A]',
  deleted: 'bg-[#FEF2F2] text-[#991B1B]',
  reverted: 'bg-[#FFFBEB] text-[#92400E]',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Slide-over modal showing the revision history of a mail template.
 * Click "Bu sürüme dön" to revert; the parent reloads the editor state
 * via `onReverted`. Up to 50 most recent revisions (server-side prune).
 */
export default function MailRevisionHistory({ templateKey, locale, open, onClose, onReverted, hasUnsavedDraft }: Props) {
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [diffOpenFor, setDiffOpenFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}/revisions`);
        // Defensive parse: server SHOULD return JSON for every status,
        // but if a stray empty-body 500 slips through (older deploy,
        // proxy stripping body, etc.) we want a useful error instead
        // of "Unexpected end of JSON input".
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          const msg = body.detail || body.error || `Sunucu hatası (HTTP ${res.status})`;
          const hint = body.hint ? ` — ${body.hint}` : '';
          throw new Error(`${msg}${hint}`);
        }
        setRevisions(body.revisions ?? []);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, templateKey, locale]);

  const onRevert = (revisionId: string) => {
    // Audit Fix E: editör'de unsaved draft varsa ekstra uyarı satırı.
    // Confirm sonrası revert API çağrısı parent'taki dirty state'i de
    // iptal eder (editor reload), bu yüzden draft kaybı geri alınamaz.
    const baseBody = 'Bu sürüme geri dönmek istediğine emin misin? Mevcut içerik otomatik olarak geçmişe (tarihçeye) eklenir, kaybolmaz.';
    const draftWarning = hasUnsavedDraft
      ? '\n\n⚠ Editörde kaydedilmemiş taslak değişiklikleriniz var — bunlar kaybolacak. Önce kaydetmek için "Vazgeç" seçin.'
      : '';
    askConfirm({
      title: 'Bu sürüme geri dön',
      body: baseBody + draftWarning,
      confirmLabel: 'Geri dön',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        setReverting(revisionId);
        setError(null);
        try {
          const res = await fetch(
            `/api/admin/mail-templates/${templateKey}/${locale}/revisions/${revisionId}/revert`,
            { method: 'POST' },
          );
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Geri dönüş başarısız');
          onReverted();
          onClose();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setReverting(null);
        }
      },
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EDEDED] p-5">
          <div className="flex items-center gap-2">
            <History size={18} strokeWidth={2} className="text-[#0A0A0A]" />
            {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily redundancy kaldırıldı. */}
            <h2 className="text-[16px] font-medium text-[#0A0A0A]">
              Sürüm geçmişi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bz-btn-icon-lg shrink-0"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="m-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">{error}</div>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
          </div>
        ) : revisions.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-[#737373]">
            Henüz hiç değişiklik yok. İlk kayıt sırasında otomatik kayıtlanacak.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {revisions.map((r, idx) => {
                const isLatest = idx === 0;
                const isExpanded = expanded.has(r.id);
                const isDiffOpen = diffOpenFor === r.id;
                const editorLabel = r.editor?.username || r.editor?.email || (r.editedById ? 'Bilinmeyen admin' : 'Sistem');
                // Diff shows "what THIS edit changed": before = the older
                // revision (idx+1), after = this revision. The oldest
                // entry compares against an empty state so its diff
                // surfaces every field the initial seed introduced.
                const olderSibling = revisions[idx + 1];
                const diffBefore = olderSibling ? olderSibling.content : {};
                const diffAfter = r.content;
                return (
                  <li key={r.id} className="rounded-xl border border-[#EDEDED] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`pulse-eyebrow rounded-full px-2 py-0.5 ${EDIT_TYPE_BG[r.editType] ?? 'bg-[#FAFAFA] text-[#0A0A0A]'}`}>
                            {EDIT_TYPE_LABELS[r.editType] ?? r.editType}
                          </span>
                          {isLatest && (
                            <span className="pulse-eyebrow rounded-full bg-[#C6F24E] px-2 py-0.5 text-[#0A0A0A]">
                              MEVCUT
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[12px] text-[#525252]">{formatDate(r.createdAt)}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{editorLabel}</p>
                      </div>
                      {!isLatest && (
                        <button
                          type="button"
                          onClick={() => onRevert(r.id)}
                          disabled={reverting !== null}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#EDEDED] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
                          title="Bu sürüme dön"
                        >
                          {reverting === r.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                          Bu sürüme dön
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.id)}
                        className="text-[11px] font-semibold text-[#737373] hover:text-[#0A0A0A]"
                      >
                        {isExpanded ? 'İçeriği gizle' : 'İçeriği göster'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffOpenFor(isDiffOpen ? null : r.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#737373] hover:text-[#0A0A0A]"
                      >
                        <GitCompare size={11} />
                        {isDiffOpen ? 'Farkı gizle' : 'Önceki sürümle farkı göster'}
                      </button>
                    </div>
                    {isExpanded && (
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#FAFAFA] p-2 text-[10px] text-[#525252]">
                        {JSON.stringify(r.content, null, 2)}
                      </pre>
                    )}
                    {isDiffOpen && (
                      <div className="mt-2">
                        <MailRevisionDiff
                          before={diffBefore}
                          after={diffAfter}
                          beforeLabel={olderSibling ? formatDate(olderSibling.createdAt) : 'Boş başlangıç'}
                          afterLabel={isLatest ? 'MEVCUT' : formatDate(r.createdAt)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
