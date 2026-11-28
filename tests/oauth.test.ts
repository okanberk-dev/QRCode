/**
 * OAuth flow tests — signup, login, token refresh, error cases.
 *
 * These exercise pure logic (handleOAuthSignIn / handleTokenRefresh) with
 * stubbed dependencies so we never touch Prisma, Firebase, or the network.
 *
 * Run: npm test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  handleOAuthSignIn,
  handleTokenRefresh,
  type OAuthDeps,
  type OAuthUserRecord,
  type RefreshDeps,
  type TokenClaims,
} from '../src/lib/oauth';
import { signJwt, verifyJwt } from '../src/lib/auth';

const FIXED_NOW = new Date('2026-04-29T12:00:00.000Z');

function buildUser(overrides: Partial<OAuthUserRecord> = {}): OAuthUserRecord {
  const trialEndsAt = new Date(FIXED_NOW);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  return {
    id: 'user_existing',
    email: 'jane@example.com',
    name: 'Jane',
    role: 'restaurant_owner',
    plan: 'trial',
    isActive: true,
    trialEndsAt,
    ...overrides,
  };
}

interface TestStore {
  byEmail: Map<string, OAuthUserRecord>;
  byId: Map<string, OAuthUserRecord>;
  createCalls: number;
  signCalls: number;
}

function buildDeps(opts: {
  store?: TestStore;
  claims?: TokenClaims | null;
  signToken?: OAuthDeps['signToken'];
} = {}): { deps: OAuthDeps; store: TestStore } {
  const store: TestStore = opts.store ?? {
    byEmail: new Map(),
    byId: new Map(),
    createCalls: 0,
    signCalls: 0,
  };

  const deps: OAuthDeps = {
    verifyToken: async (token) => {
      if (token === 'invalid') return null;
      return opts.claims ?? {
        sub: 'firebase-sub',
        email: 'jane@example.com',
        email_verified: true,
        name: 'Jane',
      };
    },
    findUser: async (email) => store.byEmail.get(email) ?? null,
    createUser: async (data) => {
      store.createCalls += 1;
      const user: OAuthUserRecord = {
        id: `user_${store.createCalls}`,
        email: data.email,
        name: data.name,
        role: 'restaurant_owner',
        plan: 'trial',
        isActive: true,
        trialEndsAt: data.trialEndsAt,
      };
      store.byEmail.set(user.email, user);
      store.byId.set(user.id, user);
      return user;
    },
    signToken: opts.signToken ?? (async (payload) => {
      store.signCalls += 1;
      return `signed:${JSON.stringify(payload)}`;
    }),
    now: () => FIXED_NOW,
  };

  return { deps, store };
}

describe('OAuth signup (new user)', () => {
  it('creates a user when the email is unknown and returns isNewUser=true', async () => {
    const { deps, store } = buildDeps();

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.isNewUser, true);
    assert.equal(result.user.email, 'jane@example.com');
    assert.equal(result.user.name, 'Jane');
    assert.equal(store.createCalls, 1);
    assert.equal(store.signCalls, 1);
    assert.match(result.token, /^signed:/);
  });

  it('lowercases and trims the email before lookup', async () => {
    const { deps, store } = buildDeps({
      claims: {
        sub: 'firebase-sub',
        email: '  Jane@Example.COM  ',
        email_verified: true,
      },
    });

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.user.email, 'jane@example.com');
    assert.ok(store.byEmail.has('jane@example.com'));
  });

  it('seeds a 14-day trial window for new users', async () => {
    const { deps } = buildDeps();
    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const expected = new Date(FIXED_NOW);
    expected.setDate(expected.getDate() + 14);
    assert.equal(result.user.trialEndsAt?.toISOString(), expected.toISOString());
  });
});

describe('OAuth login (returning user)', () => {
  it('returns isNewUser=false and does not create a row when the email exists', async () => {
    const existing = buildUser({ id: 'user_existing', plan: 'pro' });
    const store: TestStore = {
      byEmail: new Map([[existing.email, existing]]),
      byId: new Map([[existing.id, existing]]),
      createCalls: 0,
      signCalls: 0,
    };
    const { deps } = buildDeps({ store });

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.isNewUser, false);
    assert.equal(result.user.id, 'user_existing');
    assert.equal(store.createCalls, 0);
  });

  it('issues a JWT carrying userId, email, role, and plan claims', async () => {
    const captured: Record<string, unknown>[] = [];
    const { deps } = buildDeps({
      signToken: async (payload) => {
        captured.push(payload);
        return 'signed-token';
      },
    });

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.token, 'signed-token');
    assert.equal(captured.length, 1);
    assert.equal(captured[0].email, 'jane@example.com');
    assert.equal(captured[0].role, 'restaurant_owner');
    assert.equal(captured[0].plan, 'trial');
    assert.equal(typeof captured[0].userId, 'string');
  });
});

describe('OAuth sign-in page (allowCreate: false)', () => {
  it('does not open a business account for an unknown e-mail', async () => {
    const { deps, store } = buildDeps();

    const result = await handleOAuthSignIn({ idToken: 'good', allowCreate: false }, deps);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 409);
    assert.equal(result.code, 'NO_BUSINESS_ACCOUNT');
    assert.equal(result.email, 'jane@example.com');
    assert.equal(store.createCalls, 0);
    assert.equal(store.signCalls, 0);
  });

  it('still signs in an existing business account', async () => {
    const existing = buildUser({ id: 'user_existing' });
    const store: TestStore = {
      byEmail: new Map([[existing.email, existing]]),
      byId: new Map([[existing.id, existing]]),
      createCalls: 0,
      signCalls: 0,
    };
    const { deps } = buildDeps({ store });

    const result = await handleOAuthSignIn({ idToken: 'good', allowCreate: false }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.isNewUser, false);
    assert.equal(store.createCalls, 0);
  });
});

describe('OAuth error cases', () => {
  it('rejects a missing idToken with 400', async () => {
    const { deps } = buildDeps();
    const result = await handleOAuthSignIn({ idToken: '' }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
  });

  it('rejects a non-string idToken with 400', async () => {
    const { deps } = buildDeps();
    const result = await handleOAuthSignIn(
      { idToken: 123 as unknown as string },
      deps,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
  });

  it('rejects an unverifiable token with 401', async () => {
    const { deps } = buildDeps();
    const result = await handleOAuthSignIn({ idToken: 'invalid' }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });

  it('rejects a token with no email claim with 400', async () => {
    const { deps } = buildDeps({
      claims: { sub: 'firebase-sub', email_verified: true },
    });
    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
  });

  it('rejects an unverified email with 403', async () => {
    const { deps } = buildDeps({
      claims: {
        sub: 'firebase-sub',
        email: 'jane@example.com',
        email_verified: false,
      },
    });
    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });

  it('rejects a deactivated account with 403', async () => {
    const existing = buildUser({ isActive: false });
    const store: TestStore = {
      byEmail: new Map([[existing.email, existing]]),
      byId: new Map([[existing.id, existing]]),
      createCalls: 0,
      signCalls: 0,
    };
    const { deps } = buildDeps({ store });

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });

  it('rejects an expired trial with 402 and trialExpired=true', async () => {
    const expiredTrial = new Date(FIXED_NOW);
    expiredTrial.setDate(expiredTrial.getDate() - 1);
    const existing = buildUser({ plan: 'trial', trialEndsAt: expiredTrial });
    const store: TestStore = {
      byEmail: new Map([[existing.email, existing]]),
      byId: new Map([[existing.id, existing]]),
      createCalls: 0,
      signCalls: 0,
    };
    const { deps } = buildDeps({ store });

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 402);
    assert.equal(result.trialExpired, true);
  });

  it('does not check trial expiry for paid plans', async () => {
    const existing = buildUser({ plan: 'pro', trialEndsAt: null });
    const store: TestStore = {
      byEmail: new Map([[existing.email, existing]]),
      byId: new Map([[existing.id, existing]]),
      createCalls: 0,
      signCalls: 0,
    };
    const { deps } = buildDeps({ store });

    const result = await handleOAuthSignIn({ idToken: 'good' }, deps);

    assert.equal(result.ok, true);
  });
});

describe('Token refresh', () => {
  function buildRefreshDeps(opts: {
    user?: OAuthUserRecord | null;
    signTokenSpy?: (payload: Record<string, unknown>) => Promise<string>;
  } = {}): { deps: RefreshDeps; signed: Record<string, unknown>[] } {
    const signed: Record<string, unknown>[] = [];
    const deps: RefreshDeps = {
      verifyToken: verifyJwt,
      findUserById: async (id) => (opts.user && opts.user.id === id ? opts.user : null),
      signToken: opts.signTokenSpy ?? (async (payload) => {
        signed.push(payload);
        return signJwt(payload);
      }),
      now: () => FIXED_NOW,
    };
    return { deps, signed };
  }

  it('rotates the JWT for a valid token + active user', async () => {
    const user = buildUser({ id: 'user_existing' });
    const { deps, signed } = buildRefreshDeps({ user });
    const oldToken = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const result = await handleTokenRefresh({ token: oldToken }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(signed.length, 1, 'expected signToken to be called once');
    assert.equal(signed[0].userId, user.id);
    assert.equal(signed[0].email, user.email);

    const verified = await verifyJwt(result.token);
    assert.ok(verified, 'refreshed token should verify');
    assert.equal(verified.userId, user.id);
    assert.equal(verified.email, user.email);
  });

  // §38.238 — an impersonation token must never be refreshed. `handleTokenRefresh`
  // re-signs from scratch with only { userId, email, role, plan }, so refreshing
  // one silently dropped the `impersonating` claim and turned a 30-minute audited
  // shadow session into a plain 7-day login as that customer.
  it('refuses to refresh an impersonation token with 403', async () => {
    const user = buildUser({ id: 'user_existing' });
    const { deps, signed } = buildRefreshDeps({ user });
    const shadowToken = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      impersonating: { adminId: 'admin_1', sessionId: 'imp_1' },
    });

    const result = await handleTokenRefresh({ token: shadowToken }, deps);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
    assert.equal(signed.length, 0, 'no new token may be minted for a shadow session');
  });

  it('still refreshes a normal token that has no impersonating claim', async () => {
    const user = buildUser({ id: 'user_existing' });
    const { deps, signed } = buildRefreshDeps({ user });
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const result = await handleTokenRefresh({ token }, deps);

    assert.equal(result.ok, true);
    assert.equal(signed.length, 1);
    const verified = await verifyJwt((result as { token: string }).token);
    assert.ok(verified);
    assert.equal(verified.impersonating, undefined);
  });

  it('rejects a malformed token with 401', async () => {
    const { deps } = buildRefreshDeps({ user: buildUser() });
    const result = await handleTokenRefresh({ token: 'not.a.jwt' }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });

  it('rejects when no token is supplied with 401', async () => {
    const { deps } = buildRefreshDeps({ user: buildUser() });
    const result = await handleTokenRefresh({ token: '' }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });

  it('rejects when the user no longer exists with 401', async () => {
    const { deps } = buildRefreshDeps({ user: null });
    const orphanToken = await signJwt({
      userId: 'ghost',
      email: 'ghost@example.com',
      role: 'restaurant_owner',
      plan: 'trial',
    });
    const result = await handleTokenRefresh({ token: orphanToken }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });

  it('rejects a deactivated account with 403', async () => {
    const user = buildUser({ isActive: false });
    const { deps } = buildRefreshDeps({ user });
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });
    const result = await handleTokenRefresh({ token }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });

  // Team scope is resolved by e-mail, so a session must not keep renewing
  // with an address the team member has not verified (login already gated
  // this; refresh did not).
  it('rejects a team_member with an unverified e-mail with 403', async () => {
    const user = { ...buildUser({ role: 'team_member' }), emailVerified: false };
    const { deps, signed } = buildRefreshDeps({ user });
    const token = await signJwt({ userId: user.id, email: user.email, role: user.role, plan: user.plan });
    const result = await handleTokenRefresh({ token }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
    assert.equal(signed.length, 0);
  });

  it('still refreshes a restaurant_owner whose e-mail is unverified', async () => {
    const user = { ...buildUser(), emailVerified: false };
    const { deps } = buildRefreshDeps({ user });
    const token = await signJwt({ userId: user.id, email: user.email, role: user.role, plan: user.plan });
    const result = await handleTokenRefresh({ token }, deps);
    assert.equal(result.ok, true);
  });

  it('rejects an expired trial with 402 and trialExpired=true', async () => {
    const expiredTrial = new Date(FIXED_NOW);
    expiredTrial.setDate(expiredTrial.getDate() - 1);
    const user = buildUser({ plan: 'trial', trialEndsAt: expiredTrial });
    const { deps } = buildRefreshDeps({ user });
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: 'trial',
    });
    const result = await handleTokenRefresh({ token }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 402);
    assert.equal(result.trialExpired, true);
  });
});

describe('JWT roundtrip (sanity)', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret-must-be-at-least-32-chars-long';
  });

  it('signs a payload and verifies the round trip', async () => {
    const token = await signJwt({ userId: 'u1', email: 'u@example.com' });
    const payload = await verifyJwt(token);
    assert.ok(payload);
    assert.equal(payload.userId, 'u1');
    assert.equal(payload.email, 'u@example.com');
  });

  it('rejects a tampered token', async () => {
    const token = await signJwt({ userId: 'u1' });
    const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'B' : 'A') + 'X';
    const payload = await verifyJwt(tampered);
    assert.equal(payload, null);

    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
});
