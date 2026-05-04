import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getQuickReplyTemplate,
  listQuickReplyTemplates,
} from '../src/lib/quick-reply-templates';

test('listQuickReplyTemplates: 4 template TR labels', () => {
  const list = listQuickReplyTemplates('tr');
  assert.equal(list.length, 4);
  assert.deepEqual(list.map((t) => t.key), [
    'positive_thanks',
    'low_rating_apology',
    'complaint_callback',
    'birthday_thanks',
  ]);
  assert.equal(list[0].label, 'Pozitif yorum teşekkürü');
  assert.equal(list[0].tone, 'warm');
});

test('listQuickReplyTemplates: 4 template EN labels', () => {
  const list = listQuickReplyTemplates('en');
  assert.equal(list[1].label, 'Low rating apology');
  assert.equal(list[1].tone, 'apologetic');
});

test('getQuickReplyTemplate: positive_thanks TR placeholder substitute', () => {
  const body = getQuickReplyTemplate('positive_thanks', 'tr', {
    customerName: 'Ayşe Demir',
    restaurantName: 'Kadıköy Bistro',
    hasKvkkConsent: true,
  });
  assert.match(body, /Merhaba Ayşe Demir/);
  assert.match(body, /Kadıköy Bistro ekibi/);
  assert.ok(!body.includes('${'));
});

test('getQuickReplyTemplate: KVKK consent false → "Müşteri" fallback', () => {
  const body = getQuickReplyTemplate('low_rating_apology', 'tr', {
    customerName: 'Mehmet Kaya',
    restaurantName: 'Restoran',
    hasKvkkConsent: false,
  });
  assert.match(body, /Sayın Müşteri/);
  assert.ok(!body.includes('Mehmet'));
});

test('getQuickReplyTemplate: customerName null → fallback', () => {
  const body = getQuickReplyTemplate('birthday_thanks', 'tr', {
    customerName: null,
    restaurantName: 'Restoran',
  });
  assert.match(body, /^Müşteri/);
});

test('getQuickReplyTemplate: EN locale + restaurantName empty fallback "Our team"', () => {
  const body = getQuickReplyTemplate('complaint_callback', 'en', {
    customerName: 'John Smith',
    restaurantName: '',
    hasKvkkConsent: true,
  });
  assert.match(body, /John Smith/);
  assert.match(body, /We at Our team/);
});
