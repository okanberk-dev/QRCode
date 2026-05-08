'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APInboxCard (~180 satır).
 *
 * Compound inbox card: header + 3 action button + segmented filter
 * + items list (checkbox + avatar + name + stars + body + time) +
 * floating bulk action bar (selection > 0 iken).
 *
 * Mevcut Buaze counterpart yok — `feedbacks/_components/FeedbackList`
 * + admin/reviews custom inline JSX'ler ile farklı abstraksiyon
 * seviyelerinde. APInboxCard generic standalone primitive olarak
 * standalone surface'lerde reuse edilebilir (örn. notification
 * widget, support ticket inbox).
 *
 * Pulse §11 hex map:
 *  - card: APCard padding=0, max-w-440px
 *  - header: 14/18 padding + bottom border rgba(10,10,10,0.05)
 *  - segmented: <APSegmented size="sm">
 *  - items: 12/10 padding + rounded-10 + lime-soft (selected) /
 *    rgba(10,10,10,0.03) hover
 *  - avatar: 36×36 lime-soft / amber / red tone (rating-bazlı)
 *  - bulk bar: graphite bg + lime selected count + bulk actions
 *
 * A11y: list role implicit (li/ul); checkboxes APCheckbox primitive
 * reuse; bulk count `aria-live="polite"` (CLAUDE.md §11.20 paterni).
 */

import { type ReactNode, useState, useMemo } from 'react';
import { Filter, MoreHorizontal, RefreshCw } from 'lucide-react';
import { APCard } from './APCard';
import { APCheckbox } from './APCheckbox';
import { APIconButton } from './APIconButton';
import { APSegmented, type APSegmentedOption } from './APSegmented';

export interface APInboxItem {
  id: string;
  name: string;
  stars: number;
  body: ReactNode;
  time: string;
  /** Avatar bg tone — rating-bazlı veya custom */
  avatarTone?: 'success' | 'warn' | 'danger' | 'default';
  initial?: string;
}

export interface APInboxCardProps<T extends string> {
  /** Header label (ex. "GELEN KUTUSU") */
  headerLabel: ReactNode;
  /** Tab options — single-select */
  tabs: APSegmentedOption<T>[];
  activeTab: T;
  onTabChange: (next: T) => void;
  items: APInboxItem[];
  /** Bulk actions row (rendered when selection > 0) */
  bulkActions?: ReactNode;
  /** Selection state (controlled) */
  selected?: Record<string, boolean>;
  onSelectedChange?: (next: Record<string, boolean>) => void;
  onItemClick?: (id: string) => void;
  onFilterClick?: () => void;
  onRefreshClick?: () => void;
  onMoreClick?: () => void;
  /** Locale-aware label "X SEÇİLDİ" */
  selectedLabel?: string;
  className?: string;
}

const AVATAR_BG: Record<NonNullable<APInboxItem['avatarTone']>, string> = {
  success: '#EAF9B8',
  warn: '#FEF3C7',
  danger: '#FEF2F2',
  default: 'rgba(10,10,10,0.06)',
};

function StarsRow({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={10} height={10} viewBox="0 0 24 24">
          <path
            d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"
            fill={n >= i ? '#A8D62E' : 'rgba(10,10,10,0.1)'}
            stroke={n >= i ? '#A8D62E' : 'rgba(10,10,10,0.2)'}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export function APInboxCard<T extends string>({
  headerLabel,
  tabs,
  activeTab,
  onTabChange,
  items,
  bulkActions,
  selected: selectedProp,
  onSelectedChange,
  onItemClick,
  onFilterClick,
  onRefreshClick,
  onMoreClick,
  selectedLabel = 'SEÇİLDİ',
  className = '',
}: APInboxCardProps<T>) {
  const [internalSelected, setInternalSelected] = useState<Record<string, boolean>>({});
  const selected = selectedProp ?? internalSelected;
  const setSelected = (next: Record<string, boolean>) => {
    if (onSelectedChange) onSelectedChange(next);
    else setInternalSelected(next);
  };

  const allSel = items.length > 0 && items.every((i) => selected[i.id]);
  const anySel = items.some((i) => selected[i.id]);
  const someSel = anySel && !allSel;
  const selCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  return (
    <APCard padding={0} className={`max-w-[440px] overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between px-[18px] pt-3.5 pb-2.5"
        style={{ borderBottom: '1px solid rgba(10,10,10,0.05)' }}
      >
        <div className="flex items-center gap-2.5">
          <APCheckbox
            checked={allSel}
            indeterminate={someSel}
            onChange={(checked) => {
              const next: Record<string, boolean> = {};
              if (checked) items.forEach((i) => (next[i.id] = true));
              setSelected(next);
            }}
            size="sm"
            ariaLabel="Tümünü seç"
          />
          <span
            className="text-[11px] uppercase tracking-[0.18em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {headerLabel}
          </span>
        </div>
        <div className="flex gap-1.5">
          <APIconButton ariaLabel="Filtrele" size="sm" tone="ghost" onClick={onFilterClick}>
            <Filter size={12} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
          </APIconButton>
          <APIconButton ariaLabel="Yenile" size="sm" tone="ghost" onClick={onRefreshClick}>
            <RefreshCw size={12} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
          </APIconButton>
          <APIconButton ariaLabel="Daha fazla" size="sm" tone="ghost" onClick={onMoreClick}>
            <MoreHorizontal size={12} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
          </APIconButton>
        </div>
      </div>
      <div className="px-[18px] pt-2.5">
        <APSegmented size="sm" options={tabs} value={activeTab} onChange={onTabChange} />
      </div>
      <ul className="px-2 pt-1.5 pb-2">
        {items.map((it) => {
          const isSel = !!selected[it.id];
          const tone = it.avatarTone ?? 'default';
          return (
            <li
              key={it.id}
              onClick={() => onItemClick && onItemClick(it.id)}
              className={`grid cursor-pointer items-center gap-3 px-2.5 py-3 transition-colors duration-[140ms] ${
                isSel ? '' : 'hover:bg-[rgba(10,10,10,0.03)]'
              }`}
              style={{
                gridTemplateColumns: '20px 36px 1fr auto',
                borderRadius: 10,
                background: isSel ? '#EAF9B8' : 'transparent',
              }}
            >
              <APCheckbox
                checked={isSel}
                onChange={(v) => setSelected({ ...selected, [it.id]: v })}
                size="sm"
                ariaLabel={`${it.name} satırını seç`}
              />
              <span
                aria-hidden="true"
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: AVATAR_BG[tone],
                  color: '#0A0A0A',
                  fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
                  fontStyle: 'italic',
                  fontSize: 16,
                }}
              >
                {(it.initial ?? it.name[0]).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#0A0A0A]">{it.name}</span>
                  <StarsRow n={it.stars} />
                </div>
                <p className="m-0 truncate text-[12px] leading-[1.45] text-[#737373]">
                  {it.body}
                </p>
              </div>
              <span
                className="text-[9px] uppercase tracking-[0.18em] text-[#525252]"
                style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
              >
                {it.time}
              </span>
            </li>
          );
        })}
      </ul>
      {selCount > 0 && bulkActions ? (
        <div
          className="flex items-center justify-between gap-2 px-[18px] py-3"
          style={{ background: '#0A0A0A', borderTop: '1px solid rgba(10,10,10,0.06)' }}
        >
          <span
            aria-live="polite"
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C6F24E]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {selCount} {selectedLabel}
          </span>
          <div className="flex gap-1.5">{bulkActions}</div>
        </div>
      ) : null}
    </APCard>
  );
}
