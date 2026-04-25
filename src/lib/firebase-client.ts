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

/**
 * Opens a Google sign-in popup and returns the Firebase ID token.
 * Returns null when Firebase is not configured or the SDK isn't installed.
 * Throws an Error('POPUP_CLOSED') when the user dismisses the popup.
 */
export async function signInWithGoogleIdToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  type FirebaseAppModule = typeof import('firebase/app');
  type FirebaseAuthModule = typeof import('firebase/auth');

  let appMod: FirebaseAppModule;
  let authMod: FirebaseAuthModule;
  try {
    // Use string-literal dynamic imports so bundler treats them as chunks;
    // if firebase isn't installed, caller gets a null response via catch.
    appMod = (await import('firebase/app')) as FirebaseAppModule;
    authMod = (await import('firebase/auth')) as FirebaseAuthModule;
  } catch {
    return null;
  }

  const cfg = publicConfig();
  const app = appMod.getApps().length
    ? appMod.getApp()
    : appMod.initializeApp({
        apiKey: cfg.apiKey!,
        authDomain: cfg.authDomain!,
        projectId: cfg.projectId!,
        appId: cfg.appId!,
      });

  const auth = authMod.getAuth(app);
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // One-line diagnostic so a screenshot of the console reveals any
  // mismatch between the runtime hostname and the configured authDomain.
  if (typeof window !== 'undefined') {
    console.info('[firebase] signin attempt', {
      hostname: window.location.hostname,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
    });
  }

  try {
    const cred = await authMod.signInWithPopup(auth, provider);
    return await cred.user.getIdToken();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('POPUP_CLOSED');
    }
    throw err;
  }
}
