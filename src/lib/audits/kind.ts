// Denetim Merkezi — türetilmiş (asla saklanmayan) meta veri.
//
// Spec §5.1. Saf fonksiyonlar, DB'siz; hem API (liste/katalog payload'ı)
// hem de UI aynı kuralları kullanır — drift olmasın diye tek modül.
//
//   - deriveAuditKind     : 'checklist' | 'quiz'  (UI: Kontrol listesi | Test)
//   - deriveAuditStatus   : 'archived' | 'live' | 'paused' | 'draft'
//   - auditSectorForBusiness : işletme kategorisi → denetim sektörü
//   - humanQuestionType   : ham `yes_no` yerine insan etiketi
//   - readableOn          : vurgu rengi üstünde okunur yazı rengi

import { detectSector } from '@/lib/sector-platforms';
import type { AuditQuestionType, AuditSector } from './types';

// ─── Kind ───────────────────────────────────────────────────────────────

export type AuditKind = 'checklist' | 'quiz';

/**
 * Herhangi bir `single | multi` soru varsa "Test" (quiz), yoksa "Kontrol
 * listesi". Türetilir, saklanmaz: soru listesi değiştikçe etiket de değişir
 * (yalnız Evet/Hayır soruları kalan bir "Test" görünür biçimde checklist'e
 * döner).
 */
export function deriveAuditKind(types: ReadonlyArray<string | null | undefined>): AuditKind {
  for (const t of types) {
    if (t === 'single' || t === 'multi') return 'quiz';
  }
  return 'checklist';
}

// ─── Status ─────────────────────────────────────────────────────────────

export type AuditStatus = 'archived' | 'live' | 'paused' | 'draft';

export interface AuditStatusInput {
  isActive: boolean;
  isPublished: boolean;
  assignmentCount: number;
  responseCount: number;
}

/**
 * Sıra önemli (spec §3.0):
 *   1. `!isActive`                       → archived  (DELETE yanıtlıysa isActive=false)
 *   2. `isPublished`                     → live
 *   3. yayında değil ama link/yanıt var  → paused    (bir zamanlar yayındaydı)
 *   4. aksi halde                        → draft
 *
 * Arşivlenmiş bir denetim `isPublished=true` kalabilir (DELETE yalnız
 * isActive'i kapatır); bu yüzden archived HER ZAMAN önce kontrol edilir.
 */
export function deriveAuditStatus(input: AuditStatusInput): AuditStatus {
  if (!input.isActive) return 'archived';
  if (input.isPublished) return 'live';
  if (input.assignmentCount > 0 || input.responseCount > 0) return 'paused';
  return 'draft';
}

// ─── Sector ─────────────────────────────────────────────────────────────

/**
 * İşletme kategorisinden denetim sektörü. `detectSector` boş/null kategori ve
 * TANIMSIZ serbest metin için `'food'` döner (default branch), yani burada
 * ayrı bir "bilinmiyor → other" fallback'i YOK:
 *
 *   food | delivery                       → 'food'
 *   hospitality                           → 'hotel'
 *   clinic                                → 'health'
 *   spa                                   → 'beauty'
 *   retail                                → 'retail'
 *   legal | fitness | education | other   → 'other'
 */
export function auditSectorForBusiness(category: string | null | undefined): AuditSector {
  switch (detectSector(category)) {
    case 'food':
    case 'delivery':
      return 'food';
    case 'hospitality':
      return 'hotel';
    case 'clinic':
      return 'health';
    case 'spa':
      return 'beauty';
    case 'retail':
      return 'retail';
    case 'legal':
    case 'fitness':
    case 'education':
    case 'other':
    default:
      return 'other';
  }
}

// ─── Human question type label ──────────────────────────────────────────

const QUESTION_TYPE_LABEL: Record<AuditQuestionType, { tr: string; en: string }> = {
  yes_no: { tr: 'Evet/Hayır', en: 'Yes/No' },
  scale: { tr: '1-5 puan', en: '1-5 rating' },
  single: { tr: 'Seçim', en: 'Choice' },
  multi: { tr: 'Çoklu seçim', en: 'Multiple choice' },
  text: { tr: 'Not', en: 'Note' },
  file: { tr: 'Fotoğraf', en: 'Photo' },
};

/**
 * `yes_no` / `single` gibi ham değerleri owner'a hiç göstermemek için insan
 * etiketi. Bilinmeyen tip → olduğu gibi (boş değil) döner ki UI boş kalmasın.
 */
export function humanQuestionType(
  type: AuditQuestionType | string,
  locale: 'tr' | 'en' = 'tr',
): string {
  const entry = QUESTION_TYPE_LABEL[type as AuditQuestionType];
  if (!entry) return String(type ?? '');
  return locale === 'en' ? entry.en : entry.tr;
}

// ─── Readable text colour on an accent background ──────────────────────

const READABLE_DARK = '#0A0A0A';
const READABLE_LIGHT = '#FFFFFF';

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  return null;
}

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG göreli parlaklık, 0 (siyah) - 1 (beyaz). Geçersiz hex → null. */
export function relativeLuminance(hex: string | null | undefined): number | null {
  if (typeof hex !== 'string') return null;
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb[0]) +
    0.7152 * channelLuminance(rgb[1]) +
    0.0722 * channelLuminance(rgb[2])
  );
}

/**
 * Vurgu (accent) rengi üstünde ikon / seçili buton yazısı için `#0A0A0A` veya
 * `#FFFFFF`. İki renkten WCAG kontrastı yüksek olanı seçer (eşik ≈ 0.179
 * parlaklık). Koyu marka rengi (#1E3A8A) → beyaz; açık (lime #C6F24E) → siyah.
 * Geçersiz / eksik hex → `#0A0A0A` (Pulse'un varsayılan accent'i lime, üstüne
 * koyu yazı gider).
 */
export function readableOn(hex: string | null | undefined): '#0A0A0A' | '#FFFFFF' {
  const lum = relativeLuminance(hex);
  if (lum === null) return READABLE_DARK;
  const contrastWithBlack = (lum + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (lum + 0.05);
  return contrastWithBlack >= contrastWithWhite ? READABLE_DARK : READABLE_LIGHT;
}
