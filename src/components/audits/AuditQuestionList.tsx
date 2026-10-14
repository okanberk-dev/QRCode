'use client';

// Denetim Merkezi — builder'ın madde listesi (spec §3.4).
//
// Tek bileşen: hızlı ekleme satırı + sürüklenebilir madde listesi + "Detay"
// editörü. Eski wizard ile edit ekranındaki iki kopya `SortableQuestionItem`
// bunun yerine geçer.
//
//   • Hızlı ekleme: metin + tür çipleri; Enter maddeyi varsayılanlarla ekler ve
//     odak kutuda kalır → 6 maddelik kontrol listesi = 6 × (yaz + Enter).
//     "Seçenekli" seçenek istediği için editörü hemen açar.
//   • Satır: sürükle, numara, yerinde düzenlenen metin (otomatik boy), tür,
//     Evet/Hayır'da görünür "Uygun cevap", "Zorunlu değil", "Detay", sil.
//   • Yanıt almış maddeler (kalıcı id'si `answeredIds`'te) kilitli: tür /
//     seçenek / uygun cevap / ağırlık değişmez, silinemez; metin serbest.

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GripVertical, Lock, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  type Announcements,
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
import { Badge } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { humanQuestionType, type AuditKind } from '@/lib/audits/kind';
import { getYesNoDefaultOptions } from '@/lib/audits/options';
import { makeDefaultQuestion, type AuditBuilderQuestion } from '@/lib/audits/question-normalize';
import AuditQuestionEditor from './AuditQuestionEditor';
import ChipRadioGroup from './ChipRadioGroup';
import {
  QUICK_ADD_TYPES,
  applyDraftToQuestion,
  defaultQuickAddType,
  expectedAnswerLabel,
  optionsPreview,
  questionToDraft,
  quickAddLabel,
  yesNoCorrectIndex,
  type QuickAddType,
} from './audit-ui';

export const AUDIT_MAX_QUESTIONS = 100;

export interface AuditQuestionListProps {
  /** Arayüz dili. */
  locale: Locale;
  /** Denetimin dili (Evet/Hayır ↔ Yes/No). */
  auditLocale: 'tr' | 'en';
  /** Türetilmiş tür: "Uygun cevap" / "Doğru cevap" ve yer tutucu metni. */
  kind: AuditKind;
  /** Hızlı ekleme çipinin başlangıç değeri (oluşturmada seçilen tür). */
  startKind: AuditKind;
  questions: AuditBuilderQuestion[];
  onChange: (next: AuditBuilderQuestion[]) => void;
  /** Yanıt almış sorular (kalıcı id'ler). */
  answeredIds?: ReadonlySet<string>;
  /** clientKey → doğrulama hatası. */
  errors?: Readonly<Record<string, string>>;
  /** Hızlı ekleme kutusunun id'si (builder başlıktan Enter ile buraya odaklar). */
  inputId?: string;
  max?: number;
}

// ─── Yardımcılar ────────────────────────────────────────────────────────

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Yerinde düzenlenen madde metni: içeriğe göre boy ayarlar, Enter odağı kutuya taşır. */
function AutoTextarea({
  value,
  onChange,
  onEnter,
  ariaLabel,
  invalid,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  ariaLabel: string;
  invalid: boolean;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useIsoLayoutEffect(() => {
    fit();
  }, [value, fit]);

  // Genişlik değişince (döndürme, yan panel) satır sayısı da değişir.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w !== lastWidth) {
        lastWidth = w;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      maxLength={2000}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      enterKeyHint="next"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Enter = bitir ve hızlı ekleme kutusuna geç; Shift+Enter yeni satır.
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnter();
        }
      }}
      className={[
        'block w-full resize-none overflow-hidden rounded-lg border bg-transparent px-2 py-1.5',
        'text-[16px] leading-snug text-[#0A0A0A] sm:text-[14px]',
        'placeholder:text-[#A3A3A3] hover:border-[#EDEDED] hover:bg-white',
        'focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C6F24E]/50',
        invalid
          ? 'border-[#FCA5A5] focus:border-[#DC2626]'
          : 'border-transparent focus:border-[#C6F24E]',
      ].join(' ')}
    />
  );
}

// ─── Satır ──────────────────────────────────────────────────────────────

interface RowProps {
  q: AuditBuilderQuestion;
  index: number;
  locale: Locale;
  auditLocale: 'tr' | 'en';
  kind: AuditKind;
  locked: boolean;
  error: string | null;
  onPrompt: (key: string, value: string) => void;
  onToggleOptional: (key: string) => void;
  onExpected: (key: string, idx: 0 | 1) => void;
  onDetail: (key: string) => void;
  onRemove: (key: string) => void;
  onEnterPrompt: () => void;
}

const QuestionRow = memo(function QuestionRow({
  q,
  index,
  locale,
  auditLocale,
  kind,
  locked,
  error,
  onPrompt,
  onToggleOptional,
  onExpected,
  onDetail,
  onRemove,
  onEnterPrompt,
}: RowProps) {
  const isTr = locale === 'tr';
  const radioName = useId();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.clientKey,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { boxShadow: '0 8px 20px -4px rgba(0,0,0,0.18)', zIndex: 20 } : {}),
  };

  const yesNoOptions = getYesNoDefaultOptions(auditLocale);
  const yesNoIdx = yesNoCorrectIndex(q.correctAnswer);
  const filledOptions = (q.options ?? []).filter((o) => o.trim().length > 0);
  const choiceNeedsOptions = (q.type === 'single' || q.type === 'multi') && filledOptions.length < 2;
  const noun = kind === 'quiz' ? (isTr ? 'Soru' : 'Question') : isTr ? 'Madde' : 'Item';
  const hasCorrect =
    q.correctAnswer !== null &&
    q.correctAnswer !== undefined &&
    !(Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-q-key={q.clientKey}
      className={[
        'bz-card scroll-mt-24 p-2.5 sm:p-3',
        isDragging ? 'ring-1 ring-[#C6F24E]' : '',
        error ? 'border-[#FCA5A5]' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-1.5 sm:gap-2">
        <button
          type="button"
          className="bz-btn-icon h-11 w-9 shrink-0 cursor-grab touch-none active:cursor-grabbing sm:h-8"
          aria-label={isTr ? `${noun} ${index + 1}: sırayı değiştir` : `${noun} ${index + 1}: reorder`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} aria-hidden="true" />
        </button>
        <span
          aria-hidden="true"
          className="bz-mono mt-2.5 w-5 shrink-0 text-right text-[12px] text-[#737373] sm:mt-2"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <AutoTextarea
            value={q.prompt}
            onChange={(v) => onPrompt(q.clientKey, v)}
            onEnter={onEnterPrompt}
            ariaLabel={`${noun} ${index + 1}`}
            invalid={Boolean(error) && !q.prompt.trim()}
            placeholder={isTr ? `${noun} metni` : `${noun} text`}
          />

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2">
            <Badge kind="ghost" dot={false}>
              {humanQuestionType(q.type, locale)}
            </Badge>

            {q.type === 'yes_no' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span id={`${radioName}-lbl`} className="text-[12px] text-[#525252]">
                  {expectedAnswerLabel(kind, locale)}:
                </span>
                <ChipRadioGroup
                  name={`${radioName}-ok`}
                  labelledBy={`${radioName}-lbl`}
                  tone="lime"
                  disabled={locked}
                  value={yesNoIdx === 0 ? '0' : yesNoIdx === 1 ? '1' : ''}
                  options={[
                    { value: '0', label: yesNoOptions[0] },
                    { value: '1', label: yesNoOptions[1] },
                  ]}
                  onChange={(v) => onExpected(q.clientKey, v === '0' ? 0 : 1)}
                />
                {yesNoIdx === -1 && (
                  <span className="text-[11.5px] text-[#737373]">
                    {isTr ? 'Seçilmedi · puana katılmaz' : 'Not set · not scored'}
                  </span>
                )}
              </div>
            )}

            {(q.type === 'single' || q.type === 'multi') && filledOptions.length >= 2 && (
              <span className="min-w-0 max-w-full truncate text-[12px] text-[#525252]">
                {optionsPreview(filledOptions)}
              </span>
            )}
            {(q.type === 'single' || q.type === 'multi') && filledOptions.length >= 2 && !hasCorrect && (
              <span className="text-[11.5px] text-[#737373]">
                {isTr ? 'Doğru cevap yok · puana katılmaz' : 'No correct answer · not scored'}
              </span>
            )}

            {q.weight > 1 && (
              <Badge kind="warn" dot={false}>
                {isTr ? `Puan ×${q.weight}` : `Weight ×${q.weight}`}
              </Badge>
            )}

            <button
              type="button"
              aria-pressed={!q.isRequired}
              onClick={() => onToggleOptional(q.clientKey)}
              className={[
                'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-[12.5px] font-medium transition-colors sm:min-h-8',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6F24E]',
                !q.isRequired
                  ? 'border-[#A8D62E] bg-[#EAF9B8] text-[#0A0A0A]'
                  : 'border-[#EDEDED] bg-white text-[#525252] hover:bg-[#FAFAFA]',
              ].join(' ')}
            >
              {isTr ? 'Zorunlu değil' : 'Not required'}
            </button>

            {locked && (
              <span
                className="inline-flex items-center gap-1 text-[11.5px] text-[#737373]"
                title={
                  isTr
                    ? 'Bu maddeye yanıt verilmiş; türü ve seçenekleri değişmez.'
                    : 'This item has answers; its type and options are fixed.'
                }
              >
                <Lock size={12} aria-hidden="true" />
                {isTr ? 'Yanıt almış' : 'Has answers'}
              </span>
            )}

            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDetail(q.clientKey)}
                className="bz-btn-ghost min-h-9 sm:min-h-8"
                aria-label={isTr ? `${noun} ${index + 1}: detay` : `${noun} ${index + 1}: details`}
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                {isTr ? 'Detay' : 'Details'}
              </button>
              <button
                type="button"
                onClick={() => onRemove(q.clientKey)}
                disabled={locked}
                title={locked ? (isTr ? 'Yanıt almış madde silinemez.' : 'An item with answers cannot be deleted.') : undefined}
                aria-label={
                  locked
                    ? isTr
                      ? `${noun} ${index + 1} silinemez: yanıt almış`
                      : `${noun} ${index + 1} cannot be deleted: it has answers`
                    : isTr
                      ? `${noun} ${index + 1}: sil`
                      : `${noun} ${index + 1}: delete`
                }
                className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </span>
          </div>

          {(error || choiceNeedsOptions) && (
            <p className="mt-1.5 px-2 text-[12px] font-medium text-[#B91C1C]" role="alert">
              {error ??
                (isTr ? 'En az 2 seçenek yaz. "Detay"dan ekleyebilirsin.' : 'Write at least 2 options. Add them under "Details".')}
            </p>
          )}
        </div>
      </div>
    </li>
  );
});

// ─── Liste ──────────────────────────────────────────────────────────────

export default function AuditQuestionList({
  locale,
  auditLocale,
  kind,
  startKind,
  questions,
  onChange,
  answeredIds,
  errors,
  inputId,
  max = AUDIT_MAX_QUESTIONS,
}: AuditQuestionListProps) {
  const isTr = locale === 'tr';
  const baseId = useId();
  const dndId = useId();
  const quickInputId = inputId ?? `${baseId}-quick`;
  const quickLabelId = `${baseId}-quick-lbl`;
  const quickTypeLabelId = `${baseId}-quick-type`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [quickType, setQuickType] = useState<QuickAddType>(() => defaultQuickAddType(startKind));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');

  // Satır callback'leri kararlı kalsın (React.memo) → son listeyi ref'ten oku.
  const qRef = useRef(questions);
  qRef.current = questions;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const answeredRef = useRef(answeredIds);
  answeredRef.current = answeredIds;

  const atMax = questions.length >= max;
  const noun = kind === 'quiz' ? (isTr ? 'Soru' : 'Question') : isTr ? 'Madde' : 'Item';

  const isLocked = useCallback(
    (q: AuditBuilderQuestion) => Boolean(q.persistedId && answeredRef.current?.has(q.persistedId)),
    [],
  );

  const patch = useCallback((key: string, fn: (q: AuditBuilderQuestion) => AuditBuilderQuestion) => {
    onChangeRef.current(qRef.current.map((q) => (q.clientKey === key ? fn(q) : q)));
  }, []);

  const focusQuickInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const add = useCallback(() => {
    const prompt = text.trim();
    if (!prompt || qRef.current.length >= max) return;
    const created = makeDefaultQuestion(quickType, auditLocale, {
      prompt,
      sortOrder: (qRef.current.length + 1) * 10,
    });
    onChangeRef.current([...qRef.current, created]);
    setText('');
    setAnnounce(
      isTr
        ? `${noun} eklendi. Toplam ${qRef.current.length + 1}.`
        : `${noun} added. ${qRef.current.length + 1} in total.`,
    );
    // Seçenekli soru seçenek ister → editörü hemen aç (odak ilk seçenekte).
    if (quickType === 'single') setEditingKey(created.clientKey);
    else focusQuickInput();
  }, [text, quickType, auditLocale, max, isTr, noun, focusQuickInput]);

  const onPrompt = useCallback(
    (key: string, value: string) => patch(key, (q) => ({ ...q, prompt: value })),
    [patch],
  );
  const onToggleOptional = useCallback(
    (key: string) => patch(key, (q) => ({ ...q, isRequired: !q.isRequired })),
    [patch],
  );
  const onExpected = useCallback(
    (key: string, idx: 0 | 1) => {
      const opts = getYesNoDefaultOptions(auditLocale);
      patch(key, (q) => (isLocked(q) ? q : { ...q, options: opts, correctAnswer: opts[idx] }));
    },
    [patch, auditLocale, isLocked],
  );
  const onDetail = useCallback((key: string) => setEditingKey(key), []);
  const onRemove = useCallback(
    (key: string) => {
      const target = qRef.current.find((q) => q.clientKey === key);
      if (!target || isLocked(target)) return;
      onChangeRef.current(qRef.current.filter((q) => q.clientKey !== key));
      setAnnounce(isTr ? `${noun} silindi.` : `${noun} deleted.`);
      focusQuickInput();
    },
    [isLocked, isTr, noun, focusQuickInput],
  );

  // @dnd-kit sensörleri — menü builder'ıyla aynı (CLAUDE.md §12.1).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = qRef.current;
    const from = list.findIndex((q) => q.clientKey === active.id);
    const to = list.findIndex((q) => q.clientKey === over.id);
    if (from === -1 || to === -1) return;
    onChangeRef.current(
      arrayMove(list, from, to).map((q, i) => ({ ...q, sortOrder: (i + 1) * 10 })),
    );
  }, []);

  const dndAnnouncements = useMemo<Announcements>(() => {
    const pos = (id: string | number) => qRef.current.findIndex((q) => q.clientKey === id) + 1;
    return {
      onDragStart: ({ active }) =>
        isTr ? `${noun} ${pos(active.id)} alındı.` : `Picked up ${noun.toLowerCase()} ${pos(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over
          ? isTr
            ? `${noun} ${pos(active.id)}, ${pos(over.id)}. sıranın üzerinde.`
            : `${noun} ${pos(active.id)} is over position ${pos(over.id)}.`
          : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? isTr
            ? `${noun} ${pos(active.id)}, ${pos(over.id)}. sıraya bırakıldı.`
            : `${noun} ${pos(active.id)} was dropped at position ${pos(over.id)}.`
          : isTr
            ? `${noun} yerinde bırakıldı.`
            : `${noun} was dropped in place.`,
      onDragCancel: ({ active }) =>
        isTr ? `Taşıma iptal edildi. ${noun} ${pos(active.id)} yerinde.` : `Move cancelled. ${noun} ${pos(active.id)} stays in place.`,
    };
  }, [isTr, noun]);

  const editing = editingKey ? (questions.find((q) => q.clientKey === editingKey) ?? null) : null;
  // Düzenlenen soru dışarıdan silinirse (nadir) editör kendiliğinden kapanır.
  useEffect(() => {
    if (editingKey && !editing) setEditingKey(null);
  }, [editingKey, editing]);

  return (
    <div className="space-y-3">
      {/* Hızlı ekleme */}
      <div className="bz-card space-y-2.5 p-3">
        <label id={quickLabelId} htmlFor={quickInputId} className="sr-only">
          {isTr ? `Yeni ${noun.toLocaleLowerCase('tr-TR')} metni` : `New ${noun.toLowerCase()} text`}
        </label>
        <div className="flex gap-2">
          <input
            id={quickInputId}
            ref={inputRef}
            type="text"
            className="bz-input min-w-0 flex-1"
            value={text}
            maxLength={2000}
            disabled={atMax}
            autoComplete="off"
            enterKeyHint="enter"
            placeholder={
              kind === 'quiz'
                ? isTr
                  ? "Soru yaz ve Enter'a bas…"
                  : 'Type a question and press Enter…'
                : isTr
                  ? "Madde yaz ve Enter'a bas…"
                  : 'Type an item and press Enter…'
            }
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
              e.preventDefault();
              add();
            }}
          />
          <button
            type="button"
            className="bz-btn-primary shrink-0"
            onClick={add}
            disabled={atMax || text.trim().length === 0}
          >
            <Plus size={14} aria-hidden="true" /> {isTr ? 'Ekle' : 'Add'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span id={quickTypeLabelId} className="text-[12px] text-[#737373]">
            {isTr ? 'Tür:' : 'Type:'}
          </span>
          <ChipRadioGroup
            name={`${baseId}-quick-type`}
            labelledBy={quickTypeLabelId}
            value={quickType}
            onChange={setQuickType}
            options={QUICK_ADD_TYPES.map((t) => ({ value: t, label: quickAddLabel(t, locale) }))}
          />
        </div>
        {atMax && (
          <p className="text-[12px] text-[#92400E]">
            {isTr
              ? `En fazla ${max} ${noun.toLocaleLowerCase('tr-TR')} ekleyebilirsin.`
              : `You can add up to ${max} ${noun.toLowerCase()}s.`}
          </p>
        )}
      </div>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-4 py-5 text-center text-[13px] text-[#737373]">
          {kind === 'quiz'
            ? isTr
              ? 'Henüz soru yok. Yukarıya ilk soruyu yazıp Enter\'a bas.'
              : 'No questions yet. Type the first one above and press Enter.'
            : isTr
              ? 'Henüz madde yok. Yukarıya ilk maddeyi yazıp Enter\'a bas.'
              : 'No items yet. Type the first one above and press Enter.'}
        </p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements: dndAnnouncements,
            screenReaderInstructions: {
              draggable: isTr
                ? 'Sıralamak için boşluk tuşuna bas, ok tuşlarıyla taşı, bırakmak için tekrar boşluk tuşuna bas.'
                : 'To reorder, press space, move with the arrow keys, and press space again to drop.',
            },
          }}
        >
          <SortableContext
            items={questions.map((q) => q.clientKey)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-2">
              {questions.map((q, i) => (
                <QuestionRow
                  key={q.clientKey}
                  q={q}
                  index={i}
                  locale={locale}
                  auditLocale={auditLocale}
                  kind={kind}
                  locked={Boolean(q.persistedId && answeredIds?.has(q.persistedId))}
                  error={errors?.[q.clientKey] ?? null}
                  onPrompt={onPrompt}
                  onToggleOptional={onToggleOptional}
                  onExpected={onExpected}
                  onDetail={onDetail}
                  onRemove={onRemove}
                  onEnterPrompt={focusQuickInput}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <AuditQuestionEditor
        locale={locale}
        open={editing !== null}
        draft={editing ? questionToDraft(editing) : null}
        auditLocale={auditLocale}
        kind={kind}
        locked={editing ? isLocked(editing) : false}
        onClose={() => setEditingKey(null)}
        onSave={(d) => {
          if (!editingKey) return;
          patch(editingKey, (q) => applyDraftToQuestion(q, d));
          setEditingKey(null);
        }}
      />
    </div>
  );
}
