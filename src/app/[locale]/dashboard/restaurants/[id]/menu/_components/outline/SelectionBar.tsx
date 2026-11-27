'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleSlash, Eye, EyeOff, FolderInput, MoreHorizontal, Percent, Trash2 } from 'lucide-react';
import { PanelSelectionBar, type PanelSelectionAction } from '@/components/ui';
import { Sheet } from '../kit/Sheet';
import { flagPatch, type FlagOp } from '../menu-status';
import type { CategoryShape } from '../menu-types';
import { useIsSmUp } from '../menu-ui';
import { useStudio } from '../studio/studio-context';

/** Bulk delete asks first from this many items (G13). */
export const BULK_DELETE_CONFIRM_AT = 5;

/**
 * Fixed action bar while rows are selected (spec §7.7, G3). Every bulk change
 * is N requests (4 at a time) with one undo entry. An action is disabled when
 * it would change nothing. Phones get the four most used actions; the rest
 * sit under "Diğer…". The bar's height is published as `--menu-stack` so
 * toasts and scrolled-to rows stay above it.
 */
export function SelectionBar({
  selection, categories, onClear,
}: {
  selection: Set<string>;
  categories: CategoryShape[];
  onClear: () => void;
}) {
  const { copy, locale, actions, openBulkPrice, openMoveDialog, askConfirm, categoryCount } = useStudio();
  const smUp = useIsSmUp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const ids = useMemo(() => [...selection], [selection]);
  const items = useMemo(
    () => categories.flatMap((c) => c.items.filter((i) => selection.has(i.id))),
    [categories, selection],
  );
  const can = (op: FlagOp) => items.some((i) => flagPatch(op, i) !== null);

  useEffect(() => {
    const root = document.documentElement;
    const bar = wrapRef.current?.querySelector<HTMLElement>('[role="region"]');
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => root.style.setProperty('--menu-stack', `${Math.round(bar.offsetHeight) + 8}px`));
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--menu-stack');
    };
    // Mounted only while something is selected, so the bar exists for the whole life of this effect.
  }, []);

  const run = (key: string, task: () => Promise<unknown>) => {
    setMoreOpen(false);
    setBusy(key);
    void task().finally(() => setBusy(null));
  };
  const flags = (op: FlagOp) => run(op, () => actions.bulkSetFlags(ids, op));
  const remove = () => {
    setMoreOpen(false);
    const go = () =>
      run('delete', async () => {
        const r = await actions.bulkDelete(ids);
        if (r.ok) onClear();
      });
    if (ids.length >= BULK_DELETE_CONFIRM_AT) {
      askConfirm({
        title: copy.fmt.bulkDeleteTitle(ids.length),
        body: copy.fmt.bulkDeleteBody,
        confirmLabel: copy.selection.delete,
        cancelLabel: copy.dialogs.cancel,
        variant: 'danger',
        onConfirm: go,
      });
    } else go();
  };

  const all: Record<string, PanelSelectionAction> = {
    markAvailable: {
      key: 'markAvailable', label: copy.selection.markAvailable, icon: <CheckCircle2 size={13} strokeWidth={2} />,
      onClick: () => flags('markAvailable'), disabled: !can('markAvailable'), loading: busy === 'markAvailable', variant: 'lime',
    },
    markSoldOut: {
      key: 'markSoldOut', label: copy.selection.markSoldOut, icon: <CircleSlash size={13} strokeWidth={2} />,
      onClick: () => flags('markSoldOut'), disabled: !can('markSoldOut'), loading: busy === 'markSoldOut',
    },
    price: {
      key: 'price', label: copy.selection.price, icon: <Percent size={13} strokeWidth={2} />,
      onClick: () => openBulkPrice(ids), disabled: items.length === 0,
    },
    hide: {
      key: 'hide', label: copy.selection.hide, icon: <EyeOff size={13} strokeWidth={2} />,
      onClick: () => flags('hide'), disabled: !can('hide'), loading: busy === 'hide',
    },
    show: {
      key: 'show', label: copy.selection.show, icon: <Eye size={13} strokeWidth={2} />,
      onClick: () => flags('show'), disabled: !can('show'), loading: busy === 'show',
    },
    move: {
      key: 'move', label: copy.selection.move, icon: <FolderInput size={13} strokeWidth={2} />,
      onClick: () => {
        setMoreOpen(false);
        openMoveDialog(ids);
      },
      disabled: items.length === 0 || categoryCount < 2,
    },
    delete: {
      key: 'delete', label: copy.selection.delete, icon: <Trash2 size={13} strokeWidth={2} />,
      onClick: remove, disabled: items.length === 0, loading: busy === 'delete', variant: 'danger',
    },
  };

  const barActions: PanelSelectionAction[] = smUp
    ? [all.markAvailable, all.markSoldOut, all.price, all.hide, all.show, all.move, all.delete]
    : [
        all.markSoldOut,
        all.markAvailable,
        all.price,
        { key: 'more', label: copy.selection.more, icon: <MoreHorizontal size={13} strokeWidth={2} />, onClick: () => setMoreOpen(true) },
      ];

  return (
    <div ref={wrapRef}>
      <PanelSelectionBar
        count={selection.size}
        countClassName="text-[13px] font-medium text-white"
        label={copy.selection.selectedLabel}
        ariaLabel={copy.selection.barAria}
        actions={barActions}
        onClear={onClear}
        clearLabel={copy.selection.clear}
        countLocale={locale === 'tr' ? 'tr-TR' : 'en-US'}
      />
      {moreOpen && (
        <Sheet open onRequestClose={() => setMoreOpen(false)} side="bottom" title={copy.selection.moreTitle}>
          <div className="grid gap-2">
            {[all.hide, all.show, all.move, all.delete].map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className={`flex min-h-[48px] items-center gap-3 rounded-[20px] border px-4 text-left text-[14px] font-medium disabled:opacity-40 ${
                  a.variant === 'danger' ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]' : 'border-pn-line-strong bg-white text-pn-ink'
                }`}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
