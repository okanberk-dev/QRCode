// Client-side Firebase Auth wrapper (lazy-loaded).
// Fully inert if env vars OR the firebase package are missing — callers must
// handle the `null` return and fall back to email/password flow.

const publicConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export function isFirebaseConfigured(): boolean {
  const c = publicConfig();
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId);
}

type FirebaseLikeError = { code?: string; message?: string };

const currentHostname = () =>
  typeof window !== 'undefined' ? window.location.hostname : '(server)';

/**
 * Maps a Firebase auth error (or generic Error) to a user-facing message.
 * Also surfaces the literal hostname being tested so the operator can
 * compare it against Firebase Console → Authorized Domains.
 */
export function getFirebaseErrorMessage(
  err: unknown,
  locale: 'tr' | 'en' = 'tr',
): string {
  const e = err as FirebaseLikeError;
  const rawMessage = e?.message ?? '';
  const code = e?.code || (rawMessage.match(/\(([^)]+)\)/)?.[1] ?? '');
  const tr = locale === 'tr';
  const host = currentHostname();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '(unset)';

  // Firebase sometimes surfaces non-coded errors whose message contains
  // diagnostic strings. Detect those before falling through to the switch.
  const lowerMsg = rawMessage.toLowerCase();
  if (lowerMsg.includes('requested action is invalid')) {
    return tr
      ? `Firebase OAuth ayarı eksik. Console → Authentication → Sign-in method → Google sağlayıcısının etkin olduğunu, "Web SDK configuration" altındaki Project public-facing name + support email alanlarının dolu olduğunu doğrulayın. (host: ${host})`
      : `Firebase OAuth setup is incomplete. In Console → Authentication → Sign-in method → Google, ensure the provider is enabled and the Web SDK configuration (project name + support email) is filled in. (host: ${host})`;
  }
  if (lowerMsg.includes('missing initial state')) {
    return tr
      ? `Tarayıcı oturum deposu engellendi (üçüncü taraf çerez/depolama kısıtı). Sayfayı yenileyin; sorun sürerse "Site Verileri"ni temizleyin veya gizli pencereyi kapatın.`
      : `Browser session storage was blocked (third-party cookie/storage restriction). Refresh the page; if the issue persists, clear site data or exit private browsing.`;
  }

  switch (code) {
    case 'auth/popup-blocked':
      return tr
        ? 'Tarayıcınız Google penceresini engelledi. Pop-up\'lara izin verip tekrar deneyin.'
        : 'Your browser blocked the Google popup. Allow pop-ups and try again.';
    case 'auth/popup-closed-by-user':
      return tr
        ? 'Google penceresi kapatıldı. Devam etmek için tekrar deneyin.'
        : 'Google sign-in window was closed. Try again to continue.';
    case 'auth/unauthorized-domain':
      return tr
        ? `Bu alan adı (${host}) Firebase'de yetkili değil. Console → Authentication → Settings → Authorized domains listesine "${host}" değerini protokolsüz / yol-suz / tam olarak ekleyin.`
        : `This domain (${host}) is not authorized in Firebase. Add "${host}" exactly (no protocol, no path) under Console → Authentication → Settings → Authorized domains.`;
    case 'auth/network-request-failed':
      return tr
        ? 'Ağ hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        : 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return tr
        ? 'Google ile giriş Firebase konsolunda etkinleştirilmemiş. Console → Authentication → Sign-in method → Google → Enable.'
        : 'Google sign-in is not enabled in Firebase console. Enable it under Authentication → Sign-in method → Google.';
    case 'auth/account-exists-with-different-credential':
      return tr
        ? 'Bu e-posta farklı bir giriş yöntemiyle kayıtlı. E-posta + şifre ile deneyin.'
        : 'This email is registered with a different sign-in method. Try email + password.';
    case 'auth/internal-error':
      return tr
        ? `Firebase iç hatası. authDomain="${authDomain}" değerinin Firebase default domaini veya /__/auth proxy'si tanımlı kendi domaininiz olduğunu doğrulayın.`
        : `Firebase internal error. Verify NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ("${authDomain}") is either the default Firebase domain or your own domain with the /__/auth proxy configured.`;
    case 'RECAPTCHA_NOT_READY':
    case 'RECAPTCHA_SCRIPT_FAILED':
      return tr
        ? 'Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip tekrar deneyin.'
        : 'Security check failed to load. Refresh the page and try again.';
    default: {
      const base = tr ? 'Google ile giriş başarısız oldu.' : 'Google sign-in failed.';
      return code ? `${base} (${code} · host: ${host})` : `${base} (host: ${host})`;
    }
  }
}

type FirebaseAppModule = typeof import('firebase/app');
type FirebaseAuthModule = typeof import('firebase/auth');

async function loadFirebase(): Promise<{ appMod: FirebaseAppModule; authMod: FirebaseAuthModule } | null> {
  try {
    const [appMod, authMod] = await Promise.all([
      import('firebase/app') as Promise<FirebaseAppModule>,
      import('firebase/auth') as Promise<FirebaseAuthModule>,
    ]);
    return { appMod, authMod };
  } catch {
    return null;
  }
}

function getAuthInstance(appMod: FirebaseAppModule, authMod: FirebaseAuthModule) {
  const cfg = publicConfig();
  const app = appMod.getApps().length
    ? appMod.getApp()
    : appMod.initializeApp({
        apiKey: cfg.apiKey!,
        authDomain: cfg.authDomain!,
        projectId: cfg.projectId!,
        appId: cfg.appId!,
      });
  return { auth: authMod.getAuth(app), cfg };
}

/**
 * Warm the Firebase Auth SDK + auth instance during idle time so the click on
 * "Google ile devam et" opens the popup immediately instead of first
 * downloading ~150 KB of `firebase/auth` and initialising the popup resolver.
 * Firebase modules are cached after the first import, so repeated calls are
 * free. Errors are swallowed — the click path still loads on demand.
 */
export function preloadGoogleSignIn(): void {
  if (!isFirebaseConfigured() || typeof window === 'undefined') return;
  const run = () => {
    loadFirebase()
      .then((mods) => {
        if (mods) getAuthInstance(mods.appMod, mods.authMod);
      })
      .catch(() => {
        /* click path retries */
      });
  };
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}

type GoogleSignInResult =
  | { status: 'unconfigured' }
  | { status: 'idToken'; idToken: string }
  | { status: 'redirecting' };

/**
 * Triggers Google sign-in. Prefers a popup window because:
 *  - It avoids the bounce through `<project>.firebaseapp.com`, which Chrome's
 *    bounce-tracking mitigation may strip storage from (causing
 *    getRedirectResult to lose state on return).
 *  - It avoids Firebase's auth iframe CSP issues (the iframe uses eval which
 *    Chrome flags under strict CSP).
 *
 * Falls back to redirect when the popup is blocked or otherwise refused, so
 * users on aggressive popup blockers still get a working flow. The redirect
 * result is consumed by `consumeGoogleRedirectIdToken()` on page mount.
 *
 * Returns:
 *  - { status: 'unconfigured' } — Firebase env vars / package missing.
 *  - { status: 'idToken', idToken } — popup succeeded; pass token to backend.
 *  - { status: 'redirecting' } — browser navigating away; mount effect will
 *    consume the result on return.
 */
export async function startGoogleSignIn(): Promise<GoogleSignInResult> {
  if (!isFirebaseConfigured()) return { status: 'unconfigured' };

  const mods = await loadFirebase();
  if (!mods) return { status: 'unconfigured' };

  const { auth, cfg } = getAuthInstance(mods.appMod, mods.authMod);
  const provider = new mods.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (typeof window !== 'undefined') {
    console.info('[firebase] sign-in start', {
      hostname: window.location.hostname,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
    });
  }

  try {
    const result = await mods.authMod.signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return { status: 'idToken', idToken };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    const popupFailed =
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/web-storage-unsupported';

    if (!popupFailed) throw err;

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('buaze.google.redirect', '1');
      } catch {
        // sessionStorage might be blocked in private mode; non-fatal.
      }
    }
    await mods.authMod.signInWithRedirect(auth, provider);
    return { status: 'redirecting' };
  }
}

/**
 * Call from a useEffect on the login/register page mount. Returns the
 * Firebase ID token if a redirect just completed; null otherwise.
 * Always clears the "redirect in progress" sentinel.
 */
export async function consumeGoogleRedirectIdToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === 'undefined') return null;

  const mods = await loadFirebase();
  if (!mods) return null;

  const { auth } = getAuthInstance(mods.appMod, mods.authMod);
  try {
    const result = await mods.authMod.getRedirectResult(auth);
    if (!result) return null;
    return await result.user.getIdToken();
  } finally {
    try {
      window.sessionStorage.removeItem('buaze.google.redirect');
    } catch {
      // ignore
    }
  }
}

/** True if a redirect-fallback was initiated and we haven't returned yet. */
export function isGoogleRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('buaze.google.redirect') === '1';
  } catch {
    return false;
  }
}
