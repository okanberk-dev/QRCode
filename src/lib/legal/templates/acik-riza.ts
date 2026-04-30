/**
 * Açık Rıza Metni — Aydınlatma metninden ayrı tutulur (KVKK Tebliği zorunluluğu).
 * Pazarlama / iletişim ile ilgili AÇIK RIZA, ETK kapsamına giren ticari elektronik
 * ileti onayı `ticari-ileti.ts` içinde ayrıca toplanır. Bu metin, KVKK m. 5/1 ve
 * m. 6/2 kapsamındaki açık rızayı belgeleyen metindir.
 */

export const ACIK_RIZA_TR = {
  title: 'Açık Rıza Metni',
  description:
    'KVKK m. 5/1 ve m. 6/2 kapsamında, açık rıza gerektiren işlemeler için verilen rızanın kapsamını belgeleyen metin.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## Beyan

6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") m. 5/1 ve m. 6/2 uyarınca; aşağıda belirtilen kişisel verilerimin, belirtilen amaçlarla ve belirtilen sürelerle, veri sorumlusu sıfatıyla {{COMPANY_NAME}} ("Buaze") tarafından işlenmesine, aktarılmasına ve saklanmasına bilgilendirilmiş ve özgür iradem ile **açık rıza** veriyorum.

## 1. Açık rıza ile işlenen veriler

- Kimlik: ad, soyad
- İletişim: e-posta, telefon
- Müşteri yorum ve memnuniyet verileri
- Pazarlama tercihleri ve etkileşim verileri (açık rıza verdiysem)
- KVKK m. 6 kapsamına giren özel nitelikli veriler bu metin kapsamında işlenmez.

## 2. Amaç

Verilerim aşağıdaki amaçlar için işlenmektedir:

- Müşteri memnuniyetinin ölçülmesi ve hizmetin iyileştirilmesi,
- İşletmeyle iletişime geçilerek yorum ve şikâyetlerin yanıtlanması,
- Ayrıca onay vermem halinde, ilgi gösterebileceğim kampanya, indirim ve duyuruların tarafıma iletilmesi.

## 3. Aktarım

Verilerim, aydınlatma metninde sayılan üçüncü kişilere (ilgili işletme, bulut altyapı sağlayıcıları, e-posta hizmet sağlayıcısı vb.) yine aydınlatma metninde belirtilen amaçlar ve KVKK m. 8 - m. 9 şartlarına uygun olarak aktarılabilir.

## 4. Süre

Açık rızam, açık biçimde geri alınana veya işleme amacı ortadan kalkana kadar geçerlidir. Sürelere ilişkin detaylar Aydınlatma Metni m. 6'da belirtilmiştir.

## 5. Rızamın geri alınması

Açık rızamı, hiçbir gerekçe göstermeksizin ve ücretsiz olarak her zaman {{KVKK_CONTACT_EMAIL}} adresine başvurarak geri alabilirim. Rıza geri alındığında, bu rızaya bağlı olarak işlenen veriler işlemden kaldırılır; ancak diğer hukuki sebeplerle işlenmesi gereken veriler ilgili mevzuat çerçevesinde saklanmaya devam edilebilir.

## 6. Bilgilendirme

Bu rıza metnini imzalamadan / onaylamadan önce KVKK Aydınlatma Metni'ni okudum ve anladım. Bu rızanın, hizmetin sunulması için zorunlu olmayan işlemlerle sınırlı olduğunu ve rıza vermesem dahi temel hizmetlerden yararlanabileceğimi biliyorum.

Yukarıdaki bilgileri okudum, anladım; kişisel verilerimin yukarıda belirtilen kapsamda işlenmesine **AÇIK RIZA veriyorum**.`,
};

export const ACIK_RIZA_EN = {
  title: 'Explicit Consent Statement',
  description:
    'Documentation of explicit consent for processing operations that require consent under KVKK Articles 5/1 and 6/2.',
  effectiveLabel: 'Effective from',
  content: `## Statement

Pursuant to Articles 5/1 and 6/2 of the Turkish Personal Data Protection Law No. 6698 ("KVKK"), I hereby give my **explicit consent** — informed and freely — to {{COMPANY_NAME}} ("Buaze"), as data controller, to process, transfer and retain the personal data described below, for the stated purposes and durations.

## 1. Data processed under explicit consent

- Identity: first name, last name
- Contact: e-mail, phone
- Customer feedback and satisfaction data
- Marketing preferences and engagement data (where consent given)
- Special-category data under KVKK Art. 6 is NOT processed under this statement.

## 2. Purpose

My data is processed for:

- Measuring customer satisfaction and improving the service,
- Allowing the business to follow up on feedback and complaints,
- If I separately opt in, sending me campaigns, offers and announcements that may be of interest.

## 3. Transfers

My data may be transferred to the third parties listed in the Privacy Notice (the relevant business, cloud infrastructure providers, e-mail service provider, etc.) for the purposes set out there and in compliance with KVKK Articles 8 and 9.

## 4. Duration

My consent remains valid until I expressly withdraw it or until the purpose of processing ceases. Detailed retention periods are set out in Section 6 of the Privacy Notice.

## 5. Withdrawing consent

I may withdraw this consent at any time, free of charge and without explanation, by contacting {{KVKK_CONTACT_EMAIL}}. Once withdrawn, data processed solely on the basis of this consent is removed; data that must be retained on other legal grounds may continue to be retained under applicable law.

## 6. Acknowledgement

Before granting / approving this consent I have read and understood the KVKK Privacy Notice. I understand that this consent covers only operations that are not strictly required for service delivery, and that I may still use the core service if I withhold consent.

I have read and understood the above; I hereby give my **EXPLICIT CONSENT** to the processing of my personal data within the scope described.`,
};
