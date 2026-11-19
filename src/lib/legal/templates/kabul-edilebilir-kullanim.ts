/**
 * Kabul Edilebilir Kullanım Politikası (AUP — Acceptable Use Policy).
 *
 * Yasaklı içerik, sahte yorum, bot kullanımı, otomatik scraping, telif
 * ihlali, müstehcen / terör / nefret içeriği vs. yasaklarını listeler.
 * Kullanım Şartları'nın eki niteliğindedir; ihlal halinde derhal fesih
 * + içerik kaldırma yetkisi tanır.
 *
 * Buaze'yi 5651 sayılı İnternet Kanunu m. 8 sorumluluğundan + üçüncü
 * taraf telif/kişilik hakkı taleplerinden korur. Ayrıca Türk Ticaret
 * Kanunu m. 55 (haksız rekabet — sahte yorum) çerçevesinde işletme
 * üzerine doğacak riski Buaze'den kullanıcıya transfer eder.
 */

export const KABUL_EDILEBILIR_KULLANIM_TR = {
  title: 'Kabul Edilebilir Kullanım Politikası',
  description:
    '{{COMPANY_NAME}} platformunda yasaklı kullanımlar, içerik yükümlülükleri ve ihlal halinde uygulanacak yaptırımlar.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Kapsam

Bu politika, {{COMPANY_NAME}} ("Buaze") platformunu kullanan tüm gerçek ve tüzel kişiler için bağlayıcıdır. Kullanım Şartları'nın **ayrılmaz parçası**dır; bu politikaya aykırı her davranış aynı zamanda Kullanım Şartları'nın da ihlali sayılır.

## 2. Yasaklı içerikler

Aşağıdaki içeriklerin platformda paylaşılması, yüklenmesi veya iletilmesi **kesinlikle yasaktır**:

- **Sahte yorum / sahte değerlendirme** — Hizmeti almamış kişiler adına yorum yazma, ücret karşılığı pozitif yorum üretimi, rakip işletme aleyhine yanıltıcı içerik (TTK m. 55 haksız rekabet).
- **Yasal mevzuata aykırı içerik** — 5237 sayılı Türk Ceza Kanunu, 5651 sayılı Kanun ve 6112 sayılı Kanun kapsamına giren içerikler.
- **Telif veya kişilik hakkı ihlali** — Üçüncü kişilerin fikri mülkiyetini, ses/görüntü kayıt haklarını, marka haklarını ihlal eden içerikler.
- **Müstehcen / pornografik içerik**, çocuk istismarı (TCK m. 226).
- **Şiddet, terör veya nefret söylemi** — Belirli grup/kimliklere yönelik tehdit, taciz veya ayrımcılık.
- **Yanıltıcı / aldatıcı bilgi** — Sahte kimlik, hizmet sahteciliği, tıbbi yanlış bilgi vb.
- **Spam, zincir mesaj, reklam yığını** — Platform kullanım amacı dışında promosyon.
- **Zararlı yazılım / kötü amaçlı kod** — Virüs, trojan, exploit içeren dosya/link.
- **Kişisel verilerin hukuksuz paylaşımı** — Üçüncü kişilerin rızası olmaksızın kimlik, iletişim, sağlık vb. bilgileri ifşa etmek.

## 3. Yasaklı kullanım davranışları

- **Otomatik araç / bot kullanımı** — Selenium, scraper, headless browser ile platforma yetkisiz erişim veya veri çekimi.
- **Tersine mühendislik / exploit denemesi** — Platform yazılımının lisanssız kopyalanması, decompile edilmesi, güvenlik açığı sömürülmesi.
- **Yetki sınırlarını aşma** — Başka kullanıcının hesabına yetkisiz erişim, oturum çalma, ayrıcalık yükseltme.
- **DoS / DDoS girişimi** — Platform altyapısına aşırı yük bindirerek erişilebilirliği bozma.
- **API kötüye kullanımı** — Belgelenmiş rate limit'leri aşma, dokümante edilmemiş endpoint'lere zorla istek atma.
- **Yorum yönlendirme manipülasyonu** — Müşteriye yıldız zorlama, yorum metnini dayatma, müşteriyi belirli platforma kandırma. Buaze akışı **review-gating yapmaz**; bu akışı düzenleyici motorla manipüle etmek yasaktır (Google Politika ihlali ayrıca rezervlidir).
- **Kara para aklama / dolandırıcılık** — Sahte sipariş, kart manipülasyonu, hayalî işletme açma.

## 4. Çocuk koruması

Platform 18 yaş altı kullanıcılara yönelik değildir. 18 yaşından küçük olduğunu fark ettiğimiz hesaplar derhal kapatılır ve toplanan veriler silinir. Müşteri formuna 18 yaş altı kişi yorum bırakırsa, hukuki temsilcinin onayı aranır.

## 5. İhlal halinde yaptırım

Bu politikaya aykırı davranış tespit edildiğinde {{COMPANY_NAME}} aşağıdaki yaptırımları **ön bildirimsiz** uygulayabilir:

- İlgili içeriğin **kaldırılması** veya gizlenmesi,
- Hesabın **askıya alınması** veya **derhal feshi** (Kullanım Şartları m. 8),
- Ödenen abonelik bedelinin iade edilmemesi,
- Yetkili kamu kurumlarına bildirimde bulunulması (5651 m. 8/13 + TCK ihlali),
- Üçüncü kişi taleplerinin kullanıcıya rücu edilmesi.

### 5.1 Sahte yorum / review-gating manipülasyonu — özel yaptırım

Sahte yorum üretimi, ücret karşılığı yorum, yıldız zorlama veya Buaze yönlendirme motorunu hile ile review-gating'e dönüştürme tespit edildiğinde otomatik olarak:

- Hesap derhal feshedilir,
- 3 (üç) ay süreyle aynı işletme/yönetici Buaze platformuna **yeniden kayıt yasağı** uygulanır,
- Üretilen sahte yorumlar arşivlenir ve Google + ilgili 3. parti platformlara teknik delille bildirilir (Google Ads Policy m. "Fake Reviews"),
- Tüketici aldatması nedeniyle açılabilecek davalarda Buaze kanıt sunma hakkını saklı tutar.

### 5.2 KVKK / telif / kanun ihlali — yargısız fesih

KVKK ihlali (yetkisiz veri yükleme, 3. kişi PII paylaşımı), telif hakkı ihlali (markaya/eserlere yetkisiz kullanım) veya 5651 / TCK kapsamına giren içerik tespit edilirse Buaze, **0 (sıfır) ihtar süresi ile** hesabı askıya alır veya feshederek erişimi keser. Yetkili merciler tarafından kararlaştırılan içerik kaldırma talepleri en geç 4 saat içinde uygulanır.

### 5.3 Tekrarlı ihlal — 3-strike kuralı

Aynı kullanıcı 90 (doksan) gün içinde **3 (üç) ayrı uyarı** alırsa, Buaze 4. ihlalde herhangi bir ek değerlendirme yapmaksızın hesabı **kalıcı olarak fesheder**. Kalıcı fesih sonrası tüm ödenmiş ücretler Buaze'de kalır.

Buaze, ihlalden dolayı **doğrudan veya dolaylı zarar görmesi** halinde tazminat hakkını saklı tutar. Kullanıcı, ihlal sebebiyle Buaze aleyhine açılan davalarda Buaze'yi **savunma maliyeti dahil** zararsız tutmayı taahhüt eder (indemnity).

### 5.4 Müşterilere gönderilen yanıtlar

Kullanıcının Buaze üzerinden müşterilere gönderdiği her yanıtı, e-postayı ve Google yorum yanıtını **kullanıcı kendisi yazar ve gönderir**. Buaze bu içerikler bakımından 5651 sayılı Kanun m. 5 uyarınca **yer sağlayıcıdır**: içeriği oluşturmaz, değiştirmez, onaylamaz ve önceden denetlemekle yükümlü değildir; hukuka aykırı içerikten haberdar edildiğinde içeriği erişime kapatır.

- İçerikten doğan **hukuki, idari ve cezai sorumluluk yalnızca kullanıcıya aittir** (başta 5237 sayılı TCK m. 106 tehdit, m. 125 hakaret, m. 216 halkı kin ve düşmanlığa tahrik; 6698 sayılı KVKK ve 6098 sayılı Türk Borçlar Kanunu).
- Buaze'nin gönderim öncesi uyguladığı otomatik kontroller (küfür, hakaret, tehdit, nefret söylemi, kişisel veri, yanıltıcı link ve olağan dışı karakter filtresi) yalnızca bir güvenlik önlemidir; bir içeriğin filtreden geçmesi onun hukuka uygun olduğu anlamına gelmez ve sorumluluğu Buaze'ye geçirmez.
- Kullanıcı, her gönderimde bu sorumluluğu ayrıca onaylar. Bu içerikler nedeniyle üçüncü kişilerin Buaze'ye yönelttiği her türlü talep, ceza ve masraftan kullanıcı sorumludur ve Buaze'yi zararsız tutar (5.3).
- Buaze, şikâyet veya resmî talep halinde ilgili içeriği ve gönderim kayıtlarını saklar, gerektiğinde yetkili mercilere iletir ve hesabı askıya alabilir.

## 6. İhbar ve şikâyet mekanizması

Bu politikaya aykırı içerik veya davranış tespit ederseniz:

- {{LEGAL_CONTACT_EMAIL}} adresine **delil + bağlantı + açıklama** ile ihbar gönderebilirsiniz.
- Telif ihlali için "İçerik Moderasyon ve Şikâyet Politikası" akışını kullanın.
- Şikâyetler ortalama **3 iş günü** içinde değerlendirilir; içerik kaldırma, askıya alma veya ret kararı yazılı olarak iletilir.

## 7. İçeriklerin saklanması ve kanıt

Buaze, yasal yükümlülükler ve ihlal soruşturmaları kapsamında **5651 m. 5** uyarınca trafik bilgilerini 1 yıl saklar. İhlal şüphesinde içerik delil olarak alınır; gerektiğinde yetkili mercilere ibraz edilir.

## 8. Politika güncellemeleri

Bu politika önceden bildirim yapılmaksızın güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır; köklü değişiklikler kayıtlı kullanıcılara e-posta ile duyurulur. Güncelleme sonrası platforma erişim yeni şartların kabulü sayılır.`,
};

export const KABUL_EDILEBILIR_KULLANIM_EN = {
  title: 'Acceptable Use Policy',
  description:
    'Prohibited uses, content obligations and enforcement actions on the {{COMPANY_NAME}} platform.',
  effectiveLabel: 'Effective from',
  content: `## 1. Scope

This policy is binding on every individual or legal entity using the {{COMPANY_NAME}} ("Buaze") platform. It is an **integral part** of the Terms of Service; any breach also constitutes a breach of the Terms.

## 2. Prohibited content

The following content is strictly prohibited from being shared, uploaded or transmitted:

- **Fake reviews / fabricated ratings** — Reviews from people who never received the service, paid positive reviews, misleading content against competitors (Turkish Commercial Code Art. 55 unfair competition).
- **Illegal content** — Anything within the scope of Turkish Penal Code No. 5237, Internet Law No. 5651, Broadcasting Law No. 6112.
- **IP or personality-rights infringement** — Content that violates third-party intellectual property, image, or trademark rights.
- **Obscene / pornographic** content, child sexual abuse material (Penal Code Art. 226).
- **Violence, terrorism or hate speech** — Threats, harassment, discrimination targeting groups or identities.
- **Misleading or deceptive information** — Identity fraud, service fraud, medical misinformation, etc.
- **Spam, chain messages, promotional flooding** — Promotion outside the intended use of the platform.
- **Malicious software** — Files or links containing viruses, trojans or exploits.
- **Unlawful disclosure of personal data** — Sharing identity, contact, health, etc. data of third parties without consent.

## 3. Prohibited conduct

- **Automated tools / bots** — Selenium, scrapers, headless browsers used for unauthorised access or data extraction.
- **Reverse engineering / exploits** — Unlicensed copying, decompilation, exploitation of vulnerabilities.
- **Privilege escalation** — Unauthorised access to other users' accounts, session hijacking.
- **DoS / DDoS attempts** — Overloading platform infrastructure to disrupt availability.
- **API abuse** — Bypassing documented rate limits, hitting undocumented endpoints.
- **Review-flow manipulation** — Forcing star ratings, dictating review text, deceiving customers into specific platforms. Buaze does **not** review-gate; manipulating the routing engine to do so is prohibited (Google policy violations are also reserved).
- **Money laundering / fraud** — Fake orders, card manipulation, shell businesses.

## 4. Child protection

The platform is not aimed at users under 18. Accounts identified as belonging to minors are immediately closed and the data is deleted. If a person under 18 leaves a review, legal guardian consent is required.

## 5. Enforcement

When a breach is detected, {{COMPANY_NAME}} may apply the following measures **without prior notice**:

- Removal or hiding of the content,
- Suspension or **immediate termination** of the account (Terms Art. 8),
- Forfeiture of paid subscription fees,
- Reporting to competent public authorities (Internet Law Art. 8/13 + Penal Code violations),
- Recourse / chargeback of any third-party claim against the user.

### 5.1 Fake reviews / review-gating manipulation — special enforcement

When fake-review production, paid reviews, star-rating coercion or fraudulent use of Buaze's routing engine for review-gating is detected, automatically:

- The account is terminated immediately,
- The business / operator is **banned from re-registering** on Buaze for 3 (three) months,
- Fake reviews are archived and reported with technical evidence to Google + relevant third-party platforms (Google Ads Policy "Fake Reviews"),
- Buaze reserves the right to submit evidence in any consumer-deception lawsuit.

### 5.2 KVKK / IP / criminal violations — extrajudicial termination

For KVKK violations (unauthorised data uploads, sharing third-party PII), IP infringement (unauthorised brand/work use) or content falling under Internet Law No. 5651 / Penal Code, Buaze suspends or terminates the account with **0 (zero) cure period**. Authority-ordered takedowns are executed within 4 hours.

### 5.3 Repeated violations — 3-strike rule

If a user receives **3 separate warnings within 90 (ninety) days**, Buaze **permanently terminates** the account on the 4th violation without further review. All paid fees are forfeited.

Buaze reserves the right to claim compensation for damages — direct or indirect — arising from the breach. The user agrees to **indemnify and hold Buaze harmless** (including defence costs) in any third-party claim caused by the user's breach.

### 5.4 Replies sent to customers

Every reply, e-mail and Google review reply that the user sends to customers through Buaze is **written and sent by the user**. For this content Buaze is a **hosting provider** (Turkish Law No. 5651, Art. 5; EU Digital Services Act, Art. 4–6): it does not create, edit, endorse or pre-screen it, and it disables access once notified of unlawful content.

- **Civil, administrative and criminal liability for the content lies solely with the user** (including the Turkish Penal Code Art. 106 threats, Art. 125 insult, Art. 216 incitement to hatred; Personal Data Protection Law No. 6698; Code of Obligations No. 6098; and any other law that applies to the user or the recipient).
- The automatic checks Buaze runs before sending (profanity, insult, threats, hate speech, personal data, misleading links and unusual characters) are a safety measure only; content passing them is not thereby lawful and liability does not shift to Buaze.
- The user confirms this responsibility again on every send. The user indemnifies and holds Buaze harmless from any third-party claim, fine or cost arising from such content (5.3).
- On a complaint or an official request, Buaze preserves the content and sending records, discloses them to competent authorities where required and may suspend the account.

## 6. Reporting and complaints

To report content or conduct violating this policy:

- Send a notice with **evidence + link + explanation** to {{LEGAL_CONTACT_EMAIL}}.
- Use the "Content Moderation & Complaints Policy" workflow for IP infringement.
- Reports are reviewed within **3 business days** on average; the decision (removal / suspension / dismissal) is sent in writing.

## 7. Retention and evidence

Pursuant to Internet Law Art. 5, Buaze retains traffic data for 1 year for legal obligations and breach investigations. In case of suspected breach, the content is preserved as evidence and disclosed to authorities when required.

## 8. Updates

This policy may be updated without prior notice. The current version is always published here; material changes are e-mailed to registered users. Continued use after an update constitutes acceptance.`,
};
