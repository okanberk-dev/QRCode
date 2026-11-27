'use client';

import { computeDiff, type DiffEntry } from '@/lib/email/revision-diff';

interface Props {
  before: unknown;
  after: unknown;
  /** Used in the empty-state line ("X ile karşılaştırılıyor"). */
  beforeLabel?: string;
  afterLabel?: string;
}

function truncate(s: string, max = 200): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function EntryRow({ entry }: { entry: DiffEntry }) {
  const path = (
    <code className="rounded bg-pn-canvas px-1.5 py-0.5 font-mono text-[12px] text-pn-ink">{entry.path}</code>
  );
  if (entry.kind === 'changed') {
    return (
      <div className="rounded-[14px] border border-pn-line bg-white p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">DEĞİŞTİ</span>
          {path}
        </div>
        <div className="mt-1.5 space-y-1">
          <div className="rounded border border-red-100 bg-red-50/60 p-1.5 text-[12px] text-red-700">
            <span className="pulse-eyebrow mr-1">−</span>
            {truncate(entry.before)}
          </div>
          <div className="rounded border border-emerald-100 bg-emerald-50/60 p-1.5 text-[12px] text-emerald-800">
            <span className="pulse-eyebrow mr-1">+</span>
            {truncate(entry.after)}
          </div>
        </div>
      </div>
    );
  }
  if (entry.kind === 'added') {
    return (
      <div className="rounded-[14px] border border-emerald-100 bg-emerald-50/60 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">EKLENDİ</span>
          {path}
        </div>
        <p className="mt-1.5 text-[12px] text-emerald-800">{truncate(entry.value)}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[14px] border border-red-100 bg-red-50/60 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium rounded bg-red-100 px-1.5 py-0.5 text-red-700">SİLİNDİ</span>
        {path}
      </div>
      <p className="mt-1.5 text-[12px] text-red-700">{truncate(entry.value)}</p>
    </div>
  );
}

/**
 * Field-level diff between two revision content snapshots. Visual:
 * changed (amber, before/after), added (green), removed (red). Sorted
 * by computeDiff() so changed entries surface first.
 */
export default function MailRevisionDiff({ before, after, beforeLabel, afterLabel }: Props) {
  const diff = computeDiff(
    before as Record<string, unknown>,
    after as Record<string, unknown>,
  );

  if (diff.entries.length === 0) {
    return (
      <div className="rounded-[14px] border border-pn-line bg-pn-canvas p-3 text-center text-[12px] text-[#737373]">
        Bu iki sürüm arasında değişiklik yok ({diff.unchangedCount} alan aynı).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(beforeLabel || afterLabel) && (
        <div className="text-[12px] text-[#9CA3AF]">
          {beforeLabel ?? 'önceki'} → {afterLabel ?? 'sonraki'}
        </div>
      )}
      {diff.entries.map((e, i) => (
        <EntryRow key={`${e.kind}-${e.path}-${i}`} entry={e} />
      ))}
      {diff.unchangedCount > 0 && (
        <p className="pt-1 text-center text-[12px] text-[#9CA3AF]">
          {diff.unchangedCount} alan değişmedi.
        </p>
      )}
    </div>
  );
}
