// Staff mode of the customer's card page (CLAUDE.md §61).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasPanelCookie, pickCardView, staffPanelHref } from '../src/lib/loyalty-staff';

test('pickCardView: staff mode needs access, ?view=customer always wins', () => {
  assert.equal(pickCardView({ staffAccess: true }), 'staff');
  assert.equal(pickCardView({ staffAccess: true, viewParam: null }), 'staff');
  assert.equal(pickCardView({ staffAccess: true, viewParam: 'customer' }), 'customer');
  assert.equal(pickCardView({ staffAccess: false }), 'customer');
  assert.equal(pickCardView({ staffAccess: false, viewParam: 'staff' }), 'customer');
});

test('hasPanelCookie: only a non-empty panel session cookie counts', () => {
  assert.equal(hasPanelCookie(null), false);
  assert.equal(hasPanelCookie(''), false);
  assert.equal(hasPanelCookie('buaze_customer=abc; bzc_kafe=tok'), false);
  assert.equal(hasPanelCookie('user_token='), false);
  assert.equal(hasPanelCookie('xuser_token=abc'), false);
  assert.equal(hasPanelCookie('user_token=eyJhbGciOi'), true);
  assert.equal(hasPanelCookie('a=1; admin_token=eyJhbGciOi; b=2'), true);
});

test('staffPanelHref: admins go to the admin panel, others to the owner counter', () => {
  assert.equal(staffPanelHref({ actorKind: 'admin', restaurantId: 'r1' }, 'tr'), '/admin/restaurants/r1');
  assert.equal(staffPanelHref({ actorKind: 'owner', restaurantId: 'r1' }, 'en'), '/en/dashboard/loyalty?restaurantId=r1');
});

test('staff mode never saves the customer card on the staff phone', () => {
  const staffView = readFileSync('src/app/l/[slug]/k/[token]/StaffCounterView.tsx', 'utf8');
  assert.equal(/remember=1|CARD_STORAGE_PREFIX|\/api\/public\/loyalty\/card/.test(staffView), false);
  const cardView = readFileSync('src/app/l/[slug]/k/[token]/CardView.tsx', 'utf8');
  assert.match(cardView, /void refresh\(!staffHref\)/);
  assert.match(cardView, /if \(!staffHref\) \{\s*try \{\s*window\.localStorage\.setItem/);
});
