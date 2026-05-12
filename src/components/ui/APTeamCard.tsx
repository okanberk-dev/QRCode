'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APTeamCard (~85 satır).
 *
 * Team member card: gradient lime avatar (italic initial) + name + email +
 * online dot + role chip. HANDOFF "Cem Aydın · OWNER" listing paterni.
 * Mevcut Buaze counterpart yok (admin/users + owner/team mevcut UI inline)
 * — yeni primitive.
 *
 * Pulse §11 hex map:
 *  - card: APCard with hover lift, 16px padding, 320 max-width
 *  - avatar: 44×44 22px radius + linear-gradient(135deg, #C6F24E → #A8D62E)
 *  - avatar text: 18px italic Space Grotesk + 600 weight + #0A0A0A
 *  - online dot: 6×6 #16A34A green
 *  - email: 11px #525252 muted
 *  - role chip: <APChip tone={role-specific}>
 *
 * Role tone mapping:
 *  - owner: lime
 *  - admin: dark (graphite + lime accent)
 *  - member: default
 *
 * Kullanım: settings → team list, admin/users team viewer, member invite
 * preview.
 *
 * A11y: card decorative, role chip semantic; online dot aria-label
 * "Çevrimiçi/Çevrimdışı".
 */

import { APCard } from './APCard';
import { APChip, type APChipTone } from './APChip';

export type APTeamRole = 'owner' | 'admin' | 'member';

export interface APTeamCardProps {
  name: string;
  email: string;
  /** Avatar initial (default: name[0]) */
  initial?: string;
  role: APTeamRole;
  /** Locale-aware role labels (default TR: SAHİP/YÖNETİCİ/ÜYE) */
  roleLabels?: Record<APTeamRole, string>;
  online?: boolean;
  className?: string;
}

const ROLE_TONE: Record<APTeamRole, APChipTone> = {
  owner: 'lime',
  admin: 'dark',
  member: 'default',
};

const DEFAULT_LABELS_TR: Record<APTeamRole, string> = {
  owner: 'SAHİP',
  admin: 'YÖNETİCİ',
  member: 'ÜYE',
};

export function APTeamCard({
  name,
  email,
  initial,
  role,
  roleLabels = DEFAULT_LABELS_TR,
  online = false,
  className = '',
}: APTeamCardProps) {
  const ch = (initial ?? name[0] ?? '?').toUpperCase();
  return (
    <APCard hover padding={16} className={`max-w-[320px] ${className}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #C6F24E 0%, #A8D62E 100%)',
            color: '#0A0A0A',
            fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {ch}
        </span>
        <div className="flex-1 min-w-0">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-[#0A0A0A] truncate">{name}</span>
            <span
              aria-label={online ? 'Çevrimiçi' : 'Çevrimdışı'}
              role="img"
              className="inline-block shrink-0"
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: online ? '#16A34A' : 'rgba(10,10,10,0.18)',
              }}
            />
          </div>
          <p className="m-0 text-[11px] text-[#525252] truncate">{email}</p>
        </div>
        <APChip tone={ROLE_TONE[role]}>{roleLabels[role]}</APChip>
      </div>
    </APCard>
  );
}
