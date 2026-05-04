import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackTimeline } from '../src/lib/feedback-timeline';

const t = (s: string) => new Date(s);

test('buildFeedbackTimeline: minimum input returns received only', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'received');
  assert.equal(events[0].title, 'Yorum alındı');
  assert.equal(events[0].meta, 'Google üzerinden');
});

test('buildFeedbackTimeline: 4 source union sort chronological asc', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
    aiDraft: { id: 'd1', generatedAt: t('2026-05-04T09:01:00Z'), latencyMs: 1400 },
    replies: [
      { id: 'r1', createdAt: t('2026-05-04T10:30:00Z'), source: 'ai_copilot', channel: 'email' },
    ],
    systemEvents: [
      { id: 's1', type: 'low_rating_alert', sentAt: t('2026-05-04T09:02:00Z') },
    ],
  });
  assert.equal(events.length, 4);
  // Asc: received → ai_draft → notification → replied
  assert.equal(events[0].type, 'received');
  assert.equal(events[1].type, 'ai_draft');
  assert.equal(events[2].type, 'notification');
  assert.equal(events[3].type, 'replied');
});

test('buildFeedbackTimeline: AI draft latency formatted', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
    aiDraft: { id: 'd1', generatedAt: t('2026-05-04T09:01:00Z'), latencyMs: 1400 },
  });
  const ai = events.find((e) => e.type === 'ai_draft');
  assert.ok(ai);
  assert.equal(ai.meta, '1.4s · GPT-4o');
});

test('buildFeedbackTimeline: AI draft null latency fallback "GPT-4o"', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
    aiDraft: { id: 'd1', generatedAt: t('2026-05-04T09:01:00Z'), latencyMs: null },
  });
  const ai = events.find((e) => e.type === 'ai_draft');
  assert.ok(ai);
  assert.equal(ai.meta, 'GPT-4o');
});

test('buildFeedbackTimeline: reply source variants → distinct titles', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
    replies: [
      { id: 'r1', createdAt: t('2026-05-04T10:00:00Z'), source: 'manual', channel: 'email' },
      { id: 'r2', createdAt: t('2026-05-04T11:00:00Z'), source: 'ai_copilot', channel: 'email' },
      { id: 'r3', createdAt: t('2026-05-04T12:00:00Z'), source: 'template_fallback', channel: 'internal' },
    ],
  });
  const replies = events.filter((e) => e.type === 'replied');
  assert.equal(replies[0].title, 'Yanıt gönderildi');
  assert.equal(replies[1].title, 'AI yanıtı gönderildi');
  assert.equal(replies[2].title, 'Şablon yanıt gönderildi');
});

test('buildFeedbackTimeline: locale EN', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
    isTr: false,
  });
  assert.equal(events[0].title, 'Review received');
  assert.equal(events[0].meta, 'via Google');
});

test('buildFeedbackTimeline: irrelevant system events filtered', () => {
  const events = buildFeedbackTimeline({
    feedback: { id: 'f1', createdAt: t('2026-05-04T09:00:00Z'), platform: 'google' },
    systemEvents: [
      // weekly_report bu feedback'le ilgisiz, atlanır
      { id: 's1', type: 'weekly_report', sentAt: t('2026-05-04T09:30:00Z') },
      // low_rating_alert ilgili, dahil
      { id: 's2', type: 'low_rating_alert', sentAt: t('2026-05-04T09:45:00Z') },
    ],
  });
  assert.equal(events.length, 2);
  const notifications = events.filter((e) => e.type === 'notification');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].id, 'system:s2');
});
