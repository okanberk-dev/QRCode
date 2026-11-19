import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminRoleLabel,
  getActiveAdminHref,
  getAdminMobileNav,
  getAdminNavLeaves,
  toAdminNavRole,
} from '../src/components/admin/admin-nav';

const hrefs = (leaves: { href: string }[]) => leaves.map((l) => l.href);
const none = new Set<string>();

test('admin nav: superadmin sees every non-dev page, including dashboard', () => {
  const pages = hrefs(getAdminNavLeaves('superadmin', none));
  for (const href of ['/admin/dashboard', '/admin/restaurants', '/admin/members', '/admin/audit-logs', '/admin/profile']) {
    assert.ok(pages.includes(href), href);
  }
  // Workspace pages for business owners were removed from the admin panel.
  for (const gone of ['/admin/team', '/admin/billing', '/admin/settings', '/admin/campaigns']) {
    assert.ok(!pages.includes(gone), gone);
  }
});

test('admin nav: manager is scoped to its business — no global dashboard or accounts', () => {
  const pages = hrefs(getAdminNavLeaves('manager', none));
  assert.deepEqual(pages, ['/admin/reviews', '/admin/analytics', '/admin/qr', '/admin/profile']);
});

test('admin nav: staff without grants only gets the profile page', () => {
  assert.deepEqual(hrefs(getAdminNavLeaves('staff', none)), ['/admin/profile']);
});

test('admin nav: staff grants open exactly the matching pages', () => {
  const perms = new Set(['reviews:read', 'customers:read', 'analytics:read']);
  const pages = hrefs(getAdminNavLeaves('staff', perms));
  assert.deepEqual(pages, ['/admin/dashboard', '/admin/reviews', '/admin/analytics', '/admin/customers', '/admin/profile']);
});

test('admin mobile nav: never empty for staff and capped at five', () => {
  assert.deepEqual(hrefs(getAdminMobileNav('staff', none)), ['/admin/profile']);
  assert.equal(getAdminMobileNav('superadmin', none).length, 5);
});

test('admin nav: longest matching href wins', () => {
  const list = ['/admin/newsletters', '/admin/newsletters/campaigns'];
  assert.equal(getActiveAdminHref('/admin/newsletters/campaigns/abc', list), '/admin/newsletters/campaigns');
  assert.equal(getActiveAdminHref('/admin/newsletters', list), '/admin/newsletters');
  assert.equal(getActiveAdminHref('/admin/newsletters-x', list), null);
});

test('admin role labels are shared and localized', () => {
  assert.equal(adminRoleLabel('staff', 'tr'), 'Görevli');
  assert.equal(adminRoleLabel('staff', 'en'), 'Staff');
  assert.equal(adminRoleLabel('manager', 'en'), 'Manager');
  assert.equal(toAdminNavRole('restaurant_owner'), 'manager');
});
