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
- Buaze, KVKK m. 12 ve m. 16 yükümlülüklerini yerine getirir; aktarım için yazılı veri işleyici eki gerektiğinde {{LEGAL_CONTACT_EMAIL}} adresine başvurarak alınabilir.

## 8. Kullanıcı içeriği ve teknik destek

- Müşteri, platforma yüklediği içeriklerden (yorum metni, görsel, müşteri verisi) hukuki olarak sorumludur.
- Teknik destek, plana göre {{SUPPORT_RESPONSE_HOURS}} saat içinde verilen ilk yanıt taahhüdüyle çalışır. Destek e-posta: {{SUPPORT_EMAIL}}.

## 9. Sınırlı sorumluluk

Hizmetin ifası sırasında Buaze'nin doğrudan sorumluluğu, ilgili olayın gerçekleştiği son 12 aylık abonelik bedeli ile sınırlıdır. Dolaylı zarar, kâr kaybı, üçüncü taraf taleplerinden kaynaklı zarar Buaze sorumluluğu kapsamında değildir; meğerki Türk Borçlar Kanunu m. 115 anlamında ağır kusur veya kasıt mevcut olsun.

## 10. Mücbir sebep

Doğal afet, savaş, kamu otoritesi kararları, internet altyapısının genel arızası, Tier 1 sağlayıcının kesintisi gibi taraflar dışındaki olaylar, mücbir sebep sayılır; bu sürede yükümlülükler askıya alınır.

## 11. Bildirim

Bu sözleşme kapsamındaki bildirimler {{LEGAL_CONTACT_EMAIL}} adresine ve müşterinin kayıtlı e-postasına yapılır; gönderildiği an tebliğ edilmiş sayılır.

## 12. Uyuşmazlık çözümü

Sözleşme Türk hukukuna tabidir. Tüketici sıfatı taşıyan abonelerle çıkacak uyuşmazlıklarda Tüketici Hakem Heyeti / Tüketici Mahkemesi yetkilidir; diğer hâllerde {{COMPANY_COURT_CITY}} mahkeme ve icra daireleri yetkili olur.

## 13. Yürürlük

Bu sözleşme, müşterinin ödeme yapmadan önce elektronik onay vermesiyle kurulur ve sözleşme süresince yürürlükte kalır.`,
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
- Buaze fulfils its KVKK Articles 12 and 16 obligations; a written data-processing addendum can be requested via {{LEGAL_CONTACT_EMAIL}}.

## 8. User content and support

- The Customer is legally responsible for content uploaded to the Platform (review text, images, customer data).
- Support is provided by Buaze with a first-response commitment of {{SUPPORT_RESPONSE_HOURS}} hours, depending on plan. Support e-mail: {{SUPPORT_EMAIL}}.

## 9. Limitation of liability

Buaze's direct liability under this agreement is limited to the subscription fees paid in the 12 months preceding the relevant event. Indirect damages, loss of profit and third-party claim damages are excluded, except for cases of gross negligence or wilful misconduct under Turkish Code of Obligations Art. 115.

## 10. Force majeure

Natural disasters, war, public authority decisions, large-scale internet outages, Tier 1 provider failures and similar events outside the parties' control are deemed force majeure; obligations are suspended for their duration.

## 11. Notices

Notices under this agreement are sent to {{LEGAL_CONTACT_EMAIL}} and to the Customer's registered e-mail; they are deemed delivered when sent.

## 12. Disputes

This agreement is governed by Turkish law. Consumer disputes are subject to the Consumer Arbitration Committee / Consumer Courts; otherwise, the courts and execution offices of {{COMPANY_COURT_CITY}} have exclusive jurisdiction.

## 13. Effect

This agreement enters into force when the Customer gives electronic approval before payment and remains in force throughout the subscription period.`,
};
