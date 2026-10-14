import { useRef, useState } from 'react';
import { AlertTriangle, Check, Image as ImageIcon, Info, Loader2, ShieldAlert, X } from 'lucide-react';
import { AlertBanner, Modal, PulseSelect } from '@/components/ui';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { parsePriceInput } from '@/lib/format';
import { compressImage } from '@/lib/client-image';
import type { Locale } from '@/lib/translations';
import { Field, ModalActions } from './FormParts';
import { ALLERGEN_GROUPS, ALLERGEN_LABELS, BADGE_GROUPS, BADGE_LABELS, BADGE_TINTS } from './menu-constants';
import type { CategoryShape } from './menu-types';

export function ItemModal({
  mode, data, categories, copy, busy, locale, restaurantId, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<MenuItemView> & { categoryId?: string };
  categories: CategoryShape[];
  copy: Record<string, string>;
  busy: boolean;
  locale: Locale;
  restaurantId: string;
  onClose: () => void;
  /** Resolves to an error message when the save failed, or null on success. */
  onSave: (payload: Partial<MenuItemView> & { categoryId?: string }) => Promise<string | null>;
}) {
  const [categoryId, setCategoryId] = useState(data.categoryId ?? categories[0]?.id ?? '');
  const [name, setName] = useState(data.name ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [priceInput, setPriceInput] = useState(data.priceCents ? (data.priceCents / 100).toFixed(2) : '0');
  const [imageUrl, setImageUrl] = useState(data.imageUrl ?? '');
  const [badges, setBadges] = useState<string[]>(data.badges ?? []);
  const [allergens, setAllergens] = useState<string[]>(data.allergens ?? []);
  const [isAvailable, setIsAvailable] = useState(data.isAvailable ?? true);
  const [isOutOfStock, setIsOutOfStock] = useState(data.isOutOfStock ?? false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleBadge = (b: string) => {
    setBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const toggleAllergen = (a: string) => {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const handleFilePick = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError(locale === 'tr' ? 'Sadece görsel dosyası yükleyebilirsiniz.' : 'Only image files allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError(locale === 'tr' ? 'Görsel 5 MB\'dan büyük olamaz.' : 'Image must be under 5 MB.');
      return;
    }
    setUploading(true);
    setFormError(null);
    try {
      // Client-side compression cuts upload time ~80% for heavy phone photos.
      const compressed = await compressImage(file, { maxDim: 1600, quality: 0.85 });
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('kind', 'item');
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/upload`, { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Görsel yüklenemedi');
      setImageUrl(body.url);
    } catch (e) {
      setFormError((e as Error).message);
    }
    setUploading(false);
  };

  return (
    <Modal size={680} title={mode === 'create' ? copy.addItem : copy.editItem} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const cents = parsePriceInput(priceInput);
          if (cents === null) {
            setFormError(locale === 'tr' ? 'Geçersiz fiyat' : 'Invalid price');
            return;
          }
          setFormError(null);
          const err = await onSave({
            id: data.id,
            categoryId,
            name: name.trim(),
            description: description.trim() || null,
            priceCents: cents,
            imageUrl: imageUrl.trim() || null,
            badges,
            allergens,
            isAvailable,
            isOutOfStock,
          });
          if (err) setFormError(err);
        }}
        className="space-y-5"
      >
        <Field label={locale === 'tr' ? 'Kategori' : 'Category'}>
          <PulseSelect
            value={categoryId}
            onChange={setCategoryId}
            ariaLabel={locale === 'tr' ? 'Kategori' : 'Category'}
            className="w-full"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label={copy.itemName}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bz-card px-4 py-3 text-[16px] sm:text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none bz-card px-4 py-3 text-[16px] sm:text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
          />
        </Field>
        <Field label={copy.price}>
          <div className="relative">
            <input
              required
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0,00"
              className="w-full bz-card px-4 py-3 pr-12 text-[16px] sm:text-[15px] tabular-nums text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[13px] font-medium text-[#A3A3A3]">₺</span>
          </div>
        </Field>
        <Field label={copy.imageUrl}>
          <div className="flex gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F5] ring-1 ring-[#EDEDED]">
              {imageUrl ? (
                 
                <img src={imageUrl} alt="preview" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#A3A3A3]">
                  <ImageIcon size={24} strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bz-btn-primary bz-btn-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} strokeWidth={2} />}
                  {uploading ? copy.uploading : copy.uploadImage}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] active:scale-95"
                  >
                    <X size={12} strokeWidth={2} />
                    {copy.removeImage}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFilePick(f);
                  e.target.value = '';
                }}
              />
              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={copy.orUrl + ' · https://...'}
                className="w-full rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[16px] sm:text-[12px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
            </div>
          </div>
        </Field>
        <Field label={copy.badges}>
          <div className="space-y-3">
            {BADGE_GROUPS.map((group) => (
              <div key={group.tr} className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A3A3A3]">
                  {locale === 'tr' ? group.tr : group.en}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((b) => {
                    const active = badges.includes(b);
                    const tint = BADGE_TINTS[b];
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBadge(b)}
                        style={
                          active
                            ? {
                                backgroundColor: tint.bg,
                                color: tint.fg,
                                borderColor: tint.border ?? tint.bg,
                              }
                            : undefined
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
                          active
                            ? 'shadow-sm'
                            : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {active && <Check size={11} strokeWidth={2.5} />}
                        {BADGE_LABELS[b][locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Field>

        {/* Allergens — regulatory disclosure, intentionally distinct visual
            treatment from marketing badges (amber warning palette). */}
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert size={11} strokeWidth={2.25} className="text-[#92400E]" />
              {locale === 'tr' ? 'Alerjenler (opsiyonel)' : 'Allergens (optional)'}
            </span>
          }
        >
          <div className="space-y-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB]/60 p-3">
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#92400E]">
              <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" />
              {locale === 'tr'
                ? 'Üründe doğal olarak bulunan veya çapraz bulaşma riski taşıyan içerikleri seç. Müşteriler menüde uyarı olarak görür.'
                : 'Mark allergens that are present or risk cross-contamination. Customers see this as a warning in the public menu.'}
            </p>
            {ALLERGEN_GROUPS.map((group) => (
              <div key={group.tr} className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#92400E]/80">
                  {locale === 'tr' ? group.tr : group.en}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((a) => {
                    const active = allergens.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergen(a)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
                          active
                            ? 'border-[#92400E] bg-[#FEF3C7] text-[#92400E] shadow-sm'
                            : 'border-[#FDE68A]/60 bg-white text-[#92400E]/80 hover:border-[#92400E] hover:text-[#92400E]'
                        }`}
                      >
                        {active && <Check size={11} strokeWidth={2.5} />}
                        {ALLERGEN_LABELS[a][locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {allergens.length > 0 && (
              <button
                type="button"
                onClick={() => setAllergens([])}
                className="text-[11px] font-medium text-[#92400E] underline-offset-2 hover:underline"
              >
                {locale === 'tr' ? 'Tümünü temizle' : 'Clear all'}
              </button>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center gap-3 bz-card px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 accent-[#0A0A0A]" />
            <span className="text-[14px] font-medium text-[#0A0A0A]">{copy.available}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 bz-card px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
            <input type="checkbox" checked={isOutOfStock} onChange={(e) => setIsOutOfStock(e.target.checked)} className="h-4 w-4 accent-[#D97706]" />
            <span className="text-[14px] font-medium text-[#0A0A0A]">{copy.outOfStock}</span>
          </label>
        </div>
        {formError && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            {formError}
          </AlertBanner>
        )}
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}
