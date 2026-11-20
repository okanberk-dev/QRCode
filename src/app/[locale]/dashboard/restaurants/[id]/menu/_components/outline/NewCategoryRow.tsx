'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Field } from '@/components/ui';
import { useStudio } from '../studio/studio-context';

const MAX = 80;

/** Locale case-insensitive duplicate check of a category name. */
export function isDuplicateCategoryName(name: string, others: { id: string; name: string }[], exceptId?: string): boolean {
  const key = name.trim().toLocaleLowerCase('tr-TR');
  return others.some((c) => c.id !== exceptId && c.name.trim().toLocaleLowerCase('tr-TR') === key);
}

/**
 * "+ Yeni kategori" under the outline: a dashed button that turns into a name
 * field. Enter adds the category; its quick-add opens right away.
 */
export function NewCategoryRow({ autoFocus = false }: { autoFocus?: boolean }) {
  const { copy, actions, getCategories, registerNewCategory, focusQuickAdd } = useStudio();
  const [open, setOpen] = useState(autoFocus);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openForm = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: 'nearest' });
    });
  }, []);
  useEffect(() => registerNewCategory(openForm), [registerNewCategory, openForm]);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = async () => {
    const trimmed = name.replace(/\s+/g, ' ').trim();
    if (!trimmed) return setError(copy.category.nameRequired);
    if (trimmed.length > MAX) return setError(copy.category.nameTooLong);
    if (isDuplicateCategoryName(trimmed, getCategories())) return setError(copy.category.duplicate);
    setBusy(true);
    const r = await actions.createCategory(trimmed);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setName('');
    setError(null);
    setOpen(autoFocus);
    if (r.categoryId) {
      const id = r.categoryId;
      requestAnimationFrame(() => requestAnimationFrame(() => focusQuickAdd(id)));
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    } else if (e.key === 'Escape' && !autoFocus) {
      e.preventDefault();
      setOpen(false);
      setName('');
      setError(null);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={openForm}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4D4D4] bg-white text-[13.5px] font-medium text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
      >
        <Plus size={15} strokeWidth={2.25} aria-hidden="true" />
        {copy.outline.newCategory}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-[#D4D4D4] bg-white p-4">
      <Field label={copy.category.name} error={error}>
        <input
          ref={inputRef}
          value={name}
          maxLength={MAX}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={copy.category.namePlaceholder}
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="done"
          className="bz-input h-11 pointer-fine:h-9"
        />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        {!autoFocus && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setName('');
              setError(null);
            }}
            className="bz-btn-ghost"
          >
            {copy.category.cancel}
          </button>
        )}
        <button type="button" onClick={() => void submit()} disabled={busy} className="bz-btn-primary">
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {copy.category.add}
        </button>
      </div>
    </div>
  );
}
