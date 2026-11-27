import type { ReactNode } from 'react';

/**
 * Pano number (docs/design/DASHBOARD_DESIGN.md §5.5): the whole part in ink,
 * the decimal separator + fraction in soft grey, and a leading / trailing
 * affix ("₺", "%", "★", " dk") smaller and grey. `6.010,29` → `6.010` +
 * `,29`.
 *
 * Anything that is not a plain number-ish string (a React node, "—") is
 * rendered untouched, so callers can pass whatever they already had.
 */

export interface SplitNumber {
  prefix: string;
  whole: string;
  fraction: string;
  suffix: string;
}

const NUMBER_RE = /^([^\d\-+−]*)([-+−]?\d[\d.,\s  ]*\d|[-+−]?\d)(.*)$/;

/** Pure split, exported for tests. Returns null when the value is not numeric. */
export function splitPanoNumber(value: string, locale: 'tr' | 'en' = 'tr'): SplitNumber | null {
  const text = value.trim();
  const match = NUMBER_RE.exec(text);
  if (!match) return null;
  const [, prefix, numeric, suffix] = match;
  // Decimal separator: the locale's one, when 1–2 digits follow it at the
  // end. "1.234" in Turkish is a thousands group, not a fraction.
  const decimal = locale === 'en' ? '.' : ',';
  const at = numeric.lastIndexOf(decimal);
  let whole = numeric;
  let fraction = '';
  if (at > 0) {
    const tail = numeric.slice(at + 1);
    if (/^\d{1,2}$/.test(tail)) {
      whole = numeric.slice(0, at);
      fraction = numeric.slice(at);
    }
  }
  return { prefix, whole, fraction, suffix };
}

interface PanoNumberProps {
  value: ReactNode;
  locale?: 'tr' | 'en';
  className?: string;
}

export function PanoNumber({ value, locale = 'tr', className = '' }: PanoNumberProps) {
  const text =
    typeof value === 'number'
      ? value.toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR', { maximumFractionDigits: 2 })
      : value;
  if (typeof text !== 'string') return <span className={`pn-num ${className}`}>{text}</span>;
  const parts = splitPanoNumber(text, locale);
  if (!parts) return <span className={`pn-num ${className}`}>{text}</span>;
  return (
    <span className={`pn-num ${className}`}>
      {parts.prefix && <span className="pn-num-affix">{parts.prefix}</span>}
      {parts.whole}
      {parts.fraction && <span className="pn-num-frac">{parts.fraction}</span>}
      {parts.suffix && <span className="pn-num-affix">{parts.suffix}</span>}
    </span>
  );
}

export default PanoNumber;
