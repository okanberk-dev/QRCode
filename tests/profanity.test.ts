import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsProfanity } from '../src/lib/profanity';
import { moderateReplyContent } from '../src/lib/content-safety';

test('blocks swear words in supported languages', () => {
  for (const t of [
    'Siktir git buradan',
    'orospu çocuğu',
    'AMK ne biçim yorum bu',
    'Amına koyayım',
    'amina koyim',
    'şerefsiz misafir',
    'yavşak',
    'This is fucking ridiculous',
    'f.u.c.k you',
    'fuuuuck',
    'you are a b1tch',
    'Du Arschloch',
    'quel connard',
    'eres un gilipollas',
    'che cazzo',
    'сука',
    'شرموطة',
  ]) {
    assert.equal(containsProfanity(t), true, t);
  }
});

test('allows everyday words that resemble swear words', () => {
  for (const t of [
    'Sık sık geldiğiniz için teşekkürler',
    'sik sik geliyoruz',
    'Biraz sıkıntı yaşadık, özür dileriz',
    'sikinti icin kusura bakmayin',
    'Sıkıştık, masalarımız doluydu',
    'sikisik bir aksam oldu',
    'Amina Hanım, yorumunuz için teşekkürler',
    'Teknik bir sorun yaşadık',
    'Masa 4 için 5 yıldız aldık',
    'Dickens okumayı seven misafirimiz',
    'Shiitake mantarlı risotto',
    'Ankara Gölbaşı şubemiz',
    'Hesap: 14.30 itibarıyla kapatıldı',
    'Got it, thank you!',
  ]) {
    assert.equal(containsProfanity(t), false, t);
  }
});

test('moderateReplyContent blocks profanity even without OPENAI_API_KEY', async () => {
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const r = await moderateReplyContent('Siktir git, bir daha gelme.');
    assert.equal(r.blocked, true);
    assert.equal(r.reason, 'profanity');
    const ok = await moderateReplyContent('Geri bildiriminiz için teşekkür ederiz.');
    assert.equal(ok.blocked, false);
  } finally {
    if (key !== undefined) process.env.OPENAI_API_KEY = key;
  }
});
