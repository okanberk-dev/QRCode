import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyWebhookSignature,
  ruleMatchesFeedback,
  WEBHOOK_HEADERS,
} from '../src/lib/webhook-fanout';

// Stage 12 §38.82 — webhook-fanout helper unit tests.
// HMAC sign + verify round-trip + ruleMatchesFeedback dispatch matrix.
// dispatchWebhook & persistFireResult tests Prisma + fetch mock gerektirir
// (out of scope, integration test scope — manuel ngrok / webhook.site).

describe('webhook-fanout', () => {
  describe('verifyWebhookSignature', () => {
    const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

    function manualSign(ruleId: string, payload: string): string {
      return crypto
        .createHmac('sha256', secret)
        .update(`${ruleId}:${payload}`)
        .digest('base64url');
    }

    it('round-trip sign + verify returns true', () => {
      const ruleId = 'rule_test_1';
      const payload = JSON.stringify({ event: 'feedback.low_rating', rating: 2 });
      const sig = manualSign(ruleId, payload);
      assert.equal(verifyWebhookSignature(payload, ruleId, sig), true);
    });

    it('tampered signature returns false', () => {
      const ruleId = 'rule_test_2';
      const payload = 'body';
      const sig = manualSign(ruleId, payload);
      const tampered = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');
      assert.equal(verifyWebhookSignature(payload, ruleId, tampered), false);
    });

    it('different ruleId returns false (signature ruleId-bound)', () => {
      const payload = 'shared-body';
      const sigForA = manualSign('rule_a', payload);
      assert.equal(verifyWebhookSignature(payload, 'rule_b', sigForA), false);
    });

    it('different payload returns false', () => {
      const ruleId = 'rule_test_4';
      const sig = manualSign(ruleId, 'original');
      assert.equal(verifyWebhookSignature('modified', ruleId, sig), false);
    });

    it('empty signature returns false (no exception)', () => {
      assert.equal(verifyWebhookSignature('body', 'rule_id', ''), false);
    });

    it('mismatched signature length returns false', () => {
      const ruleId = 'rule_test_6';
      const sig = manualSign(ruleId, 'body');
      assert.equal(verifyWebhookSignature('body', ruleId, sig + 'extra'), false);
    });
  });

  describe('ruleMatchesFeedback', () => {
    it('rating_lte threshold=3 matches rating=1', () => {
      assert.equal(
        ruleMatchesFeedback({ trigger: 'rating_lte', threshold: '3' }, { rating: 1 }),
        true,
      );
    });

    it('rating_lte threshold=3 matches rating=3 (inclusive)', () => {
      assert.equal(
        ruleMatchesFeedback({ trigger: 'rating_lte', threshold: '3' }, { rating: 3 }),
        true,
      );
    });

    it('rating_lte threshold=3 does not match rating=4', () => {
      assert.equal(
        ruleMatchesFeedback({ trigger: 'rating_lte', threshold: '3' }, { rating: 4 }),
        false,
      );
    });

    it('rating_gte threshold=4 matches rating=5', () => {
      assert.equal(
        ruleMatchesFeedback({ trigger: 'rating_gte', threshold: '4' }, { rating: 5 }),
        true,
      );
    });

    it('rating_gte threshold=4 does not match rating=3', () => {
      assert.equal(
        ruleMatchesFeedback({ trigger: 'rating_gte', threshold: '4' }, { rating: 3 }),
        false,
      );
    });

    it('keyword case-insensitive substring match (TR characters)', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'keyword', threshold: 'KÖTÜ' },
          { rating: 2, comment: 'Çok kötü hizmet' },
        ),
        true,
      );
    });

    it('keyword no match returns false', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'keyword', threshold: 'harika' },
          { rating: 2, comment: 'kötü deneyim' },
        ),
        false,
      );
    });

    it('keyword null comment returns false', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'keyword', threshold: 'kötü' },
          { rating: 2, comment: null },
        ),
        false,
      );
    });

    it('keyword null threshold returns false', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'keyword', threshold: null },
          { rating: 2, comment: 'kötü' },
        ),
        false,
      );
    });

    it('platform exact match', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'platform', threshold: 'google' },
          { rating: 5, platform: 'google' },
        ),
        true,
      );
    });

    it('platform mismatch returns false', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'platform', threshold: 'google' },
          { rating: 5, platform: 'yemeksepeti' },
        ),
        false,
      );
    });

    it('platform null returns false', () => {
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'platform', threshold: 'google' },
          { rating: 5, platform: null },
        ),
        false,
      );
    });

    it('unknown trigger returns false (defensive)', () => {
      // Schema string field — runtime accepts arbitrary values; helper falls
      // through to default-case `return false`.
      assert.equal(
        ruleMatchesFeedback(
          { trigger: 'unknown_trigger', threshold: 'x' },
          { rating: 5 },
        ),
        false,
      );
    });
  });

  describe('WEBHOOK_HEADERS const', () => {
    it('exports stable header names', () => {
      assert.equal(WEBHOOK_HEADERS.signature, 'X-Buaze-Signature');
      assert.equal(WEBHOOK_HEADERS.ruleId, 'X-Buaze-Rule-Id');
      assert.equal(WEBHOOK_HEADERS.source, 'X-Buaze-Source');
    });
  });
});
