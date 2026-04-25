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
