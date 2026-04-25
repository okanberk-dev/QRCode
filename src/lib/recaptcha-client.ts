'use client';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const SCRIPT_ID = 'buaze-recaptcha-enterprise';

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.grecaptcha?.enterprise) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('RECAPTCHA_SCRIPT_FAILED')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('RECAPTCHA_SCRIPT_FAILED'));
    document.head.appendChild(script);
  });
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(SITE_KEY);
}

/**
 * Inject the reCAPTCHA script tag without executing a token. Call from a
 * form's mount effect so the script is warm before the user clicks submit —
 * eliminates the first-submit network round-trip the user would otherwise
 * pay for. Safe to call multiple times; the script is reused.
 */
export function preloadRecaptcha(): void {
  if (!SITE_KEY) return;
  void loadRecaptchaScript(SITE_KEY);
}

export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;

  await loadRecaptchaScript(SITE_KEY);
  const enterprise = window.grecaptcha?.enterprise;
  if (!enterprise) throw new Error('RECAPTCHA_NOT_READY');

  await new Promise<void>((resolve) => enterprise.ready(resolve));
  return enterprise.execute(SITE_KEY, { action });
}
