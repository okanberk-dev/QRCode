// Denetim Merkezi — tek sayfa builder (oluştur + düzenle) için saf durum
// yardımcıları. React yok, DB yok; `tests/audits-builder-state.test.ts` kapsar.
//
// Builder bileşeni (`AuditBuilderClient`) yalnız sunum ve olay bağlar; "ilk durum
// nasıl kurulur", "ne doğrulanır", "sunucuya ne gider" kararları burada, test
// edilebilir biçimde durur.

import { deriveAuditKind, type AuditKind } from '@/lib/audits/kind';
import { isScorableByDefinition } from '@/lib/audits/score';
import {
  checkQuestionForSave,
  fromServerQuestion,
  normalizeQuestionForSave,
  toCreateQuestions,
  toPatchQuestions,
  type AuditBuilderQuestion,
  type PatchQuestionPayload,
  type ServerQuestionRow,
} from '@/lib/audits/question-normalize';
import {
  defaultShareAssignment,
  deriveScoringMode,
  type AuditTemplatePatchInput,
  type AuditTemplateSubmitInput,
} from '@/lib/audits/wizard-state';
import type { AuditLocale, AuditScoringMode, AuditSector } from '@/lib/audits/types';

// ─── Sunucudan gelen kaynaklar ──────────────────────────────────────────

export interface BuilderRestaurantOption {
  id: string;
  name: string;
  category: string | null;
}

export interface BuilderCategoryOption {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: string;
}

/** `?from=<hazır şablon>`: katalogdan "Kopyala ve düzenle". */
export interface BuilderForkSource {
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  categoryId: string | null;
  locale: AuditLocale;
  questions: ServerQuestionRow[];
}

/** Düzenlenen denetim (`getAuditForEdit`). */
export interface BuilderEditSource {
  id: string;
  restaurantId: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: AuditLocale;
  categoryId: string | null;
  isPublished: boolean;
  /** `expectedUpdatedAt` olarak geri gönderilir (STALE_EDIT koruması). */
  updatedAt: string;
  hasResponses: boolean;
  questions: ServerQuestionRow[];
  /** Yanıt almış sorular → tür / seçenek / uygun cevap / ağırlık kilitli, silinemez. */
  answeredQuestionIds: string[];
}

export type BuilderMode = 'create' | 'edit';

// ─── İlk durum ──────────────────────────────────────────────────────────

export interface BuilderInitialState {
  title: string;
  description: string;
  locale: AuditLocale;
  questions: AuditBuilderQuestion[];
  /** Geçme puanı kutusunun ham metni ('' = yok). */
  passingScoreInput: string;
  /** Sahibin (ya da kaynağın) seçtiği sektör; null = işletmeden türet. */
  sectorOverride: AuditSector | null;
  /** Açıkça seçilmiş puan modu; null = sorulardan türet. */
  scoringOverride: AuditScoringMode | null;
  categoryId: string | null;
  /** Hızlı ekleme çipinin ve "Ne tür bir denetim?" seçiminin başlangıcı. */
  startKind: AuditKind;
}

/**
 * Sunucu / şablon soru satırlarını builder sorularına çevirir (sıra korunur,
 * `sortOrder` (i+1)*10'a oturur). `persisted: true` → `persistedId` dolar ve
 * kaydetmede `id` gönderilir; `false` (hazır şablondan kopya) → hepsi yeni soru.
 */
export function questionsFromRows(
  rows: readonly ServerQuestionRow[],
  opts: { persisted: boolean },
): AuditBuilderQuestion[] {
  return rows
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((row, i) => {
      const q = fromServerQuestion(row);
      return { ...q, persistedId: opts.persisted ? row.id : null, sortOrder: (i + 1) * 10 };
    });
}

function passingToInput(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/** Mod + kaynak → builder'ın ilk durumu. */
export function buildInitialState(args: {
  mode: BuilderMode;
  fork?: BuilderForkSource | null;
  edit?: BuilderEditSource | null;
}): BuilderInitialState {
  if (args.mode === 'edit' && args.edit) {
    const e = args.edit;
    const questions = questionsFromRows(e.questions, { persisted: true });
    return {
      title: e.title,
      description: e.description ?? '',
      locale: e.locale,
      questions,
      passingScoreInput: passingToInput(e.passingScore),
      // Düzenlerken kayıtlı sektör / kategori işletmeyle birlikte oynamaz.
      sectorOverride: e.sector,
      scoringOverride: null,
      categoryId: e.categoryId,
      startKind: deriveAuditKind(questions.map((q) => q.type)),
    };
  }
  if (args.fork) {
    const f = args.fork;
    const questions = questionsFromRows(f.questions, { persisted: false });
    return {
      title: f.title,
      description: f.description ?? '',
      locale: f.locale,
      questions,
      passingScoreInput: passingToInput(f.passingScore),
      sectorOverride: f.sector,
      // Tohumlanmış "Geçti / Kaldı" korunur; diğer modlar ağırlıklardan türetilir
      // (ağırlıkların hepsi 1 iken 'weighted' ile 'percentage' aynı sonucu verir).
      scoringOverride: f.scoringMode === 'pass_fail' ? 'pass_fail' : null,
      categoryId: f.categoryId,
      startKind: deriveAuditKind(questions.map((q) => q.type)),
    };
  }
  return {
    title: '',
    description: '',
    locale: 'tr',
    questions: [],
    passingScoreInput: '',
    sectorOverride: null,
    scoringOverride: null,
    categoryId: null,
    startKind: 'checklist',
  };
}

// ─── Türetilmişler ──────────────────────────────────────────────────────

/**
 * Bölüm başlığındaki tür rozeti: sorulardan türetilir. Hiç soru yokken sahibin
 * "Ne tür bir denetim?" seçimine düşer (aksi halde "Test" seçip hâlâ
 * "Kontrol listesi" görmek kafa karıştırırdı).
 */
export function effectiveKind(questions: readonly AuditBuilderQuestion[], startKind: AuditKind): AuditKind {
  return questions.length === 0 ? startKind : deriveAuditKind(questions.map((q) => q.type));
}

/**
 * En az bir soru puanlanabilir mi? "Geçme puanı" bölümü yalnız o zaman gösterilir.
 * Kaydedilecek (normalize edilmiş) hal ölçülür: seçeneklerde olmayan doğru cevap
 * kaydedilirken atılır, o soru puanlanamaz olur.
 */
export function hasScorableQuestion(
  questions: readonly AuditBuilderQuestion[],
  auditLocale: AuditLocale,
): boolean {
  return questions.some((q) => {
    const n = normalizeQuestionForSave(q, auditLocale);
    return isScorableByDefinition({ type: n.type, correctAnswer: n.correctAnswer });
  });
}

/** Geçme puanı kutusu: yalnız rakam, en çok 3 hane. */
export function sanitizePassingInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 3);
}

/** Ham metin → 0-100 tam sayı | null (boş); 100'ü aşarsa `invalid`. */
export function readPassingScore(raw: string): { value: number | null; invalid: boolean } {
  const t = raw.trim();
  if (t === '') return { value: null, invalid: false };
  if (!/^\d{1,3}$/.test(t)) return { value: null, invalid: true };
  const n = Number(t);
  if (n > 100) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

// ─── Doğrulama ──────────────────────────────────────────────────────────

export type BuilderFocusTarget =
  | { kind: 'title' }
  | { kind: 'questions' }
  | { kind: 'question'; clientKey: string }
  | { kind: 'passingScore' };

export interface BuilderValidationInput {
  /** Arayüz dili (mesajlar). */
  uiLocale: 'tr' | 'en';
  kind: AuditKind;
  title: string;
  questions: readonly AuditBuilderQuestion[];
  auditLocale: AuditLocale;
  passingScoreInput: string;
  hasScorable: boolean;
  /** Etkin puan modu (türetilmiş ya da seçilmiş). */
  scoringMode: AuditScoringMode;
}

export interface BuilderValidation {
  ok: boolean;
  titleError: string | null;
  questionsError: string | null;
  passingScoreError: string | null;
  /** clientKey → mesaj. */
  questionErrors: Record<string, string>;
  /** İlk hata: odaklanılacak / kaydırılacak yer (sıra: başlık, liste, madde, geçme puanı). */
  first: BuilderFocusTarget | null;
}

/** Sayfa içi doğrulama — adım atlama yok; sunucu Zod'u son kapıdır. */
export function validateBuilder(input: BuilderValidationInput): BuilderValidation {
  const isTr = input.uiLocale === 'tr';
  const quiz = input.kind === 'quiz';

  const titleError = input.title.trim() ? null : isTr ? 'Başlık yaz.' : 'Write a title.';

  const questionsError =
    input.questions.length === 0
      ? isTr
        ? quiz
          ? 'En az bir soru ekle.'
          : 'En az bir madde ekle.'
        : quiz
          ? 'Add at least one question.'
          : 'Add at least one item.'
      : null;

  const questionErrors: Record<string, string> = {};
  let firstQuestionKey: string | null = null;
  for (const q of input.questions) {
    const check = checkQuestionForSave(q, input.auditLocale);
    if (check.ok) continue;
    questionErrors[q.clientKey] =
      check.field === 'prompt'
        ? isTr
          ? quiz
            ? 'Soru metni boş olamaz.'
            : 'Madde metni boş olamaz.'
          : quiz
            ? "Question text can't be empty."
            : "Item text can't be empty."
        : isTr
          ? 'En az 2 seçenek yaz. "Detay"dan ekleyebilirsin.'
          : 'Write at least 2 options. Add them under "Details".';
    if (firstQuestionKey === null) firstQuestionKey = q.clientKey;
  }

  let passingScoreError: string | null = null;
  if (input.hasScorable) {
    const read = readPassingScore(input.passingScoreInput);
    if (read.invalid) {
      passingScoreError = isTr ? '0 ile 100 arasında bir sayı yaz.' : 'Enter a number between 0 and 100.';
    } else if (input.scoringMode === 'pass_fail' && read.value === null) {
      passingScoreError = isTr
        ? 'Geçti / Kaldı için geçme puanı yaz.'
        : 'Pass / Fail needs a pass mark.';
    }
  }

  let first: BuilderFocusTarget | null = null;
  if (titleError) first = { kind: 'title' };
  else if (questionsError) first = { kind: 'questions' };
  else if (firstQuestionKey) first = { kind: 'question', clientKey: firstQuestionKey };
  else if (passingScoreError) first = { kind: 'passingScore' };

  return {
    ok: first === null,
    titleError,
    questionsError,
    passingScoreError,
    questionErrors,
    first,
  };
}

// ─── Kirli durum (kaydedilmemiş değişiklik) ─────────────────────────────

export interface BuilderSnapshotInput {
  title: string;
  description: string;
  auditLocale: AuditLocale;
  passingScoreInput: string;
  sectorOverride: AuditSector | null;
  scoringOverride: AuditScoringMode | null;
  categoryId: string | null;
  questions: readonly AuditBuilderQuestion[];
}

/** Form durumunun karşılaştırılabilir özeti (`clientKey` ve sıra numarası hariç). */
export function builderSnapshot(s: BuilderSnapshotInput): string {
  return JSON.stringify([
    s.title,
    s.description,
    s.auditLocale,
    s.passingScoreInput,
    s.sectorOverride,
    s.scoringOverride,
    s.categoryId,
    s.questions.map((q) => [
      q.persistedId ?? null,
      q.type,
      q.prompt,
      q.helpText,
      q.options,
      q.correctAnswer,
      q.weight,
      q.isRequired,
    ]),
  ]);
}

// ─── Sunucuya giden gövdeler ────────────────────────────────────────────

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** İki sorunun yanıt-kilitli alanları (tür, seçenekler, uygun cevap, ağırlık) aynı mı? */
export function sameStructure(a: AuditBuilderQuestion, b: AuditBuilderQuestion): boolean {
  return (
    a.type === b.type &&
    a.weight === b.weight &&
    sameJson(a.options, b.options) &&
    sameJson(a.correctAnswer, b.correctAnswer)
  );
}

function needsOptions(type: AuditBuilderQuestion['type']): boolean {
  return type === 'single' || type === 'multi' || type === 'yes_no';
}

/**
 * `PATCH` soruları. Kalıcı id'si olan soru, yapısı yüklendiği haliyle DEĞİŞMEDİYSE
 * yüklenen ham değerleriyle gönderilir. Aksi halde normalize (kırpma, denetim
 * diline çevirme) yanıt almış bir sorunun seçeneklerini sessizce "değiştirilmiş"
 * gösterip `QUESTION_LOCKED` ile kaydı engellerdi: örn. İngilizce denetimde
 * `['Evet','Hayır']` saklı yes/no sorusu, ya da sonunda boşluk olan seçenek.
 * Metin, açıklama, zorunluluk ve sıra her zaman güncel haliyle gider.
 */
export function buildPatchQuestions(
  questions: readonly AuditBuilderQuestion[],
  auditLocale: AuditLocale,
  initialById: ReadonlyMap<string, AuditBuilderQuestion>,
): PatchQuestionPayload[] {
  return questions.map((q, i) => {
    const [base] = toPatchQuestions([q], auditLocale);
    const out: PatchQuestionPayload = { ...base, sortOrder: (i + 1) * 10 };
    const initial = q.persistedId ? initialById.get(q.persistedId) : undefined;
    if (initial && sameStructure(q, initial)) {
      const rawOptionsUsable =
        !needsOptions(initial.type) || (Array.isArray(initial.options) && initial.options.length >= 2);
      if (rawOptionsUsable) {
        out.type = initial.type;
        out.options = initial.options;
        out.correctAnswer = initial.correctAnswer;
        out.weight = initial.weight;
      }
    }
    return out;
  });
}

export interface BuilderPayloadMeta {
  title: string;
  description: string;
  auditLocale: AuditLocale;
  sector: AuditSector;
  categoryId: string | null;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
}

/** `POST …/templates`. Yayınlanıyorsa varsayılan sürekli paylaşım linki aynı işlemde açılır. */
export function buildCreatePayload(
  meta: BuilderPayloadMeta,
  questions: readonly AuditBuilderQuestion[],
  publish: boolean,
): AuditTemplateSubmitInput {
  return {
    title: meta.title.trim(),
    description: meta.description.trim() || null,
    sector: meta.sector,
    categoryId: meta.categoryId,
    locale: meta.auditLocale,
    scoringMode: meta.scoringMode,
    passingScore: meta.passingScore,
    questions: toCreateQuestions(questions, meta.auditLocale),
    publish,
    ...(publish ? { assignment: defaultShareAssignment() } : {}),
  };
}

/** `PATCH …/templates/[id]`: kalıcı id'ler + `expectedUpdatedAt`. Yayın durumuna dokunmaz. */
export function buildEditPayload(
  meta: BuilderPayloadMeta,
  questions: readonly AuditBuilderQuestion[],
  expectedUpdatedAt: string,
  initialById: ReadonlyMap<string, AuditBuilderQuestion>,
): AuditTemplatePatchInput {
  return {
    title: meta.title.trim(),
    description: meta.description.trim() || null,
    sector: meta.sector,
    categoryId: meta.categoryId,
    locale: meta.auditLocale,
    scoringMode: meta.scoringMode,
    passingScore: meta.passingScore,
    questions: buildPatchQuestions(questions, meta.auditLocale, initialById),
    expectedUpdatedAt,
  };
}

/**
 * Kaydedilecek puan modu. Sahibin "Daha fazla ayar"dan seçtiği kazanır; yoksa
 * `deriveScoringMode` (oluşturmada ağırlıklardan, düzenlemede yanıt yoksa
 * ağırlıklardan, yanıt varsa kayıtlı mod).
 */
export function resolveScoringMode(args: {
  mode: BuilderMode;
  questions: readonly AuditBuilderQuestion[];
  storedMode: AuditScoringMode | null;
  hasResponses: boolean;
  explicitMode: AuditScoringMode | null;
}): AuditScoringMode {
  return deriveScoringMode({
    questions: args.questions,
    mode: args.mode,
    storedMode: args.storedMode,
    hasResponses: args.hasResponses,
    explicitMode: args.explicitMode,
  });
}
