import { prisma } from '@/lib/prisma';
import type { LegalDocumentKey, LegalLocale } from './keys';
import { loadActiveLegalDocument } from './loader';
import type { ConsentSource, ConsentSubjectType } from './keys';

/**
 * Onay log'u kaydeder. Admin paneli "Müşteri X bu sözleşmenin Y. versiyonuna
 * Z tarihinde onay verdi" sorusunu cevaplayabilsin diye snapshot fields
 * (documentKey/locale/version) denormalize tutulur — belge silinse bile
 * audit log kalır.
 *
 * Hata fırlatmaz; consent yazımı sırasındaki herhangi bir patlama
 * çağıran request'i (kayıt, feedback submit) kırmamalı. console.error ile
 * Sentry'ye düşer (CLAUDE.md §26).
 */
export async function recordConsent(input: {
  key: LegalDocumentKey;
  locale: LegalLocale;
  subjectType: ConsentSubjectType;
  subjectId: string;
  source: ConsentSource;
  granted?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const snapshot = await loadActiveLegalDocument(input.key, input.locale);
    await prisma.legalConsent.create({
      data: {
        documentId: snapshot.source === 'db'
          ? await resolveDocumentId(input.key, input.locale)
          : null,
        documentKey: input.key,
        locale: input.locale,
        version: snapshot.version,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        source: input.source,
        granted: input.granted ?? true,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    // An e-mail subject id is personal data: log only that one was given
    // (CLAUDE.md §37.7 — console.error lands in Sentry `extra`).
    console.error('[legal] recordConsent failed', {
      key: input.key,
      locale: input.locale,
      subjectType: input.subjectType,
      ...(input.subjectType === 'email' ? { hasSubject: Boolean(input.subjectId) } : { subjectId: input.subjectId }),
      err,
    });
  }
}

async function resolveDocumentId(
  key: LegalDocumentKey,
  locale: LegalLocale,
): Promise<string | null> {
  try {
    const row = await prisma.legalDocument.findUnique({
      where: { key_locale: { key, locale } },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Birden çok belge için tek seferde consent log'u (review form aynı
 * anda KVKK + ticari ileti onayı topluyor). Concurrent execute'lu — her
 * kayıt bağımsız, biri hata atarsa diğeri etkilenmez.
 */
export async function recordConsentBatch(
  base: Omit<Parameters<typeof recordConsent>[0], 'key' | 'granted'>,
  items: Array<{ key: LegalDocumentKey; granted?: boolean }>,
): Promise<void> {
  await Promise.allSettled(
    items.map((item) =>
      recordConsent({
        ...base,
        key: item.key,
        granted: item.granted,
      }),
    ),
  );
}

/**
 * Stage 31b §38.108 (§45'de genişletildi) — Onboarding consent backfill.
 *
 * Onboarding `complete` endpoint'inde çağrılır. Register flow'u 4 zorunlu
 * belgeye onay log atıyor (UI checkbox + recordConsentBatch). Ama:
 *   - Google sign-in akışı (`/api/auth/google`) mevcut LegalConsent log
 *     atmıyor (Google butonu UI'da yasal checkbox göstermez); bu user'lar
 *     `/onboarding`'a düşer ve /complete sonrası 4 zorunlu belgeye onay
 *     vermiş sayılır.
 *   - "Davet sonrası" register akışı da onaylı sayılır.
 *
 * Pattern: lookup-first (LegalConsent missing belgeleri tespit) → eksikse
 * recordConsent. Idempotent — onboarding tekrar çağrılırsa duplicate row
 * yazmaz. Fail-soft: log fail onboarding'i kırmamalı (CLAUDE.md §21.27
 * paterni reuse).
 */
export async function ensureOnboardingConsents(input: {
  userId: string;
  locale: LegalLocale;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const requiredKeys: LegalDocumentKey[] = [
    'kullanim-sartlari',
    'gizlilik-politikasi',
    'kvkk-aydinlatma',
    // §45 — İçerik/yanıt sorumluluğu onayı (reply/message content
    // responsibility). Google sign-in flow için de backfill kapsamına
    // alındı ki reply-gönderim akışı KVKK aydınlatma yükümlülüğüyle aynı
    // garantiye sahip olsun.
    'kabul-edilebilir-kullanim',
  ];
  try {
    const existing = await prisma.legalConsent.findMany({
      where: {
        subjectType: 'user',
        subjectId: input.userId,
        documentKey: { in: requiredKeys as readonly string[] as string[] },
        granted: true,
      },
      select: { documentKey: true },
    });
    const existingKeys = new Set(existing.map((c) => c.documentKey));
    const missing = requiredKeys.filter((k) => !existingKeys.has(k));
    if (missing.length === 0) return;
    await recordConsentBatch(
      {
        locale: input.locale,
        subjectType: 'user',
        subjectId: input.userId,
        source: 'onboarding',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      missing.map((key) => ({ key, granted: true })),
    );
  } catch (err) {
    // Fail-soft — onboarding flow'u kırmamalı (CLAUDE.md §21.27 paterni).
    console.error('[legal] ensureOnboardingConsents failed', {
      userId: input.userId,
      err,
    });
  }
}
