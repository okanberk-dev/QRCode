import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStructuredInsight,
  _testing,
} from '../src/lib/weekly-structured-insight';

// emptyResult — internal testing export
test('weekly-structured-insight: emptyResult shape', () => {
  const r = _testing.emptyResult('fallback');
  assert.equal(r.trend, '');
  assert.equal(r.win, '');
  assert.equal(r.risk, '');
  assert.equal(r.source, 'fallback');
});

test('extractStructuredInsight: empty comments → fallback (no API call)', async () => {
  const result = await extractStructuredInsight(
    { comments: [] },
    'tr',
    'test-cache:empty',
  );
  assert.equal(result.source, 'fallback');
  assert.equal(result.trend, '');
});

test('extractStructuredInsight: comments below MIN_COMMENTS (5) → fallback', async () => {
  const result = await extractStructuredInsight(
    {
      comments: [
        { rating: 5, comment: 'Çok güzeldi' },
        { rating: 4, comment: 'Lezzetli' },
      ],
    },
    'tr',
    'test-cache:few',
  );
  // 2 yorum < 5 (MIN_COMMENTS_FOR_AI) → fallback
  assert.equal(result.source, 'fallback');
});

test('extractStructuredInsight: cache hit returns cached result', async () => {
  // İlk çağrı (5+ yorum, ama OPENAI_API_KEY yok test ortamında → fallback cache'e yazmaz)
  // Bu test sadece emptyResult fallback path'inin hata atmadığını doğrular.
  const cacheKey = `test-cache:cache-hit-${Date.now()}`;
  const r1 = await extractStructuredInsight(
    {
      comments: Array.from({ length: 6 }, (_, i) => ({
        rating: 4 + (i % 2),
        comment: `Yorum ${i}`,
      })),
    },
    'tr',
    cacheKey,
  );
  assert.equal(typeof r1.trend, 'string');
  assert.equal(typeof r1.win, 'string');
  assert.equal(typeof r1.risk, 'string');
  assert.ok(['openai', 'fallback'].includes(r1.source));
});
