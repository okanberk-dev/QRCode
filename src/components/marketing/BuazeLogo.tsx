'use client';

import { useState } from 'react';

// 'on-lime' is kept as an alias of 'on-brand' for older callers (the brand
// surface used to be lime; it is now Getir-style purple).
type LogoVariant = 'default' | 'on-dark' | 'on-brand' | 'on-lime';

interface BuazeLogoProps {
  size?: number;
  className?: string;
  variant?: LogoVariant;
  imageUrl?: string | null;
}

// Brand symbol — speech bubble with ECG pulse line + purple accent spark.
// Graphite + purple spark on light surfaces, white + light-purple spark on
// graphite / deep purple, white + lavender spark on the purple brand fill
// (purple surfaces always carry white marks).
// Falls back to SVG when imageUrl is missing, empty, not an absolute URL, or fails to load.
export default function BuazeLogo({ size = 40, className = '', variant = 'default', imageUrl }: BuazeLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const isUsableUrl =
    typeof imageUrl === 'string' &&
    imageUrl.trim().length > 0 &&
    (imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('data:'));

  if (isUsableUrl && !imgFailed) {
    return (

      <img
        src={imageUrl as string}
        width={size}
        height={size}
        className={className}
        alt="Buaze"
        style={{ objectFit: 'contain' }}
        // Above-the-fold navbar mark on every surface. `decoding="async"`
        // keeps the main thread free during PNG/SVG decode without
        // `loading="lazy"` (which would defer the request and hurt LCP).
        // Width/height attrs already prevent CLS. CLAUDE.md §40.1 + §38.A.
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }

  const onBrand = variant === 'on-brand' || variant === 'on-lime';
  const fg = variant === 'on-dark' || onBrand ? '#FFFFFF' : '#0A0A0A';
  // #8C6CF0 keeps >= 4.5:1 on graphite and on the deep-purple footer frame.
  const accent = onBrand ? '#DCD3F6' : variant === 'on-dark' ? '#8C6CF0' : '#5D3EBC';
  const stroke = 3.2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Buaze Logo"
      role="img"
    >
      {/* Comment bubble — asymmetric, tail at lower-left */}
      <path
        d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z"
        fill="none"
        stroke={fg}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      {/* ECG pulse line inside bubble */}
      <path
        d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28"
        fill="none"
        stroke={fg}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent spark — top-right */}
      <circle cx="54" cy="10" r="5" fill={accent} />
    </svg>
  );
}
