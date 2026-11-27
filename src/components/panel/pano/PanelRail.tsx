'use client';

import type { ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from '@/components/navigation/IntentLink';
import { MenuLinks, groupIsActive, type PanoNavEntry, type PanoNavGroup, type PanoNavLink } from './PanelTopNav';

/**
 * Pano icon rail (docs/design/DASHBOARD_DESIGN.md §5.1): the left column of
 * round buttons from the Fintora reference — brand on top, tools in the
 * middle, help at the bottom. Links open their page; groups open a menu to
 * the right. Each button shows its name in a tooltip (icons only). Hidden
 * below 1024px, where the mobile drawer lists the same entries.
 */

function railInitial(label: string): string {
  return label.trim().charAt(0).toLocaleUpperCase('tr');
}

export function RailLink({ entry }: { entry: Pick<PanoNavLink, 'href' | 'label' | 'icon' | 'active' | 'isNew'> }) {
  const Icon = entry.icon;
  return (
    <Link
      href={entry.href}
      aria-label={entry.label}
      aria-current={entry.active ? 'page' : undefined}
      data-active={entry.active ? 'true' : undefined}
      data-label={entry.label}
      className="pn-rail-btn"
    >
      {Icon ? <Icon size={20} aria-hidden="true" /> : <span aria-hidden="true">{railInitial(entry.label)}</span>}
      {entry.isNew && <span className="pn-rail-dot" aria-hidden="true" />}
    </Link>
  );
}

function RailGroup({ group, newLabel }: { group: PanoNavGroup; newLabel?: string }) {
  const Icon = group.icon;
  const active = groupIsActive(group);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={group.label}
          data-active={active ? 'true' : undefined}
          data-label={group.label}
          className="pn-rail-btn"
        >
          {Icon ? <Icon size={20} aria-hidden="true" /> : <span aria-hidden="true">{railInitial(group.label)}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="start"
          sideOffset={14}
          collisionPadding={12}
          className="bz-menu z-[70] min-w-[240px] focus:outline-none"
        >
          <DropdownMenu.Label className="bz-menu-label">{group.label}</DropdownMenu.Label>
          <MenuLinks items={group.children} newLabel={newLabel} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface PanelRailProps {
  brand: ReactNode;
  entries: PanoNavEntry[];
  footer?: ReactNode;
  ariaLabel: string;
  newLabel?: string;
}

export function PanelRail({ brand, entries, footer, ariaLabel, newLabel }: PanelRailProps) {
  return (
    <aside className="pn-rail hidden lg:flex">
      <div className="pn-rail-brand">{brand}</div>
      <nav aria-label={ariaLabel} className="pn-rail-nav">
        {entries.map((entry) =>
          entry.type === 'link' ? (
            <RailLink key={entry.href} entry={entry} />
          ) : (
            <RailGroup key={entry.id} group={entry} newLabel={newLabel} />
          ),
        )}
      </nav>
      {footer && <div className="pn-rail-foot">{footer}</div>}
    </aside>
  );
}

export default PanelRail;
