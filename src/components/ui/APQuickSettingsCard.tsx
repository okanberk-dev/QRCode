'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APQuickSettingsCard (~120 satır).
 *
 * Compound settings panel: header (eyebrow + italic title + settings
 * icon trigger) + APToggleCard list + APSlider + theme toggle row.
 *
 * Mevcut Buaze counterpart yok — owner notification settings + admin
 * settings inline form'lardan farklı abstraction. Standalone preview
 * widget (settings hub homepage, onboarding step preview).
 *
 * Pulse §11 hex map:
 *  - card: APCard padding=0, max-w-420
 *  - header: 16/18 padding + bottom border + italic Space Grotesk title
 *  - body: 12 padding + 8 gap (toggle cards stack)
 *  - slider section: 0/18 padding + 16 mb
 *  - theme row: #FAFAFA bg + 10/12 padding + 10 radius
 *
 * Generic: caller controls toggle items + slider value + theme state.
 *
 * A11y: card decorative; APToggleCard + APSwitch + APSlider zaten
 * a11y-compliant primitives.
 */

import { type ReactNode } from 'react';
import { Moon, Settings, Sun } from 'lucide-react';
import { APCard } from './APCard';
import { APIconButton } from './APIconButton';
import { APSlider } from './APSlider';
import { APSwitch } from './APSwitch';
import { APToggleCard } from './APToggleCard';

export interface APQuickSettingsToggle {
  key: string;
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  badge?: ReactNode;
  checked: boolean;
}

export interface APQuickSettingsCardProps {
  /** Eyebrow label (mono uppercase) */
  eyebrow: ReactNode;
  /** Hero title (italic Space Grotesk) */
  title: ReactNode;
  toggles: APQuickSettingsToggle[];
  onToggleChange?: (key: string, next: boolean) => void;
  /** Slider value (e.g., AI quota %) */
  sliderValue?: number;
  sliderLabel?: string;
  sliderSuffix?: string;
  onSliderChange?: (next: number) => void;
  /** Theme switch (dark mode) */
  theme?: 'light' | 'dark';
  onThemeChange?: (next: 'light' | 'dark') => void;
  themeLightLabel?: string;
  themeDarkLabel?: string;
  onSettingsClick?: () => void;
  className?: string;
}

export function APQuickSettingsCard({
  eyebrow,
  title,
  toggles,
  onToggleChange,
  sliderValue,
  sliderLabel,
  sliderSuffix = '%',
  onSliderChange,
  theme,
  onThemeChange,
  themeLightLabel = 'Açık tema',
  themeDarkLabel = 'Koyu tema',
  onSettingsClick,
  className = '',
}: APQuickSettingsCardProps) {
  return (
    <APCard padding={0} className={`max-w-[420px] overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between px-[18px] pt-4 pb-3"
        style={{ borderBottom: '1px solid rgba(10,10,10,0.06)' }}
      >
        <div>
          <span
            className="block text-[9px] uppercase tracking-[0.18em] text-[#737373]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {eyebrow}
          </span>
          <h4
            className="mt-1 text-[22px] font-normal tracking-[-0.01em]"
            style={{
              fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
              fontStyle: 'italic',
            }}
          >
            {title}
          </h4>
        </div>
        {onSettingsClick ? (
          <APIconButton ariaLabel="Ayarlar" size="sm" tone="ghost" onClick={onSettingsClick}>
            <Settings size={14} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
          </APIconButton>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-3">
        {toggles.map((t) => (
          <APToggleCard
            key={t.key}
            icon={t.icon}
            title={t.title}
            description={t.description}
            badge={t.badge}
            checked={t.checked}
            onChange={(next) => onToggleChange && onToggleChange(t.key, next)}
          />
        ))}
      </div>
      {(sliderValue != null || theme != null) && (
        <div className="flex flex-col gap-3 px-[18px] pb-4">
          {sliderValue != null && onSliderChange ? (
            <APSlider
              value={sliderValue}
              onChange={onSliderChange}
              label={sliderLabel}
              suffix={sliderSuffix}
            />
          ) : null}
          {theme != null && onThemeChange ? (
            <div
              className="flex items-center justify-between rounded-[10px] px-3 py-2.5"
              style={{ background: '#FAFAFA' }}
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon size={16} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Sun size={16} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
                )}
                <span className="text-[13px] font-medium text-[#0A0A0A]">
                  {theme === 'dark' ? themeDarkLabel : themeLightLabel}
                </span>
              </div>
              <APSwitch
                checked={theme === 'dark'}
                onChange={(v) => onThemeChange(v ? 'dark' : 'light')}
                size="sm"
                ariaLabel={theme === 'dark' ? themeLightLabel : themeDarkLabel}
              />
            </div>
          ) : null}
        </div>
      )}
    </APCard>
  );
}
