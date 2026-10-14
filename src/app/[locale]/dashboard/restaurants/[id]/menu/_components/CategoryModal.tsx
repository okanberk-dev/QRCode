import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { APSwitch, AlertBanner, Modal } from '@/components/ui';
import { Field, ModalActions } from './FormParts';
import type { MenuCopy } from './menu-copy';
import type { CategoryShape } from './menu-types';
import { isFinePointer } from './menu-ui';

const INPUT_CLASS =
  'w-full bz-card px-4 py-3 text-[16px] sm:text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40';

export function CategoryModal({
  mode, data, copy, busy, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<CategoryShape>;
  copy: MenuCopy;
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
  // Focus the name field only where a keyboard is physically there; on a
  // phone it would pop the on-screen keyboard over the form.
  const [autoFocusName] = useState(isFinePointer);

  const dirty =
    name.trim() !== (data.name ?? '') ||
    description.trim() !== (data.description ?? '') ||
    isVisible !== (data.isVisible ?? true);

  return (
    <Modal
      size={620}
      title={mode === 'create' ? copy.addCategory : copy.editCategory}
      onClose={onClose}
      closeGuard={() => dirty}
      closeConfirm={{ title: copy.leaveTitle, body: copy.leaveBody, confirm: copy.leave, cancel: copy.keepEditing }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
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
            autoFocus={autoFocusName}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.categoryNamePlaceholder}
            enterKeyHint="done"
            autoCapitalize="sentences"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>
        <div className="flex items-center justify-between gap-4 bz-card px-4 py-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#0A0A0A]">{copy.visible}</p>
            <p className="mt-0.5 text-[12px] text-[#737373]">{copy.categoryVisibleHint}</p>
          </div>
          <APSwitch checked={isVisible} onChange={setIsVisible} ariaLabel={copy.visible} />
        </div>
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}
