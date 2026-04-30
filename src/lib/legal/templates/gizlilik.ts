/**
 * Gizlilik Politikası — public-yüze çıkan, KVKK Aydınlatma Metni'nin
 * uzun ve genel hâlinden farklı olarak ürün-merkezli, daha okunabilir
 * sürüm. KVKK metinleri "veri sorumlusunun bildirimi" tonunda iken
 * gizlilik politikası "kullanıcıya hitap" tonundadır.
 */

export const GIZLILIK_TR = {
  title: 'Gizlilik Politikası',
  description:
    '{{COMPANY_NAME}} olarak topladığımız bilgileri, kullanım amaçlarımızı ve üçüncü taraf paylaşım sınırlarımızı özetleyen genel politika.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## Giriş

Bu politika, {{COMPANY_NAME}} ("Buaze", "biz") tarafından sunulan platform ve ilgili hizmetler aracılığıyla topladığımız bilgileri, bu bilgileri nasıl kullandığımızı ve hangi kapsamlarda paylaştığımızı açıklar. Politika, kullanıcılarımıza yönelik özet bir rehberdir; teknik ayrıntılar için KVKK Aydınlatma Metni'mize bakabilirsiniz.

## 1. Topladığımız bilgiler

**Kayıt sırasında:** ad, soyad, e-posta, şifre (yalnız hash olarak saklanır), işletme adı.

**Hizmet kullanımı sırasında:** IP adresi, tarayıcı türü, oturum çerezleri, performans ölçümleri.

**Müşteri formlarından:** verdiğiniz puan, opsiyonel yorum metni, isim ve iletişim (paylaşmayı seçtiyseniz).

**Pazarlama (opsiyonel):** kampanya etkileşim verileri ve iletişim tercihleri — yalnız ayrı açık rıza vermişseniz.

## 2. Bilgileri nasıl kullanırız

- Hizmetin sunulması (hesap, ödeme, e-posta bildirimi)
- Platform güvenliğinin sağlanması ve kötüye kullanımın engellenmesi
- Performans analizleri ve ürünün iyileştirilmesi
- Yasal yükümlülüklerin yerine getirilmesi
- Sizinle iletişim kurma ve destek talebi yanıtlama
- Açık rızanız varsa pazarlama iletişimi

## 3. Bilgileri kimlerle paylaşırız

- **Bulut altyapı sağlayıcılarımız:** sunucu barındırma ve veri tabanı (KVKK m. 8 koşulları sağlanır).
- **E-posta sağlayıcımız:** bildirim ve pazarlama gönderimleri.
- **Ödeme altyapısı:** yalnızca ödeme akışı verisi.
- **Yorumların paylaşıldığı işletme:** müşterinin geri bildiriminin yöneltildiği taraf.
- **Yetkili kamu kurumları:** hukuki yükümlülükler kapsamında.

Verilerinizi reklamcılık amacıyla **satmayız**.

## 4. Veri saklama

Veriler, işleme amacının ortadan kalkmasına bağlı olarak, KVKK Aydınlatma Metni'nde belirtilen sürelere uygun saklanır. IP adresleri {{IP_RETENTION_DAYS}} gün sonra anonimleştirilir.

## 5. Çerezler

Oturum, güvenlik ve analitik amaçlarla çerez kullanırız. Detaylar Çerez Politikası'nda yer alır. Tarayıcı ayarlarınızdan çerezleri her zaman kontrol edebilirsiniz.

## 6. Çocukların verileri

Buaze hizmetleri 18 yaş altı kullanıcılara yönelik değildir. 18 yaşından küçük olduğunuzu fark edersek hesabı kapatır ve toplanan verileri sileriz.

## 7. Haklarınız

KVKK m. 11 kapsamındaki haklarınızı (erişim, düzeltme, silme, itiraz, taşınabilirlik talepleri) {{KVKK_CONTACT_EMAIL}} adresine yazarak kullanabilirsiniz.

## 8. Politika güncellemeleri

Bu politika güncellendiğinde sayfa başındaki "yürürlük tarihi" değiştirilir; önemli değişiklikler için kayıtlı kullanıcılara e-posta ile bildirim gönderilir.

## 9. İletişim

Soru, talep ve şikâyetlerinizi {{KVKK_CONTACT_EMAIL}} adresine iletebilirsiniz.`,
};

export const GIZLILIK_EN = {
  title: 'Privacy Policy',
  description:
    'Summary of how {{COMPANY_NAME}} collects, uses and shares information about you when you use our platform.',
  effectiveLabel: 'Effective from',
  content: `## Introduction

This policy explains what information {{COMPANY_NAME}} ("Buaze", "we") collects through our platform and how we use and share it. This is a user-facing summary; for the full legal disclosure, see our KVKK Privacy Notice.

## 1. Information we collect

**At registration:** first name, last name, e-mail, password (stored only as a hash), business name.

**During service use:** IP address, browser type, session cookies, performance metrics.

**From customer feedback forms:** rating, optional comment text, name and contact (if you choose to share).

**Marketing (optional):** campaign interactions and contact preferences — only if you have given separate explicit consent.

## 2. How we use information

- Delivering the service (account, billing, e-mail notifications)
- Securing the platform and preventing abuse
- Performance analytics and product improvement
- Complying with legal obligations
- Communicating with you and answering support requests
- Marketing communications, where you have opted in

## 3. Who we share information with

- **Cloud infrastructure providers:** hosting and database services (KVKK Art. 8 conditions met).
- **E-mail provider:** notification and marketing delivery.
- **Payment processor:** payment flow data only.
- **The business that received your review:** the party your feedback was directed to.
- **Public authorities:** under legal obligation.

We do **not** sell your data for advertising purposes.

## 4. Retention

Data is retained no longer than necessary, in line with the periods set out in the KVKK Privacy Notice. IP addresses are anonymised after {{IP_RETENTION_DAYS}} days.

## 5. Cookies

We use cookies for session, security and analytics purposes. See our Cookie Policy for the full list. You may control cookies through your browser settings at any time.

## 6. Children's data

Buaze services are not aimed at users under 18. If we become aware that a user is under 18, we will close the account and delete the collected data.

## 7. Your rights

You can exercise your KVKK Article 11 rights (access, correction, deletion, objection, portability) by writing to {{KVKK_CONTACT_EMAIL}}.

## 8. Policy updates

When this policy changes, the "effective from" date at the top is updated; for material changes we e-mail registered users.

## 9. Contact

For any questions, requests or complaints, contact us at {{KVKK_CONTACT_EMAIL}}.`,
};
