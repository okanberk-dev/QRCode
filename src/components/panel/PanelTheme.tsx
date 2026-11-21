import { panelSans } from '@/lib/panel-fonts';

// Mounted once by each panel layout (owner dashboard + admin). Publishes the
// DM Sans family name at :root so portaled content (menus, selects, modals —
// rendered into <body>, outside the shell) uses the panel font too. The theme
// itself is switched on in globals.css by `:root:has(.bz-panel)` (§53).
// The family name comes from next/font at build time (no user input).
const css = `:root{--font-panel-sans:${panelSans.style.fontFamily};}`;

export default function PanelTheme() {
  return <style>{css}</style>;
}
