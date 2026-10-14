import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AlertBanner, Field, Modal } from '@/components/ui';
import type { MenuCopy } from './menu-copy';
import type { CategoryShape } from './menu-types';
import { MENU_INPUT_CLASS, isFinePointer } from './menu-ui';
import { SwitchRow } from './SwitchRow';

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

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) {
      setFormError(copy.categoryNameRequired);
      return;
    }
    setFormError(null);
    const err = await onSave({
      id: data.id,
      name: name.trim(),
      description: description.trim() || null,
      isVisible,
    });
    if (err) setFormError(err);
  };

  return (
    <Modal
      size={620}
      title={mode === 'create' ? copy.addCategory : copy.editCategory}
      onClose={onClose}
      closeGuard={() => dirty}
      closeConfirm={{ title: copy.leaveTitle, body: copy.leaveBody, confirm: copy.leave, cancel: copy.keepEditing }}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="bz-btn-ghost">
            {copy.cancel}
          </button>
          <button type="button" onClick={submit} disabled={busy} className="bz-btn-primary">
            {busy && <Loader2 size={14} className="animate-spin" />}
            {copy.save}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {formError && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            {formError}
          </AlertBanner>
        )}
        <Field label={copy.categoryName} required>
          <input
            autoFocus={autoFocusName}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter saves (the footer button is outside the field, so there is no form to submit).
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={copy.categoryNamePlaceholder}
            enterKeyHint="done"
            autoCapitalize="sentences"
            className={MENU_INPUT_CLASS}
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${MENU_INPUT_CLASS} resize-none`}
          />
        </Field>
        <SwitchRow
          title={copy.showOnMenu}
          hint={copy.categoryVisibleHint}
          checked={isVisible}
          onChange={setIsVisible}
        />
      </div>
    </Modal>
  );
}
