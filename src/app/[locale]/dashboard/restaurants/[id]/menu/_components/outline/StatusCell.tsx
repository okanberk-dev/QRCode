'use client';

import { Eye } from 'lucide-react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { APSwitch } from '@/components/ui';
import { useStudio } from '../studio/studio-context';
import { ONLY_MEDIUM, SR_IN_MEDIUM } from './row-layout';

/**
 * One-tap availability in a row (G2): the switch is Satışta ⇄ Tükendi
 * (`isOutOfStock` only). A hidden item shows "Göster" instead, which sends
 * `{ isAvailable: true }` only (spec §0.2). The 3-state control lives in the
 * item panel. In the medium tier the switch label is screen-reader only and
 * "Göster" is an eye icon.
 */
export function StatusCell({
  item, disabled, service = false,
}: {
  item: MenuItemView;
  disabled: boolean;
  /** Kept for callers; the switch stays tappable while saving so quick on → off → on lands in order (serial queue). */
  saving?: boolean;
  /** Servis rows: always the narrow look (visible label). */
  service?: boolean;
}) {
  const { copy, finePointer, actions } = useStudio();
  const labelClass = service ? '' : SR_IN_MEDIUM;

  if (!item.isAvailable) {
    const show = () => void actions.showItem(item.id);
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={show}
          aria-label={copy.item.showAria(item.name)}
          className={`bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8 ${service ? '' : 'pointer-fine:@min-[480px]/outline:hidden pointer-fine:@2xl/outline:inline-flex'}`}
        >
          <Eye size={14} strokeWidth={2} aria-hidden="true" />
          {copy.item.show}
        </button>
        {!service && (
          <button
            type="button"
            disabled={disabled}
            onClick={show}
            aria-label={copy.item.showAria(item.name)}
            title={copy.item.show}
            className={`bz-btn-icon h-8 w-8 ${ONLY_MEDIUM}`}
          >
            <Eye size={14} strokeWidth={2} />
          </button>
        )}
      </>
    );
  }

  const soldOut = item.isOutOfStock;
  return (
    <APSwitch
      checked={!soldOut}
      size={finePointer ? 'md' : 'lg'}
      disabled={disabled}
      onChange={() => void actions.toggleSoldOut(item.id)}
      ariaLabel={copy.item.switchAria(item.name)}
      label={
        <span className={`${labelClass} text-[12.5px] font-medium ${soldOut ? 'text-[#92400E]' : 'text-[#737373]'}`}>
          {soldOut ? copy.item.soldOut : copy.item.available}
        </span>
      }
    />
  );
}
