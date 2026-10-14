import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  AlertTriangle, Check, ChevronDown, Image as ImageIcon, Info, Loader2, ShieldAlert, X,
} from 'lucide-react';
import { AlertBanner, Field, Modal, PulseSelect } from '@/components/ui';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { mapMenuApiError } from '@/lib/menu-api-error';
import type { MenuCopy, MenuFmt } from './menu-copy';
import { ALLERGEN_GROUPS, ALLERGEN_LABELS, BADGE_GROUPS, BADGE_LABELS, BADGE_TINTS } from './menu-constants';
import {
  buildCreatePayload,
  buildEditPatch,
  checkPrice,
  currencySymbol,
  hasExtraOptions,
  initialItemFormValues,
  isItemFormDirty,
  nextItemFormValues,
  priceEcho,
  type ItemFormValues,
  type ItemPatch,
} from './menu-item-form';
import type { CategoryShape } from './menu-types';
import { MENU_INPUT_CLASS, MENU_LABEL_CLASS, isFinePointer } from './menu-ui';
import { SwitchRow } from './SwitchRow';
import type { PhotoUploadResult } from './useMenuBuilder';

const ADDED_NOTE_MS = 3000;

/**
 * Add / edit one menu item.
 *
 * Built for typing a whole menu in one sitting: name ⏎ price ⏎ saves and
 * starts the next item (the price field starts empty, the photo shows at once
 * from the phone's own file and is prepared in the background, the footer
 * never scrolls away). No <form> on purpose — the Modal's footer sits outside
 * its body, so Enter is handled explicitly on the two fields it matters for.
 */
export function ItemEditorModal({
  mode, data, categories, isTr, copy, fmt, onClose, onSave, onUploadPhoto,
}: {
  mode: 'create' | 'edit';
  data: Partial<MenuItemView> & { categoryId?: string };
  categories: CategoryShape[];
  isTr: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  onClose: () => void;
  /** Resolves to an error message when the save failed, or null on success. The editor closes itself. */
  onSave: (patch: ItemPatch) => Promise<string | null>;
  onUploadPhoto: (file: File) => Promise<PhotoUploadResult>;
}) {
  const [initial] = useState(() => initialItemFormValues(mode, data, categories[0]?.id ?? '', isTr));
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [showMore, setShowMore] = useState(() => mode === 'edit' && hasExtraOptions(initial));
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addedNote, setAddedNote] = useState<string | null>(null);
  // Auto-focus and the "Enter" hint only where a physical keyboard is: on a
  // phone the on-screen keyboard would cover the footer.
  const [finePointer] = useState(isFinePointer);

  // photo
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const savingRef = useRef(false);
  const uploadSeq = useRef(0);
  const mounted = useRef(true);
  const previewUrl = useRef<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const priceId = useId();
  const moreId = useId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const patch = (change: Partial<ItemFormValues>) => setValues((v) => ({ ...v, ...change }));

  const setPreview = (url: string | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = url;
    setLocalPreview(url);
  };

  const currency = (data.currency || 'TRY').toUpperCase();
  const symbol = currencySymbol(currency);
  const dirty = isItemFormDirty(mode, initial, values);
  const shownPhoto = localPreview ?? (values.imageUrl && values.imageUrl.trim() ? values.imageUrl : null);
  const photoLink = values.imageUrl && !values.imageUrl.startsWith('data:') ? values.imageUrl : '';

  // ── photo ──
  const pickPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPhotoError(mapMenuApiError({ code: 'IMAGE_UNPROCESSABLE' }, isTr));
      return;
    }
    const seq = ++uploadSeq.current;
    setPhotoError(null);
    // The phone's own file shows at once; the 960px copy is made and stored in the background.
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const result = await onUploadPhoto(file);
    if (!mounted.current || seq !== uploadSeq.current) return;
    setUploading(false);
    setPreview(null);
    if (result.ok) patch({ imageUrl: result.url });
    else setPhotoError(result.message);
  };

  const removePhoto = () => {
    uploadSeq.current += 1; // forget an upload still running
    setUploading(false);
    setPreview(null);
    setPhotoError(null);
    patch({ imageUrl: null });
  };

  // ── save ──
  const submit = async (addAnother: boolean) => {
    if (savingRef.current || uploading) return;
    if (!values.name.trim()) {
      setNameError(copy.nameRequired);
      nameRef.current?.focus();
      return;
    }
    const price = checkPrice(values.price);
    if (price.kind !== 'ok') {
      setPriceError(price.kind === 'empty' ? copy.priceRequired : copy.priceInvalid);
      priceRef.current?.focus();
      return;
    }
    const current: ItemFormValues = { ...values, imageUrl: values.imageUrl?.trim() || null };
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      let body: ItemPatch;
      if (mode === 'create') {
        body = buildCreatePayload(current, price.cents);
      } else {
        body = buildEditPatch(initial, current);
        if (Object.keys(body).length === 0) {
          onClose(); // nothing changed — nothing to send
          return;
        }
      }
      const err = await onSave(body);
      if (!mounted.current) return;
      if (err) {
        setFormError(err);
        return;
      }
      if (mode === 'edit' || !addAnother) {
        onClose();
        return;
      }
      // Save & add another: same category, blank item, name field first.
      setAddedNote(fmt.itemAdded(current.name));
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setAddedNote(null), ADDED_NOTE_MS);
      setValues((v) => nextItemFormValues(v));
      setNameError(null);
      setPriceError(null);
      setPhotoError(null);
      uploadSeq.current += 1;
      setPreview(null);
      if (finePointer) nameRef.current?.focus();
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  // Enter contract (spec 4.6). Only these two fields; the description textarea keeps Enter as a line break.
  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (savingRef.current || uploading) return;
    if (!values.name.trim()) {
      setNameError(copy.nameRequired);
      return;
    }
    if (mode === 'create') {
      if (!values.price.trim()) {
        priceRef.current?.focus();
        return;
      }
      void submit(true);
    } else {
      void submit(false);
    }
  };
  const onPriceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (savingRef.current || uploading) return;
    void submit(mode === 'create');
  };

  // ── price messages ──
  const priceState = checkPrice(values.price);
  const echo = priceEcho(values.price, currency, isTr);
  const priceMessage = priceError
    ? ({ tone: 'error', text: priceError } as const)
    : priceState.kind === 'ok' && priceState.zero
      ? ({ tone: 'warn', text: fmt.priceZero(symbol) } as const)
      : echo
        ? ({ tone: 'echo', text: echo } as const)
        : null;
  const priceMsgId = `${priceId}-msg`;
  const toneClass = { error: 'text-[#DC2626]', warn: 'text-[#92400E]', echo: 'text-[#525252]' } as const;

  const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);

  const busyNow = saving || uploading;

  return (
    <Modal
      size={560}
      title={mode === 'create' ? copy.addItem : copy.editItem}
      onClose={onClose}
      closeGuard={() => dirty}
      closeConfirm={{ title: copy.leaveTitle, body: copy.leaveBody, confirm: copy.leave, cancel: copy.keepEditing }}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={onClose} className="bz-btn-ghost">
            {copy.cancel}
          </button>
          {mode === 'create' && (
            <button type="button" onClick={() => void submit(true)} disabled={busyNow} className="bz-btn-ghost">
              {copy.saveAndAdd}
            </button>
          )}
          <button type="button" onClick={() => void submit(false)} disabled={busyNow} className="bz-btn-primary">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {copy.save}
          </button>
          {/* Always rendered so screen readers announce the note when it appears. */}
          <p
            aria-live="polite"
            className="inline-flex items-center gap-1.5 truncate text-[12.5px] font-medium text-[#166534] empty:hidden sm:order-first sm:mr-auto"
          >
            {addedNote && (
              <>
                <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                {addedNote}
              </>
            )}
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        {formError && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            {formError}
          </AlertBanner>
        )}

        {categories.length > 1 && (
          <Field label={copy.category}>
            <PulseSelect
              value={values.categoryId}
              onChange={(categoryId) => patch({ categoryId })}
              className="w-full"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
        )}

        <Field label={copy.itemName} required error={nameError}>
          <input
            ref={nameRef}
            autoFocus={finePointer}
            maxLength={120}
            value={values.name}
            onChange={(e) => {
              patch({ name: e.target.value });
              if (nameError) setNameError(null);
            }}
            onKeyDown={onNameKeyDown}
            placeholder={copy.itemNamePlaceholder}
            autoCapitalize="sentences"
            enterKeyHint="next"
            autoComplete="off"
            className={MENU_INPUT_CLASS}
          />
        </Field>

        {/* Price: a plain label + input pair — the currency symbol sits inside the field. */}
        <div>
          <label htmlFor={priceId} className={MENU_LABEL_CLASS}>
            {copy.priceLabel}
            <span aria-hidden="true" className="ml-1 text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              id={priceId}
              ref={priceRef}
              value={values.price}
              onChange={(e) => {
                patch({ price: e.target.value });
                if (priceError) setPriceError(null);
              }}
              onKeyDown={onPriceKeyDown}
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              placeholder={copy.pricePlaceholder}
              aria-required="true"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceMessage ? priceMsgId : undefined}
              className={`${MENU_INPUT_CLASS} pr-12 tabular-nums`}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[13px] font-medium text-[#737373]"
            >
              {symbol}
            </span>
          </div>
          {priceMessage && (
            <p
              id={priceMsgId}
              role={priceMessage.tone === 'error' ? 'alert' : undefined}
              aria-live={priceMessage.tone === 'echo' ? 'polite' : undefined}
              className={`mt-1.5 text-[11.5px] leading-snug ${toneClass[priceMessage.tone]}`}
            >
              {priceMessage.text}
            </p>
          )}
          {finePointer && mode === 'create' && (
            <p className="mt-1.5 hidden text-[11px] text-[#737373] sm:block">{copy.priceEnterHint}</p>
          )}
        </div>

        {/* Photo */}
        <div>
          <span className={MENU_LABEL_CLASS}>{copy.photo}</span>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={shownPhoto ? copy.changePhoto : copy.addPhoto}
              className={`relative flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
                shownPhoto
                  ? 'border-[#EDEDED] bg-[#F5F5F5]'
                  : photoError
                    ? 'border-dashed border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                    : 'border-dashed border-[#D4D4D4] bg-[#FAFAFA] text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
              }`}
            >
              {shownPhoto ? (
                <img src={shownPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  {photoError ? (
                    <AlertTriangle size={20} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <ImageIcon size={20} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span className="px-1 text-center leading-tight">+ {copy.addPhoto}</span>
                </>
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/75" aria-hidden="true">
                  <Loader2 size={20} className="animate-spin text-[#0A0A0A]" />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              {uploading ? (
                <p aria-live="polite" className="text-[12.5px] font-medium text-[#525252]">
                  {copy.photoPreparing}
                </p>
              ) : photoError ? (
                <p role="alert" className="text-[12.5px] font-medium leading-snug text-[#991B1B]">
                  {photoError}
                </p>
              ) : null}
              {!uploading && shownPhoto && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="bz-btn-ghost">
                    {copy.changePhoto}
                  </button>
                  <button type="button" onClick={removePhoto} className="bz-btn-ghost">
                    <X size={13} strokeWidth={2} aria-hidden="true" />
                    {copy.removePhoto}
                  </button>
                </div>
              )}
              {!uploading && !shownPhoto && !photoError && (
                <p className="text-[12.5px] leading-snug text-[#737373]">{copy.photoHelp}</p>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void pickPhoto(file);
            }}
          />
        </div>

        <div>
          <button
            type="button"
            aria-expanded={showMore}
            aria-controls={moreId}
            onClick={() => setShowMore((open) => !open)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full text-[13px] font-semibold text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] sm:min-h-[36px]"
          >
            <ChevronDown
              size={15}
              strokeWidth={2.25}
              aria-hidden="true"
              className={`transition-transform ${showMore ? 'rotate-180' : ''}`}
            />
            {copy.moreOptions}
          </button>

          <div id={moreId} hidden={!showMore} className="mt-2 space-y-5">
            <Field label={copy.description}>
              <textarea
                value={values.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={3}
                maxLength={500}
                className={`${MENU_INPUT_CLASS} resize-none`}
              />
            </Field>

            <div>
              <span className={MENU_LABEL_CLASS}>{copy.badges}</span>
              <div className="space-y-3">
                {BADGE_GROUPS.map((group) => (
                  <div key={group.tr} className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#737373]">
                      {isTr ? group.tr : group.en}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((b) => {
                        const active = values.badges.includes(b);
                        const tint = BADGE_TINTS[b];
                        return (
                          <button
                            key={b}
                            type="button"
                            aria-pressed={active}
                            onClick={() => patch({ badges: toggle(values.badges, b) })}
                            style={
                              active
                                ? { backgroundColor: tint.bg, color: tint.fg, borderColor: tint.border ?? tint.bg }
                                : undefined
                            }
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all sm:min-h-0 ${
                              active
                                ? 'shadow-sm'
                                : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
                            }`}
                          >
                            {active && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
                            {BADGE_LABELS[b][isTr ? 'tr' : 'en']}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergens — a disclosure customers see on the public menu, so it keeps the amber warning look. */}
            <div>
              <span className={`${MENU_LABEL_CLASS} inline-flex items-center gap-1.5`}>
                <ShieldAlert size={12} strokeWidth={2.25} className="text-[#92400E]" aria-hidden="true" />
                {copy.allergens}
                {values.allergens.length > 0 && (
                  <span className="font-normal text-[#92400E]">· {fmt.allergenSelected(values.allergens.length)}</span>
                )}
              </span>
              <div className="space-y-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB]/60 p-3">
                <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#92400E]">
                  <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {copy.allergenHint}
                </p>
                {ALLERGEN_GROUPS.map((group) => (
                  <div key={group.tr} className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#92400E]">
                      {isTr ? group.tr : group.en}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((a) => {
                        const active = values.allergens.includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            aria-pressed={active}
                            onClick={() => patch({ allergens: toggle(values.allergens, a) })}
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all sm:min-h-0 ${
                              active
                                ? 'border-[#92400E] bg-[#FEF3C7] text-[#92400E] shadow-sm'
                                : 'border-[#FDE68A] bg-white text-[#92400E] hover:border-[#92400E]'
                            }`}
                          >
                            {active && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
                            {ALLERGEN_LABELS[a][isTr ? 'tr' : 'en']}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {values.allergens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => patch({ allergens: [] })}
                    className="min-h-[32px] text-[12px] font-medium text-[#92400E] underline-offset-2 hover:underline"
                  >
                    {copy.clearAll}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* Both switches say what is ON: "available" and "shown on the menu". */}
              <SwitchRow
                title={copy.sellableLabel}
                hint={copy.sellableHint}
                checked={!values.isOutOfStock}
                onChange={(on) => patch({ isOutOfStock: !on })}
              />
              <SwitchRow
                title={copy.showOnMenu}
                hint={copy.showOnMenuHint}
                checked={values.isAvailable}
                onChange={(on) => patch({ isAvailable: on })}
              />
            </div>

            <Field label={copy.photoLink}>
              <input
                type="url"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={photoLink}
                onChange={(e) => {
                  uploadSeq.current += 1;
                  setUploading(false);
                  setPreview(null);
                  patch({ imageUrl: e.target.value === '' ? null : e.target.value });
                }}
                placeholder="https://"
                className={MENU_INPUT_CLASS}
              />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
