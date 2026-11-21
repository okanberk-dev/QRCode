// Pure string helper with no imports — safe for client and server bundles.

/**
 * Deterministic frontend AI reply generator. When a real LLM backend is
 * connected via `/api/feedback/:id/suggest-reply`, this can be replaced
 * with the server response. Until then, the UI calls this helper to
 * pre-populate the reply box.
 */
export function buildReplyTemplate(opts: {
  name: string | null;
  rating: number;
  locale: 'tr' | 'en';
}): string {
  // Operator-safe fallback. Eskiden `[Buraya somut bir cevap ekleyin.]`
  // placeholder taşıyordu; "Kullan & gönder" otomatik akışı eklenince
  // kullanıcı yanlışlıkla placeholder'ı müşteriye gönderebilir oldu.
  // Yeni metin: generic ama valid bir cevap. AI key yokken bile gönderilse
  // utanılmayacak, "ekibimiz konuyu inceleyip dönecek" tonunda.
  const { name, rating, locale } = opts;
  const firstName = (name ?? (locale === 'tr' ? 'Değerli müşterimiz' : 'Valued customer'))
    .split(' ')[0];
  if (locale === 'tr') {
    return rating >= 4
      ? `Merhaba ${firstName}, güzel yorumunuz için çok teşekkür ederiz. Sizi tekrar ağırlamak için sabırsızlanıyoruz.`
      : `Merhaba ${firstName}, geri bildiriminiz için teşekkürler. Yaşadığınız deneyim için üzgünüz; ekibimiz konuyu detaylıca inceleyip kısa süre içinde sizinle iletişime geçecektir.`;
  }
  return rating >= 4
    ? `Hi ${firstName}, thank you so much for your kind feedback. We can't wait to welcome you again.`
    : `Hi ${firstName}, thank you for sharing this. We're sorry about your experience; our team is reviewing it carefully and will reach out to you shortly.`;
}
