import type { MenuCopy } from '../menu-labels';

/** "Powered by Buaze" attribution (kept); Pulse adds a small ECG glyph. */
export default function MenuFooter({ copy, ecg }: { copy: MenuCopy; ecg: boolean }) {
  return (
    <footer className="mt-(--m-section-gap) border-t border-(--m-rule) px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] text-center">
      <p className="inline-flex items-center gap-2 text-[12px] leading-4 tracking-[0.08em] text-(--m-muted)">
        {ecg && (
          <svg aria-hidden width="22" height="12" viewBox="0 0 22 12" fill="none" className="text-(--m-accent-ui)">
            <path d="M1 6h5l2-4 3 8 2.5-6L15 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {copy.footer}
      </p>
    </footer>
  );
}
