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
        ? `Firebase iç hatası. authDomain="${authDomain}" değerinin <project-id>.firebaseapp.com formatında olduğunu doğrulayın; aksi halde popup başarısız olur.`
        : `Firebase internal error. Verify NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ("${authDomain}") matches "<project-id>.firebaseapp.com".`;
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
 * Kicks off the Google sign-in redirect flow. The browser navigates away
 * to Firebase's OAuth handler; the result is consumed on return by
 * `consumeGoogleRedirectIdToken()` from the form's mount effect.
 * Returns false when Firebase is not configured (caller shows a notice).
 */
export async function startGoogleSignInRedirect(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const mods = await loadFirebase();
  if (!mods) return false;

  const { auth, cfg } = getAuthInstance(mods.appMod, mods.authMod);
  const provider = new mods.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (typeof window !== 'undefined') {
    console.info('[firebase] redirect start', {
      hostname: window.location.hostname,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
    });
    // Mark that we initiated a redirect so the consumer hook can show a
    // brief loading state instead of flashing the empty form.
    try {
      window.sessionStorage.setItem('buaze.google.redirect', '1');
    } catch {
      // sessionStorage might be blocked in private mode; non-fatal.
    }
  }

  await mods.authMod.signInWithRedirect(auth, provider);
  return true;
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

/** True if `startGoogleSignInRedirect` was called and we haven't returned yet. */
export function isGoogleRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('buaze.google.redirect') === '1';
  } catch {
    return false;
  }
}
