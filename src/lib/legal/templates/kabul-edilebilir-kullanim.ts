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

Buaze, ihlalden dolayı **doğrudan veya dolaylı zarar görmesi** halinde tazminat hakkını saklı tutar. Kullanıcı, ihlal sebebiyle Buaze aleyhine açılan davalarda Buaze'yi **savunma maliyeti dahil** zararsız tutmayı taahhüt eder (indemnity).

## 6. İhbar ve şikâyet mekanizması

Bu politikaya aykırı içerik veya davranış tespit ederseniz:

- {{LEGAL_CONTACT_EMAIL}} adresine **delil + bağlantı + açıklama** ile ihbar gönderebilirsiniz.
- Telif ihlali için "İçerik Moderasyon ve Şikâyet Politikası" akışını kullanın.
- Şikâyetler ortalama **3 iş günü** içinde değerlendirilir; içerik kaldırma, askıya alma veya retweet kararı yazılı olarak iletilir.

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

Buaze reserves the right to claim compensation for damages — direct or indirect — arising from the breach. The user agrees to **indemnify and hold Buaze harmless** (including defence costs) in any third-party claim caused by the user's breach.

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
