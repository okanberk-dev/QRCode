/**
 * KVKK Aydınlatma Metni (Information / Clarification Notice).
 *
 * 6698 sayılı Kişisel Verilerin Korunması Kanunu m. 10 ve "Aydınlatma
 * Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında
 * Tebliğ" çerçevesinde hazırlanmış genel taslaktır. Açık rıza metni
 * (acik-riza) bu metinden ayrı tutulur — Tebliğ aydınlatma + rızanın
 * birbirine karıştırılmaması zorunluluğunu açıkça belirtir.
 *
 * NOT: Hukuken bağlayıcı değildir. Veri sorumlusu, adres, irtibat kişisi
 * gibi alanlar admin paneli üzerinden doldurulduktan sonra hukuk
 * danışmanı tarafından onaylanmadan yayına alınmamalıdır.
 *
 * Placeholder konvansiyonu: `{{KEY}}` admin paneli tarafından düz metin
 * olarak korunur — admin metni özelleştirirken doldurur. Sistem otomatik
 * substitution yapmaz; kullanıcı UI'ında olduğu gibi gösterilir.
 */

export const KVKK_AYDINLATMA_TR = {
  title: 'KVKK Aydınlatma Metni',
  description:
    'Veri sorumlusu sıfatıyla {{COMPANY_NAME}} olarak kişisel verilerinizi nasıl işlediğimize dair KVKK m.10 kapsamındaki bilgilendirme.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Veri sorumlusunun kimliği

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") m. 10 uyarınca, veri sorumlusu sıfatıyla {{COMPANY_NAME}} ("Buaze" / "Platform") tarafından hazırlanmıştır. İletişim bilgilerimiz:

- Unvan: {{COMPANY_NAME}}
- Adres: {{COMPANY_ADDRESS}}
- E-posta: {{KVKK_CONTACT_EMAIL}}
- Mersis / Vergi No: {{COMPANY_TAX_ID}}

## 2. İşlenen kişisel veri kategorileri

Platformu kullanmanıza bağlı olarak aşağıdaki kişisel veriler işlenebilir:

- Kimlik verisi: ad, soyad
- İletişim verisi: e-posta, telefon
- Müşteri işlem verisi: ziyaret tarihi, masa numarası, şube/lokasyon, puan, yorum metni
- İşlem güvenliği verisi: IP adresi, tarayıcı / cihaz bilgisi, oturum belirteçleri, zaman damgaları
- Pazarlama verisi (ayrıca açık rıza ile): iletişim tercihleri, kampanya etkileşim verileri

## 3. İşleme amaçları

Kişisel verileriniz, KVKK m. 4 ilkelerine uygun olarak aşağıdaki amaçlarla işlenir:

- Müşteri geri bildirimlerinin alınması, raporlanması ve hizmet kalitesinin iyileştirilmesi
- İşletmelerin müşterileriyle iletişim kurmasının sağlanması ve şikâyetlerin çözümlenmesi
- Hizmet sunumu için zorunlu olan platform altyapısının yönetilmesi (kullanıcı hesabı, oturum yönetimi, bildirim)
- Yasal yükümlülüklerin yerine getirilmesi (vergi, sözleşme, talep yanıtlama)
- Bilgi güvenliği süreçlerinin yürütülmesi ve kötüye kullanımın engellenmesi
- Açık rıza vermeniz halinde pazarlama, kampanya ve duyuru iletişimi

## 4. İşlemenin hukuki sebepleri (KVKK m. 5-6)

İşleme faaliyetlerimiz aşağıdaki hukuki sebeplere dayanır:

- KVKK m. 5/2-(c): Sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması
- KVKK m. 5/2-(ç): Hukuki yükümlülüğün yerine getirilmesi
- KVKK m. 5/2-(e): Bir hakkın tesisi, kullanılması veya korunması için zorunlu olması
- KVKK m. 5/2-(f): Temel hak ve özgürlüklerinize zarar vermemek kaydıyla, meşru menfaatler
- Pazarlama ve isteğe bağlı işlemler için KVKK m. 5/1 ve m. 6/2 uyarınca açık rızanız

## 5. Verilerin aktarılması

Kişisel verileriniz, aşağıdaki taraflara KVKK m. 8 ve m. 9 şartlarına uygun olarak aktarılabilir:

- Hizmet aldığınız restoran / işletme — yorum ve iletişim verileri
- Bulut altyapı sağlayıcılarımız — sunucu barındırma ve veri tabanı hizmetleri
- E-posta gönderim sağlayıcımız — bildirim ve pazarlama iletileri
- Ödeme altyapı sağlayıcısı — faturalandırma akışı (yalnız ödeme tarafı)
- Yetkili kamu kurum ve kuruluşları — hukuki yükümlülükler kapsamında

Yurt dışına aktarım, **02.06.2024 tarihli 7499 sayılı Kanun ile değişik KVKK m. 9** kapsamında belirlenen mekanizmalardan biri (yeterlilik kararı, taahhütname, bağlayıcı şirket kuralları veya açık rıza) sağlanmadan yapılmaz. Güncel altyapı sağlayıcılarımızın bulunduğu bölgeler ve uygulanan aktarım mekanizması {{KVKK_CONTACT_EMAIL}} adresinden talep üzerine paylaşılır.

## 6. Saklama süreleri

İşleme amacının ortadan kalkmasına bağlı olarak veriler, ilgili mevzuatta öngörülen azami sürelere uyulacak şekilde saklanır:

- Yorum ve geri bildirim verileri: işletme ile aktif iş ilişkisi süresince ve sonrasında {{REVIEW_RETENTION_MONTHS}} ay
- IP adresleri: {{IP_RETENTION_DAYS}} gün (ardından anonimleştirilir)
- Oturum / log kayıtları: 6 ay
- Pazarlama iletişim onayı ve ret kayıtları: ETK gereği iznin sona ermesinden sonra en az 3 yıl
- Faturalandırma kayıtları: VUK m. 253 gereği 5 yıl

Süre sonunda veriler silinir, yok edilir veya anonim hale getirilir.

## 7. Veri toplama yöntemleri

Veriler; web platformu, mobil arayüz, QR kodu üzerinden açılan geri bildirim formu, e-posta iletişimi, müşteri destek talepleri ve ödeme akışı kanallarından otomatik veya kısmen otomatik yollarla toplanır.

## 8. Haklarınız (KVKK m. 11)

KVKK m. 11 uyarınca veri sorumlusuna başvurarak;

- Kişisel verilerinizin işlenip işlenmediğini öğrenme,
- İşlenmişse buna ilişkin bilgi talep etme,
- İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,
- Yurt içi / yurt dışı aktarıldığı üçüncü kişileri bilme,
- Eksik veya yanlış işlenmişse düzeltilmesini isteme,
- KVKK m. 7'de öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,
- Düzeltme / silme / yok etme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme,
- Otomatik sistemlerle yapılan analiz sonucu aleyhinize bir sonuç çıkması durumunda buna itiraz etme,
- Kanuna aykırı işleme nedeniyle zarara uğramanız halinde tazminat talep etme

haklarına sahipsiniz.

## 9. Başvuru yolu

Haklarınızı kullanmak için "Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ" doğrultusunda;

- {{KVKK_CONTACT_EMAIL}} adresine kayıtlı elektronik posta (KEP / güvenli e-posta) ile,
- {{COMPANY_ADDRESS}} adresine ıslak imzalı dilekçe ile,

başvurabilirsiniz. Başvurularınız en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. Talebin niteliği gereği maliyet doğması halinde Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret talep edilebilir.

## 10. Güncellemeler

Bu metin, mevzuat değişiklikleri veya işleme süreçlerimizdeki güncellemeler doğrultusunda revize edilebilir. Güncel sürüm her zaman bu sayfada yayımlanır; yürürlük tarihi metnin başında belirtilir.`,
};

export const KVKK_AYDINLATMA_EN = {
  title: 'KVKK Privacy Notice',
  description:
    'How we process your personal data as the data controller {{COMPANY_NAME}} under Article 10 of Turkish KVKK Law No. 6698.',
  effectiveLabel: 'Effective from',
  content: `## 1. Data controller

This notice is prepared by {{COMPANY_NAME}} ("Buaze" / "Platform") in its capacity as data controller, pursuant to Article 10 of the Turkish Personal Data Protection Law No. 6698 ("KVKK"). Contact details:

- Entity: {{COMPANY_NAME}}
- Address: {{COMPANY_ADDRESS}}
- E-mail: {{KVKK_CONTACT_EMAIL}}
- Tax / registration number: {{COMPANY_TAX_ID}}

## 2. Categories of personal data processed

Depending on your use of the Platform, the following categories may be processed:

- Identity data: first name, last name
- Contact data: e-mail, phone
- Customer transaction data: visit date, table number, branch / location, rating, review text
- Operational security data: IP address, browser / device info, session tokens, timestamps
- Marketing data (subject to separate explicit consent): communication preferences, campaign interactions

## 3. Purposes of processing

Personal data is processed in line with KVKK Article 4 principles for:

- Collecting and reporting customer feedback and improving service quality
- Enabling the business to communicate with the customer and resolve complaints
- Operating the platform infrastructure required for service delivery
- Fulfilling legal obligations (tax, contractual, request handling)
- Maintaining information security and preventing abuse
- Marketing, campaign and announcement messaging where you have given explicit consent

## 4. Legal basis (KVKK Articles 5-6)

Processing relies on the following legal grounds:

- Art. 5/2-(c): Processing necessary for the conclusion or performance of a contract
- Art. 5/2-(ç): Compliance with a legal obligation
- Art. 5/2-(e): Establishment, exercise or protection of a right
- Art. 5/2-(f): Legitimate interests, provided that fundamental rights and freedoms are not harmed
- Art. 5/1 and 6/2: Your explicit consent, where required (e.g. marketing)

## 5. Transfers

Data may be shared with the following parties under KVKK Articles 8 and 9:

- The restaurant / business you interacted with — review and contact data
- Cloud infrastructure providers — hosting and database services
- E-mail provider — notification and marketing
- Payment processor — billing flow only
- Authorised public authorities — under legal obligations

International transfers are not made unless one of the mechanisms in **Article 9 of the KVKK as amended by Law No. 7499 (2 June 2024)** is satisfied (adequacy decision, undertaking, binding corporate rules or explicit consent). Current provider regions and the applied transfer mechanism are available on request from {{KVKK_CONTACT_EMAIL}}.

## 6. Retention periods

Data is retained no longer than necessary, in line with applicable law:

- Review and feedback data: throughout the active relationship and {{REVIEW_RETENTION_MONTHS}} months thereafter
- IP addresses: {{IP_RETENTION_DAYS}} days, then anonymised
- Session / log records: 6 months
- Marketing consent and opt-out records: at least 3 years after the consent ends, as required by ETK
- Billing records: 5 years (Turkish Tax Procedure Law Art. 253)

After the period expires, data is deleted, destroyed or anonymised.

## 7. Collection methods

Data is collected — automatically or partially automatically — through the web platform, mobile interface, the QR-code-driven feedback form, e-mail communication, support requests and the payment flow.

## 8. Your rights (KVKK Article 11)

Under Article 11 of the KVKK, you may apply to the data controller to:

- Learn whether your data is processed
- Request information if it is processed
- Learn the purpose and whether processing is in line with that purpose
- Know the third parties to whom data is transferred domestically or internationally
- Request correction of incomplete or incorrect data
- Request deletion or destruction within the conditions of KVKK Article 7
- Request that correction / deletion be communicated to recipients
- Object to results derived solely from automated analysis
- Claim compensation for harm arising from unlawful processing

## 9. How to apply

You may exercise your rights — pursuant to the Communiqué on Application Procedures — by:

- Sending registered electronic mail to {{KVKK_CONTACT_EMAIL}}
- Submitting a wet-signed petition to {{COMPANY_ADDRESS}}

Applications are answered free of charge within 30 days. A fee set by the Personal Data Protection Authority may apply if the request entails additional cost.

## 10. Updates

This notice may be revised in line with regulatory or operational changes. The latest version is always published here; the effective date appears at the top.`,
};
