/**
 * Platform link mapping regression tests.
 *
 * Guards the drift that let Yelp + Foursquare silently drop out of the
 * "retest all" flow: the Prisma select and the active-link filter must both
 * be derived from PROVIDER_MAP, never a hand-written column list.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROVIDER_MAP,
  providerColumnsSelect,
  collectActiveProviderLinks,
} from '../src/lib/platform-link-test';
import { checkProviderUrl, describeDomainError } from '../src/lib/integration-domains';
import { EXTERNAL_REVIEW_PROVIDERS, isExternalReviewProvider } from '../src/lib/restaurant-features';

describe('providerColumnsSelect', () => {
  it('covers every url + enabled column referenced by PROVIDER_MAP', () => {
    const select = providerColumnsSelect();
    for (const m of PROVIDER_MAP) {
      assert.equal(select[m.urlField], true, `${m.urlField} missing from select`);
      if (m.enabledField) {
        assert.equal(select[m.enabledField], true, `${m.enabledField} missing from select`);
      }
    }
  });

  it('includes yelp + foursquare (the columns the old hand-written list forgot)', () => {
    const select = providerColumnsSelect();
    assert.equal(select.yelpUrl, true);
    assert.equal(select.yelpEnabled, true);
    assert.equal(select.foursquareUrl, true);
    assert.equal(select.foursquareEnabled, true);
  });
});

describe('collectActiveProviderLinks', () => {
  const base = {
    googleReviewUrl: 'https://g.page/r/abc/review',
    googleEnabled: true,
    yelpUrl: ' https://www.yelp.com/biz/some-place ',
    yelpEnabled: true,
    foursquareUrl: 'https://foursquare.com/v/place/123',
    foursquareEnabled: false,
    instagramUrl: 'https://instagram.com/place',
    website: '',
    externalPlatformsEnabled: true,
  };

  it('returns url-set + enabled review platforms and url-set social platforms', () => {
    const active = collectActiveProviderLinks(base, isExternalReviewProvider);
    const providers = active.map((a) => a.mapping.provider);
    assert.deepEqual(providers, ['google', 'yelp', 'instagram']);
  });

  it('trims URLs before testing', () => {
    const active = collectActiveProviderLinks(base, isExternalReviewProvider);
    const yelp = active.find((a) => a.mapping.provider === 'yelp');
    assert.equal(yelp?.url, 'https://www.yelp.com/biz/some-place');
  });

  it('skips disabled review platforms even when a URL is saved', () => {
    const active = collectActiveProviderLinks(base, isExternalReviewProvider);
    assert.ok(!active.some((a) => a.mapping.provider === 'foursquare'));
  });

  it('drops every external review provider when the admin master flag is off', () => {
    const active = collectActiveProviderLinks(
      { ...base, externalPlatformsEnabled: false, foursquareEnabled: true },
      isExternalReviewProvider,
    );
    const providers = active.map((a) => a.mapping.provider);
    for (const external of EXTERNAL_REVIEW_PROVIDERS) {
      assert.ok(!providers.includes(external), `${external} should be gated`);
    }
    assert.ok(providers.includes('google'));
    assert.ok(providers.includes('instagram'));
  });

  it('treats a missing flag as enabled (legacy rows)', () => {
    const active = collectActiveProviderLinks(
      { yelpUrl: 'https://www.yelp.com/biz/x', yelpEnabled: true },
      isExternalReviewProvider,
    );
    assert.equal(active.length, 1);
  });
});

describe('checkProviderUrl — getir + yandex path heuristics', () => {
  it('flags the Getir marketplace home as a generic homepage (soft warning)', () => {
    const bare = checkProviderUrl('getir', 'https://getir.com');
    assert.equal(bare.ok, false);
    if (!bare.ok) {
      assert.equal(bare.severity, 'warning');
      assert.equal(bare.reason, 'generic_homepage');
    }
    const landing = checkProviderUrl('getir', 'https://getir.com/yemek/');
    assert.equal(landing.ok, false);
    if (!landing.ok) assert.equal(landing.reason, 'generic_homepage');
  });

  it('accepts a Getir restaurant listing', () => {
    assert.equal(
      checkProviderUrl('getir', 'https://getir.com/yemek/restoran/pizza-locale-kadikoy/').ok,
      true,
    );
    assert.equal(
      checkProviderUrl('getir', 'https://getir.com/yemek/restaurant/pizza-locale/').ok,
      true,
    );
  });

  it('flags Yandex Maps home but accepts an organisation card', () => {
    const home = checkProviderUrl('yandex', 'https://yandex.com.tr/maps');
    assert.equal(home.ok, false);
    if (!home.ok) assert.equal(home.reason, 'generic_homepage');
    assert.equal(
      checkProviderUrl('yandex', 'https://yandex.com.tr/maps/org/pizza_locale/1234567890/').ok,
      true,
    );
    assert.equal(checkProviderUrl('yandex', 'https://yandex.com/maps/-/CDxyz').ok, true);
  });

  it('still hard-rejects a wrong domain for both providers', () => {
    const r = checkProviderUrl('getir', 'https://example.com/yemek/restoran/x');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.severity, 'error');
  });
});

describe('describeDomainError', () => {
  it('appends an ellipsis when the expected-domain list is truncated', () => {
    const result = checkProviderUrl('trendyol_go', 'https://example.com/restaurant/x');
    assert.equal(result.ok, false);
    const tr = describeDomainError('trendyol_go', result, 'tr');
    assert.ok(tr.includes('…'), tr);
    const en = describeDomainError('trendyol_go', result, 'en');
    assert.ok(en.startsWith("This URL doesn't look like"), en);
  });

  it('does not append an ellipsis when three or fewer domains are listed', () => {
    const result = checkProviderUrl('yelp', 'https://example.com/biz/x');
    assert.equal(result.ok, false);
    assert.ok(!describeDomainError('yelp', result, 'en').includes('…'));
  });
});
