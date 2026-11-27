'use client';

import { useId, type KeyboardEvent, type RefObject } from 'react';
import type { MenuAllergen, MenuBadge } from '@/lib/validations';
import { ALLERGEN_GROUPS, ALLERGEN_LABELS, BADGE_GROUPS, BADGE_LABELS, BADGE_TINTS } from '../menu-constants';
import { checkPrice, currencySymbol, priceEcho, type ItemFormValues } from '../menu-item-form';
import { itemStatus, statusPatch } from '../menu-status';
import type { CategoryShape } from '../menu-types';
import { useStudio } from '../studio/studio-context';
import { ChipGroupField } from './ChipGroupField';
import { PhotoField } from './PhotoField';
import { StatusField } from './StatusField';

const DESCRIPTION_MAX = 500;

/**
 * The item form (spec §7.8): one column, no tabs, nothing folded away — photo,
 * name + price, description, category, what customers see, labels, allergens.
 * Enter: name → price (edit: save); price → save (create: save & add
 * another). ⌘/Ctrl+Enter saves from anywhere (handled by the panel).
 */
export function ItemForm({
  mode, values, onChange, currency, categories, readOnly, nameError, priceError, onEnterSave,
  nameRef, priceRef, descriptionRef, photoRef, onUploadingChange, notice,
}: {
  mode: 'create' | 'edit';
  values: ItemFormValues;
  onChange: (patch: Partial<ItemFormValues>) => void;
  currency: string;
  categories: CategoryShape[];
  readOnly: boolean;
  nameError: string | null;
  priceError: string | null;
  /** Enter in name / price asks the panel to save (`addAnother` for create from the price field). */
  onEnterSave: (addAnother: boolean) => void;
  nameRef: RefObject<HTMLInputElement | null>;
  priceRef: RefObject<HTMLInputElement | null>;
  descriptionRef: RefObject<HTMLTextAreaElement | null>;
  photoRef: RefObject<HTMLButtonElement | null>;
  onUploadingChange: (uploading: boolean) => void;
  notice?: React.ReactNode;
}) {
  const { copy, isTr, actions } = useStudio();
  const nameId = useId();
  const priceId = useId();
  const descId = useId();
  const categoryId = useId();
  const lang = isTr ? 'tr' : 'en';
  const symbol = currencySymbol(currency);
  const category = categories.find((c) => c.id === values.categoryId);

  const price = checkPrice(values.price);
  const echo = priceEcho(values.price, currency, isTr);
  const priceMessage = priceError
    ? { tone: 'text-[#DC2626]', text: priceError, alert: true }
    : price.kind === 'ok' && price.zero
      ? { tone: 'text-[#92400E]', text: copy.fmt.priceZero(symbol), alert: false }
      : echo
        ? { tone: 'text-[#525252]', text: echo, alert: false }
        : null;

  const onNameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (mode === 'create' || !values.price.trim()) priceRef.current?.focus();
    else onEnterSave(false);
  };
  const onPriceKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    onEnterSave(mode === 'create');
  };

  const status = itemStatus(values);

  return (
    <div className="max-w-[560px] space-y-6">
      {notice}
      <PhotoField
        value={values.imageUrl}
        onChange={(imageUrl) => onChange({ imageUrl })}
        readOnly={readOnly}
        onUploadingChange={onUploadingChange}
        buttonRef={photoRef}
      />

      <div className="grid gap-3 @min-[420px]:grid-cols-[1fr_160px]">
        <div className="min-w-0">
          <label htmlFor={nameId} className="mb-1.5 block text-[12px] font-medium text-pn-ink">
            {copy.item.name}
            <span aria-hidden="true" className="ml-1 text-[#DC2626]">*</span>
          </label>
          <input
            id={nameId}
            ref={nameRef}
            value={values.name}
            maxLength={120}
            readOnly={readOnly}
            onChange={(e) => onChange({ name: e.target.value })}
            onKeyDown={onNameKey}
            placeholder={copy.item.namePlaceholder}
            autoCapitalize="sentences"
            autoComplete="off"
            enterKeyHint="next"
            aria-required="true"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${nameId}-err` : undefined}
            className="bz-input h-11 font-body pointer-fine:h-10"
          />
          {nameError && (
            <p id={`${nameId}-err`} role="alert" className="mt-1.5 text-[12px] text-[#DC2626]">
              {nameError}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <label htmlFor={priceId} className="mb-1.5 block text-[12px] font-medium text-pn-ink">
            {copy.item.price}
            <span aria-hidden="true" className="ml-1 text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              id={priceId}
              ref={priceRef}
              value={values.price}
              readOnly={readOnly}
              onChange={(e) => onChange({ price: e.target.value })}
              onKeyDown={onPriceKey}
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              placeholder={copy.item.pricePlaceholder}
              aria-required="true"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceMessage ? `${priceId}-msg` : undefined}
              className="bz-input h-11 pr-8 text-right tabular-nums pointer-fine:h-10"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-[#737373]">
              {symbol}
            </span>
          </div>
          {priceMessage && (
            <p id={`${priceId}-msg`} role={priceMessage.alert ? 'alert' : undefined} className={`mt-1.5 text-[12px] leading-snug ${priceMessage.tone}`}>
              {priceMessage.text}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={descId} className="mb-1.5 block text-[12px] font-medium text-pn-ink">
          {copy.item.description}
        </label>
        <textarea
          id={descId}
          ref={descriptionRef}
          value={values.description}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          readOnly={readOnly}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={copy.item.descriptionPlaceholder}
          className="bz-input peer resize-none font-body"
        />
        <p
          className={`mt-1 text-right text-[12px] text-[#737373] ${values.description.length > 400 ? '' : 'hidden peer-focus:block'}`}
        >
          {copy.fmt.descriptionCount(values.description.length, DESCRIPTION_MAX)}
        </p>
      </div>

      <div>
        <label htmlFor={categoryId} className="mb-1.5 block text-[12px] font-medium text-pn-ink">
          {copy.item.category}
        </label>
        {/* Native select: it works inside the Radix sheet (the portaled
            PulseSelect would sit behind the modal layer) and gives phones
            their own picker. */}
        <select
          id={categoryId}
          value={values.categoryId}
          disabled={readOnly || categories.length < 2}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          aria-describedby={categories.length < 2 ? `${categoryId}-hint` : undefined}
          className="bz-input w-full sm:w-[280px]"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {categories.length < 2 && (
          <p id={`${categoryId}-hint`} className="mt-1.5 text-[12px] text-[#737373]">
            {copy.item.oneCategoryHint}
          </p>
        )}
      </div>

      <StatusField
        value={status}
        disabled={readOnly}
        onChange={(next) => onChange(statusPatch(next, values))}
        categoryVisible={category?.isVisible ?? true}
        onShowCategory={readOnly || !category ? undefined : () => void actions.setCategoryVisible(category.id, true)}
      />

      <ChipGroupField<MenuBadge>
        legend={copy.item.badges}
        disabled={readOnly}
        groups={BADGE_GROUPS.map((g) => ({ label: g[lang], items: g.items }))}
        labelOf={(b) => BADGE_LABELS[b][lang]}
        tintOf={(b) => BADGE_TINTS[b]}
        selected={values.badges}
        onChange={(badges) => onChange({ badges })}
      />

      <ChipGroupField<MenuAllergen>
        legend={copy.item.allergens}
        disabled={readOnly}
        hint={copy.item.allergenHint}
        groups={ALLERGEN_GROUPS.map((g) => ({ label: g[lang], items: g.items }))}
        labelOf={(a) => ALLERGEN_LABELS[a][lang]}
        selected={values.allergens}
        onChange={(allergens) => onChange({ allergens })}
        clearLabel={copy.item.clearAll}
        countLabel={values.allergens.length > 0 ? copy.fmt.allergenSelected(values.allergens.length) : undefined}
      />
    </div>
  );
}
