'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Field } from '@/components/ui';
import { Sheet } from '../kit/Sheet';
import { parsePasteBlock } from '../menu-paste';
import type { CategoryShape } from '../menu-types';
import { isFinePointer, useIsSmUp } from '../menu-ui';
import { PasteReview, announcePaste } from '../outline/PasteReview';
import { useStudio } from '../studio/studio-context';

/**
 * "Liste yapıştır" sheet (spec §7.7 / §8.3): pick the category, paste lines,
 * see the review update as you type. Once a row in the review is edited the
 * review stops following the text ("Yeniden oku" reads it again). The text is
 * kept when adding fails; every way of closing asks first when something
 * would be lost. Success closes the sheet, then toasts with "Geri al".
 */
export function PasteSheet({
  initialCategoryId, categories, onClose, onDirtyChange,
}: {
  initialCategoryId: string | null;
  categories: CategoryShape[];
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { copy, isTr, toaster, flashItem } = useStudio();
  const smUp = useIsSmUp();
  const textId = useId();
  const categorySelectId = useId();
  const [target, setTarget] = useState<string>(initialCategoryId ?? categories[0]?.id ?? '');
  const [text, setText] = useState('');
  const [readText, setReadText] = useState('');
  const [reviewEdited, setReviewEdited] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const sections = useMemo(() => parsePasteBlock(readText, isTr).sections, [readText, isTr]);
  const dirty = text.trim() !== '';

  const requestClose = () => {
    if (dirty) setConfirmClose(true);
    else onClose();
  };
  const onEdited = useCallback(() => setReviewEdited(true), []);

  return (
    <Sheet
      open
      onRequestClose={requestClose}
      side={smUp ? 'right' : 'bottom'}
      widthClass="sm:max-w-[560px]"
      title={copy.paste.title}
      overlay={
        confirmClose ? (
          <div className="absolute inset-0 z-10 flex items-end justify-center bg-[#0A0A0A]/30 p-4 sm:items-center">
            <div role="alertdialog" aria-label={copy.paste.discardTitle} className="w-full max-w-[400px] space-y-2 rounded-2xl bg-white p-4 bz-elev-3">
              <p className="text-[15px] font-semibold text-[#0A0A0A]">{copy.paste.discardTitle}</p>
              <p className="text-[13px] text-[#525252]">{copy.paste.discardBody}</p>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button type="button" autoFocus onClick={() => setConfirmClose(false)} className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]">
                  {copy.paste.keep}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDirtyChange(false);
                    onClose();
                  }}
                  className="bz-btn min-h-[44px] border-[#FCA5A5] text-[#991B1B] sm:min-h-[36px]"
                >
                  {copy.paste.discard}
                </button>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-[#525252]">
          {copy.paste.help} {copy.paste.headerHelp}
        </p>
        <Field label={copy.paste.whichCategory} htmlFor={categorySelectId}>
          {/* Native select: a portaled PulseSelect cannot be used inside the modal sheet. */}
          <select
            id={categorySelectId}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="bz-input w-full sm:w-[280px]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.paste.title} htmlFor={textId}>
          <textarea
            id={textId}
            value={text}
            rows={8}
            autoFocus={isFinePointer()}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              onDirtyChange(next.trim() !== '');
              if (!reviewEdited) setReadText(next);
            }}
            placeholder={copy.paste.placeholder}
            className="bz-input min-h-[160px] resize-y text-[16px] sm:text-[14px]"
          />
        </Field>
        {reviewEdited && readText !== text && (
          <button
            type="button"
            onClick={() => {
              setReadText(text);
              setReviewEdited(false);
            }}
            className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8"
          >
            <RefreshCw size={13} strokeWidth={2} aria-hidden="true" />
            {copy.paste.reread}
          </button>
        )}
        {sections.length > 0 && (
          <PasteReview
            key={readText}
            variant="sheet"
            initialSections={sections}
            targetCategoryId={target || null}
            onEdited={onEdited}
            onCancel={requestClose}
            onDone={(r) => {
              onDirtyChange(false);
              onClose();
              announcePaste(r, { copy, toaster, flashItem });
            }}
          />
        )}
      </div>
    </Sheet>
  );
}
