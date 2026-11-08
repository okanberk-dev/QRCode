import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedHostsFromUrls,
  checkReplyRisk,
  registrableHost,
  replyRiskMessages,
  type ReplyRiskKind,
} from '../src/lib/reply-risk';
import { moderateReplyContent } from '../src/lib/content-safety';

function expectBlocked(text: string, kind: ReplyRiskKind, opts = {}) {
  const r = checkReplyRisk(text, opts);
  assert.equal(r.blocked, true, `should block: ${text}`);
  assert.ok(r.issues.includes(kind), `expected ${kind} for "${text}", got ${r.issues.join(',')}`);
}

function expectAllowed(text: string, opts = {}) {
  const r = checkReplyRisk(text, opts);
  assert.equal(r.blocked, false, `should allow: ${text} (got ${r.issues.join(',')})`);
}

test('unusual characters: invisible, direction-changing, look-alike and fancy letters', () => {
  expectBlocked('Teşekkürler ‮moc.live‬', 'unusual_characters');
  expectBlocked('si​ktir', 'unusual_characters');
  expectBlocked('Merhaba sаyın müşterimiz', 'unusual_characters'); // Cyrillic "а" inside a Latin word
  expectBlocked('𝐓𝐞𝐬𝐞𝐤𝐤𝐮𝐫𝐥𝐞𝐫', 'unusual_characters');
  expectBlocked('Ｍｅｒｈａｂａ', 'unusual_characters');
  expectBlocked('Z̴̡̛a̷̢͝l̵̨̛g̶̢̛o', 'unusual_characters');
  expectBlocked('Merhaba\u0007', 'unusual_characters');
});

test('profanity incl. obfuscated, spaced, masked and emoji', () => {
  expectBlocked('s i k t i r git', 'profanity');
  expectBlocked('S.İ.K.T.İ.R', 'profanity');
  expectBlocked('f*ck this', 'profanity');
  expectBlocked('s*kt*r', 'profanity');
  expectBlocked('ѕһіt happens', 'profanity');
  expectBlocked('Size 🖕', 'profanity');
  expectBlocked('o ç', 'profanity');
  expectBlocked('hassiktir', 'profanity');
});

test('insults aimed at the customer', () => {
  for (const t of [
    'Siz aptalsınız',
    'Ne kadar salak bir yorum',
    'Gerizekalı müşteri',
    'Yalancısınız, böyle bir şey olmadı',
    'Terbiyesiz insan',
    'Bu herif yine yazmış',
    'Malsın sen',
    'You are an idiot',
    "You're a liar",
    'Cahil müşteri',
  ]) {
    expectBlocked(t, 'insult');
  }
});

test('threats', () => {
  for (const t of [
    'Seni bulurum',
    'Sizi mahvedeceğiz',
    'Pişman olursunuz',
    'Evinizi biliyoruz',
    'Başınıza iş açarız',
    'Görürsün sen',
    "I'll kill you",
    'We know where you live',
    'You will regret this',
  ]) {
    expectBlocked(t, 'threat');
  }
});

test('legal intimidation of the customer', () => {
  for (const t of [
    'Hakkınızda suç duyurusunda bulunacağız.',
    'Sizi mahkemeye vereceğiz.',
    'Avukatımız sizinle iletişime geçecek.',
    'Sizden tazminat talep edeceğiz.',
    'Sizi şikayet edeceğiz.',
    'We will sue you.',
    'See you in court.',
  ]) {
    expectBlocked(t, 'legal_intimidation');
  }
});

test('hate and discrimination', () => {
  expectBlocked('Zenci müşteriler', 'hate');
  expectBlocked('Suriyeliler giremez', 'hate');
  expectBlocked('pis arap', 'hate');
});

test('review pressure: delete / change the review, or something in return', () => {
  for (const t of [
    'Yorumunuzu silmenizi rica ederiz.',
    'Lütfen yorumunuzu kaldırın.',
    'Yorumunuzu silerseniz size indirim yapalım.',
    'Puanınızı güncelleyebilir misiniz?',
    'Yıldızınızı yükseltin lütfen.',
    'Şikayetinizi geri çekmenizi bekliyoruz.',
    '5 yıldız verirseniz tatlı ikram ederiz.',
    'Yorum karşılığında %20 indirim.',
    'Please remove your review.',
    'Could you update your rating?',
    'Leave us 5 stars and get a free coffee.',
  ]) {
    expectBlocked(t, 'review_pressure');
  }
});

test('personal and financial data', () => {
  expectBlocked('TC kimlik numaranız 10000000146 olarak kayıtlı.', 'personal_data');
  expectBlocked('Kart: 4111 1111 1111 1111', 'personal_data');
  expectBlocked('IBAN: TR33 0006 1005 1978 6457 8413 26', 'personal_data');
});

test('links: only the business’s own saved hosts', () => {
  const allowedHosts = allowedHostsFromUrls([
    'https://www.lezzetevi.com.tr',
    'https://search.google.com/local/writereview?placeid=abc',
    null,
    'not a url',
  ]);
  assert.deepEqual(allowedHosts.sort(), ['google.com', 'lezzetevi.com.tr']);

  expectAllowed('Menümüz: https://www.lezzetevi.com.tr/menu', { allowedHosts });
  expectAllowed('Bize Google’dan ulaşın: https://maps.google.com/x', { allowedHosts });
  expectAllowed('Menü linki: buaze.com/menu/lezzet-evi', { allowedHosts });
  expectAllowed('Bize info@lezzetevi.com.tr adresinden yazın.', { allowedHosts });

  expectBlocked('Detaylar: bit.ly/3xYz', 'link', { allowedHosts });
  expectBlocked('www.kampanya-firsat.com adresine girin', 'link', { allowedHosts });
  expectBlocked('https://lezzetevi.com.tr@evil.example/login', 'link', { allowedHosts });
  expectBlocked('http://192.168.1.10/odeme', 'link', { allowedHosts });
  expectBlocked('kazan[.]com', 'link', { allowedHosts });
  expectBlocked('t.co/abc', 'link', { allowedHosts });

  const preview = checkReplyRisk('Detaylar: bit.ly/3xYz', { linksAsWarning: true });
  assert.equal(preview.blocked, false);
  assert.deepEqual(preview.warnings, ['link']);
});

test('markup / script injection', () => {
  expectBlocked('<script>alert(1)</script>', 'markup');
  expectBlocked('<a href="x">tıkla</a>', 'markup');
  expectBlocked('javascript:alert(1)', 'markup');
});

test('everyday replies pass', () => {
  for (const t of [
    'Merhaba Ayşe Hanım, yaşadığınız deneyim için çok üzgünüz. Mutfak ekibimizle konuştuk ve bekleme süresini kısaltmak için yeni bir düzen kurduk.',
    'Sık sık geldiğiniz için teşekkürler, sizi tekrar ağırlamak isteriz.',
    'Biraz sıkıntı yaşadık, özür dileriz.',
    '5 yıldız verdiğiniz için çok teşekkür ederiz!',
    'Yorumunuzu dikkate alarak menümüzü güncelledik.',
    'Yorum ve önerilerinizi bizimle paylaşmaktan çekinmeyin.',
    'Sizi tekrar davet etmek isteriz.',
    'Gavurdağı salatamızı da denemenizi öneririz.',
    'Yalancı dolmamız artık her gün taze.',
    'Bok choy ile hazırlanan yeni tabağımızı deneyin.',
    'Thanks for the 5-star review!',
    "We'll find you a better table next time.",
    'Bizi 0532 123 45 67 numarasından arayabilirsiniz.',
    'Siparişiniz 14.30 itibarıyla hazırlandı.',
    'Kahve 85,50 TL, tatlı 120 TL.',
    'Bir dahaki gelişinizde tatlı ikramımızdır.',
    'Puanımızı yükseltmek için çalışıyoruz.',
    'Thank you for your feedback, we have shared it with the kitchen team.',
    'Rezervasyon için +90 212 555 44 33 numarasını arayabilirsiniz.',
    'Yorumunuz için teşekkürler, tekrar gelirseniz sizi ağırlamaktan mutluluk duyarız.',
    'Değerlendirmeniz bizim için çok değerli 🙏❤️👨‍👩‍👧',
    'Got it, thank you!',
    'Sizi bekletmeden siparişinizi hazırladık.',
    'Adresinizi öğrenebilir miyiz? Siparişi yeniden gönderelim.',
    'İade politikamız gereği tutar 3 iş günü içinde hesabınıza geçecek.',
  ]) {
    expectAllowed(t);
  }
});

test('registrableHost keeps country second-level domains', () => {
  assert.equal(registrableHost('www.lezzet.com.tr'), 'lezzet.com.tr');
  assert.equal(registrableHost('search.google.com'), 'google.com');
  assert.equal(registrableHost('buaze.com'), 'buaze.com');
});

test('messages exist for every issue in both languages', () => {
  const all: ReplyRiskKind[] = [
    'unusual_characters', 'profanity', 'insult', 'threat', 'legal_intimidation',
    'hate', 'review_pressure', 'personal_data', 'link', 'markup',
  ];
  assert.equal(replyRiskMessages(all, 'tr').length, all.length);
  assert.equal(replyRiskMessages(all, 'en').length, all.length);
});

test('moderateReplyContent applies the deterministic gate without OPENAI_API_KEY', async () => {
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const threat = await moderateReplyContent('Sizi mahkemeye vereceğiz.');
    assert.equal(threat.blocked, true);
    assert.equal(threat.reason, 'legal_intimidation');
    const link = await moderateReplyContent('Detaylar: bit.ly/x', { allowedHosts: [] });
    assert.equal(link.blocked, true);
    assert.equal(link.reason, 'link');
    const ok = await moderateReplyContent('Geri bildiriminiz için teşekkür ederiz.');
    assert.equal(ok.blocked, false);
  } finally {
    if (key !== undefined) process.env.OPENAI_API_KEY = key;
  }
});
