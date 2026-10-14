'use client';

// Surveys editor — one question as a card.
//
// Header: number + type chip (a menu; a lock when the question has answers) and
// a "..." menu (move up / down, duplicate, delete). Body: the question text
// (auto-growing textarea), choice rows, and a "required" switch row. Every
// touch target is 44 px; the textarea and inputs are 16 px on phones (bz-input)
// so iOS does not zoom.
//
// Locks mirror the server (rules R1 / R2 in lib/surveys.ts):
//   - an answered question keeps its type;
//   - in an answered choice question only options that were actually picked are
//     read-only and cannot be removed — unpicked ones stay free, new ones too.
// Rewording an answered question is allowed but warned about (old answers read
// under the new wording).

import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Gauge,
  ListChecks,
  Lock,
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react';
import { APSwitch, PulseMenu, PulseMenuItem, PulseMenuLabel } from '@/components/ui';
import type { SurveyQuestionType } from '@/lib/surveys';
import {
  OPTIONS_MAX,
  OPTIONS_MIN,
  OPTION_TEXT_MAX,
  QUESTION_TEXT_MAX,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_MENU_ORDER,
  changeQuestionType,
  isAnsweredTextChanged,
  isTypeLocked,
  optionRow,
  type EditorLocale,
  type EditorQuestion,
  type QuestionErrors,
} from './survey-editor-state';

export const QUESTION_TYPE_ICONS: Record<SurveyQuestionType, LucideIcon> = {
  rating: Star,
  nps: Gauge,
  multiple_choice: ListChecks,
  short_text: Type,
  long_text: AlignLeft,
};

export interface QuestionCardHandle {
  focusText: () => void;
  focusOption: (index: number) => void;
}

interface QuestionCardProps {
  ref?: React.Ref<QuestionCardHandle>;
  locale: EditorLocale;
  question: EditorQuestion;
  index: number;
  total: number;
  errors?: QuestionErrors;
  /** The 30-question cap is reached: duplicating is not possible. */
  maxReached: boolean;
  onChange: (next: EditorQuestion) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const ICON_BTN =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#525252] transition-colors hover:bg-[#F5F5F5] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

export default function QuestionCard({
  ref,
  locale,
  question,
  index,
  total,
  errors,
  maxReached,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: QuestionCardProps) {
  const isTr = locale === 'tr';
  const uid = useId();
  const textId = `${uid}-text`;
  const textHintId = `${uid}-text-hint`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingOptionFocus = useRef<number | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      // Plain focus() scrolls the field into view; the scroll-margin classes on
      // the fields keep it clear of the sticky action bar and the bottom nav.
      focusText: () => textareaRef.current?.focus(),
      focusOption: (i: number) => optionRefs.current[i]?.focus(),
    }),
    [],
  );

  // Grow the textarea with its content (never a scrollbar inside the card).
  const growTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, []);
  useLayoutEffect(() => {
    growTextarea();
  }, [question.text, growTextarea]);
  useEffect(() => {
    // Fonts / width settle after the first paint; measure once more.
    const raf = window.requestAnimationFrame(growTextarea);
    return () => window.cancelAnimationFrame(raf);
  }, [growTextarea]);

  // Focus a row that "Add option" / Enter just created.
  useEffect(() => {
    const target = pendingOptionFocus.current;
    if (target === null) return;
    pendingOptionFocus.current = null;
    optionRefs.current[target]?.focus();
  }, [question.options.length]);

  const typeLocked = isTypeLocked(question);
  const TypeIcon = QUESTION_TYPE_ICONS[question.type];
  const typeLabel = QUESTION_TYPE_LABELS[question.type][locale];
  const isChoice = question.type === 'multiple_choice';
  const hasLockedOption = isChoice && question.options.some((o) => o.locked);
  const canDelete = total > 1;
  const textLength = question.text.length;
  const textErr = errors?.text ?? null;
  const answeredTextChanged = isAnsweredTextChanged(question);

  function setOptionText(optionIndex: number, text: string) {
    onChange({
      ...question,
      options: question.options.map((o, i) => (i === optionIndex ? { ...o, text } : o)),
    });
  }

  function addOption(at: number = question.options.length) {
    if (question.options.length >= OPTIONS_MAX) return;
    const next = [...question.options];
    next.splice(at, 0, optionRow(''));
    pendingOptionFocus.current = at;
    onChange({ ...question, options: next });
  }

  function removeOption(optionIndex: number) {
    if (question.options.length <= OPTIONS_MIN) return;
    const row = question.options[optionIndex];
    if (!row || row.locked) return;
    onChange({ ...question, options: question.options.filter((_, i) => i !== optionIndex) });
  }

  return (
    <li className="bz-card space-y-3 p-4 sm:p-5">
      {/* Header: number + type, and the "..." menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] px-2 text-[12px] font-semibold text-[#C6F24E]"
          >
            {index + 1}
          </span>

          {typeLocked ? (
            <span
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-3 text-[13px] font-medium text-[#525252]"
              title={
                isTr
                  ? 'Bu sorunun yanıtları olduğu için tipi değiştirilemez.'
                  : "The type can't change because this question has responses."
              }
            >
              <TypeIcon size={15} aria-hidden="true" />
              <span className="truncate">{typeLabel}</span>
              <Lock size={13} aria-hidden="true" />
              <span className="sr-only">
                {isTr
                  ? 'Bu sorunun yanıtları olduğu için tipi değiştirilemez.'
                  : "The type can't change because this question has responses."}
              </span>
            </span>
          ) : (
            <PulseMenu
              align="start"
              className="min-w-[220px]"
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
                  aria-label={`${isTr ? 'Soru tipi' : 'Question type'}: ${typeLabel}`}
                >
                  <TypeIcon size={15} aria-hidden="true" />
                  <span className="truncate">{typeLabel}</span>
                  <ChevronDown size={14} className="text-[#737373]" aria-hidden="true" />
                </button>
              }
            >
              <PulseMenuLabel>{isTr ? 'Soru tipi' : 'Question type'}</PulseMenuLabel>
              {QUESTION_TYPE_MENU_ORDER.map((type) => {
                const Icon = QUESTION_TYPE_ICONS[type];
                return (
                  <PulseMenuItem
                    key={type}
                    icon={<Icon size={14} />}
                    selected={type === question.type}
                    onSelect={() => onChange(changeQuestionType(question, type))}
                  >
                    {QUESTION_TYPE_LABELS[type][locale]}
                  </PulseMenuItem>
                );
              })}
            </PulseMenu>
          )}
        </div>

        <PulseMenu
          align="end"
          className="min-w-[200px]"
          trigger={
            <button
              type="button"
              className={ICON_BTN}
              aria-label={isTr ? `Soru ${index + 1} işlemleri` : `Question ${index + 1} actions`}
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
          }
        >
          <PulseMenuItem icon={<ArrowUp size={14} />} disabled={index === 0} onSelect={() => onMove(-1)}>
            {isTr ? 'Yukarı taşı' : 'Move up'}
          </PulseMenuItem>
          <PulseMenuItem icon={<ArrowDown size={14} />} disabled={index === total - 1} onSelect={() => onMove(1)}>
            {isTr ? 'Aşağı taşı' : 'Move down'}
          </PulseMenuItem>
          <PulseMenuItem icon={<Copy size={14} />} disabled={maxReached} onSelect={onDuplicate}>
            {isTr ? 'Çoğalt' : 'Duplicate'}
          </PulseMenuItem>
          <PulseMenuItem icon={<Trash2 size={14} />} danger disabled={!canDelete} onSelect={onDelete}>
            {canDelete
              ? isTr
                ? 'Sil'
                : 'Delete'
              : isTr
                ? 'Sil · en az 1 soru olmalı'
                : 'Delete · at least 1 question'}
          </PulseMenuItem>
        </PulseMenu>
      </div>

      {/* Question text */}
      <div>
        <label htmlFor={textId} className="sr-only">
          {isTr ? `Soru ${index + 1} metni` : `Question ${index + 1} text`}
        </label>
        <textarea
          ref={textareaRef}
          id={textId}
          className="bz-input block w-full resize-none overflow-hidden scroll-mt-24 scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+120px)]"
          style={{ minHeight: 68 }}
          rows={2}
          maxLength={QUESTION_TEXT_MAX}
          value={question.text}
          placeholder={isTr ? 'Sorunu buraya yaz…' : 'Write your question here…'}
          aria-invalid={textErr ? true : undefined}
          aria-describedby={textErr || answeredTextChanged ? textHintId : undefined}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
        />
        <div className="mt-1 flex items-start justify-between gap-3">
          <div id={textHintId} className="min-w-0 flex-1 space-y-1">
            {textErr && (
              <p role="alert" className="text-[11.5px] leading-[1.45] text-[#DC2626]">
                {textErr}
              </p>
            )}
            {answeredTextChanged && (
              <p className="text-[11.5px] leading-[1.45] text-[#92400E]">
                {isTr
                  ? `Bu sorunun ${question.answerCount} yanıtı var; metni değiştirirsen eski yanıtlar yeni metinle görünür.`
                  : `This question has ${question.answerCount} responses; if you change the text, old answers will appear under the new wording.`}
              </p>
            )}
          </div>
          {textLength >= 240 && (
            <span className="shrink-0 text-[11px] tabular-nums text-[#737373]" aria-hidden="true">
              {textLength}/{QUESTION_TEXT_MAX}
            </span>
          )}
        </div>
      </div>

      {/* Choice rows */}
      {isChoice && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-[#0A0A0A]">
            {isTr ? 'Seçenekler' : 'Options'}{' '}
            <span className="font-normal text-[#737373]">
              ({OPTIONS_MIN}–{OPTIONS_MAX})
            </span>
          </p>
          <ul className="space-y-2">
            {question.options.map((option, i) => {
              const dupe = errors?.duplicateRows.includes(i) ?? false;
              const rowErrorId = `${uid}-opt-${i}-err`;
              return (
                <li key={option.key}>
                  <div className="flex items-center gap-1">
                    <input
                      ref={(el) => {
                        optionRefs.current[i] = el;
                      }}
                      className="bz-input h-11 min-w-0 flex-1 scroll-mt-24 scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+120px)]"
                      value={option.text}
                      readOnly={option.locked}
                      maxLength={OPTION_TEXT_MAX}
                      autoComplete="off"
                      enterKeyHint="next"
                      placeholder={isTr ? `Seçenek ${i + 1}` : `Option ${i + 1}`}
                      aria-label={isTr ? `Seçenek ${i + 1}` : `Option ${i + 1}`}
                      aria-invalid={dupe ? true : undefined}
                      aria-describedby={dupe ? rowErrorId : undefined}
                      style={option.locked ? { background: '#FAFAFA', color: '#525252' } : undefined}
                      onChange={(e) => setOptionText(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          addOption(i + 1);
                        }
                      }}
                    />
                    {option.locked ? (
                      <span
                        role="img"
                        aria-label={
                          isTr
                            ? 'Bu seçenek yanıt aldığı için değiştirilemez.'
                            : "This option has responses and can't change."
                        }
                        title={
                          isTr
                            ? 'Bu seçenek yanıt aldığı için değiştirilemez.'
                            : "This option has responses and can't change."
                        }
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[#737373]"
                      >
                        <Lock size={16} aria-hidden="true" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={ICON_BTN}
                        disabled={question.options.length <= OPTIONS_MIN}
                        aria-label={isTr ? `Seçenek ${i + 1} sil` : `Remove option ${i + 1}`}
                        onClick={() => removeOption(i)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {dupe && (
                    <p id={rowErrorId} role="alert" className="mt-1 text-[11.5px] leading-[1.45] text-[#DC2626]">
                      {isTr ? 'Aynı seçeneği iki kez yazmışsın.' : 'You entered the same option twice.'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {errors?.options && (
            <p role="alert" className="text-[11.5px] leading-[1.45] text-[#DC2626]">
              {errors.options}
            </p>
          )}
          {hasLockedOption && (
            <p className="flex items-center gap-1.5 text-[11.5px] leading-[1.45] text-[#737373]">
              <Lock size={12} aria-hidden="true" />
              {isTr
                ? 'Kilitli seçenekler yanıt aldığı için değiştirilemez.'
                : "Locked options have responses and can't change."}
            </p>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            disabled={question.options.length >= OPTIONS_MAX}
            onClick={() => addOption()}
          >
            <Plus size={15} aria-hidden="true" />
            {isTr ? 'Seçenek ekle' : 'Add option'}
          </button>
        </div>
      )}

      {/* Required switch row — the 44 px target is the whole label row */}
      <div className="border-t border-[#EDEDED] pt-1">
        <APSwitch
          className="min-h-[44px] w-full"
          size="md"
          checked={question.required}
          onChange={(next) => onChange({ ...question, required: next })}
          label={isTr ? 'Cevaplamak zorunlu' : 'Required'}
          sublabel={
            isTr
              ? 'Kapalıysa müşteri bu soruyu atlayabilir.'
              : 'If off, customers can skip this question.'
          }
        />
      </div>
    </li>
  );
}
