// §38.232 + §40.11 — ROI route segment layout.
// Sole purpose: scope `roi.css` (RoiCalculator slider polish) to
// /[locale]/roi only. Next.js App Router auto-injects stylesheets
// imported from a layout into that segment's HTML — keeps the ROI
// slider chrome out of every marketing + panel page's global CSS
// bundle. Children pass through unchanged (locale layout + metadata intact).
import './roi.css';

export default function RoiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
