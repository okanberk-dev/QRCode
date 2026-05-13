'use client';

// CLAUDE.md §42 Phase 2 — 5-step owner audit wizard.
// SurveyWizardClient paterniyle uyumlu: state local, step number, navigate
// next/prev, final submit POST'ler.

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  GripVertical,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
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
import {
  AlertBanner,
  Badge,
  Field,
  PageHeader,
  RadioCard,
  Toggle,
} from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import {
  AUDIT_RECURRENCES,
  AUDIT_SECTORS,
  type AuditAssigneeType,
  type AuditQuestionType,
  type AuditRecurrence,
  type AuditScoringMode,
  type AuditSector,
} from '@/lib/audits/types';
import {
  createInitialWizardState,
  toSubmitPayload,
  type AuditQuestionDraft,
  type AuditWizardState,
  type WizardStep,
} from '@/lib/audits/wizard-state';
import AuditQuestionEditor, { makeQuestionId } from './AuditQuestionEditor';

interface Restaurant {
  id: string;
  name: string;
}

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: string;
}

interface TeamMemberRef {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface ForkSource {
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  categoryId: string | null;
  questions: AuditQuestionDraft[];
}

interface Props {
  locale: Locale;
  restaurants: Restaurant[];
  initialRestaurantId: string;
  categories: CategoryRef[];
  teamMembers: TeamMemberRef[];
  forkSource: ForkSource | null;
}

const SCORE_OPTIONS_TR: { value: AuditScoringMode; label: string; description: string }[] = [
  { value: 'percentage', label: 'Yüzde', description: 'Tüm sorular eşit ağırlıkta, ortalama puan' },
  { value: 'weighted', label: 'Ağırlıklı', description: 'Her sorunun ağırlığı (1-10) puanı etkiler' },
  { value: 'pass_fail', label: 'Geçti / Kaldı', description: 'Eşik puanın üstünde "geçti" sayılır' },
];
const SCORE_OPTIONS_EN: typeof SCORE_OPTIONS_TR = [
  { value: 'percentage', label: 'Percentage', description: 'All questions equal, simple average' },
  { value: 'weighted', label: 'Weighted', description: 'Each question weight (1-10) affects total' },
  { value: 'pass_fail', label: 'Pass / Fail', description: 'Threshold-based — above passing = pass' },
];

const ASSIGNEE_OPTIONS_TR: { value: AuditAssigneeType; label: string; description: string }[] = [
  { value: 'team_member', label: 'Ekip üyesi', description: 'Bu denetimi panelden doldurur' },
  { value: 'candidate', label: 'Aday', description: 'E-posta + telefon ile takip, public link gönderilir' },
  { value: 'link', label: 'Public link', description: 'Anonim erişim, link kopyala paylaş' },
  { value: 'self', label: 'Kendim', description: 'Önizleme / test amaçlı' },
];
const ASSIGNEE_OPTIONS_EN: typeof ASSIGNEE_OPTIONS_TR = [
  { value: 'team_member', label: 'Team member', description: 'Fills via panel' },
  { value: 'candidate', label: 'Candidate', description: 'Email + phone, public link delivered' },
  { value: 'link', label: 'Public link', description: 'Anonymous link, share manually' },
  { value: 'self', label: 'Myself', description: 'Preview / test' },
];

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

// CLAUDE.md §42 Phase 2 — Sortable question row (PR-B DnD upgrade).
// Drag handle GripVertical butonuna `attributes`/`listeners` bağlanır;
// kalan kart UI mevcut yapıyı korur. Keyboard nav: tab → drag handle →
// Space (pick up) → Arrow keys (move) → Space (drop). isDragging shadow
// + ring ile ayırt edilir.
function SortableQuestionItem({
  q,
  index,
  locale,
  qTypeLabel,
  onEdit,
  onRemove,
}: {
  q: AuditQuestionDraft;
  index: number;
  locale: Locale;
  qTypeLabel: Record<AuditQuestionType, string>;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
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
      className={`bz-card p-3 flex items-start gap-2 ${isDragging ? 'ring-1 ring-[#C6F24E]' : ''}`}
    >
      <button
        type="button"
        className="bz-btn-icon cursor-grab active:cursor-grabbing touch-none"
        aria-label={locale === 'tr' ? 'Sırayı değiştir' : 'Reorder'}
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
          className="bz-btn-icon"
          onClick={onEdit}
          aria-label={locale === 'tr' ? 'Düzenle' : 'Edit'}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="bz-btn-icon"
          onClick={onRemove}
          aria-label={locale === 'tr' ? 'Sil' : 'Remove'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

// CLAUDE.md §42 Phase 2 — Wizard step indicator (visual upgrade PR-B).
// Sade numara badge + chevron yerine: ikon + label + bağlantı çizgisi +
// üst progress bar. Done state lime tick + lime-soft bg; active state
// graphite ikon + lime ring; pending muted. Mobile horizontal scroll
// (`no-scrollbar` overflow-x-auto), aria-current="step" semantik.
const STEP_ICONS = [Sparkles, Target, ListChecks, UserCheck, Eye] as const;

function StepIndicator({ step, locale }: { step: WizardStep; locale: Locale }) {
  const labels =
    locale === 'tr'
      ? ['Temel', 'Puanlama', 'Sorular', 'Atama', 'Önizleme']
      : ['Basics', 'Scoring', 'Questions', 'Assignment', 'Review'];
  const totalSteps = labels.length;
  // Progress: current step / (total - 1). Step 5 done state'te %100 dolu.
  const progressPct = Math.round(((step - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="bz-card p-3 sm:p-4">
      {/* Üst sade progress bar — overflow-anchored, mobile'da hızlı feedback */}
      <div className="relative h-1 bg-[#EDEDED] rounded-full mb-3 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[#C6F24E] transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Step list — horizontal scroll on mobile, equal grid on sm+ */}
      <ol
        className="no-scrollbar flex items-start justify-between gap-1 overflow-x-auto sm:gap-3"
        aria-label={locale === 'tr' ? 'Wizard adımları' : 'Wizard steps'}
      >
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const Icon = STEP_ICONS[i];
          const active = step === stepNum;
          const done = step > stepNum;
          return (
            <li
              key={label}
              className="flex min-w-[68px] flex-1 flex-col items-center gap-1.5 text-center"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={[
                  'relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors',
                  active
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] ring-2 ring-[#C6F24E] ring-offset-2'
                    : done
                      ? 'bg-[#EAF9B8] text-[#0A0A0A] border-[#A8D62E]'
                      : 'bg-white text-[#737373] border-[#EDEDED]',
                ].join(' ')}
              >
                {done ? <Check size={16} strokeWidth={2.5} /> : <Icon size={16} />}
              </span>
              <span
                className={[
                  'text-[11px] leading-tight font-medium',
                  active
                    ? 'text-[#0A0A0A]'
                    : done
                      ? 'text-[#166534]'
                      : 'text-[#737373]',
                ].join(' ')}
              >
                <span className="pulse-eyebrow block">{stepNum}</span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function AuditWizardClient({
  locale,
  restaurants,
  initialRestaurantId,
  categories,
  teamMembers,
  forkSource,
}: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const scoreOpts = locale === 'tr' ? SCORE_OPTIONS_TR : SCORE_OPTIONS_EN;
  const assigneeOpts = locale === 'tr' ? ASSIGNEE_OPTIONS_TR : ASSIGNEE_OPTIONS_EN;
  const qTypeLabel = locale === 'tr' ? QUESTION_TYPE_LABEL_TR : QUESTION_TYPE_LABEL_EN;

  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<AuditWizardState>(() => {
    const base = createInitialWizardState(initialRestaurantId);
    if (forkSource) {
      return {
        ...base,
        title: forkSource.title,
        description: forkSource.description ?? '',
        sector: forkSource.sector,
        scoringMode: forkSource.scoringMode,
        passingScore: forkSource.passingScore,
        categoryId: forkSource.categoryId,
        questions: forkSource.questions.map((q, i) => ({
          ...q,
          id: q.id || makeQuestionId(),
          sortOrder: (i + 1) * 10,
        })),
      };
    }
    return base;
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<AuditQuestionDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesForSector = useMemo(
    () => categories.filter((c) => c.sector === state.sector || c.sector === 'other'),
    [categories, state.sector],
  );

  const stepValid = useMemo(() => {
    if (step === 1) return Boolean(state.restaurantId) && state.title.trim().length > 0;
    if (step === 2) {
      if (state.scoringMode === 'pass_fail') {
        return state.passingScore != null && state.passingScore > 0;
      }
      return true;
    }
    if (step === 3) return state.questions.length > 0;
    if (step === 4) {
      if (!state.assignmentEnabled) return true;
      if (!state.assigneeType) return false;
      if (state.assigneeType === 'team_member') return Boolean(state.assigneeTeamMemberId);
      if (state.assigneeType === 'candidate') {
        return Boolean(state.assigneeEmail.trim() || state.assigneePhone.trim());
      }
      return true;
    }
    return true;
  }, [step, state]);

  const openAddQuestion = useCallback(() => {
    setEditingDraft(null);
    setEditorOpen(true);
  }, []);

  const openEditQuestion = useCallback((q: AuditQuestionDraft) => {
    setEditingDraft(q);
    setEditorOpen(true);
  }, []);

  const handleSaveQuestion = useCallback((q: AuditQuestionDraft) => {
    setState((prev) => {
      const exists = prev.questions.findIndex((x) => x.id === q.id) !== -1;
      const next = exists
        ? prev.questions.map((x) => (x.id === q.id ? q : x))
        : [...prev.questions, { ...q, sortOrder: (prev.questions.length + 1) * 10 }];
      return { ...prev, questions: next };
    });
    setEditorOpen(false);
  }, []);

  const handleRemoveQuestion = useCallback((id: string) => {
    setState((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== id) }));
  }, []);

  // @dnd-kit sensors — menu builder paterni (CLAUDE.md §12.1) ile birebir.
  // Pointer threshold 8px → click ≠ drag; touch 150ms delay → mobil long-press;
  // keyboard sortableKeyboardCoordinates → Space pick up + arrow move + Space drop.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleQuestionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setState((prev) => {
      const oldIndex = prev.questions.findIndex((q) => q.id === active.id);
      const newIndex = prev.questions.findIndex((q) => q.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev.questions, oldIndex, newIndex);
      return { ...prev, questions: next.map((q, i) => ({ ...q, sortOrder: (i + 1) * 10 })) };
    });
  }, []);

  const handleSubmit = useCallback(
    async (publish: boolean) => {
      if (submitting) return;
      setError(null);
      setSubmitting(true);
      try {
        const payload = toSubmitPayload(state, publish);
        const res = await fetch(`/api/restaurants/${state.restaurantId}/audits/templates`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (Array.isArray(j.issues) && j.issues.length > 0) {
            setError(
              j.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join(', '),
            );
          } else {
            setError(j.error || j.message || (locale === 'tr' ? 'Kaydetme başarısız' : 'Save failed'));
          }
          return;
        }
        const json = await res.json();
        router.push(`/${locale}/dashboard/audits/${json.data.id}`);
      } catch {
        setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
      } finally {
        setSubmitting(false);
      }
    },
    [state, locale, router, submitting],
  );

  const isFork = Boolean(forkSource);

  return (
    <div className="mx-auto max-w-[900px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isFork ? (locale === 'tr' ? 'ŞABLON KOPYASI' : 'TEMPLATE COPY') : (locale === 'tr' ? 'YENİ DENETİM' : 'NEW AUDIT')}
        eyebrowColor="#C6F24E"
        title={isFork ? state.title || t.audits_create : t.audits_create}
        description={
          isFork
            ? locale === 'tr'
              ? 'Global şablondan kopyalandı. Düzenleyebilirsin.'
              : 'Copied from a global template. You can edit before publishing.'
            : t.audits_subtitle
        }
      />

      <StepIndicator step={step} locale={locale} />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}

      <div className="bz-card p-4 sm:p-6 space-y-4">
        {step === 1 && (
          <>
            {restaurants.length > 1 && (
              <Field label={locale === 'tr' ? 'İşletme' : 'Business'} required>
                <select
                  className="bz-input"
                  value={state.restaurantId}
                  onChange={(e) => setState({ ...state, restaurantId: e.target.value })}
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={locale === 'tr' ? 'Başlık' : 'Title'} required>
              <input
                className="bz-input"
                value={state.title}
                onChange={(e) => setState({ ...state, title: e.target.value })}
                maxLength={200}
                placeholder={
                  locale === 'tr' ? 'Örn: Mutfak hijyen kontrolü' : 'e.g. Kitchen hygiene check'
                }
              />
            </Field>
            <Field label={locale === 'tr' ? 'Açıklama' : 'Description'}>
              <textarea
                className="bz-input min-h-[80px]"
                value={state.description}
                onChange={(e) => setState({ ...state, description: e.target.value })}
                maxLength={4000}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={locale === 'tr' ? 'Sektör' : 'Sector'}>
                <select
                  className="bz-input"
                  value={state.sector}
                  onChange={(e) => setState({ ...state, sector: e.target.value as AuditSector })}
                >
                  {AUDIT_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {t[`audits_sector_${s}` as 'audits_sector_food']}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={locale === 'tr' ? 'Kategori (opsiyonel)' : 'Category (optional)'}>
                <select
                  className="bz-input"
                  value={state.categoryId ?? ''}
                  onChange={(e) =>
                    setState({ ...state, categoryId: e.target.value || null })
                  }
                >
                  <option value="">—</option>
                  {categoriesForSector.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === 'tr' ? c.labelTr : c.labelEn}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid gap-2">
              {scoreOpts.map((opt) => (
                <RadioCard
                  key={opt.value}
                  active={state.scoringMode === opt.value}
                  onClick={() => setState({ ...state, scoringMode: opt.value })}
                  title={opt.label}
                  body={opt.description}
                />
              ))}
            </div>
            {(state.scoringMode === 'pass_fail' || state.scoringMode === 'percentage' || state.scoringMode === 'weighted') && (
              <Field
                label={t.audits_passing_score}
                hint={
                  state.scoringMode === 'pass_fail'
                    ? locale === 'tr' ? 'Zorunlu (0-100)' : 'Required (0-100)'
                    : locale === 'tr' ? 'Opsiyonel — "geçti" rozeti için' : 'Optional — for "passed" badge'
                }
              >
                <input
                  className="bz-input"
                  type="number"
                  min={0}
                  max={100}
                  value={state.passingScore ?? ''}
                  onChange={(e) =>
                    setState({
                      ...state,
                      passingScore: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="bz-h-tight text-[15px]">
                  {state.questions.length} {locale === 'tr' ? 'soru' : 'questions'}
                </p>
                <p className="text-[12px] text-[#737373]">
                  {locale === 'tr'
                    ? 'En az 1 soru ekle. Sırayı sürükleyerek (veya tab + space ile) değiştir.'
                    : 'Add at least 1 question. Drag to reorder (or use tab + space).'}
                </p>
              </div>
              <button type="button" className="bz-btn-primary" onClick={openAddQuestion}>
                <Plus size={14} /> {t.audits_question_add}
              </button>
            </div>

            {state.questions.length === 0 ? (
              <div className="bz-card-soft p-6 text-center text-[#525252] text-[13px]">
                {locale === 'tr' ? 'Henüz soru yok' : 'No questions yet'}
              </div>
            ) : (
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleQuestionDragEnd}
              >
                <SortableContext
                  items={state.questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol className="space-y-2">
                    {state.questions.map((q, i) => (
                      <SortableQuestionItem
                        key={q.id}
                        q={q}
                        index={i}
                        locale={locale}
                        qTypeLabel={qTypeLabel}
                        onEdit={() => openEditQuestion(q)}
                        onRemove={() => handleRemoveQuestion(q.id)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 bz-card-soft p-3">
              <div>
                <p className="bz-h-tight text-[14px]">
                  {locale === 'tr' ? 'Şimdi atama yap' : 'Create assignment now'}
                </p>
                <p className="text-[12px] text-[#737373]">
                  {locale === 'tr'
                    ? 'Kapalı bırakırsan şablon taslak/yayın olarak kaydedilir, atamayı sonra detay sayfasından yapabilirsin.'
                    : 'Leave off to save the template only; assign later from the detail page.'}
                </p>
              </div>
              <Toggle
                checked={state.assignmentEnabled}
                onChange={(v) => setState({ ...state, assignmentEnabled: v })}
              />
            </label>

            {state.assignmentEnabled && (
              <>
                <div className="grid gap-2">
                  {assigneeOpts.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      active={state.assigneeType === opt.value}
                      onClick={() => setState({ ...state, assigneeType: opt.value })}
                      title={opt.label}
                      body={opt.description}
                    />
                  ))}
                </div>

                {state.assigneeType === 'team_member' && (
                  <Field label={t.audits_assign_team_member} required>
                    {teamMembers.length === 0 ? (
                      <p className="text-[13px] text-[#737373]">
                        {locale === 'tr'
                          ? 'Aktif ekip üyesi yok. Önce Ayarlar → Ekip\'ten davet et.'
                          : 'No active team members. Invite via Settings → Team first.'}
                      </p>
                    ) : (
                      <select
                        className="bz-input"
                        value={state.assigneeTeamMemberId ?? ''}
                        onChange={(e) =>
                          setState({ ...state, assigneeTeamMemberId: e.target.value || null })
                        }
                      >
                        <option value="">—</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.email} · {m.role}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}

                {state.assigneeType === 'candidate' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={locale === 'tr' ? 'Ad' : 'Name'}>
                      <input
                        className="bz-input"
                        value={state.assigneeName}
                        onChange={(e) => setState({ ...state, assigneeName: e.target.value })}
                      />
                    </Field>
                    <Field label="E-posta">
                      <input
                        className="bz-input"
                        type="email"
                        value={state.assigneeEmail}
                        onChange={(e) => setState({ ...state, assigneeEmail: e.target.value })}
                      />
                    </Field>
                    <Field label={locale === 'tr' ? 'Telefon' : 'Phone'}>
                      <input
                        className="bz-input"
                        type="tel"
                        value={state.assigneePhone}
                        onChange={(e) => setState({ ...state, assigneePhone: e.target.value })}
                      />
                    </Field>
                  </div>
                )}

                {(state.assigneeType === 'candidate' || state.assigneeType === 'link') && (
                  <AlertBanner kind="info">
                    {locale === 'tr'
                      ? 'Kaydedince sistem otomatik bir public link üretir. Linki detay sayfasından kopyalayıp paylaşabilirsin. (Yanıt akışı bir sonraki dalgada açılacak.)'
                      : 'After saving, a public link is generated. Copy and share it from the detail page. (Response flow ships next wave.)'}
                  </AlertBanner>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t.audits_assign_due_date}>
                    <input
                      className="bz-input"
                      type="date"
                      value={state.dueAt}
                      onChange={(e) => setState({ ...state, dueAt: e.target.value })}
                    />
                  </Field>
                  <Field label={t.audits_assign_recurrence}>
                    <select
                      className="bz-input"
                      value={state.recurrence}
                      onChange={(e) => setState({ ...state, recurrence: e.target.value as AuditRecurrence })}
                    >
                      {AUDIT_RECURRENCES.map((r) => (
                        <option key={r} value={r}>
                          {t[`audits_recurrence_${r}` as 'audits_recurrence_once']}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label={t.audits_assign_internal_note}>
                  <textarea
                    className="bz-input min-h-[60px]"
                    value={state.internalNote}
                    onChange={(e) => setState({ ...state, internalNote: e.target.value })}
                    maxLength={2000}
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-[13px]">
            <div className="bz-card-soft p-3 space-y-1">
              <p className="bz-h-tight text-[15px]">{state.title || (locale === 'tr' ? 'Başlıksız' : 'Untitled')}</p>
              {state.description && <p className="text-[#525252]">{state.description}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge kind="lime">
                  {t[`audits_sector_${state.sector}` as 'audits_sector_food']}
                </Badge>
                <Badge kind="ghost">
                  {state.scoringMode === 'percentage'
                    ? t.audits_score_mode_percentage
                    : state.scoringMode === 'weighted'
                      ? t.audits_score_mode_weighted
                      : t.audits_score_mode_pass_fail}
                </Badge>
                {state.passingScore != null && <Badge kind="info">≥{state.passingScore}</Badge>}
                <Badge kind="ghost">{state.questions.length} {locale === 'tr' ? 'soru' : 'questions'}</Badge>
              </div>
            </div>
            {state.assignmentEnabled && state.assigneeType ? (
              <div className="bz-card-soft p-3">
                <p className="bz-h-tight text-[13px] mb-1">
                  {locale === 'tr' ? 'Atama' : 'Assignment'}
                </p>
                <p>
                  <Badge kind="info">
                    {assigneeOpts.find((o) => o.value === state.assigneeType)?.label}
                  </Badge>{' '}
                  {state.assigneeType === 'team_member' && state.assigneeTeamMemberId && (
                    <span>{teamMembers.find((m) => m.id === state.assigneeTeamMemberId)?.email}</span>
                  )}
                  {state.assigneeType === 'candidate' && (
                    <span>{[state.assigneeName, state.assigneeEmail, state.assigneePhone].filter(Boolean).join(' · ')}</span>
                  )}
                </p>
                {state.dueAt && (
                  <p className="text-[#737373] mt-1">
                    {t.audits_assign_due_date}: {state.dueAt}
                  </p>
                )}
              </div>
            ) : (
              <AlertBanner kind="info">
                {locale === 'tr'
                  ? 'Atama yok. Detay sayfasından sonra atama yapabilirsin.'
                  : 'No assignment. You can assign later from the detail page.'}
              </AlertBanner>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="bz-btn-ghost"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
          disabled={step === 1 || submitting}
        >
          <ArrowLeft size={14} /> {t.audits_wizard_prev}
        </button>
        {step < 5 ? (
          <button
            type="button"
            className="bz-btn-primary"
            onClick={() => stepValid && setStep((s) => (s < 5 ? ((s + 1) as WizardStep) : s))}
            disabled={!stepValid || submitting}
          >
            {t.audits_wizard_next} <ArrowRight size={14} />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={() => handleSubmit(false)}
              disabled={submitting || state.questions.length === 0}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {t.audits_wizard_save_draft}
            </button>
            <button
              type="button"
              className="bz-btn-primary"
              onClick={() => handleSubmit(true)}
              disabled={submitting || state.questions.length === 0}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {t.audits_wizard_publish}
            </button>
          </div>
        )}
      </div>

      <AuditQuestionEditor
        locale={locale}
        open={editorOpen}
        draft={editingDraft}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveQuestion}
      />
    </div>
  );
}
