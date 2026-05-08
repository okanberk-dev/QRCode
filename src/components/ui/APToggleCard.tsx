'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APToggleCard (~85 satır).
 *
 * Tıklanabilir card with icon + title + description + APSwitch + opsiyonel
 * badge. HANDOFF "Otomatik Pilot / Anlık Bildirim / Koyu Tema" benzeri
 * settings card paterni — toggle UX'inin görsel olarak zengin versiyonu.
 * Mevcut Buaze counterpart yok — yeni primitive.
 *
 * Pulse §11 hex map:
 *  - active state: #EAF9B8 (lime-soft) bg + #C6F24E/40 border
 *  - inactive: white bg + rgba(10,10,10,0.08) border
 *  - icon container: lime (active) / rgba(10,10,10,0.04) (inactive); 40×40 12px radius
 *  - hover: 0 8px 24px -12px rgba(10,10,10,0.18) shadow
 *  - 14px padding, 14px radius, min-w 240px
 *
 * Kullanım: settings panel toggle list, owner notification preferences,
 * admin feature flag list (pasif bug fix-style flag UI).
 *
 * A11y: container `<button>` (Enter/Space activate); card-level click
 * forwards to APSwitch onChange. focus-visible lime ring.
 */

import { type ReactNode } from 'react';
import { APChip } from './APChip';
import { APSwitch } from './APSwitch';

export interface APToggleCardProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  checked: boolean;
  onChange?: (next: boolean) => void;
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function APToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
  badge,
  disabled = false,
  className = '',
}: APToggleCardProps) {
  const handleClick = () => {
    if (!disabled && onChange) onChange(!checked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={checked}
      className={`group flex w-full items-center gap-3 text-left transition-all duration-[200ms] ease-out hover:shadow-[0_8px_24px_-12px_rgba(10,10,10,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${className}`}
      style={{
        padding: 14,
        borderRadius: 14,
        background: checked ? '#EAF9B8' : '#fff',
        border: `1px solid ${checked ? 'rgba(168,214,46,0.4)' : 'rgba(10,10,10,0.08)'}`,
        minWidth: 240,
        boxShadow: '0 1px 0 rgba(10,10,10,0.02)',
      }}
    >
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: checked ? '#C6F24E' : 'rgba(10,10,10,0.04)',
          color: '#0A0A0A',
        }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="mb-0.5 flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-[#0A0A0A]">{title}</span>
          {badge ? (
            typeof badge === 'string' ? (
              <APChip tone="lime" dot>
                {badge}
              </APChip>
            ) : (
              badge
            )
          ) : null}
        </span>
        <span className="block text-[11.5px] leading-[1.4] text-[#737373]">
          {description}
        </span>
      </span>
      <span aria-hidden="true" className="pointer-events-none">
        <APSwitch checked={checked} size="sm" disabled={disabled} />
      </span>
    </button>
  );
}
