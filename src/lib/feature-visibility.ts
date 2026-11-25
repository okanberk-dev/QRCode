/**
 * Which secondary tools appear in the owner menu (CLAUDE.md §57).
 *
 * Live usage on 2026-11-25: surveys — 4 surveys, 4 responses ever, none in
 * the last 6 months; audits — 2 completed audits ever. Both stay fully
 * working (pages, links, public forms, data), but the menu shows them only
 * to workspaces that already use them, or everywhere when the operator turns
 * them back on (`FEATURE_SURVEYS=on`, `FEATURE_AUDITS=on`). Nothing is
 * deleted; `off` hides them even from workspaces with data.
 */
export interface ToolUsage {
  surveys: number;
  audits: number;
}

export interface ToolVisibility {
  surveys: boolean;
  audits: boolean;
}

type Mode = 'on' | 'off' | 'auto';

function mode(raw: string | undefined): Mode {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'on' || v === '1' || v === 'true') return 'on';
  if (v === 'off' || v === '0' || v === 'false') return 'off';
  return 'auto';
}

export function toolVisibility(usage: ToolUsage, env: Record<string, string | undefined> = process.env): ToolVisibility {
  const decide = (m: Mode, count: number) => (m === 'on' ? true : m === 'off' ? false : count > 0);
  return {
    surveys: decide(mode(env.FEATURE_SURVEYS), usage.surveys),
    audits: decide(mode(env.FEATURE_AUDITS), usage.audits),
  };
}
