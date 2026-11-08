import { panelMono, panelSans } from '@/lib/panel-fonts';

// Mounted once by each panel layout (owner dashboard + admin). Publishes the
// Geist family names at :root so portaled content (menus, selects, modals —
// rendered into <body>, outside the shell) uses the panel fonts too. The
// theme itself is switched on in globals.css by `:root:has(.bz-panel)`.
// The family names come from next/font at build time (no user input).
const css = `:root{--font-panel-sans:${panelSans.style.fontFamily};--font-panel-mono:${panelMono.style.fontFamily};}`;

export default function PanelTheme() {
  return <style>{css}</style>;
}
