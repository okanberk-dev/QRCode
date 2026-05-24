/**
 * Lemon Squeezy lib barrel (CLAUDE.md §44).
 *
 * Public API:
 *   • getLemonSqueezyConfig() — env access + mode/key sanity
 *   • lsFetch() — REST API client (future checkout/portal endpoints)
 *   • verifyLemonSqueezySignature, computePayloadHash, parseLemonSqueezyPayload —
 *     webhook handler primitives
 *   • dispatchLemonSqueezyEvent() — single entry for processing parsed payload
 *
 * Caller örnek:
 *   import { verifyLemonSqueezySignature, dispatchLemonSqueezyEvent } from '@/lib/lemon-squeezy';
 */

export { getLemonSqueezyConfig, __resetLemonSqueezyConfigForTests } from './config';
export type { LemonSqueezyConfig, LemonSqueezyMode } from './config';

export { lsFetch } from './client';
export type { LemonSqueezyFetchOptions, LemonSqueezyFetchResult } from './client';

export {
  verifyLemonSqueezySignature,
  computePayloadHash,
  parseLemonSqueezyPayload,
  isKnownLemonSqueezyEvent,
} from './webhook';
export type { SignatureVerifyResult, ParseResult } from './webhook';

export { dispatchLemonSqueezyEvent } from './event-handlers';
export type { HandlerResult } from './event-handlers';

export type {
  LemonSqueezyEventName,
  LemonSqueezyResourceType,
  LemonSqueezyWebhookPayload,
  LemonSqueezyWebhookMeta,
  LemonSqueezyDataEnvelope,
  LemonSqueezySubscriptionAttributes,
  LemonSqueezyOrderAttributes,
  LemonSqueezyInvoiceAttributes,
  LemonSqueezyApiResponse,
  LemonSqueezyApiError,
} from './types';
