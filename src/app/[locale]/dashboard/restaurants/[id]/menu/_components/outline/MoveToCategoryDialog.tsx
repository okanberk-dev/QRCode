'use client';

import { useMemo, useState } from 'react';
import { EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui';
import { isTempId } from '../menu-merge';
import { useStudio } from '../studio/studio-context';

/**
 * "Başka kategoriye taşı…" for one item (row ⋯, `M`) or a selection
 * ("Taşı…"). The items go to the end of the picked category (the server's
 * rule), keeping their visual order. The dialog closes first; the move then
 * toasts with "Geri al" and the moved rows flash in their new section.
 */
export function MoveToCategoryDialog({ itemIds, onClose, onMoved }: {
  itemIds: string[];
  onClose: () => void;
  onMoved?: () => void;
}) {
  const { copy, actions, getCategories, flashItem } = useStudio();
  const categories = getCategories();
  const owners = useMemo(() => {
    const set = new Set<string>();
    for (const c of categories) if (c.items.some((i) => itemIds.includes(i.id))) set.add(c.id);
    return set;
  }, [categories, itemIds]);
  const shared = owners.size === 1 ? [...owners][0] : null;
  const first = categories.flatMap((c) => c.items).find((i) => i.id === itemIds[0]);
  const [target, setTarget] = useState<string | null>(() => categories.find((c) => c.id !== shared)?.id ?? null);

  const submit = () => {
    if (!target) return;
    const ids = itemIds.filter((id) => !isTempId(id));
    onClose();
    void (async () => {
      const r = ids.length === 1 ? await actions.moveItemToCategory(ids[0], target) : await actions.bulkMove(ids, target);
      if (!r.ok) return;
      onMoved?.();
      ids.forEach((id) => flashItem(id));
    })();
  };

  const title = itemIds.length === 1 && first ? copy.move.title(first.name) : copy.move.titleMany(itemIds.length);

  return (
    <Modal
      size={440}
      title={<span className="bz-h-tight text-[18px]">{title}</span>}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]">
            {copy.move.cancel}
          </button>
          <button type="button" onClick={submit} disabled={!target} className="bz-btn-primary min-h-[44px] sm:min-h-[36px]">
            {copy.move.submit}
          </button>
        </div>
      }
    >
      <div role="radiogroup" aria-label={title} className="divide-y divide-[#EDEDED] overflow-hidden rounded-xl border border-[#EDEDED]">
        {categories.map((c) => {
          const current = c.id === shared;
          const checked = target === c.id;
          return (
            <label
              key={c.id}
              className={`flex min-h-[48px] items-center gap-3 px-3 ${
                current ? 'cursor-not-allowed bg-[#FAFAFA] text-[#A3A3A3]' : 'cursor-pointer hover:bg-[#FAFAFA]'
              } ${checked ? 'bg-[#F7FAEF]' : ''}`}
            >
              <input
                type="radio"
                name="menu-move-target"
                value={c.id}
                checked={checked}
                disabled={current}
                onChange={() => setTarget(c.id)}
                className="h-4 w-4 accent-[#0A0A0A]"
              />
              <span className={`min-w-0 flex-1 truncate font-body text-[14px] font-medium ${current ? '' : 'text-[#0A0A0A]'}`}>
                {c.name}
              </span>
              {!c.isVisible && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-[#737373]">
                  <EyeOff size={12} strokeWidth={2} aria-hidden="true" />
                  {copy.move.hiddenMark}
                </span>
              )}
              {current && <span className="shrink-0 text-[12px]">{copy.move.current}</span>}
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] text-[#737373]">{copy.move.endHint}</p>
    </Modal>
  );
}
