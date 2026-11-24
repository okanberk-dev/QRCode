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

Soru, talep ve şikâyetlerinizi {{KVKK_CONTACT_EMAIL}} adresine iletebilirsiniz.

## 10. Veri Sorumlusu (Controller) ve Veri İşleyen (Processor)

KVKK m. 3(ç) ve m. 12 kapsamında Buaze, kullanım senaryosuna göre **iki farklı sıfat** taşır:

**Buaze müşterisi olan işletmenin son müşterileri (geri bildirim, yorum, kampanya alıcıları) için:** Veri sorumlusu **işletmedir**; Buaze yalnızca işletmenin talimatları doğrultusunda veri işleyen sıfatıyla hareket eder. İşletme, son müşteriye karşı KVKK m. 10 aydınlatma yükümlülüğünü kendi adına yerine getirir.

**Buaze hesabı olan işletme sahipleri (panel kullanıcıları) için:** Veri sorumlusu **Buaze**'dir. Buaze, ödeme, kullanıcı yönetimi ve hizmet sunumu için panel kullanıcılarının verilerini doğrudan işler.

Bu ayrım, GDPR Art. 4(7) "controller" ve Art. 4(8) "processor" tanımlarıyla paraleldir; Avrupa Birliği'nde mukim son müşterilerle çalışan işletmeler için ayrı bir veri işleyici sözleşmesi (DPA) imzalanır.

## 11. Google kullanıcı verisi (Google İşletme Profili bağlantısı)

İsterseniz Google hesabınızı Buaze'ye bağlayarak Google İşletme Profili yorumlarınızı panelde görüntüleyebilir, yanıtlayabilir ve kendi web sitenizdeki Buaze yorum widget'ında gösterebilirsiniz. Bağlantı yalnızca siz başlattığınızda kurulur ve ayrı bir Google izin ekranıyla onayınıza sunulur. Bu özellik şimdilik yalnızca erişimi açılmış hesaplarda kullanılabilir.

**Eriştiğimiz veriler:** Yalnızca Google İşletme Profili yönetim yetkisi (https://www.googleapis.com/auth/business.manage) kapsamında; Google hesabınıza bağlı işletme hesapları ve konumları, konumlarınızın ortalama puanı ve toplam yorum sayısı, yorumlar (yorum kimliği, yorumu yazanın Google'daki görünen adı ve profil fotoğrafı bağlantısı, yıldız puanı, yorum metni, oluşturulma ve güncellenme zamanı) ile bu yorumlara verdiğiniz yanıtlar.

**Nasıl kullanırız:** Yalnızca yorumlarınızı panelde göstermek, yorum widget'ını sitenize eklediğinizde orada göstermek, yanıt taslağı hazırlamanıza yardımcı olmak ve sizin onayınızla yazdığınız yanıtı Google'a iletmek için. Yorum metinlerini değiştirmeyiz. Yanıt, siz gönder düğmesine basmadan Google'a gönderilmez.

**Paylaşım:** Google kullanıcı verisini satmayız, reklam veya profilleme amacıyla kullanmayız ve üçüncü taraflara aktarmayız. Yorum widget'ı, Google'da zaten herkese açık olan yorumlarınızı yalnızca siz siteye eklediğinizde gösterir. Yapay zekâ ile yanıt taslağı hazırlanırken yorum metni, taslağı üreten hizmet sağlayıcıya yalnızca o istek için iletilir.

**Saklama ve güvenlik:** Erişim ve yenileme anahtarlarınız şifrelenmiş olarak (AES-256-GCM) ve hangi Google uygulama kimliğiyle alındıklarıyla birlikte saklanır. Widget ve panel için yalnızca yukarıda sayılan yorum alanlarının son kopyasını sunucumuzda önbellekte tutarız; bu kopya 6–12 saatte bir (ya da siz panelden yenilediğinizde) Google'dan yenilenir; panel için en yeni 2.000 yoruma kadar, herkese açık widget için en yeni 100 yorum kullanılır. Yorum metni değiştirilmeden saklanır; Google'ın otomatik çevirisi yalnız gösterim ve analiz için ayrıştırılır. Ayrıca sizin için hazırlanan yanıt taslakları, toplu yanıt sırasındaki gönderimler ve gönderdiğiniz yanıtın kaydı (kim, ne zaman, hangi metin) tutulur.

**Bağlantıyı kaldırma ve silme:** Bağlantıyı panelden istediğiniz an kaldırabilirsiniz; bu durumda erişim anahtarınız Google'da iptal edilir, sistemimizden silinir ve Google'dan alınan yorum önbelleği ile yanıt taslakları da silinir. Erişimi https://myaccount.google.com/permissions adresinden kaldırırsanız bağlantı "kopuk" görünür ve yenileme durur; önbelleğin silinmesi için bağlantıyı panelden de kaldırın ya da support@buaze.com adresine yazın. Hesabınız silindiğinde bu verilerin tamamı silinir.

**Google API Hizmetleri Kullanıcı Verisi Politikası:** Buaze'nin Google API'lerinden aldığı bilgileri kullanması ve başka bir uygulamaya aktarması, Sınırlı Kullanım (Limited Use) gereklilikleri dahil olmak üzere Google API Services User Data Policy'ye (https://developers.google.com/terms/api-services-user-data-policy) uygundur.`,
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

For any questions, requests or complaints, contact us at {{KVKK_CONTACT_EMAIL}}.

## 10. Controller and Processor (GDPR Art. 4(7), Art. 4(8) and Art. 28)

Under GDPR Article 13(1)(a) and KVKK Article 3(ç) / 12, Buaze acts in **two different capacities** depending on the context:

**For the end-customers of a Buaze business operator (review feedback, campaign recipients):** the **business operator is the controller**; Buaze processes personal data only on the documented instructions of the controller, in the role of **processor** (GDPR Art. 4(8)). The controller is responsible for fulfilling the GDPR Art. 13/14 information obligation toward end-customers in its own name.

**For the business operator's own panel users (the merchant accounts who sign up for Buaze):** Buaze is the **controller** (GDPR Art. 4(7)). Buaze directly processes panel user data for billing, account management and service delivery.

A separate Data Processing Agreement (DPA) under GDPR Art. 28 is executed for business operators serving data subjects in the European Economic Area. The DPA covers sub-processor disclosure, security measures, breach notification timelines and data return / deletion at end of contract.

## 11. Google user data (Google Business Profile connection)

You can optionally connect your Google account to Buaze to view and reply to your Google Business Profile reviews in the dashboard and to show them in the Buaze review widget on your own website. The connection is created only when you start it and is presented to you on a separate Google consent screen. For now this feature is available only to accounts it has been opened for.

**Data we access:** Only within the Google Business Profile management scope (https://www.googleapis.com/auth/business.manage): the business accounts and locations linked to your Google account, your locations' average rating and total review count, the reviews (review ID, the reviewer's Google display name and profile photo link, star rating, review text, creation and update time) and the replies you have posted to those reviews.

**How we use it:** Solely to show your reviews in the dashboard, to show them in the review widget when you add it to your site, to help you prepare reply drafts, and to send the reply you have written to Google with your approval. We do not change review text. A reply is never sent to Google until you press send.

**Sharing:** We do not sell Google user data, use it for advertising or profiling, or transfer it to third parties. The review widget shows your reviews, which are already public on Google, only where you add it to your site. When an AI reply draft is prepared, the review text is sent to the service provider that generates the draft for that request only.

**Storage and security:** Your access and refresh tokens are stored encrypted (AES-256-GCM), together with the Google app ID they were issued for. For the widget and the dashboard we keep only the latest copy of the review fields listed above in a server cache; it is refreshed from Google every 6–12 hours (or when you refresh it in the dashboard); the dashboard uses up to the newest 2,000 reviews and the public widget the newest 100. Review text is stored unchanged; Google's automatic translation is only separated for display and analysis. We also keep the reply drafts prepared for you, the items of a bulk reply while they are being sent, and a record of the replies you send (who, when and which text).

**Disconnecting and deletion:** You can disconnect at any time from the dashboard; your access token is then revoked at Google and deleted from our systems, and the cached Google reviews and reply drafts are deleted too. If you remove access at https://myaccount.google.com/permissions, the connection shows as broken and refreshing stops; to delete the cache as well, also disconnect in the dashboard or write to support@buaze.com. When your account is deleted, all of this data is deleted.

**Google API Services User Data Policy:** Buaze's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.`,
};
