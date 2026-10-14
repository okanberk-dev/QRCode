import type { ReactNode } from 'react';
import { APSwitch } from '@/components/ui';

/**
 * A yes/no setting as a whole tappable row: title, one line of explanation and
 * the switch. The row (≥56px tall) is the touch target, not just the 46×28
 * switch; a click on the switch itself is handled by the switch.
 */
export function SwitchRow({
  title, hint, checked, onChange, disabled = false,
}: {
  title: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[56px] items-center justify-between gap-4 bz-card px-4 py-2.5 ${
        disabled ? 'opacity-60' : 'cursor-pointer'
      }`}
      onClick={(e) => {
        if (disabled) return;
        if ((e.target as HTMLElement).closest('button')) return;
        onChange(!checked);
      }}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[#0A0A0A]">{title}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-[#737373]">{hint}</p>}
      </div>
      <APSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        ariaLabel={typeof title === 'string' ? title : undefined}
      />
    </div>
  );
}
