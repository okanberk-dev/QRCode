// Pulse mail design tokens — mirrors /tmp/design-pkg shared.jsx (canonical)
// Keep in sync with src/app/globals.css @theme {} block.

export const PULSE = {
  pure: '#FFFFFF',
  graphite: '#0A0A0A',
  lime: '#C6F24E',
  limeDeep: '#A8D62E',
  limeSoft: '#EAF9B8',
  n50: '#FAFAFA',
  n100: '#F2F2F2',
  n200: '#EDEDED',
  n300: '#D4D4D4',
  n400: '#A3A3A3',
  n500: '#737373',
  n600: '#525252',
  n700: '#333333',
  n800: '#1A1A1A',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const;

export const FONTS = {
  heading: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
} as const;

export const INSTAGRAM_HANDLE = '@buazerating';
export const INSTAGRAM_URL = 'https://instagram.com/buazerating';
