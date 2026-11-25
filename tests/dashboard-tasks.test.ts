import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPendingTasks } from '../src/lib/dashboard-tasks';

test('buildPendingTasks: empty inputs returns empty array', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 0, oldestUnrepliedAt: null },
    googlePlatformCheck: { failing: false, lastCheckedAt: null },
    churnedCustomers: { count: 0 },
  });
  assert.deepEqual(tasks, []);
});

test('buildPendingTasks: reply task only when unreplied count > 0', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 12, oldestUnrepliedAt: new Date('2026-05-04T07:00:00Z') },
    googlePlatformCheck: { failing: false, lastCheckedAt: null },
    churnedCustomers: { count: 0 },
  });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].type, 'reply');
  assert.equal(tasks[0].severity, 'high');
  assert.match(tasks[0].title, /12 geri bildirim yanıtsız/);
});

test('buildPendingTasks: platform task only when Google sync failing', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 0, oldestUnrepliedAt: null },
    googlePlatformCheck: { failing: true, lastCheckedAt: new Date() },
    churnedCustomers: { count: 0 },
  });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].type, 'platform');
  assert.equal(tasks[0].severity, 'medium');
  assert.match(tasks[0].title, /Google bağlantı sorunu/);
});

test('buildPendingTasks: reminder task only when churned > 0', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 0, oldestUnrepliedAt: null },
    googlePlatformCheck: { failing: false, lastCheckedAt: null },
    churnedCustomers: { count: 8 },
  });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].type, 'reminder');
  assert.equal(tasks[0].severity, 'low');
  assert.match(tasks[0].title, /8 müşteri/);
});

test('buildPendingTasks: severity sort high → medium → low', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 12, oldestUnrepliedAt: new Date() },
    googlePlatformCheck: { failing: true, lastCheckedAt: new Date() },
    churnedCustomers: { count: 8 },
  });
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].severity, 'high');
  assert.equal(tasks[1].severity, 'medium');
  assert.equal(tasks[2].severity, 'low');
});

test('buildPendingTasks: respects limit param', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 12, oldestUnrepliedAt: new Date() },
    googlePlatformCheck: { failing: true, lastCheckedAt: new Date() },
    churnedCustomers: { count: 8 },
    limit: 2,
  });
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].severity, 'high');
  assert.equal(tasks[1].severity, 'medium');
});

test('buildPendingTasks: locale EN', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 5, oldestUnrepliedAt: new Date() },
    googlePlatformCheck: { failing: true, lastCheckedAt: new Date() },
    churnedCustomers: { count: 3 },
    isTr: false,
  });
  assert.match(tasks[0].title, /5 reviews awaiting reply/);
  assert.match(tasks[1].title, /Google connection problem/);
  assert.match(tasks[2].title, /3 customers haven't returned/);
});

test('buildPendingTasks: reply task no oldestUnrepliedAt fallback', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 5, oldestUnrepliedAt: null },
    googlePlatformCheck: { failing: false, lastCheckedAt: null },
    churnedCustomers: { count: 0 },
  });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].meta, 'Yanıt bekliyor');
});

test('buildPendingTasks: href format type-prefixed', () => {
  const tasks = buildPendingTasks({
    unrepliedFeedbacks: { count: 1, oldestUnrepliedAt: new Date() },
    googlePlatformCheck: { failing: true, lastCheckedAt: new Date() },
    churnedCustomers: { count: 1 },
  });
  assert.match(tasks[0].href, /\/dashboard\/feedbacks/);
  assert.match(tasks[1].href, /\/dashboard\/google-reviews/);
  assert.match(tasks[2].href, /\/dashboard\/customers/);
});
