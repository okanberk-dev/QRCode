/**
 * Platform Kullanım Sözleşmesi (SaaS Service Agreement) — Buaze ile
 * işletme (restoran sahibi / yetkili) arasındaki SaaS hizmet
 * sözleşmesi. Kullanım Şartları'ndan farkı: ödeme, hizmet seviyesi,
 * fesih, teknik destek gibi B2B konularını detaylandırır.
 *
 * Mesafeli Sözleşmeler Yönetmeliği (29188) ve TBK genel hükümleri
 * çerçevesinde hazırlanmıştır.
 */

export const KULLANIM_SOZLESMESI_TR = {
  title: 'Platform Kullanım Sözleşmesi',
  description:
    '{{COMPANY_NAME}} ile işletme (restoran / kafe / otel) arasındaki SaaS hizmet sözleşmesi: abonelik, ödeme, sorumluluklar.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Taraflar

**Hizmet veren:** {{COMPANY_NAME}} ("Buaze", "Hizmet Veren")
- Adres: {{COMPANY_ADDRESS}}
- Mersis / Vergi No: {{COMPANY_TAX_ID}}
- E-posta: {{LEGAL_CONTACT_EMAIL}}

**Hizmet alan:** Platform üzerinden kayıt olan ve aboneliği başlatan işletme ("Müşteri", "Abone").

## 2. Sözleşmenin konusu

Buaze'nin müşteriye, müşteri geri bildirim toplama, yönlendirme ve raporlama özelliklerini içeren SaaS hizmetini ve ilgili teknik desteği sunmasıdır.

## 3. Hizmet kapsamı

- QR kod üretimi ve yönetimi
- Müşteri yorum toplama akışı
- Yüksek puanlı yorumların harici platformlara yönlendirilmesi
- Düşük puanlı yorumların dahili akışta yönetimi
- Raporlama, analitik ve dışa aktarım
- Sözleşmede belirtilen abonelik planına dahil yan modüller (menu, kampanya, çoklu lokasyon vb.)

## 4. Abonelik ve ödeme

- Abonelik {{TRIAL_DAYS}} günlük ücretsiz deneme ile başlar.
- Deneme bitiminde ücretli plana geçilir; faturalandırma {{BILLING_CYCLE}} bazda yapılır.
- Mevcut planın ücreti ödeme sayfasında ve {{PRICING_PAGE_URL}} adresinde duyurulur. Buaze, fiyat değişikliğini en az 30 gün önceden bildirim koşuluyla uygulayabilir.
- Ödeme; kredi kartı, banka kartı veya {{PAYMENT_PROVIDER}} altyapısı üzerinden alınır.
- Kart bilgileri Buaze tarafında saklanmaz; ödeme altyapı sağlayıcısı tarafından PCI-DSS standardında işlenir.

## 5. Cayma ve fesih

- Tüketici sıfatı taşıyan müşteriler için 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği'nde öngörülen 14 günlük cayma hakkı, hizmetin başlangıç anından itibaren işleyebilir niteliktedir; ancak abonelik dijital içerik / hizmet niteliğinde olup, ifa başladıktan sonra cayma hakkı, kullanıcının açık onayı ile sona erebilir.
- Müşteri, dilediği zaman aboneliği fesheder; iptal kullanıcı paneli üzerinden yapılır. İptal sonrası ödenmiş dönem sonuna kadar hizmet alınmaya devam edilir; iade yapılmaz.
- Buaze, sözleşmeye aykırılık halinde 14 gün ihtar süresi sonunda fesih hakkını saklı tutar.

## 6. Hizmet seviyesi (SLA)

- Hedef erişilebilirlik: takvim ayı bazında %{{SLA_AVAILABILITY}} (planlı bakım hariç).
- Planlı bakım, mümkün olduğunca düşük yoğunluk saatlerinde ve önceden bildirimle yapılır.
- SLA ihlali halinde Buaze, etkilenen ay için orantılı kredi (sonraki dönem indirimi) önerebilir; bu krediler dışında SLA için ayrı bir tazminat kapsamı yoktur.

## 7. Veri sorumluluğu

- Buaze, müşterinin platforma yüklediği veri için **veri işleyen** sıfatına sahiptir; veri sorumlusu işletmedir.
- Buaze, KVKK m. 12 ve m. 16 yükümlülüklerini yerine getirir.
- Tarafların KVKK kapsamındaki ilişkisini düzenleyen **ayrı bir Veri İşleyici Sözleşmesi (DPA)** {{LEGAL_CONTACT_EMAIL}} adresinden talep edilebilir veya panel üzerinden imzalanabilir. DPA ile bu sözleşme arasında **veri işleme konusunda** çatışma çıktığında **DPA üstündür**; diğer tüm konularda bu Sözleşme uygulanır.

## 8. Kullanıcı içeriği ve teknik destek

- Müşteri, platforma yüklediği içeriklerden (yorum metni, görsel, müşteri verisi) hukuki olarak sorumludur.
- Teknik destek, plana göre {{SUPPORT_RESPONSE_HOURS}} saat içinde verilen ilk yanıt taahhüdüyle çalışır. Destek e-posta: {{SUPPORT_EMAIL}}.

## 9. Sınırlı sorumluluk

Buaze'nin işbu sözleşme kapsamındaki **doğrudan** sorumluluğu, ilgili olayın gerçekleştiği son **3 (üç) aylık abonelik bedeli** ile sınırlıdır. Aşağıdaki zararlar her hâlükârda Buaze sorumluluğu **dışındadır**:

- Dolaylı zarar, netice kâr kaybı, iş kesintisi, itibar kaybı,
- Üçüncü kişilerin Müşteri içeriği veya operasyonu sebebiyle ileri sürdüğü talepler,
- Müşterinin hatalı yapılandırması (yanlış platform URL, yanlış müşteri verisi, yanlış KVKK metni vb.) kaynaklı zararlar,
- Müşterinin kendi pazarlama kararlarına bağlı oluşan ticari sonuçlar.

Bu sınırlama, Türk Borçlar Kanunu m. 115 anlamında ağır kusur veya kasıt halinde uygulanmaz; bu durumlarda dahi sorumluluk tutar olarak son 12 aylık abonelik bedeli ile sınırlıdır.

## 10. Müşteri içeriği ve telif lisansı

Müşterinin platforma yüklediği tüm içerikler (yorumlar, görseller, menü verileri, marka logosu, anket soruları vb.) Müşteri'ye aittir. Müşteri, hizmetin sunulması, görüntülenmesi, raporlanması, yedeklenmesi, müşterilere iletilmesi ve istatistiksel analiz amacıyla Buaze'ye **dünya çapında, ücretsiz (royalty-free), telifsiz, alt-lisans verilebilir, hizmet süresince geri alınamaz** bir kullanım lisansı tanır. Bu lisans, anonimleştirilmiş kümülatif verinin sektörel benchmark üretiminde kullanılmasını da kapsar.

## 11. Müşteri içeriği için tazminat (indemnity)

Müşteri'nin platforma yüklediği içerikten kaynaklanan KVKK ihlali, telif/marka ihlali, kişilik hakkı ihlali, haksız rekabet veya başka herhangi bir üçüncü taraf iddiası için Buaze'ye yöneltilen tüm taleplerde Müşteri, Buaze'yi **savunma masrafları, vekalet ücreti, idari para cezaları ve tazminat tutarları dahil** olmak üzere zararsız tutmayı taahhüt eder. Buaze, savunmayı yürütme veya Müşteri'ye devretme tercihini saklı tutar.

## 12. Hizmet kalitesi denetimi (audit)

Buaze, hizmet kalitesini sağlamak ve güvenlik olaylarını soruşturmak amacıyla, Müşteri restoran verisini (yorumlar, kullanım istatistikleri, sistem logları) **anonim ve agregat** olarak inceleme yetkisine sahiptir. Kişisel veri içeren kayıtlara erişim sadece (a) Müşteri'nin yazılı talebi üzerine destek amacıyla veya (b) yasal soruşturma kapsamında yapılır. Müşteri bu denetim hakkına itiraz etmez.

## 13. Mücbir sebep

Doğal afet, salgın, savaş, kamu otoritesi kararları, internet altyapısının genel arızası, Tier 1 sağlayıcının kesintisi, alt yüklenicinin (Vultr, Anthropic, Resend vb.) hizmet kesintisi gibi taraflar dışındaki olaylar mücbir sebep sayılır; bu sürede yükümlülükler askıya alınır ve Buaze gecikmeden sorumlu tutulmaz.

## 14. Bildirim

Bu sözleşme kapsamındaki bildirimler {{LEGAL_CONTACT_EMAIL}} adresine ve müşterinin kayıtlı e-postasına yapılır; gönderildiği an tebliğ edilmiş sayılır. Müşteri e-posta adresini güncel tutmakla yükümlüdür; eski adrese yapılan bildirim geçerli sayılır.

## 15. Uyuşmazlık çözümü

Sözleşme Türk hukukuna tabidir. Tüketici sıfatı taşıyan abonelerle çıkacak uyuşmazlıklarda 6502 sayılı TKHK uyarınca Tüketici Hakem Heyeti / Tüketici Mahkemesi yetkilidir; bu hak korunur.

**Tüketici sıfatı taşımayan** abonelerle (B2B / ticari kullanıcılar) çıkacak uyuşmazlıklarda taraflar, önce 30 günlük iyiniyetli müzakere yürütür. Sonuç alınamazsa uyuşmazlık, İstanbul Tahkim Merkezi (ISTAC) Tahkim Kuralları uyarınca, tek hakemli, İstanbul'da, Türkçe yürütülecek tahkim ile çözülür. Taraflar tahkim seçimini açıkça kabul eder. Tahkim öncesi ihtiyati tedbir taleplerinde {{COMPANY_COURT_CITY}} mahkemeleri yetkilidir.

## 16. Sözleşme değişiklikleri

Buaze, fiyat haricinde sözleşme şartlarını **30 gün önceden** elektronik bildirimle değiştirebilir. Müşteri bildirim sonrası platformu kullanmaya devam ederse değişiklik kabul edilmiş sayılır; kabul etmediği takdirde abonelik dönemi sonunda fesih hakkını kullanır, ödenmiş dönem için iade yapılmaz.

## 17. Birlikte okunan belgeler

İşbu sözleşme, [Kullanım Şartları](/kullanim-sartlari), [Kabul Edilebilir Kullanım Politikası](/kabul-edilebilir-kullanim), [Veri İşleyici Sözleşmesi](/veri-isleyici-sozlesmesi), [Gizlilik Politikası](/gizlilik) ile birlikte okunur ve uygulanır. Çatışma halinde bu sözleşme, veri işleme konuları dışında, diğer belgelere üstündür.

## 18. Yürürlük

Bu sözleşme, müşterinin ödeme yapmadan önce elektronik onay vermesiyle kurulur ve abonelik süresince yürürlükte kalır.`,
};

export const KULLANIM_SOZLESMESI_EN = {
  title: 'Platform User Agreement',
  description:
    'SaaS service agreement between {{COMPANY_NAME}} and the business (restaurant / café / hotel): subscription, payment, responsibilities.',
  effectiveLabel: 'Effective from',
  content: `## 1. Parties

**Service provider:** {{COMPANY_NAME}} ("Buaze", "Provider")
- Address: {{COMPANY_ADDRESS}}
- Tax / registration number: {{COMPANY_TAX_ID}}
- E-mail: {{LEGAL_CONTACT_EMAIL}}

**Customer:** The business that registers and starts a subscription on the Platform ("Customer", "Subscriber").

## 2. Subject matter

Buaze provides the Customer with a SaaS service for collecting, redirecting and reporting customer feedback, plus related technical support.

## 3. Scope

- QR code generation and management
- Customer review collection flow
- Redirection of high-rated reviews to external platforms
- Internal handling of low-rated reviews
- Reporting, analytics and export
- Add-on modules included in the chosen plan (menu, campaigns, multi-location, etc.)

## 4. Subscription and payment

- The subscription starts with a {{TRIAL_DAYS}}-day free trial.
- After the trial, the Customer is moved to the paid plan; billing is {{BILLING_CYCLE}}.
- Pricing is published on the checkout page and at {{PRICING_PAGE_URL}}. Buaze may amend pricing with at least 30 days' prior notice.
- Payments are taken via credit card, debit card or {{PAYMENT_PROVIDER}}.
- Card data is not stored by Buaze; it is processed by the payment provider in line with PCI-DSS.

## 5. Withdrawal and termination

- Where the Customer is a consumer, the 14-day right of withdrawal under Turkish Law on the Protection of Consumers No. 6502 may apply; however, since the subscription is a digital service, the right of withdrawal may end after performance starts, subject to the user's explicit acknowledgement.
- The Customer may cancel the subscription at any time via the user panel. After cancellation, the service continues until the end of the paid period; no refund is issued.
- Buaze reserves the right to terminate the agreement after a 14-day cure notice in case of breach.

## 6. Service levels (SLA)

- Target availability: {{SLA_AVAILABILITY}}% per calendar month (excluding scheduled maintenance).
- Scheduled maintenance is performed during off-peak hours with prior notice.
- In case of SLA breach, Buaze may offer a proportional credit (discount on the next period); no further SLA-related compensation is available.

## 7. Data responsibility

- Buaze acts as **data processor** for data uploaded by the Customer; the Customer is the data controller.
- Buaze fulfils its KVKK Articles 12 and 16 obligations.
- A separate **Data Processing Agreement (DPA)** governs the parties' KVKK-related relationship; it can be requested via {{LEGAL_CONTACT_EMAIL}} or signed via the panel. In case of conflict between this Agreement and the DPA on **data processing matters**, the **DPA prevails**; on all other matters this Agreement applies.

## 8. User content and support

- The Customer is legally responsible for content uploaded to the Platform (review text, images, customer data).
- Support is provided by Buaze with a first-response commitment of {{SUPPORT_RESPONSE_HOURS}} hours, depending on plan. Support e-mail: {{SUPPORT_EMAIL}}.

## 9. Limitation of liability

Buaze's **direct** liability under this agreement is limited to the subscription fees paid in the **3 (three) months** preceding the relevant event. The following damages are in any case **excluded** from Buaze's liability:

- Indirect damages, lost profits, business interruption, loss of reputation,
- Third-party claims arising from Customer content or operations,
- Damages caused by Customer misconfiguration (wrong platform URLs, wrong customer data, wrong KVKK text, etc.),
- Commercial outcomes tied to Customer's own marketing decisions.

This cap does not apply in cases of gross negligence or wilful misconduct under Turkish Code of Obligations Art. 115; even then, liability is capped at the last 12 months of subscription fees.

## 10. Customer content and IP licence

All content uploaded to the platform by the Customer (reviews, images, menu data, brand logo, survey questions, etc.) belongs to the Customer. The Customer grants Buaze a **worldwide, royalty-free, sub-licensable, irrevocable for the service term** right to use, host, display, distribute to customers, back up, report on and statistically analyse such content for service delivery. The licence also covers the use of anonymised, aggregated data for sector benchmarks.

## 11. Customer indemnification

For any third-party claim against Buaze arising from Customer content — including KVKK violations, IP / trademark infringement, personality-rights infringement, unfair competition or any other claim — the Customer agrees to **defend, indemnify and hold Buaze harmless** including legal fees, attorney costs, administrative fines and damages. Buaze reserves the right to control the defence or delegate it to the Customer.

## 12. Service quality audit

Buaze may inspect Customer restaurant data (reviews, usage stats, system logs) on an **anonymised, aggregated** basis to ensure service quality and investigate security incidents. Access to records containing personal data only occurs (a) at the Customer's written request for support, or (b) under lawful investigation. The Customer does not object to this audit right.

## 13. Force majeure

Natural disasters, pandemics, war, public authority decisions, large-scale internet outages, Tier 1 provider failures, sub-processor outages (Vultr, Anthropic, Resend, etc.) and similar events outside the parties' control are deemed force majeure; obligations are suspended for their duration and Buaze is not liable for delays.

## 14. Notices

Notices under this agreement are sent to {{LEGAL_CONTACT_EMAIL}} and to the Customer's registered e-mail; they are deemed delivered when sent. The Customer must keep the e-mail address current; notice to a stale address remains valid.

## 15. Disputes

This agreement is governed by Turkish law. For subscribers acting as consumers, Turkish Consumer Protection Law No. 6502 (Consumer Arbitration Committee / Consumer Courts) applies and is preserved.

For **non-consumer** (B2B / commercial) subscribers, the parties shall first negotiate in good faith for 30 days. If no resolution is reached, the dispute shall be finally settled under the Rules of the Istanbul Arbitration Centre (ISTAC) by a sole arbitrator, seated in Istanbul, in Turkish. The parties expressly accept arbitration. Pre-arbitral injunctions remain subject to the courts of {{COMPANY_COURT_CITY}}.

## 16. Changes to the agreement

Buaze may amend non-pricing terms with **30 days' prior** electronic notice. Continued use of the platform after notice constitutes acceptance; otherwise the Customer may terminate at the end of the billing period — no refund is issued for the paid period.

## 17. Documents read together

This agreement is read together with the [Terms of Service](/kullanim-sartlari), [Acceptable Use Policy](/kabul-edilebilir-kullanim), [Data Processing Agreement](/veri-isleyici-sozlesmesi) and [Privacy Policy](/gizlilik). In case of conflict, this agreement prevails over the others except on data-processing matters.

## 18. Effect

This agreement enters into force when the Customer gives electronic approval before payment and remains in force throughout the subscription period.`,
};
