import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';
import { Field, ModalActions } from './FormParts';
import type { CategoryShape } from './menu-types';

export function CategoryModal({
  mode, data, copy, busy, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<CategoryShape>;
  copy: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  /** Resolves to an error message when the save failed, or null on success. */
  onSave: (payload: Partial<CategoryShape>) => Promise<string | null>;
}) {
  const [name, setName] = useState(data.name ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [isVisible, setIsVisible] = useState(data.isVisible ?? true);
  // Save failures used to land only on the page-level banner, which paints
  // BEHIND this modal's overlay — the owner saw the Save button go idle with
  // no visible reason and clicked it again.
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Modal size={620} title={mode === 'create' ? copy.addCategory : copy.editCategory} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setFormError(null);
          const err = await onSave({
            id: data.id,
            name: name.trim(),
            description: description.trim() || null,
            isVisible,
          });
          if (err) setFormError(err);
        }}
        className="space-y-5"
      >
        {formError && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            {formError}
          </AlertBanner>
        )}
        <Field label={copy.categoryName}>
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
        <label className="flex cursor-pointer items-center gap-3 bz-card px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="h-4 w-4 accent-[#0A0A0A]" />
          <span className="text-[14px] font-medium text-[#0A0A0A]">{copy.visible}</span>
        </label>
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}
