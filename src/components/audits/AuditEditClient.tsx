'use client';

// CLAUDE.md §42 Phase 5 — Owner audit template edit (single-page flat form).
//
// Wizard (`AuditWizardClient`) 5-step rehberli akış; bu component edit modu
// için tek-sayfa flat form. Aynı backend kontratı (`PATCH /api/restaurants/
// [id]/audits/templates/[tplId]`) kullanılır, ama state shape farklı —
// owner zaten template'i bildiği için step-by-step gating yok.
//
// Lock UX (CLAUDE.md §40.2):
//   • `isPublished=true`     → tüm alanlar disabled, "Yayından kaldır" banner
//     CTA'sı görünür (tek tıkla draft'a alıp edit'e devam).
//   • `responseCount > 0`    → meta düzenlenebilir, soru ekleme/silme/edit
//     disabled, banner uyarısı + "Çoğalt + yeni versiyon" link'i.
//
// Mobil (CLAUDE.md §25):
//   • 1-col base, sm:2-col, lg:3-col meta grid
//   • Sticky bottom action bar (Kaydet + İptal) mobile; inline desktop
//   • DnD `TouchSensor` (150ms delay) — iOS Safari uyumlu

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  GripVertical,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertBanner, Badge, Field, PageHeader, useConfirmDialog } from '@/components/ui';
import { type Locale } from '@/lib/translations';
import {
  AUDIT_SECTORS,
  type AuditQuestionType,
  type AuditScoringMode,
  type AuditSector,
} from '@/lib/audits/types';
import type { AuditQuestionDraft } from '@/lib/audits/wizard-state';
import {
  parseAuditErrorResponse,
  type ParsedAuditError,
} from '@/lib/audits/error-humanizer';
import AuditQuestionEditor, { makeQuestionId } from './AuditQuestionEditor';

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: string;
}

export interface AuditTemplateEditData {
  id: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: 'tr' | 'en';
  categoryId: string | null;
  isPublished: boolean;
  hasResponses: boolean;
  hasAssignments: boolean;
  forkedFromId: string | null;
  forkSourcePublished: boolean;
  questions: AuditQuestionDraft[];
}

interface Props {
  locale: Locale;
  restaurantId: string;
  template: AuditTemplateEditData;
  categories: CategoryRef[];
}

const SECTOR_LABEL_TR: Record<AuditSector, string> = {
  food: 'Restoran / Cafe',
  hotel: 'Otel / Konaklama',
  retail: 'Perakende',
  health: 'Sağlık',
  beauty: 'Güzellik / Spa',
  other: 'Diğer',
};
const SECTOR_LABEL_EN: Record<AuditSector, string> = {
  food: 'Restaurant / Cafe',
  hotel: 'Hotel / Hospitality',
  retail: 'Retail',
  health: 'Healthcare',
  beauty: 'Beauty / Spa',
  other: 'Other',
};

const SCORING_LABEL_TR: Record<AuditScoringMode, string> = {
  percentage: 'Yüzde',
  weighted: 'Ağırlıklı',
  pass_fail: 'Geçti / Kaldı',
};
const SCORING_LABEL_EN: Record<AuditScoringMode, string> = {
  percentage: 'Percentage',
  weighted: 'Weighted',
  pass_fail: 'Pass / Fail',
};

const QUESTION_TYPE_LABEL_TR: Record<AuditQuestionType, string> = {
  single: 'Tek seçim',
  multi: 'Çoklu seçim',
  scale: 'Ölçek',
  text: 'Metin',
  yes_no: 'Evet/Hayır',
  file: 'Dosya',
};
const QUESTION_TYPE_LABEL_EN: Record<AuditQuestionType, string> = {
  single: 'Single',
  multi: 'Multi',
  scale: 'Scale',
  text: 'Text',
  yes_no: 'Yes/No',
  file: 'File',
};

// Sortable question row — Pulse `bz-card`, drag handle keyboard-aware
// (Space → pickup, Arrow → move, Space → drop), TouchSensor uyumlu.
function SortableQuestionItem({
  q,
  index,
  locale,
  qTypeLabel,
  onEdit,
  onRemove,
  disabled,
}: {
  q: AuditQuestionDraft;
  index: number;
  locale: Locale;
  qTypeLabel: Record<AuditQuestionType, string>;
  onEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging
      ? { boxShadow: '0 8px 20px -4px rgba(0,0,0,0.18)', zIndex: 20, opacity: 0.95 }
      : {}),
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bz-card p-3 flex items-start gap-2 ${
        isDragging ? 'ring-1 ring-[#C6F24E]' : ''
      } ${disabled ? 'opacity-70' : ''}`}
    >
      <button
        type="button"
        className="bz-btn-icon cursor-grab active:cursor-grabbing touch-none disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={locale === 'tr' ? 'Sırayı değiştir' : 'Reorder'}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge kind="ghost">{index + 1}</Badge>
          <Badge kind="info">{qTypeLabel[q.type]}</Badge>
          {q.isRequired ? null : (
            <Badge kind="ghost">{locale === 'tr' ? 'opsiyonel' : 'optional'}</Badge>
          )}
          {q.weight > 1 && <Badge kind="warn">×{q.weight}</Badge>}
        </div>
        <p className="text-[14px] mt-1 text-[#0A0A0A] break-words">{q.prompt}</p>
        {Array.isArray(q.options) && q.options.length > 0 && (
          <p className="text-[12px] text-[#525252] mt-1">{q.options.join(' · ')}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="bz-btn-icon disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={locale === 'tr' ? 'Soruyu düzenle' : 'Edit question'}
          title={locale === 'tr' ? 'Düzenle' : 'Edit'}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="bz-btn-icon disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={locale === 'tr' ? 'Soruyu sil' : 'Delete question'}
          title={locale === 'tr' ? 'Sil' : 'Delete'}
          style={{ color: '#DC2626' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

export default function AuditEditClient({ locale, restaurantId, template, categories }: Props) {
  const isTr = locale === 'tr';
  const router = useRouter();
  const [confirmDialog, askConfirm] = useConfirmDialog();

  // ─── State ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description ?? '');
  const [sector, setSector] = useState<AuditSector>(template.sector);
  const [categoryId, setCategoryId] = useState<string | null>(template.categoryId);
  const [tplLocale, setTplLocale] = useState<'tr' | 'en'>(template.locale);
  const [scoringMode, setScoringMode] = useState<AuditScoringMode>(template.scoringMode);
  const [passingScore, setPassingScore] = useState<number | null>(template.passingScore);
  const [questions, setQuestions] = useState<AuditQuestionDraft[]>(template.questions);
  const [editingQuestion, setEditingQuestion] = useState<AuditQuestionDraft | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Server-derived locks. Frontend bunları sadece UX cilası için kullanır;
  // backend PATCH zaten aynı kuralları enforce eder (CLAUDE.md §40.2).
  const isPublished = template.isPublished;
  const hasResponses = template.hasResponses;

  // Content lock: yayındaki template'in **hiçbir** alanı düzenlenemez
  // (publish toggle hariç). Owner önce yayından kaldırmalı.
  const contentLocked = isPublished;
  // Question lock: yanıt almış template'de sadece soru ekleme/silme/edit
  // kilitli; meta + scoring serbest.
  const questionLocked = hasResponses;
  // Reset eligibility: fork edilmiş + kaynak hâlâ yayında + yanıt yok.
  const canReset =
    !!template.forkedFromId && template.forkSourcePublished && !hasResponses;

  const sectorLabel = isTr ? SECTOR_LABEL_TR : SECTOR_LABEL_EN;
  const scoringLabel = isTr ? SCORING_LABEL_TR : SCORING_LABEL_EN;
  const qTypeLabel = isTr ? QUESTION_TYPE_LABEL_TR : QUESTION_TYPE_LABEL_EN;

  const categoriesForSector = useMemo(
    () => categories.filter((c) => c.sector === sector || c.sector === 'other'),
    [categories, sector],
  );

  // ─── DnD reorder ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setQuestions((prev) => {
        const oldIndex = prev.findIndex((q) => q.id === active.id);
        const newIndex = prev.findIndex((q) => q.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex).map((q, i) => ({
          ...q,
          sortOrder: (i + 1) * 10,
        }));
      });
    },
    [],
  );

  // ─── Question CRUD ────────────────────────────────────────────────────
  const openAddQuestion = useCallback(() => {
    setEditingQuestion(null);
    setEditorOpen(true);
  }, []);
  const openEditQuestion = useCallback((q: AuditQuestionDraft) => {
    setEditingQuestion(q);
    setEditorOpen(true);
  }, []);
  const onSaveQuestion = useCallback((q: AuditQuestionDraft) => {
    setQuestions((prev) => {
      const existing = prev.findIndex((p) => p.id === q.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = q;
        return next;
      }
      const sortOrder = (prev.length + 1) * 10;
      return [...prev, { ...q, id: q.id || makeQuestionId(), sortOrder }];
    });
    setEditorOpen(false);
  }, []);
  const onRemoveQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  // ─── Save / Unpublish / Reset ─────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<ParsedAuditError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Inline string → ParsedAuditError shape (client-side validation banner)
  const showError = useCallback(
    (title: string) => setError({ title, details: [], code: null }),
    [],
  );

  const submit = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!title.trim()) {
      showError(isTr ? 'Başlık boş olamaz.' : 'Title is required.');
      return;
    }
    if (questions.length === 0) {
      showError(isTr ? 'En az 1 soru ekle.' : 'Add at least 1 question.');
      return;
    }
    if (scoringMode === 'pass_fail' && (!passingScore || passingScore <= 0)) {
      showError(
        isTr
          ? 'Geçti/Kaldı modu için pozitif bir geçme puanı gerekli.'
          : 'Pass/Fail mode requires a positive passing score.',
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/audits/templates/${template.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            sector,
            scoringMode,
            passingScore,
            locale: tplLocale,
            categoryId,
            questions: questions.map((q, i) => ({
              type: q.type,
              prompt: q.prompt,
              helpText: q.helpText ?? null,
              options: q.options ?? null,
              correctAnswer: q.correctAnswer ?? null,
              weight: q.weight,
              isRequired: q.isRequired,
              sortOrder: (i + 1) * 10,
            })),
          }),
        },
      );
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(parsed);
        return;
      }
      setNotice(isTr ? 'Şablon güncellendi.' : 'Template updated.');
      router.refresh();
      // Detay sayfasına dön — owner değişikliği gözle görsün.
      setTimeout(() => {
        router.push(`/${locale}/dashboard/audits/${template.id}`);
      }, 600);
    } catch {
      showError(isTr ? 'Bağlantı hatası.' : 'Network error.');
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    sector,
    categoryId,
    tplLocale,
    scoringMode,
    passingScore,
    questions,
    restaurantId,
    template.id,
    locale,
    isTr,
    router,
    showError,
  ]);

  const unpublishAndEdit = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/audits/templates/${template.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish: false }),
        },
      );
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(parsed);
        return;
      }
      router.refresh();
      setNotice(
        isTr ? 'Yayından kaldırıldı. Şimdi düzenleyebilirsin.' : 'Unpublished. You can edit now.',
      );
    } catch {
      showError(isTr ? 'Bağlantı hatası.' : 'Network error.');
    } finally {
      setSaving(false);
    }
  }, [restaurantId, template.id, locale, isTr, router, showError]);

  const doReset = useCallback(async () => {
    setError(null);
    setResetting(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/audits/templates/${template.id}/reset`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(parsed);
        return;
      }
      setNotice(
        isTr
          ? 'Varsayılana sıfırlandı. Detay sayfasına dönülüyor…'
          : 'Reset to default. Returning to detail…',
      );
      setTimeout(() => {
        router.push(`/${locale}/dashboard/audits/${template.id}`);
        router.refresh();
      }, 700);
    } catch {
      showError(isTr ? 'Bağlantı hatası.' : 'Network error.');
    } finally {
      setResetting(false);
    }
  }, [restaurantId, template.id, locale, isTr, router, showError]);

  const reset = useCallback(() => {
    if (!canReset) return;
    askConfirm({
      title: isTr ? 'Varsayılana sıfırlanacak' : 'Reset to default',
      body: isTr
        ? 'Sorular ve skorlama orijinal şablon kaynağından yeniden alınacak. Senin eklediğin sorular silinir.'
        : 'Questions and scoring will be re-synced from the original fork source. Your custom questions will be removed.',
      confirmLabel: isTr ? 'Sıfırla' : 'Reset',
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      variant: 'danger',
      onConfirm: doReset,
    });
  }, [canReset, askConfirm, isTr, doReset]);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8 pb-32 sm:pb-8">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/dashboard/audits/${template.id}`)}
          className="inline-flex items-center gap-1 text-[12.5px] text-[#525252] hover:text-[#0A0A0A]"
        >
          <ArrowLeft size={13} /> {isTr ? 'Detaya dön' : 'Back to detail'}
        </button>
      </div>

      <PageHeader
        eyebrow={isTr ? 'DENETİM ŞABLONU' : 'AUDIT TEMPLATE'}
        title={isTr ? 'Şablonu düzenle' : 'Edit template'}
        description={
          isTr
            ? 'Bilgileri, skorlama ayarını ve soru listesini güncelle. Yayındayken doğrudan düzenleyemezsin.'
            : 'Update info, scoring and question list. Direct edits are blocked while published.'
        }
        actions={
          canReset ? (
            <button
              type="button"
              onClick={reset}
              disabled={resetting || saving}
              className="bz-btn-ghost inline-flex items-center justify-center gap-1.5"
              title={isTr ? 'Fork kaynağına geri dön' : 'Reset to fork source'}
            >
              {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              {isTr ? 'Varsayılana sıfırla' : 'Reset to default'}
            </button>
          ) : null
        }
      />

      {/* Lock banners */}
      {contentLocked && (
        <div className="mt-4">
          <AlertBanner kind="warn" icon={<Lock size={14} />}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {isTr
                  ? 'Bu şablon yayında. Düzenlemek için önce yayından kaldır.'
                  : 'This template is published. Unpublish to edit.'}
              </span>
              <button
                type="button"
                onClick={unpublishAndEdit}
                disabled={saving}
                className="bz-btn-dark inline-flex h-8 items-center justify-center gap-1.5 text-[12px] disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                {isTr ? 'Yayından kaldır' : 'Unpublish'}
              </button>
            </div>
          </AlertBanner>
        </div>
      )}

      {questionLocked && !contentLocked && (
        <div className="mt-4">
          <AlertBanner kind="info" icon={<AlertTriangle size={14} />}>
            {isTr
              ? 'Bu şablona yanıt verildiği için soru ekleme/silme yapılamaz. Yeni versiyon için detay sayfasından çoğalt.'
              : 'Question edits are locked once responses arrive. Duplicate the template for a new version.'}
          </AlertBanner>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            <div className="space-y-1">
              <p className="font-medium">{error.title}</p>
              {error.details.length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5 text-[13px]">
                  {error.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </AlertBanner>
        </div>
      )}
      {notice && (
        <div className="mt-4">
          <AlertBanner kind="success" icon={<CheckCircle2 size={14} />}>
            {notice}
          </AlertBanner>
        </div>
      )}

      {/* Meta section */}
      <section className="mt-5 bz-card p-4 sm:p-5">
        <h2 className="bz-h-tight text-[16px] mb-3.5">
          {isTr ? 'Şablon bilgileri' : 'Template info'}
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label={isTr ? 'Başlık' : 'Title'} required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={contentLocked}
              className="bz-input"
              placeholder={isTr ? 'Servis denetim formu' : 'Service audit form'}
            />
          </Field>
          <Field label={isTr ? 'Dil' : 'Locale'}>
            <select
              value={tplLocale}
              onChange={(e) => setTplLocale(e.target.value as 'tr' | 'en')}
              disabled={contentLocked}
              className="bz-input"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label={isTr ? 'Sektör' : 'Sector'}>
            <select
              value={sector}
              onChange={(e) => {
                const next = e.target.value as AuditSector;
                setSector(next);
                // Sektör değiştiyse kategori artık eşleşmiyor olabilir → null'a düşür.
                if (categoryId) {
                  const cat = categories.find((c) => c.id === categoryId);
                  if (cat && cat.sector !== next && cat.sector !== 'other') {
                    setCategoryId(null);
                  }
                }
              }}
              disabled={contentLocked}
              className="bz-input"
            >
              {AUDIT_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {sectorLabel[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isTr ? 'Kategori (opsiyonel)' : 'Category (optional)'}>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              disabled={contentLocked || categoriesForSector.length === 0}
              className="bz-input"
            >
              <option value="">
                {isTr ? '— Kategori seç —' : '— Pick a category —'}
              </option>
              {categoriesForSector.map((c) => (
                <option key={c.id} value={c.id}>
                  {isTr ? c.labelTr : c.labelEn}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={isTr ? 'Açıklama' : 'Description'}
            hint={isTr ? 'Owner-içi not. Genel açıklama.' : 'Internal note. Plain description.'}
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              disabled={contentLocked}
              rows={3}
              className="bz-input resize-y"
              placeholder={
                isTr ? 'Bu şablonun amacı, nasıl kullanılır…' : 'What this template is for…'
              }
            />
          </Field>
        </div>
      </section>

      {/* Scoring section */}
      <section className="mt-4 bz-card p-4 sm:p-5">
        <h2 className="bz-h-tight text-[16px] mb-3.5">
          {isTr ? 'Skorlama' : 'Scoring'}
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label={isTr ? 'Skorlama modu' : 'Scoring mode'}>
            <select
              value={scoringMode}
              onChange={(e) => {
                const next = e.target.value as AuditScoringMode;
                setScoringMode(next);
                if (next !== 'pass_fail') {
                  // pass_fail dışında passingScore opsiyonel
                  if (passingScore === 0) setPassingScore(null);
                }
              }}
              disabled={contentLocked}
              className="bz-input"
            >
              {(['percentage', 'weighted', 'pass_fail'] as AuditScoringMode[]).map((s) => (
                <option key={s} value={s}>
                  {scoringLabel[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              isTr
                ? scoringMode === 'pass_fail'
                  ? 'Geçme puanı *'
                  : 'Hedef puan (opsiyonel)'
                : scoringMode === 'pass_fail'
                  ? 'Passing score *'
                  : 'Target score (optional)'
            }
            hint={isTr ? '0–100 aralığı.' : '0–100 range.'}
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={passingScore ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setPassingScore(null);
                  return;
                }
                // Floor + clamp — Zod `.int().min(0).max(100)` katı.
                const n = Math.floor(Number(raw));
                if (!Number.isFinite(n)) {
                  setPassingScore(null);
                  return;
                }
                setPassingScore(Math.max(0, Math.min(100, n)));
              }}
              disabled={contentLocked}
              className="bz-input"
              placeholder="0–100"
            />
          </Field>
        </div>
      </section>

      {/* Questions section */}
      <section className="mt-4 bz-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="bz-h-tight text-[16px]">
              {isTr ? 'Sorular' : 'Questions'}
              <span className="ml-2 text-[12px] text-[#737373] font-normal">
                ({questions.length})
              </span>
            </h2>
            <p className="text-[11.5px] text-[#737373] mt-0.5">
              {isTr
                ? 'Sürükle-bırak ile sıralayabilirsin.'
                : 'Drag handles to reorder.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddQuestion}
            disabled={contentLocked || questionLocked}
            className="bz-btn-lime inline-flex items-center gap-1.5 text-[12.5px] h-9 px-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={13} />
            {isTr ? 'Soru ekle' : 'Add question'}
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-6 text-center text-[13px] text-[#525252]">
            {isTr
              ? 'Henüz soru yok. Yukarıdaki "Soru ekle" butonuyla başla.'
              : 'No questions yet. Use "Add question" above.'}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-2">
                {questions.map((q, i) => (
                  <SortableQuestionItem
                    key={q.id}
                    q={q}
                    index={i}
                    locale={locale}
                    qTypeLabel={qTypeLabel}
                    onEdit={() => openEditQuestion(q)}
                    onRemove={() => onRemoveQuestion(q.id)}
                    disabled={contentLocked || questionLocked}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Action bar — sticky bottom on mobile, inline on desktop */}
      {/* §38.238 — below sm this bar is fixed at the viewport bottom, where the
          shell's floating mobile nav (z-40, 72px tall at bottom 12px+safe-area)
          painted over it and hid "Kaydet". Raised above the nav via the shared
          `--dash-bottom-nav-h` token; from sm up the bar is static so the offset
          is inert. */}
      <div className="fixed inset-x-0 bottom-[calc(var(--dash-bottom-nav-h)+12px)] z-40 border-t border-[#EDEDED] bg-white p-3 sm:static sm:mt-5 sm:rounded-2xl sm:border sm:bg-[#FAFAFA]">
        <div className="mx-auto flex max-w-[920px] flex-row items-center justify-end gap-2 px-1 sm:px-0">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/dashboard/audits/${template.id}`)}
            disabled={saving || resetting}
            className="bz-btn-ghost inline-flex h-10 items-center justify-center gap-1.5 px-3"
          >
            {isTr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || resetting || contentLocked}
            className="bz-btn-primary inline-flex h-10 flex-1 items-center justify-center gap-1.5 px-4 sm:flex-none"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isTr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>

      <AuditQuestionEditor
        locale={locale}
        open={editorOpen}
        draft={editingQuestion}
        onClose={() => setEditorOpen(false)}
        onSave={onSaveQuestion}
      />

      {/* Reset / destructive confirm modal — CLAUDE.md §23.3.1 unification */}
      {confirmDialog}
    </div>
  );
}
