// Shared helpers for mail render fixtures (tests + scripts/mail-visual-audit.mjs).
//
// Mail copy is normally DB-driven (loadMailCopy → Prisma). Fixtures pin every
// template/locale to an empty draft so renders use the inline defaults and
// never touch the database.

import { SUPPORTED_MAIL_KEYS, setMailCopyDraft } from '../../../src/lib/email/copy-loader';

export type MailFixtureLocale = 'tr' | 'en';

export interface MailRendered {
  subject: string;
  html: string;
  text: string;
}

export interface MailFixture {
  /** Unique id, `<template>` or `<template>:<variant>` (e.g. `welcome:stress`). */
  id: string;
  /** Template file base name without variant (e.g. `welcome`). */
  template: string;
  render: (locale: MailFixtureLocale) => Promise<MailRendered>;
  /** Intentionally pathological content (very long unbroken strings, long
   *  names) used to catch overflow / clipping. Every template should have one. */
  stress?: boolean;
}

export function prepareMailRender(): void {
  for (const key of SUPPORTED_MAIL_KEYS) {
    setMailCopyDraft(key, 'tr', {});
    setMailCopyDraft(key, 'en', {});
  }
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';

// Stress strings — realistic worst cases, not lorem ipsum.
export const LONG_WORD = 'Süpercalifragilistikekspiyalidoşus'.repeat(3);
export const LONG_NAME = 'Kadıköy Moda Sahil Yolu Ünlü Balıkçı Ahmet Usta ve Oğulları Deniz Ürünleri Lokantası Şubesi';
export const LONG_EMAIL = 'cok.uzun.bir.kullanici.adi.ile.yazilmis.musteri@cok-uzun-bir-alan-adi-ornegi.com.tr';
export const LONG_URL = `${APP_URL}/tr/dashboard/restaurants/clx9f3k2a0001abcdefghijklmnop/feedbacks?status=unanswered&platform=google&range=30d&token=9c2f4a8ebd71pulse9c2f4a8ebd71pulse9c2f4a8ebd71pulse`;
export const LONG_COMMENT =
  'Yemekler gerçekten çok güzeldi ama servis neredeyse kırk dakika sürdü, garson arkadaşlar çok yoğundu galiba. ' +
  'Masamıza gelen çorba soğuktu ve değiştirmelerini istediğimizde biraz tartışma yaşadık. ' +
  'Fiyatlar makul, mekan temiz, tuvaletler biraz bakımsızdı. Tekrar gelir miyim bilmiyorum. ' +
  LONG_WORD;
