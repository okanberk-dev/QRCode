import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminActorFromPayload,
  adminPermissionKeys,
  adminProfileFromRow,
  isAdminRowStale,
} from '../src/lib/admin-session-row';

// The admin layout reads the AdminUser row once; these helpers must give the
// same answers as isAdminTokenStale (auth.ts) and loadAdminPanelProfile.

test('isAdminRowStale: missing row is a deleted admin (stale)', () => {
  assert.equal(isAdminRowStale(1_700_000_000, null), true);
});

test('isAdminRowStale: no passwordChangedAt is a legacy session (fresh)', () => {
  assert.equal(isAdminRowStale(1_700_000_000, { passwordChangedAt: null }), false);
});

test('isAdminRowStale: token issued before the password change is stale', () => {
  const changed = new Date(1_700_000_100_000);
  assert.equal(isAdminRowStale(1_700_000_000, { passwordChangedAt: changed }), true);
});

test('isAdminRowStale: token issued at or after the password change is fresh', () => {
  const changed = new Date(1_700_000_000_000);
  assert.equal(isAdminRowStale(1_700_000_000, { passwordChangedAt: changed }), false);
  assert.equal(isAdminRowStale(1_700_000_001, { passwordChangedAt: changed }), false);
});

test('adminPermissionKeys: superadmin carries no grants', () => {
  assert.deepEqual(adminPermissionKeys('superadmin', [{ resource: 'reviews', action: 'read' }]), []);
});

test('adminPermissionKeys: manager and staff carry resource:action keys', () => {
  const rows = [
    { resource: 'reviews', action: 'read' },
    { resource: 'customers', action: 'write' },
  ];
  assert.deepEqual(adminPermissionKeys('manager', rows), ['reviews:read', 'customers:write']);
  assert.deepEqual(adminPermissionKeys('staff', rows), ['reviews:read', 'customers:write']);
});

test('adminProfileFromRow: same shape as the loadAdminPanelProfile admin branch', () => {
  const profile = adminProfileFromRow(
    { id: 'a1', username: 'ops', role: 'manager', restaurantId: 'r1', email: 'ops@example.com' },
    ['reviews:read'],
    { logoUrl: '/logo.svg', faviconUrl: null },
  );
  assert.deepEqual(profile, {
    id: 'a1',
    username: 'ops',
    email: 'ops@example.com',
    recoveryEmail: 'ops@example.com',
    name: 'ops',
    role: 'manager',
    plan: null,
    trialEndsAt: null,
    restaurantId: 'r1',
    restaurantIds: ['r1'],
    logoUrl: '/logo.svg',
    faviconUrl: null,
    permissions: ['reviews:read'],
  });
});

test('adminProfileFromRow: no email falls back to username, empty role to superadmin', () => {
  const profile = adminProfileFromRow(
    { id: 'a2', username: 'root', role: '', restaurantId: null, email: null },
    [],
    { logoUrl: null, faviconUrl: null },
  );
  assert.equal(profile.email, 'root');
  assert.equal(profile.recoveryEmail, null);
  assert.equal(profile.role, 'superadmin');
  assert.equal(profile.restaurantId, null);
  assert.deepEqual(profile.restaurantIds, []);
});

test('adminActorFromPayload: builds the layout actor from claims', () => {
  assert.deepEqual(
    adminActorFromPayload({ id: 'a1', role: 'staff', username: 'ops', restaurantId: '  ' }),
    {
      id: 'a1',
      role: 'staff',
      restaurantId: null,
      username: 'ops',
      email: 'ops',
      plan: null,
      source: 'admin',
    },
  );
});

test('adminActorFromPayload: env-admin when no id claim, null for non-admin roles', () => {
  assert.equal(adminActorFromPayload({ role: 'superadmin' })?.id, 'env-admin');
  assert.equal(adminActorFromPayload({ role: 'restaurant_owner', id: 'u1' }), null);
  assert.equal(adminActorFromPayload({ id: 'u1' }), null);
});
