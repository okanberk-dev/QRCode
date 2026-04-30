import type { LegalDocumentKey, LegalLocale } from '../keys';

import { KVKK_AYDINLATMA_TR, KVKK_AYDINLATMA_EN } from './kvkk-aydinlatma';
import { ACIK_RIZA_TR, ACIK_RIZA_EN } from './acik-riza';
import { GIZLILIK_TR, GIZLILIK_EN } from './gizlilik';
import { KULLANIM_SARTLARI_TR, KULLANIM_SARTLARI_EN } from './kullanim-sartlari';
import { CEREZ_POLITIKASI_TR, CEREZ_POLITIKASI_EN } from './cerez-politikasi';
import { TICARI_ILETI_TR, TICARI_ILETI_EN } from './ticari-ileti';
import { KULLANIM_SOZLESMESI_TR, KULLANIM_SOZLESMESI_EN } from './kullanim-sozlesmesi';

export interface LegalTemplateContent {
  title: string;
  description: string;
  effectiveLabel: string;
  content: string;
}

/**
 * Seed varsayılanları — admin paneli ilk kez "Varsayılana dön" derse veya
 * DB satırı yoksa renderer bu içeriğe düşer. Public sayfalar DB'den hangi
 * versiyonun aktif olduğunu okur; DB boşsa bu defaults'tan render edilir.
 */
export const LEGAL_TEMPLATE_DEFAULTS: Record<
  LegalDocumentKey,
  Record<LegalLocale, LegalTemplateContent>
> = {
  'kvkk-aydinlatma': {
    tr: KVKK_AYDINLATMA_TR,
    en: KVKK_AYDINLATMA_EN,
  },
  'acik-riza': {
    tr: ACIK_RIZA_TR,
    en: ACIK_RIZA_EN,
  },
  'gizlilik-politikasi': {
    tr: GIZLILIK_TR,
    en: GIZLILIK_EN,
  },
  'kullanim-sartlari': {
    tr: KULLANIM_SARTLARI_TR,
    en: KULLANIM_SARTLARI_EN,
  },
  'cerez-politikasi': {
    tr: CEREZ_POLITIKASI_TR,
    en: CEREZ_POLITIKASI_EN,
  },
  'ticari-ileti': {
    tr: TICARI_ILETI_TR,
    en: TICARI_ILETI_EN,
  },
  'kullanim-sozlesmesi': {
    tr: KULLANIM_SOZLESMESI_TR,
    en: KULLANIM_SOZLESMESI_EN,
  },
};

export function getLegalTemplateDefault(
  key: LegalDocumentKey,
  locale: LegalLocale,
): LegalTemplateContent {
  return LEGAL_TEMPLATE_DEFAULTS[key][locale];
}
