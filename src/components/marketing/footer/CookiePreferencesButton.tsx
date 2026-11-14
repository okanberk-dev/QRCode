'use client';

import { COOKIE_PREFERENCES_PENDING_FLAG, OPEN_COOKIE_PREFERENCES_EVENT } from './events';

/**
 * Footer button that reopens the cookie settings dialog (see events.ts).
 * A real <button>: it changes state on the page, it does not navigate.
 */
export default function CookiePreferencesButton({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  const open = () => {
    (window as unknown as Record<string, unknown>)[COOKIE_PREFERENCES_PENDING_FLAG] = true;
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
  };
  return (
    <button type="button" aria-haspopup="dialog" onClick={open} className={className}>
      {label}
    </button>
  );
}
