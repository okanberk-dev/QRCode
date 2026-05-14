// Stage 99 §40.7 + §38.187 — Survey route segment layout.
// Sole purpose: scope `survey.css` to /s/[slug] only. Next.js App Router
// auto-injects stylesheets imported from a layout into that segment's
// HTML — keeps the ~1.2 KB gzip survey chrome out of the marketing
// surface bundle. Children pass through unchanged.
import './survey.css';

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
