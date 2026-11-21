// Server-side Firebase ID token verification via the Google public JWK set.
// Avoids adding `firebase-admin` as a dependency; uses `jose` (already
// installed for JWT signing) to verify token signature + claims.

import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export interface FirebaseTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  /** Unix seconds of the actual sign-in (not of the token refresh): used for fresh-sign-in checks. */
  auth_time?: number;
  firebase?: { sign_in_provider?: string };
}

export function getFirebaseProjectId(): string | null {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    null
  );
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseTokenClaims | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    if (!sub) return null;
    return {
      sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      email_verified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      auth_time: typeof payload.auth_time === 'number' ? payload.auth_time : undefined,
      firebase: (payload.firebase as { sign_in_provider?: string }) ?? undefined,
    };
  } catch {
    return null;
  }
}
