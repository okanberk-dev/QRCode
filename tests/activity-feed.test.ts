import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActivityFeed } from '../src/lib/activity-feed';

const t = (s: string) => new Date(s);

test('buildActivityFeed: empty input returns empty array', () => {
  const events = buildActivityFeed({
    feedbacks: [],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.deepEqual(events, []);
});

test('buildActivityFeed: union sorts newest first', () => {
  const events = buildActivityFeed({
    feedbacks: [
      { id: 'f1', name: 'Ayşe Demir', rating: 5, platform: 'google', createdAt: t('2026-05-04T09:00:00Z'), restaurantId: 'r1' },
    ],
    replies: [
      {
        id: 'rep1',
        createdAt: t('2026-05-04T11:00:00Z'),
        source: 'manual',
        feedback: { id: 'f2', name: 'Mehmet Kaya', rating: 3, platform: 'yemeksepeti' },
      },
    ],
    aiDrafts: [
      {
        id: 'd1',
        generatedAt: t('2026-05-04T10:00:00Z'),
        feedback: { id: 'f3', name: 'Selin Yıldız' },
      },
    ],
    systemEvents: [
      { id: 's1', type: 'qr_not_downloaded', sentAt: t('2026-05-04T08:00:00Z') },
    ],
  });
  assert.equal(events.length, 4);
  // Newest first: reply (11:00) → ai_draft (10:00) → feedback (09:00) → system (08:00)
  assert.equal(events[0].type, 'reply');
  assert.equal(events[1].type, 'ai_draft');
  assert.equal(events[2].type, 'feedback');
  assert.equal(events[3].type, 'system');
});

test('buildActivityFeed: feedback sentiment derived from rating', () => {
  const [pos, neu, neg] = buildActivityFeed({
    feedbacks: [
      { id: 'f1', name: 'A', rating: 5, platform: 'google', createdAt: t('2026-05-04T09:00:00Z'), restaurantId: 'r1' },
      { id: 'f2', name: 'B', rating: 3, platform: 'google', createdAt: t('2026-05-04T08:00:00Z'), restaurantId: 'r1' },
      { id: 'f3', name: 'C', rating: 1, platform: 'google', createdAt: t('2026-05-04T07:00:00Z'), restaurantId: 'r1' },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(pos.sentiment, 'pos');
  assert.equal(neu.sentiment, 'neu');
  assert.equal(neg.sentiment, 'neg');
});

test('buildActivityFeed: customer name shortened (Ad S. format)', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      { id: 'f1', name: 'Ayşe Demir', rating: 5, platform: 'google', createdAt: t('2026-05-04T09:00:00Z'), restaurantId: 'r1' },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(event.actor, 'Ayşe D.');
});

test('buildActivityFeed: KVKK fallback when name null', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      { id: 'f1', name: null, rating: 5, platform: 'google', createdAt: t('2026-05-04T09:00:00Z'), restaurantId: 'r1' },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
    isTr: true,
  });
  assert.equal(event.actor, 'Müşteri');
});

test('buildActivityFeed: AI reply marked as AI Asistan actor', () => {
  const [event] = buildActivityFeed({
    feedbacks: [],
    replies: [
      {
        id: 'r1',
        createdAt: t('2026-05-04T11:00:00Z'),
        source: 'ai_copilot',
        feedback: { id: 'f1', name: 'Mehmet Kaya', rating: 3, platform: 'google' },
      },
    ],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(event.type, 'reply');
  assert.equal(event.actor, 'AI Asistan');
  assert.equal(event.action, 'AI yanıtı gönderdi');
});

test('buildActivityFeed: manual reply marked with customer name', () => {
  const [event] = buildActivityFeed({
    feedbacks: [],
    replies: [
      {
        id: 'r1',
        createdAt: t('2026-05-04T11:00:00Z'),
        source: 'manual',
        feedback: { id: 'f1', name: 'Mehmet Kaya', rating: 3, platform: 'google' },
      },
    ],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(event.actor, 'Mehmet K.');
  assert.equal(event.action, 'yanıt verdi');
});

test('buildActivityFeed: system event types map to readable labels', () => {
  const events = buildActivityFeed({
    feedbacks: [],
    replies: [],
    aiDrafts: [],
    systemEvents: [
      { id: 's1', type: 'qr_not_downloaded', sentAt: t('2026-05-04T09:00:00Z') },
      { id: 's2', type: 'weekly_report', sentAt: t('2026-05-04T08:00:00Z') },
      { id: 's3', type: 'unknown_type', sentAt: t('2026-05-04T07:00:00Z') },
    ],
    limit: 10,
  });
  assert.equal(events[0].action, 'QR hatırlatma gönderildi');
  assert.equal(events[1].action, 'haftalık rapor gönderildi');
  assert.equal(events[2].action, 'sistem e-postası gönderildi');
  // Sentiment all neu for system events
  assert.equal(events[0].sentiment, 'neu');
  assert.equal(events[1].sentiment, 'neu');
});

test('buildActivityFeed: respects limit param', () => {
  const events = buildActivityFeed({
    feedbacks: Array.from({ length: 10 }, (_, i) => ({
      id: `f${i}`,
      name: 'Müşteri',
      rating: 5,
      platform: 'google',
      createdAt: t(`2026-05-04T0${i}:00:00Z`),
      restaurantId: 'r1',
    })),
    replies: [],
    aiDrafts: [],
    systemEvents: [],
    limit: 3,
  });
  assert.equal(events.length, 3);
});

test('buildActivityFeed: platform target shows stars + platform label', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      { id: 'f1', name: 'Ayşe Demir', rating: 5, platform: 'google', createdAt: t('2026-05-04T09:00:00Z'), restaurantId: 'r1' },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(event.target, '★★★★★ Google');
});

test('buildActivityFeed: locale EN', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      { id: 'f1', name: null, rating: 5, platform: 'google', createdAt: t('2026-05-04T09:00:00Z'), restaurantId: 'r1' },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
    isTr: false,
  });
  assert.equal(event.actor, 'Customer');
  assert.equal(event.action, 'left a review');
});
