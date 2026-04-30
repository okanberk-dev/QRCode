/**
 * Kullanım Şartları (Terms of Service) — public surface'lerde
 * "kayıt olarak kabul ediyorum" tipi onay için kullanılan genel
 * şartlar. Platform kullanım sözleşmesi (kullanim-sozlesmesi.ts)
 * daha kapsamlı SaaS hizmet sözleşmesidir; bu metin son-kullanıcı
 * (müşteri / ziyaretçi) ile platform arasındaki ilişkiyi düzenler.
 */

export const KULLANIM_SARTLARI_TR = {
  title: 'Kullanım Şartları',
  description:
    '{{COMPANY_NAME}} platformunu kullanırken uyulması gereken genel kurallar ve karşılıklı yükümlülükler.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Taraflar ve kapsam

Bu Kullanım Şartları, {{COMPANY_NAME}} ("Buaze", "Platform") ile platforma erişen / kayıt olan kullanıcı ("Kullanıcı") arasında akdedilmiş kabul edilir. Platforma erişerek veya hesap oluşturarak bu şartları okuduğunuzu, anladığınızı ve bağlı olmayı kabul ettiğinizi beyan etmiş olursunuz.

## 2. Hizmetin tanımı

Buaze; restoran, kafe, otel ve benzeri işletmelerin müşterilerinden QR kod yoluyla geri bildirim toplaması, yüksek puanlı yorumların ilgili harici platformlara yönlendirilmesi ve düşük puanların dahili olarak işletilmesi için tasarlanmış bir SaaS hizmetidir.

## 3. Hesap yükümlülükleri

- Kayıt sırasında verilen bilgilerin doğru, güncel ve eksiksiz olması Kullanıcı'nın sorumluluğundadır.
- Şifre güvenliği, hesabın yetkisiz kullanılmaması ve giriş bilgilerinin gizliliğinden Kullanıcı sorumludur.
- 18 yaşın altındaki kişiler hesap oluşturamaz.

## 4. Yasaklı kullanımlar

Aşağıdaki davranışlar yasaktır ve hesabın askıya alınmasına yol açar:

- Sahte yorum üretimi, otomatik yorum gönderimi, başka kişi adına onay verme,
- Platform altyapısına yönelik DoS, scrape, exploit, reverse engineering girişimleri,
- Üçüncü kişilerin telif veya kişilik haklarını ihlal eden içerik yüklenmesi,
- Yorum yönlendirme akışını platform politikalarına aykırı şekilde manipüle etme (yıldız zorlama, yorum metni dayatma, müşteriyi belirli bir platforma kandırma vb.),
- Vergi, ticaret, tüketici, kişisel verilerin korunması ve diğer mevzuatın ihlali.

## 5. Fikri mülkiyet hakları

Platform üzerindeki tüm yazılım kodu, marka, logo, içerik ve tasarım Buaze'ye veya lisans verenlerine aittir. Kullanıcı, platformu yalnızca bu Şartlar çerçevesinde, kişisel veya işletme amaçlı kullanma hakkına sahiptir.

Kullanıcı tarafından platforma yüklenen içerik (yorum, görsel) Kullanıcı'ya aittir; ancak Kullanıcı, bu içeriğin platform tarafından hizmet sunumu amacıyla saklanması ve gerektiğinde anonimleştirilmiş haliyle agregat olarak kullanılması için Buaze'ye dünya çapında, ücretsiz, devredilebilir bir lisans verir.

## 6. Hizmet seviyesi ve değişiklik hakkı

Buaze; planlı bakım, altyapı arızası veya zorunlu güvenlik güncellemeleri sebebiyle hizmette kesinti yaşayabilir. Buaze, makul ölçüde önceden bildirim yaparak Şartları, fiyatları veya hizmet özelliklerini değiştirme hakkını saklı tutar.

## 7. Sorumluluk sınırları

Buaze, hizmetin kesintisiz veya hatasız sunulacağını garanti etmez. Buaze'nin sorumluluğu, ödenen son 12 aylık abonelik bedeli ile sınırlıdır. Dolaylı zararlardan, kâr kaybından, veri kaybından ve üçüncü kişi talepleri sonucu doğan zararlardan Buaze sorumlu tutulamaz; meğerki Türk Borçlar Kanunu m. 115 anlamında ağır kusuru veya kasıt bulunsun.

## 8. Hesabın askıya alınması veya silinmesi

Kullanıcı, hesabını dilediği zaman silebilir. Buaze, Şartlar'a aykırı davrandığını tespit ettiği hesapları önceden bildirimsiz askıya alabilir veya silebilir. Bu durumda işlenen veriler KVKK Aydınlatma Metni'nde belirtilen süreler çerçevesinde saklanmaya devam eder.

## 9. Uyuşmazlık çözümü ve yetkili mahkeme

Bu Şartlar Türk hukukuna tabidir. {{TKHK_THRESHOLD_AMOUNT}} TL altındaki tüketici uyuşmazlıkları Tüketici Hakem Heyeti'ne, üzerindekiler Tüketici Mahkemeleri'ne; tüketici sıfatı taşımayan ihtilaflar ise {{COMPANY_COURT_CITY}} mahkeme ve icra dairelerine sunulur.

## 10. Bildirim

Buaze'ye yapılacak yazılı bildirimler {{LEGAL_CONTACT_EMAIL}} adresine veya {{COMPANY_ADDRESS}} adresine yapılır. Kullanıcı'ya yapılacak bildirimler ise hesabında kayıtlı e-posta adresine gönderilir; bildirim gönderildiği an tebliğ edilmiş sayılır.`,
};

export const KULLANIM_SARTLARI_EN = {
  title: 'Terms of Service',
  description:
    'General rules and mutual obligations that apply when you use the {{COMPANY_NAME}} platform.',
  effectiveLabel: 'Effective from',
  content: `## 1. Parties and scope

These Terms of Service govern the relationship between {{COMPANY_NAME}} ("Buaze", "Platform") and any user who accesses or registers on the Platform ("User"). By accessing the Platform or creating an account you confirm that you have read, understood and agreed to be bound by these Terms.

## 2. Description of the service

Buaze is a SaaS service that allows restaurants, cafés, hotels and similar businesses to collect feedback from their customers via QR codes, redirect high-rated reviews to relevant external platforms and handle low-rated feedback internally.

## 3. Account obligations

- The User is responsible for ensuring that information provided at registration is accurate, current and complete.
- Password security, prevention of unauthorised access and confidentiality of credentials are the User's responsibility.
- Persons under 18 may not create an account.

## 4. Prohibited uses

The following are prohibited and will lead to suspension:

- Fake review generation, automated submissions, consenting on behalf of others,
- DoS, scraping, exploit or reverse engineering attempts,
- Uploading content that infringes third-party IP or personality rights,
- Manipulating the redirect flow contrary to platform policies (forcing star ratings, dictating review text, deceiving customers, etc.),
- Breach of tax, commerce, consumer, data protection or other applicable laws.

## 5. Intellectual property

All software code, trademarks, logos, content and design on the Platform belongs to Buaze or its licensors. The User is granted a limited right to use the Platform under these Terms, for personal or business purposes.

Content uploaded by the User (reviews, images) remains the User's property; however, the User grants Buaze a worldwide, royalty-free, transferable licence to store such content for the purpose of service delivery and to use it in anonymised, aggregate form when necessary.

## 6. Service levels and right to change

Buaze may experience downtime due to scheduled maintenance, infrastructure failure or mandatory security updates. Buaze reserves the right to amend the Terms, pricing or service features upon reasonable prior notice.

## 7. Liability limits

Buaze does not warrant that the service will be uninterrupted or error-free. Liability is limited to the subscription fees paid in the preceding 12 months. Buaze is not liable for indirect damages, loss of profit, loss of data or third-party claims, except for cases of gross negligence or wilful misconduct under Turkish Code of Obligations Art. 115.

## 8. Suspension and deletion

The User may delete the account at any time. Buaze may suspend or delete accounts found to be in breach of these Terms without prior notice. Processed data continues to be retained in line with the KVKK Privacy Notice.

## 9. Disputes and jurisdiction

These Terms are governed by Turkish law. Consumer disputes below {{TKHK_THRESHOLD_AMOUNT}} TRY are heard by the Consumer Arbitration Committee, those above by Consumer Courts; non-consumer disputes are submitted to the courts and execution offices of {{COMPANY_COURT_CITY}}.

## 10. Notices

Notices to Buaze should be sent to {{LEGAL_CONTACT_EMAIL}} or to {{COMPANY_ADDRESS}}. Notices to the User are sent to the e-mail address on file and are deemed delivered when sent.`,
};
