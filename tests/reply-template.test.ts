import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReplyTemplate } from '../src/lib/reply-template';

// buildReplyTemplate moved out of src/lib/scaffolding.ts (which imports
// next/server) so client bundles stay small. These pin its output.

test('TR low rating: apology with the first name', () => {
  assert.equal(
    buildReplyTemplate({ name: 'Ayşe Yılmaz', rating: 2, locale: 'tr' }),
    'Merhaba Ayşe, geri bildiriminiz için teşekkürler. Yaşadığınız deneyim için üzgünüz; ekibimiz konuyu detaylıca inceleyip kısa süre içinde sizinle iletişime geçecektir.',
  );
});

test('TR high rating and missing name fallback', () => {
  assert.equal(
    buildReplyTemplate({ name: null, rating: 5, locale: 'tr' }),
    'Merhaba Değerli, güzel yorumunuz için çok teşekkür ederiz. Sizi tekrar ağırlamak için sabırsızlanıyoruz.',
  );
});

test('EN low and high rating', () => {
  assert.equal(
    buildReplyTemplate({ name: 'John Smith', rating: 3, locale: 'en' }),
    "Hi John, thank you for sharing this. We're sorry about your experience; our team is reviewing it carefully and will reach out to you shortly.",
  );
  assert.equal(
    buildReplyTemplate({ name: null, rating: 4, locale: 'en' }),
    "Hi Valued, thank you so much for your kind feedback. We can't wait to welcome you again.",
  );
});
