'use client';

import { APSwitch, Modal } from '@/components/ui';
import { useMenuCopy } from '../kit/useMenuCopy';
import { SHORTCUTS, formatShortcut, isSingleCharCombo, type ShortcutDef } from '../menu-keys';

/**
 * "Klavye kısayolları" (spec §9): generated from the one `SHORTCUTS` table the
 * key handler also reads, plus the "Tek tuş kısayolları" switch (WCAG 2.1.4).
 * With it off, single-character shortcuts are listed as off.
 */
export function ShortcutsDialog({
  locale, isMac, singleKeys, onSingleKeys, onClose,
}: {
  locale: 'tr' | 'en';
  isMac: boolean;
  singleKeys: boolean;
  onSingleKeys: (on: boolean) => void;
  onClose: () => void;
}) {
  const copy = useMenuCopy();

  const group = (key: 'general' | 'rows', title: string, hint?: string) => (
    <section aria-labelledby={`menu-shortcuts-${key}`} className="space-y-2">
      <h3 id={`menu-shortcuts-${key}`} className="text-[13px]">
        <span className="font-body font-medium text-pn-ink">{title}</span>
      </h3>
      {hint && <p className="text-[12px] text-[#737373]">{hint}</p>}
      <dl className="divide-y divide-pn-line rounded-[20px] border border-pn-line">
        {SHORTCUTS.filter((d) => d.group === key).map((def) => (
          <Row key={def.id} def={def} isMac={isMac} label={def.label[locale]} singleKeys={singleKeys} />
        ))}
      </dl>
    </section>
  );

  return (
    <Modal size={520} title={<span className="bz-h-tight [word-spacing:0.1em] text-[18px]">{copy.shortcuts.title}</span>} onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-[20px] border border-pn-line bg-pn-canvas p-3">
          <APSwitch
            checked={singleKeys}
            onChange={onSingleKeys}
            label={<span className="text-[14px] font-medium text-pn-ink">{copy.shortcuts.singleKeys}</span>}
            sublabel={<span className="text-[13px] text-[#525252]">{copy.shortcuts.singleKeysHint}</span>}
          />
        </div>
        {group('general', copy.shortcuts.general)}
        {group('rows', copy.shortcuts.rows, copy.shortcuts.rowsHint)}
      </div>
    </Modal>
  );
}

function Row({ def, isMac, label, singleKeys }: { def: ShortcutDef; isMac: boolean; label: string; singleKeys: boolean }) {
  const keys = formatShortcut(def, isMac);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
      <dt className="text-[13px] text-pn-ink">{label}</dt>
      <dd className="flex flex-wrap justify-end gap-1">
        {def.combos.map((combo, i) => {
          const off = !singleKeys && isSingleCharCombo(combo);
          return (
            <kbd
              key={keys[i]}
              className={`rounded-[10px] border border-pn-line-strong bg-pn-canvas px-1.5 py-0.5 font-mono text-[12px] ${
                off ? 'text-[#A3A3A3] line-through' : 'text-pn-ink'
              }`}
            >
              {keys[i]}
            </kbd>
          );
        })}
      </dd>
    </div>
  );
}
