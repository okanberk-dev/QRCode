import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ReplyApprovalRequiredError,
  assertReplyApproval,
  isReplyApproved,
  needsReplyApproval,
} from '../src/lib/reply-approval';
import { updateGoogleReviewReply } from '../src/lib/google-business';
import { sendOutcomeFromError } from '../src/lib/google-reply-jobs';

const approval = { actorId: 'user_1', approvedAt: new Date('2026-11-25T10:00:00Z') };

describe('low-rating reply approval', () => {
  it('1–3★ and unknown ratings need an approval', () => {
    for (const r of [1, 2, 3, null]) assert.equal(needsReplyApproval(r), true);
    for (const r of [4, 5]) assert.equal(needsReplyApproval(r), false);
  });

  it('4–5★ pass without approval', () => {
    assert.equal(isReplyApproved({ rating: 5, approval: null }), true);
    assert.equal(isReplyApproved({ rating: 4, approval: null }), true);
  });

  it('1–3★ without who/when is refused', () => {
    for (const rating of [1, 2, 3, null]) {
      assert.throws(() => assertReplyApproval({ rating, approval: null }), ReplyApprovalRequiredError);
    }
    assert.throws(() => assertReplyApproval({ rating: 1, approval: { actorId: ' ', approvedAt: new Date() } }), ReplyApprovalRequiredError);
    assert.throws(() => assertReplyApproval({ rating: 1, approval: { actorId: 'u', approvedAt: new Date('x') } }), ReplyApprovalRequiredError);
  });

  it('1–3★ with a recorded approval passes', () => {
    assert.doesNotThrow(() => assertReplyApproval({ rating: 1, approval }));
  });

  it('nothing reaches Google for an unapproved 1★ reply', async () => {
    let fetched = false;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => { fetched = true; return new Response('{}'); }) as typeof fetch;
    try {
      await assert.rejects(
        updateGoogleReviewReply({} as Parameters<typeof updateGoogleReviewReply>[0], 'accounts/1/locations/2/reviews/abc', 'Teşekkürler, ilginiz için.', { rating: 1, approval: null }),
        ReplyApprovalRequiredError,
      );
    } finally {
      globalThis.fetch = orig;
    }
    assert.equal(fetched, false);
  });

  it('the bulk queue fails an unapproved item without retrying', () => {
    assert.deepEqual(sendOutcomeFromError(new ReplyApprovalRequiredError()), {
      ok: false,
      code: 'APPROVAL_REQUIRED',
      retriable: false,
    });
  });
});
