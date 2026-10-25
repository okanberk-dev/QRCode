// g5b — form confirmation (4 formType variants) + contact-admin ops mail.
import { renderFormConfirmation } from '../../../src/lib/email/templates/form-confirmation';
import { renderContactAdmin } from '../../../src/lib/email/templates/contact-admin';
import { LONG_COMMENT, LONG_EMAIL, LONG_NAME, LONG_URL, LONG_WORD, type MailFixture } from './_env';

const TICKET = 'BUZ-4821';

const CONTACT_DETAILS = [
  { label: 'E-posta', value: 'mert@kadikoybistro.co' },
  { label: 'İşletme', value: 'Kadıköy Bistro' },
  { label: 'Konu', value: 'Demo talebi · 3 şube' },
];

const CAREER_DETAILS = [
  { label: 'Pozisyon', value: 'Müşteri Başarı Uzmanı' },
  { label: 'E-posta', value: 'elif.aydin@gmail.com' },
  { label: 'Telefon', value: '+90 532 555 12 34' },
  { label: 'CV', value: 'elif-aydin-cv-2026.pdf' },
];

const ROI_DETAILS = [
  { label: 'İşletme', value: 'Moda Sahil Kahvecisi' },
  { label: 'Aylık yorum', value: '1.240' },
  { label: 'Ortalama puan', value: '4.2 → 4.6' },
  { label: 'Aylık etki', value: '₺ 14.250' },
];

const STRESS_DETAILS = [
  { label: 'E-posta', value: LONG_EMAIL },
  { label: 'İşletme', value: LONG_NAME },
  { label: 'Bağlantı', value: LONG_URL },
  { label: 'Not', value: LONG_COMMENT },
  { label: 'Çok uzun etiket adı burada', value: '1.234.567' },
  { label: 'Kod', value: LONG_WORD },
];

const CONTACT_MESSAGE =
  'Merhaba, restoranımızda 3 şubemiz var ve QR ile yorum toplama akışını kurmak istiyoruz. Demo için uygun bir gün ayarlayabilir miyiz?\n\nGetir Yemek + Yemeksepeti entegrasyonu da bizim için kritik. Teşekkürler.';

export const FIXTURES_G5B: MailFixture[] = [
  // ── form-confirmation ────────────────────────────────────────────────
  {
    id: 'form-confirmation',
    template: 'form-confirmation',
    render: (locale) =>
      renderFormConfirmation(
        { formType: 'contact', name: 'Mert Demir', details: CONTACT_DETAILS, ticketId: TICKET },
        locale,
      ),
  },
  {
    id: 'form-confirmation:stress',
    template: 'form-confirmation',
    stress: true,
    render: (locale) =>
      renderFormConfirmation(
        { formType: 'contact', name: LONG_WORD, details: STRESS_DETAILS, ticketId: 'BUZ-9999999999-ABCDEFGHIJ' },
        locale,
      ),
  },
  {
    id: 'form-confirmation:no-details',
    template: 'form-confirmation',
    render: (locale) =>
      renderFormConfirmation({ formType: 'contact', name: 'Ayşe Kaya', ticketId: TICKET }, locale),
  },
  {
    id: 'form-confirmation:no-name',
    template: 'form-confirmation',
    render: (locale) =>
      renderFormConfirmation({ formType: 'contact', name: null, details: CONTACT_DETAILS.slice(0, 1), ticketId: TICKET }, locale),
  },
  {
    id: 'form-confirmation:career',
    template: 'form-confirmation',
    render: (locale) =>
      renderFormConfirmation(
        { formType: 'career', name: 'Elif Aydın', details: CAREER_DETAILS, ticketId: 'BUZ-2207' },
        locale,
      ),
  },
  {
    id: 'form-confirmation:career:stress',
    template: 'form-confirmation',
    stress: true,
    render: (locale) =>
      renderFormConfirmation(
        { formType: 'career', name: LONG_NAME, details: STRESS_DETAILS, ticketId: 'BUZ-2207' },
        locale,
      ),
  },
  {
    id: 'form-confirmation:roi',
    template: 'form-confirmation',
    render: (locale) =>
      renderFormConfirmation(
        { formType: 'roi', name: 'Can Yıldız', details: ROI_DETAILS, ticketId: 'BUZ-6310' },
        locale,
      ),
  },
  {
    id: 'form-confirmation:roi:stress',
    template: 'form-confirmation',
    stress: true,
    render: (locale) =>
      renderFormConfirmation(
        {
          formType: 'roi',
          name: 'Süleyman Hilmi Tanrıöver',
          details: [
            { label: 'İşletme', value: LONG_NAME },
            { label: 'Aylık yorum', value: '12.345.678' },
            { label: 'Aylık etki', value: '₺ 14.250.000,00' },
            { label: 'Rapor', value: LONG_URL },
          ],
          ticketId: 'BUZ-6310',
        },
        locale,
      ),
  },
  {
    id: 'form-confirmation:newsletter',
    template: 'form-confirmation',
    render: (locale) => renderFormConfirmation({ formType: 'newsletter', ticketId: 'BUZ-1002' }, locale),
  },
  {
    id: 'form-confirmation:newsletter:stress',
    template: 'form-confirmation',
    stress: true,
    render: (locale) =>
      renderFormConfirmation(
        { formType: 'newsletter', name: LONG_WORD, details: [{ label: 'E-posta', value: LONG_EMAIL }], ticketId: 'BUZ-1002' },
        locale,
      ),
  },

  // ── contact-admin ────────────────────────────────────────────────────
  {
    id: 'contact-admin',
    template: 'contact-admin',
    render: async (locale) =>
      renderContactAdmin(
        {
          name: 'Mert Demir',
          email: 'mert@kadikoybistro.co',
          phone: '+90 532 555 12 34',
          business: 'Kadıköy Bistro',
          message: CONTACT_MESSAGE,
          marketingConsent: true,
          sourcePath: 'buaze.com/iletisim',
        },
        locale,
      ),
  },
  {
    id: 'contact-admin:stress',
    template: 'contact-admin',
    stress: true,
    render: async (locale) =>
      renderContactAdmin(
        {
          name: `${LONG_NAME} ${LONG_WORD}`,
          email: LONG_EMAIL,
          phone: '+90 (532) 555 12 34 / dahili 4567 / +90 212 555 98 76',
          business: LONG_NAME,
          message: `${LONG_COMMENT}\n\n${LONG_URL}\n\n${LONG_WORD}`,
          marketingConsent: false,
          sourcePath: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'contact-admin:minimal',
    template: 'contact-admin',
    render: async (locale) =>
      renderContactAdmin(
        { name: 'Ayşe', email: 'ayse@example.com', message: 'Fiyatlar hakkında bilgi alabilir miyim?', marketingConsent: false },
        locale,
      ),
  },
  {
    id: 'contact-admin:html-input',
    template: 'contact-admin',
    render: async (locale) =>
      renderContactAdmin(
        {
          name: '<b>Ali</b> "Veli" & Co',
          email: 'ali+test@example.com',
          phone: '0212 555 00 00 <script>',
          business: '<img src=x onerror=alert(1)> Lokanta & Meyhane',
          message:
            '<script>alert("xss")</script>\n<a href="https://evil.example">tıkla</a> & <style>body{display:none}</style>\n\nSatır 3: https://www.buaze.com/tr/pricing?a=1&b=2',
          marketingConsent: true,
          sourcePath: '/iletisim?utm_source=a&utm_medium=<x>',
        },
        locale,
      ),
  },
  {
    id: 'contact-admin:long-message',
    template: 'contact-admin',
    render: async (locale) =>
      renderContactAdmin(
        {
          name: 'Zeynep Arslan',
          email: 'zeynep@arslanotel.com',
          phone: '+90 242 555 33 21',
          business: 'Arslan Butik Otel',
          message: Array.from({ length: 6 }, (_, i) => `${i + 1}. paragraf: ${LONG_COMMENT.split(' ').slice(0, 40).join(' ')}.`).join('\n\n'),
          marketingConsent: true,
          sourcePath: 'buaze.com/iletisim',
        },
        locale,
      ),
  },
];
