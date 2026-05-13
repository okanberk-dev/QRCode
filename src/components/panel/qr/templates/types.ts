/**
 * Buaze QR template registry types.
 *
 * Every template exports both a React component AND a metadata object.
 * The wizard picker (`TemplatePickerStep`) iterates the registry and
 * renders a 3-col card grid; QRCard / PDF export use the same registry to
 * look up the component by `templateId` persisted on `QrGeneration`.
 *
 * Source: `qaxx/HANDOFF.md §2`.
 */

import type { ComponentType } from 'react';
import type { ModuleShape, FinderShape } from '../BuazeQR';

export type TemplateCategory = 'venue' | 'print' | 'editorial' | 'loyalty';

export interface TemplatePreview {
  /** Module colour for the picker thumb. */
  fg: string;
  /** Background colour for the picker thumb. */
  bg: string;
  module: ModuleShape;
  finder: FinderShape;
  /** Outer surface tint hint (lime / paper / black / cream). */
  surface: string;
}

export interface TemplatePrint {
  widthMm: number;
  heightMm: number;
  bleedMm?: number;
}

/**
 * Native CSS pixel dimensions of the rendered template root `<div>`.
 *
 * Used by QRCard to scale the off-screen-rendered template into the
 * 128px preview box so what the owner sees *is* what they download
 * (CLAUDE.md §23.7 — "wizard önizlemesi = indirilen birebir"). Without
 * this, the small preview would either crop or distort because each
 * template authors its own canvas size (720×900 Classic vs 760×460
 * WalletCard).
 */
export interface TemplateCanvas {
  width: number;
  height: number;
}

export interface TemplateMeta {
  id: string;
  name: string;
  /** Short Pulse-style tag shown under the card ("Lime · Nokta"). */
  tag: string;
  category: TemplateCategory;
  preview: TemplatePreview;
  print: TemplatePrint;
  /** Native CSS canvas size of the rendered template root. Required for
   *  QRCard's scaled inline preview — see `TemplateCanvas` doc. */
  canvas: TemplateCanvas;
  /** TR/EN one-line description for the picker tooltip. */
  descriptionTr?: string;
  descriptionEn?: string;
}

export interface TemplateBusiness {
  /** Member restaurant name — replaces hardcoded "Şefin Lokantası". */
  name: string;
  /** Two-letter mark — derived via `deriveInitials(name)`. */
  initials: string;
  /** Workspace brand colour (`Restaurant.primaryColor`). May be NULL. */
  primaryColor?: string | null;
  /** Table label ("A1", "12", "VIP-3"). */
  tableNumber?: string | null;
  /** Pinned platform key for owner-side context only — templates do NOT
   *  surface rating-routing to the customer (CLAUDE.md §19.1.1). */
  platform?: string | null;
}

export interface TemplateProps {
  /** The URL the QR encodes — `/r/{slug}?source=qr[&table=…][&platform=…]`. */
  qrPayload: string;
  business: TemplateBusiness;
}

export interface TemplateEntry {
  meta: TemplateMeta;
  Component: ComponentType<TemplateProps>;
}
