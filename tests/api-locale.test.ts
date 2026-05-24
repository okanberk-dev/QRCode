/**
 * API locale resolver tests (CLAUDE.md §40 i18n disipline).
 *
 * Precedence:
 *   query `?locale=tr|en` > Accept-Language header > default 'tr'
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getLocaleFromRequest } from '../src/lib/api/locale';

// Minimal NextRequest stub — only the surface getLocaleFromRequest touches.
function fakeReq(opts: { locale?: string; acceptLanguage?: string | null }): import('next/server').NextRequest {
  const url = new URL('https://example.com/api/test');
  if (opts.locale !== undefined) url.searchParams.set('locale', opts.locale);
  return {
    nextUrl: url,
    headers: {
      get(name: string) {
        if (name.toLowerCase() === 'accept-language') return opts.acceptLanguage ?? null;
        return null;
      },
    },
  } as unknown as import('next/server').NextRequest;
}

describe('getLocaleFromRequest', () => {
  it('returns tr from query param when set', () => {
    const req = fakeReq({ locale: 'tr', acceptLanguage: 'en-US,en;q=0.9' });
    assert.equal(getLocaleFromRequest(req), 'tr');
  });

  it('returns en from query param when set (overrides header)', () => {
    const req = fakeReq({ locale: 'en', acceptLanguage: 'tr-TR' });
    assert.equal(getLocaleFromRequest(req), 'en');
  });

  it('ignores invalid query value and falls back to header', () => {
    const req = fakeReq({ locale: 'fr', acceptLanguage: 'en-US,en;q=0.9' });
    assert.equal(getLocaleFromRequest(req), 'en');
  });

  it('uses Accept-Language header when no query param', () => {
    const req = fakeReq({ acceptLanguage: 'en-US,en;q=0.9,tr;q=0.5' });
    assert.equal(getLocaleFromRequest(req), 'en');
  });

  it('defaults to tr when no query and no header', () => {
    const req = fakeReq({ acceptLanguage: null });
    assert.equal(getLocaleFromRequest(req), 'tr');
  });

  it('defaults to tr when Accept-Language has unsupported language', () => {
    const req = fakeReq({ acceptLanguage: 'de-DE,de;q=0.9' });
    assert.equal(getLocaleFromRequest(req), 'tr');
  });

  it('parses tr from Turkish header', () => {
    const req = fakeReq({ acceptLanguage: 'tr-TR,tr;q=0.9,en;q=0.5' });
    assert.equal(getLocaleFromRequest(req), 'tr');
  });
});
