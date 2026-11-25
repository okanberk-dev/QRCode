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
  assert.equal(event.actor, 'İsimsiz');
});

test('buildActivityFeed: AI-drafted reply is sent by a person, not the AI', () => {
  const [event] = buildActivityFeed({
    feedbacks: [],
    replies: [
      {
        id: 'r1',
        createdAt: t('2026-05-04T11:00:00Z'),
        source: 'ai_copilot',
        authorName: 'Ayşe Demir',
        feedback: { id: 'f1', name: 'Mehmet Kaya', rating: 3, platform: 'google' },
      },
    ],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(event.type, 'reply');
  assert.equal(event.actor, 'Ayşe Demir');
  assert.equal(event.action, 'AI taslağını onaylayıp gönderdi');
  assert.equal(event.target, '→ Mehmet K. ★★★');
});

test('buildActivityFeed: manual reply names the sender, falls back to Ekip', () => {
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
  assert.equal(event.actor, 'Ekip');
  assert.equal(event.action, 'yanıt gönderdi');
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
  assert.equal(event.target, '★★★★★');
});

test('buildActivityFeed: KVKK consent false hides name (anonim fallback)', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      {
        id: 'f1',
        name: 'Ayşe Demir',
        rating: 5,
        platform: 'google',
        createdAt: t('2026-05-04T09:00:00Z'),
        restaurantId: 'r1',
        hasKvkkConsent: false,
      },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
    isTr: true,
  });
  // KVKK opt-out → name ifşa edilmez, fallback "İsimsiz".
  assert.equal(event.actor, 'İsimsiz');
});

test('buildActivityFeed: KVKK consent true preserves shortName', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      {
        id: 'f1',
        name: 'Ayşe Demir',
        rating: 5,
        platform: 'google',
        createdAt: t('2026-05-04T09:00:00Z'),
        restaurantId: 'r1',
        hasKvkkConsent: true,
      },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
  });
  assert.equal(event.actor, 'Ayşe D.');
});

test('buildActivityFeed: KVKK consent undefined falls through to legacy (shortName)', () => {
  const [event] = buildActivityFeed({
    feedbacks: [
      {
        id: 'f1',
        name: 'Ayşe Demir',
        rating: 5,
        platform: 'google',
        createdAt: t('2026-05-04T09:00:00Z'),
        restaurantId: 'r1',
        // hasKvkkConsent omitted (undefined)
      },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
  });
  // undefined → legacy davranış (CLAUDE.md §38.32 dokümanı).
  assert.equal(event.actor, 'Ayşe D.');
});

test('buildActivityFeed: system event priority slice keeps top 3 by priority + final timestamp sort', () => {
  const events = buildActivityFeed({
    feedbacks: [],
    replies: [],
    aiDrafts: [],
    systemEvents: [
      // 4 event: priority sırası weekly_report(1) → trial_ending(2) →
      // qr_not_downloaded(5) → foobar_unknown(100). Helper priority asc +
      // slice(0,3) → unknown atlandı. Final events sort timestamp desc.
      { id: 's_low', type: 'qr_not_downloaded', sentAt: t('2026-05-04T10:00:00Z') },
      { id: 's_high', type: 'weekly_report', sentAt: t('2026-05-04T09:00:00Z') },
      { id: 's_mid', type: 'trial_ending', sentAt: t('2026-05-04T08:00:00Z') },
      { id: 's_unknown', type: 'foobar_unknown', sentAt: t('2026-05-04T11:00:00Z') },
    ],
    limit: 10,
  });
  const systemEvents = events.filter((e) => e.type === 'system');
  assert.equal(systemEvents.length, 3);
  // foobar_unknown (lowest priority) atlandı, kalan 3 timestamp desc sort'a girer.
  const ids = systemEvents.map((e) => e.id);
  assert.ok(!ids.includes('system:s_unknown'));
  assert.ok(ids.includes('system:s_high'));
  assert.ok(ids.includes('system:s_mid'));
  assert.ok(ids.includes('system:s_low'));
  // Final timestamp desc: s_low (10:00) → s_high (09:00) → s_mid (08:00).
  assert.equal(systemEvents[0].id, 'system:s_low');
  assert.equal(systemEvents[1].id, 'system:s_high');
  assert.equal(systemEvents[2].id, 'system:s_mid');
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
  assert.equal(event.actor, 'Unnamed');
  assert.equal(event.action, 'left feedback');
});
