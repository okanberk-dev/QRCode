import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdminNotificationUnread,
  serializeAdminNotificationReadAt,
} from '../src/lib/admin-notification-read-state';

test('broadcast notifications use the current admin read receipt', () => {
  const readAt = new Date('2026-05-10T09:00:00.000Z');
  assert.equal(
    serializeAdminNotificationReadAt({
      adminId: null,
      readAt: null,
      reads: [{ readAt }],
    }),
    '2026-05-10T09:00:00.000Z',
  );
});

test('broadcast notifications without a receipt are unread even if the shared row has no readAt', () => {
  assert.equal(
    isAdminNotificationUnread({
      adminId: null,
      readAt: null,
      reads: [],
    }),
    true,
  );
});

test('targeted notifications keep their own readAt field', () => {
  assert.equal(
    serializeAdminNotificationReadAt({
      adminId: 'admin-1',
      readAt: '2026-05-10T10:00:00.000Z',
      reads: [],
    }),
    '2026-05-10T10:00:00.000Z',
  );
});
