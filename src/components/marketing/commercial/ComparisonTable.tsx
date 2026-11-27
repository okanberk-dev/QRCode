import { Fragment } from 'react';
import { Check, Minus, X } from 'lucide-react';

export type CellKind = 'yes' | 'no' | 'partial' | 'na' | 'text';

export interface ComparisonCell {
  kind: CellKind;
  /** Short visible explanation; also what screen readers announce. */
  text: string;
}

export interface ComparisonColumn {
  key: string;
  label: string;
  /** Visually emphasise this column (Buaze). */
  highlight?: boolean;
}

export interface ComparisonRow {
  label: string;
  cells: Record<string, ComparisonCell>;
}

function CellIcon({ kind }: { kind: CellKind }) {
  if (kind === 'yes') {
    return (
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--rt-brand-50)]">
        <Check size={13} strokeWidth={2.75} className="text-[var(--rt-brand-700)]" />
      </span>
    );
  }
  if (kind === 'no') {
    return (
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2]">
        <X size={13} strokeWidth={2.75} className="text-[#525252]" />
      </span>
    );
  }
  if (kind === 'partial') {
    return (
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7]">
        <Minus size={13} strokeWidth={2.75} className="text-[#92400E]" />
      </span>
    );
  }
  return null;
}

/**
 * Comparison table for the commercial pages. Every cell shows an icon AND a
 * short text, so the meaning never depends on color or icon alone and the
 * nuance ("Elle girilir", "Tek bağlantı") is visible.
 *
 * Narrow screens:
 *  - Two compared columns (the /vs pages): the row label moves onto its own
 *    line above the cells, so both columns fit at 360 px without scrolling.
 *  - More columns (/compare): the table scrolls inside its own box with the
 *    first column pinned. The page itself never scrolls sideways.
 */
export default function ComparisonTable({
  caption,
  featureLabel,
  columns,
  rows,
  minWidth = 640,
}: {
  caption: string;
  featureLabel: string;
  columns: readonly ComparisonColumn[];
  rows: readonly ComparisonRow[];
  /** Table min width in px before it starts to scroll inside its box. */
  minWidth?: number;
}) {
  // Below `sm`, a two-column comparison shows each row label as a full-width
  // line above its cells instead of a third, cramped column.
  const stack = columns.length <= 2;
  const labelCol = stack ? 'hidden sm:table-cell' : '';
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#EDEDED] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={minWidth > 0 ? { minWidth } : undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
              <th
                scope="col"
                className={`${labelCol} sticky left-0 z-10 bg-[#FAFAFA] px-4 py-4 text-[13px] font-medium text-[#737373] shadow-[1px_0_0_#EDEDED] sm:px-5`}
              >
                {featureLabel}
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-4 text-[14px] font-semibold sm:px-5 ${
                    col.highlight ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'text-[#0A0A0A]'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <Fragment key={row.label}>
                {stack ? (
                  <tr className={`sm:hidden ${ri > 0 ? 'border-t border-[#EDEDED]' : ''}`}>
                    <td
                      colSpan={columns.length}
                      className="px-4 pb-1 pt-4 text-[14px] font-semibold leading-[1.4] text-[#0A0A0A]"
                    >
                      {row.label}
                    </td>
                  </tr>
                ) : null}
                <tr className={ri > 0 ? (stack ? 'sm:border-t sm:border-[#EDEDED]' : 'border-t border-[#EDEDED]') : ''}>
                  <th
                    scope="row"
                    className={`${labelCol} sticky left-0 z-10 w-[132px] min-w-[132px] bg-white px-4 py-4 align-top text-[14px] font-medium leading-[1.4] text-[#0A0A0A] shadow-[1px_0_0_#EDEDED] sm:w-[30%] sm:px-5 sm:text-[15px]`}
                  >
                    {row.label}
                  </th>
                  {columns.map((col) => {
                    const cell = row.cells[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-4 align-top sm:px-5 sm:py-4 ${stack ? 'pb-4 pt-2' : 'py-4'} ${
                          col.highlight ? 'bg-[#EAF9B8]/40' : ''
                        }`}
                      >
                        {cell ? (
                          <span className="flex items-start gap-2.5">
                            <CellIcon kind={cell.kind} />
                            <span
                              className={`pt-0.5 text-[14px] leading-[1.4] ${
                                cell.kind === 'na' ? 'text-[#737373]' : 'text-[#1A1A1A]'
                              }`}
                            >
                              {cell.text}
                            </span>
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
