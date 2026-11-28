// "Buaze ile" — what changed since the business started with Buaze
// (lib/since-buaze.ts builds the rows; only real, stored values). Server
// component: no state, rendered on the owner home.
import { ArrowDownRight, ArrowUpRight, MessageSquareText, QrCode, Star, TrendingUp } from 'lucide-react';
import type { SinceBuazeView, SinceRow } from '@/lib/since-buaze';

const ICONS: Record<SinceRow['key'], React.ReactNode> = {
  googleRating: <Star size={17} aria-hidden="true" />,
  googleCount: <MessageSquareText size={17} aria-hidden="true" />,
  qrRating: <TrendingUp size={17} aria-hidden="true" />,
  collected: <QrCode size={17} aria-hidden="true" />,
};

export default function SinceBuazeCard({ view, isTr }: { view: SinceBuazeView; isTr: boolean }) {
  return (
    <section className="bz-card p-5 sm:p-6" aria-labelledby="since-buaze-title">
      <header className="mb-4">
        <h2 id="since-buaze-title" className="pn-card-title text-pn-ink">
          {isTr ? 'Buaze ile' : 'With Buaze'}
        </h2>
        {view.since && <p className="mt-1 text-[13px] text-[#9A9A9A]">{view.since}</p>}
      </header>
      <ul className="flex flex-col gap-2">
        {view.rows.map((row) => (
          <li key={row.key} className="pn-row min-h-[64px]">
            <span className="pn-row-icon">{ICONS[row.key]}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-pn-ink">{row.label}</span>
              <span className="block truncate text-[13px] text-[#9A9A9A]">{row.sub}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[16px] font-medium tabular-nums text-pn-ink">{row.value}</span>
              {row.change && (
                <span className={`pn-change pn-change--${row.change.tone}`}>
                  {row.change.tone === 'up' && <ArrowUpRight size={12} aria-hidden="true" />}
                  {row.change.tone === 'down' && <ArrowDownRight size={12} aria-hidden="true" />}
                  {row.change.text}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
