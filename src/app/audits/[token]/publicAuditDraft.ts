// Denetim doldurma taslağı (spec §3.8, D4). Saf yardımcılar — React yok, `window`
// yok: depolama dışarıdan verilir, böylece Node test runner'ı ile sınanır.
//
// Neden `sessionStorage` (localStorage DEĞİL): sekme yeniden yüklendiğinde — ya da
// telefon kilitlenip işletim sistemi sekmeyi atıp geri getirdiğinde — cevaplar
// kaybolmasın; ama sekme kapatılınca taslak da gitsin. Mutfaktaki ortak tablette
// bir sonraki kişi önceki kişinin yarım cevaplarını / adını görmemeli. Hatırlanan
// bir "katılımcı kimliği" YOKTUR (başkasının yanıtını önceki kişiye yazar, kişisel
// veriyi kullanıcı bir şey yapmadan saklar).
//
// Fotoğraf cevapları (base64 data URL, ~600 KB) ASLA yazılmaz: ~5 MB kotayı
// doldurur ve yazma hatasına yol açar. Fotoğraflar yenilemeden sonra yeniden çekilir.

import type { PublicAnswerValue } from '@/components/audits/PublicQuestionInput';

export const DRAFT_PREFIX = 'bz_audit_draft_';
/** Taslak bu süreden eskiyse yok sayılır (12 saat). */
export const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** Saat farkı toleransı: gelecekte (>5 dk) damgalı taslak geçersizdir. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface AuditDraft {
  answers: Record<string, PublicAnswerValue>;
  name: string;
  ts: number;
}

/** `Storage`'ın kullandığımız dar yüzü (test için sahte verilebilir). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Anahtar linkin ilk 16 karakteriyle sınırlıdır (token'ın tamamı depolanmaz). */
export function draftKey(token: string): string {
  return `${DRAFT_PREFIX}${token.slice(0, 16)}`;
}

/** `sessionStorage` erişimi (gizli modda / engellenmişse fırlatabilir) → null. */
export function getSessionStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isDataUrl(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith('data:');
}

/** Fotoğraf (data URL) cevaplarını çıkarır; kalanı olduğu gibi döner. */
export function stripPhotoAnswers(
  answers: Record<string, PublicAnswerValue>,
): Record<string, PublicAnswerValue> {
  const out: Record<string, PublicAnswerValue> = {};
  for (const [qid, value] of Object.entries(answers)) {
    if (isDataUrl(value)) continue;
    if (Array.isArray(value) && value.some(isDataUrl)) continue;
    out[qid] = value;
  }
  return out;
}

function sanitizeAnswers(raw: unknown): Record<string, PublicAnswerValue> {
  const out: Record<string, PublicAnswerValue> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [qid, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
      out[qid] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      out[qid] = value as string[];
    }
    // null / bilinmeyen tipler: taslağa girmez (cevapsız demektir)
  }
  return stripPhotoAnswers(out);
}

/** Taslakta saklanacak bir şey var mı? (boş cevap + boş ad → depolamaya gerek yok) */
function hasContent(answers: Record<string, PublicAnswerValue>, name: string): boolean {
  if (name.trim().length > 0) return true;
  return Object.values(answers).some((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

/**
 * Taslağı yazar. Yazılacak içerik yoksa mevcut taslağı siler. Depolama
 * hata verirse (kota, gizli mod) sessizce `false` döner — doldurma akışı
 * taslak olmadan da çalışmaya devam eder.
 */
export function saveDraft(
  storage: StorageLike | null,
  token: string,
  state: { answers: Record<string, PublicAnswerValue>; name: string },
  now: number = Date.now(),
): boolean {
  if (!storage) return false;
  try {
    const answers = stripPhotoAnswers(state.answers);
    const name = state.name.slice(0, 200);
    if (!hasContent(answers, name)) {
      storage.removeItem(draftKey(token));
      return true;
    }
    const draft: AuditDraft = { answers, name, ts: now };
    storage.setItem(draftKey(token), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Taslağı okur; yoksa, bozuksa ya da ≤12 saatten eskiyse `null` (eskisi de
 * silinir). Cevaplar yeniden temizlenir (fotoğraf yok, yalnız bilinen tipler).
 */
export function loadDraft(
  storage: StorageLike | null,
  token: string,
  now: number = Date.now(),
): AuditDraft | null {
  if (!storage) return null;
  const key = draftKey(token);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      storage.removeItem(key);
      return null;
    }
    const p = parsed as { answers?: unknown; name?: unknown; ts?: unknown };
    const ts = typeof p.ts === 'number' && Number.isFinite(p.ts) ? p.ts : NaN;
    if (!Number.isFinite(ts) || now - ts > DRAFT_MAX_AGE_MS || ts - now > FUTURE_SKEW_MS) {
      storage.removeItem(key);
      return null;
    }
    const answers = sanitizeAnswers(p.answers);
    const name = typeof p.name === 'string' ? p.name.slice(0, 200) : '';
    if (!hasContent(answers, name)) return null;
    return { answers, name, ts };
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      /* yok say */
    }
    return null;
  }
}

/** Başarılı gönderimden / "Bir tane daha doldur"dan sonra taslağı siler. */
export function clearDraft(storage: StorageLike | null, token: string): void {
  if (!storage) return;
  try {
    storage.removeItem(draftKey(token));
  } catch {
    /* yok say */
  }
}
