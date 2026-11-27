'use client';

import { PencilLine, Smartphone, ToggleRight } from 'lucide-react';
import { useMenuCopy } from '../kit/useMenuCopy';
import { ariaKeysFor } from '../menu-keys';

export type StudioView = 'edit' | 'service' | 'preview';

const SEGMENT =
  'inline-flex items-center justify-center gap-1.5 rounded-[7px] px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent';
const ON = 'bg-white text-pn-ink shadow-[0_1px_2px_rgba(10,10,10,0.08),0_0_0_1px_rgba(10,10,10,0.04)]';
const OFF = 'text-[#525252] hover:text-pn-ink';

/** Below 1024 px: Düzenle | Servis | Önizle (spec §7.6). */
export function ViewSwitch({ value, onChange }: { value: StudioView; onChange: (v: StudioView) => void }) {
  const copy = useMenuCopy();
  const items: { id: StudioView; label: string; icon: React.ReactNode }[] = [
    { id: 'edit', label: copy.view.edit, icon: <PencilLine size={14} strokeWidth={2} aria-hidden="true" /> },
    { id: 'service', label: copy.view.service, icon: <ToggleRight size={14} strokeWidth={2} aria-hidden="true" /> },
    { id: 'preview', label: copy.view.preview, icon: <Smartphone size={14} strokeWidth={2} aria-hidden="true" /> },
  ];
  return (
    <div role="group" aria-label={copy.view.label} className="inline-flex w-full gap-0.5 rounded-[10px] bg-pn-canvas p-[3px] sm:w-auto lg:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          aria-keyshortcuts={item.id === 'preview' ? ariaKeysFor('togglePreview') : undefined}
          onClick={() => onChange(item.id)}
          className={`${SEGMENT} min-h-[44px] flex-1 sm:flex-none ${value === item.id ? ON : OFF}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** From 1024 px: Düzenle | Servis (the preview is always in the right column). */
export function ModeSwitch({ value, onChange }: { value: 'edit' | 'service'; onChange: (v: 'edit' | 'service') => void }) {
  const copy = useMenuCopy();
  return (
    <div role="group" aria-label={copy.view.label} className="inline-flex h-9 shrink-0 gap-0.5 rounded-[10px] bg-pn-canvas p-[3px]">
      {(['edit', 'service'] as const).map((m) => (
        <button key={m} type="button" aria-pressed={value === m} onClick={() => onChange(m)} className={`${SEGMENT} px-3 ${value === m ? ON : OFF}`}>
          {m === 'edit' ? copy.view.edit : copy.view.service}
        </button>
      ))}
    </div>
  );
}
