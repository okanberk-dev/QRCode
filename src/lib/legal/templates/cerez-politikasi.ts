/**
 * Çerez Politikası — ePrivacy direktifi paralelinde, KVKK m. 5 ve
 * KVKK Kurulu'nun "çerez kullanımı" rehber ilkeleri uyumlu metin.
 * Zorunlu / işlevsel / analitik / pazarlama çerezleri ayrımı yapılır;
 * kullanıcı 'kabul etme' veya 'reddetme' hakkına sahip olmalıdır.
 */

export const CEREZ_POLITIKASI_TR = {
  title: 'Çerez Politikası',
  description:
    '{{COMPANY_NAME}} platformunda kullanılan çerez türleri, amaçları ve kullanıcının kontrol seçenekleri.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Çerez nedir?

Çerez (cookie), bir web sitesini ziyaret ettiğinizde tarayıcınız tarafından cihazınıza yerleştirilen küçük metin dosyasıdır. Çerezler; oturumunuzu açık tutma, dil tercihlerinizi hatırlama ve site performansını ölçme gibi amaçlarla kullanılır.

## 2. Hangi çerezleri kullanıyoruz?

### 2.1. Zorunlu (kesinlikle gerekli) çerezler

Hizmetin temel işleyişi için şarttır; reddedilemez. Örnekler:

- Oturum tanımlayıcısı ('user_token', 'admin_token') — giriş yaptığınızda hesabınızı tutan çerez.
- CSRF koruma çerezi — formların güvenliği için.
- Çerez tercih kaydı — onayınızın hatırlanması için.

Hukuki dayanak: KVKK m. 5/2-(c) sözleşmenin ifası ve m. 5/2-(f) meşru menfaat.

### 2.2. İşlevsel çerezler

Kullanım deneyimini iyileştirir; reddedilebilir. Örnekler:

- Dil tercihi
- Tema tercihi (açık / koyu mod)
- Form taslakları

Hukuki dayanak: meşru menfaat veya açık rıza.

### 2.3. Analitik çerezler

Kullanım istatistiği ve performans ölçümü için kullanılır. Örnekler:

- Sayfa görüntüleme sayıları
- Yavaş sayfa tespiti (Vercel Speed Insights, Sentry performance)

Hukuki dayanak: açık rızanız (KVKK m. 5/1) veya yeterli anonimleştirme sağlandığında meşru menfaat.

### 2.4. Pazarlama çerezleri

İlgi alanlarınıza yönelik kampanya ve içerik göstermek için kullanılır. Yalnız ayrıca **açık rıza** verirseniz çalışır.

## 3. Üçüncü taraf çerezler

Aşağıdaki üçüncü taraf hizmetler kendi çerezlerini bırakabilir:

- Vercel (altyapı + analytics)
- Sentry (hata izleme)
- {{ANALYTICS_PROVIDER}} (analitik) — eklenmesi durumunda
- Google reCAPTCHA Enterprise (bot koruması)

Bu hizmetlerin gizlilik politikalarına ilgili sağlayıcının web sitesinden ulaşabilirsiniz.

## 4. Saklama süreleri

- Oturum çerezleri: tarayıcı kapatıldığında silinir.
- Kalıcı çerezler: en fazla 12 ay (kullanım profiline göre kısalabilir).
- reCAPTCHA çerezleri: Google politikalarına göre değişir (genellikle 6 ay).

## 5. Çerez tercihlerinizi nasıl yönetirsiniz?

- Sayfa altındaki "Çerez tercihleri" bağlantısından kategori bazlı onay verebilir / kaldırabilirsiniz.
- Tarayıcı ayarlarından (Chrome, Safari, Firefox, Edge) çerezleri tamamen engelleyebilir veya silebilirsiniz.
- Zorunlu çerezleri devre dışı bırakırsanız platform çalışmayabilir.

## 6. Değişiklikler

Bu politika güncellendiğinde sayfa başındaki yürürlük tarihi değiştirilir. Önemli değişiklikleri kullanıcılarımıza ek olarak e-posta ile duyururuz.

## 7. İletişim

Çerez kullanımına ilişkin sorularınızı {{KVKK_CONTACT_EMAIL}} adresine iletebilirsiniz.`,
};

export const CEREZ_POLITIKASI_EN = {
  title: 'Cookie Policy',
  description:
    'Types of cookies used on the {{COMPANY_NAME}} platform, their purpose and how you can control them.',
  effectiveLabel: 'Effective from',
  content: `## 1. What is a cookie?

A cookie is a small text file placed on your device by your browser when you visit a website. Cookies keep you signed in, remember your preferences and measure site performance.

## 2. Which cookies do we use?

### 2.1. Strictly necessary cookies

Required for the basic operation of the service; cannot be refused. Examples:

- Session identifiers ('user_token', 'admin_token') — keep you signed in.
- CSRF protection cookies — secure form submissions.
- Cookie preference record — remembers your consent.

Legal basis: KVKK Art. 5/2-(c) performance of the contract and Art. 5/2-(f) legitimate interests.

### 2.2. Functional cookies

Improve the user experience; can be refused. Examples:

- Language preference
- Theme preference (light / dark)
- Form drafts

Legal basis: legitimate interests or explicit consent.

### 2.3. Analytics cookies

Usage statistics and performance measurement. Examples:

- Page view counts
- Slow-page detection (Vercel Speed Insights, Sentry performance)

Legal basis: your explicit consent (KVKK Art. 5/1), or legitimate interests where adequately anonymised.

### 2.4. Marketing cookies

Used to show campaigns and content tailored to your interests. They run **only** after separate explicit consent.

## 3. Third-party cookies

The following third-party services may set their own cookies:

- Vercel (infrastructure + analytics)
- Sentry (error monitoring)
- {{ANALYTICS_PROVIDER}} (analytics) — where added
- Google reCAPTCHA Enterprise (bot protection)

You can access the privacy policies of these providers from their websites.

## 4. Retention

- Session cookies: deleted when the browser closes.
- Persistent cookies: up to 12 months (may be shorter depending on usage).
- reCAPTCHA cookies: subject to Google's policies (usually 6 months).

## 5. How to manage your preferences

- Use the "Cookie preferences" link in the footer to grant / withdraw consent per category.
- Use your browser settings (Chrome, Safari, Firefox, Edge) to block or delete cookies entirely.
- Disabling strictly necessary cookies may break the platform.

## 6. Changes

When this policy changes, the effective date at the top of the page is updated. We additionally e-mail users for material changes.

## 7. Contact

For any questions about cookies, contact {{KVKK_CONTACT_EMAIL}}.`,
};
