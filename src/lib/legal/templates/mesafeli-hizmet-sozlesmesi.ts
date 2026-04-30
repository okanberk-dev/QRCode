/**
 * Mesafeli Hizmet Sözleşmesi — 6502 sayılı Tüketicinin Korunması Hakkında
 * Kanun (TKHK) ve Mesafeli Sözleşmeler Yönetmeliği (29188 sayılı RG, 27.11.2014)
 * uyarınca, internet üzerinden satılan SaaS hizmeti için zorunlu metindir.
 *
 * Müşterinin tüketici sıfatı taşıyor olabileceği akış (özellikle bireysel
 * kullanıcı / ferdi işletme abonelikleri) için Ön Bilgilendirme + Mesafeli
 * Sözleşme yükümlülüğü doğar. B2B kurumsal SaaS'larda da güvenli yan olarak
 * eklenir.
 */

export const MESAFELI_HIZMET_SOZLESMESI_TR = {
  title: 'Mesafeli Hizmet Sözleşmesi ve Ön Bilgilendirme',
  description:
    'TKHK m. 48 ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, hizmetin satın alma anında zorunlu olarak sunulan ön bilgilendirme + mesafeli sözleşme metni.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Satıcının kimliği

- Unvan: {{COMPANY_NAME}}
- Adres: {{COMPANY_ADDRESS}}
- E-posta: {{LEGAL_CONTACT_EMAIL}}
- Telefon: {{COMPANY_PHONE}}
- Mersis / Vergi No: {{COMPANY_TAX_ID}}

## 2. Sözleşmenin konusu ve hizmetin temel özellikleri

İşbu sözleşme, satıcının ALICI'ya {{PRICING_PAGE_URL}} adresinde tanıtılan SaaS aboneliğini ({{COMPANY_NAME}} platformu) elektronik ortamda sunmasına ilişkindir. Hizmet, müşteri geri bildirimi toplama, yönlendirme, raporlama ve yan modülleri içerir.

## 3. Bedel ve ödeme

- Abonelik bedeli, ALICI tarafından sipariş onaylanmadan önce {{PRICING_PAGE_URL}} adresinde, KDV dahil olarak gösterilir.
- Ödeme; kredi kartı, banka kartı veya {{PAYMENT_PROVIDER}} altyapısı üzerinden tahsil edilir.
- Faturalama dönemi {{BILLING_CYCLE}} bazlıdır; vade her dönem başında peşin alınır.

## 4. Cayma hakkı

- TKHK m. 48 ve Yönetmelik m. 15 uyarınca, ALICI sözleşmenin kurulduğu tarihten itibaren **14 gün içinde** sebep göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
- Cayma hakkı kullanılırsa, ALICI'nın o ana kadar aldığı hizmet için orantılı bedel kesilir; kalan bedel 14 gün içinde ödeme aracına iade edilir.
- ALICI, cayma süresi dolmadan hizmetin ifasının başlatılmasını **ayrı bir onay kutusu ile açıkça** kabul ederse, ifanın tamamlanması sonrasında cayma hakkını **kullanamaz** (Yönetmelik m. 15/1-h). Söz konusu onay, ödeme akışında bu Sözleşme'nin onayından **bağımsız** ve işaretsiz olarak gösterilir; ALICI bilinçli olarak işaretlemediği sürece ifa başlatılmaz ve cayma hakkı tam korunur.
- ALICI bu onayı vermez ise hizmet aktivasyonu 14 günlük cayma süresi sonrasına ertelenir; ALICI dilerse cayma süresi içinde de aboneliği başlatma talebinde bulunabilir.
- Cayma bildirimi, sözleşmenin kuruluşu sırasında belirtilen e-posta veya posta adresine yapılır: {{LEGAL_CONTACT_EMAIL}}.

## 5. Hizmetin teslim süresi ve şekli

Hizmet, abonelik aktivasyonunu takiben anında dijital olarak ALICI'ya açılır. Fiziki teslimat söz konusu değildir; ALICI hesabıyla giriş yaparak hizmete erişir.

## 6. Faturalandırma ve fatura

- Her ödeme döneminin sonunda elektronik fatura düzenlenir ve ALICI'nın hesabında kayıtlı e-posta adresine gönderilir.
- 213 sayılı Vergi Usul Kanunu m. 253 uyarınca faturalar 5 yıl saklanır.

## 7. Ayıplı hizmet ve garanti

ALICI, hizmetin sözleşmede belirtilen niteliklere uygun olmaması halinde TKHK m. 11 - m. 14 hükümleri çerçevesinde haklara sahiptir: bedel iadesi, ücretsiz onarım veya hizmetin yenilenmesi.

## 8. Sözleşmenin sona ermesi

- ALICI, abonelik panelinden iptal seçeneğiyle dilediği zaman aboneliği sona erdirebilir.
- Satıcı, bu sözleşmeye veya Kullanım Şartları'na aykırılık halinde 14 günlük ihtar süresi sonunda sözleşmeyi feshedebilir.

## 9. Anlaşmazlıkların çözümü

- {{TKHK_THRESHOLD_AMOUNT}} TL'nin altındaki tüketici uyuşmazlıklarında ilçe / il Tüketici Hakem Heyetleri yetkilidir.
- Üzerindeki uyuşmazlıklarda Tüketici Mahkemeleri görevlidir.
- ALICI, ikametgâhının bulunduğu yerdeki mahkemeyi de tercih edebilir (TKHK m. 73/A).

## 10. Yürürlük

Bu sözleşme, ALICI'nın elektronik ortamda onay vermesiyle kurulur ve hizmet süresi boyunca yürürlükte kalır. Onay anında ALICI, ön bilgilendirme metnini ve sözleşmeyi okuduğunu, anladığını ve kabul ettiğini beyan eder.`,
};

export const MESAFELI_HIZMET_SOZLESMESI_EN = {
  title: 'Distance Services Agreement & Pre-Contractual Information',
  description:
    'Mandatory pre-contractual information + distance contract under Turkish Consumer Protection Law No. 6502 and the Distance Contracts Regulation.',
  effectiveLabel: 'Effective from',
  content: `## 1. Seller identity

- Entity: {{COMPANY_NAME}}
- Address: {{COMPANY_ADDRESS}}
- E-mail: {{LEGAL_CONTACT_EMAIL}}
- Phone: {{COMPANY_PHONE}}
- Tax / registration number: {{COMPANY_TAX_ID}}

## 2. Subject matter and main features

This agreement governs the seller's provision of the SaaS subscription described at {{PRICING_PAGE_URL}} ({{COMPANY_NAME}} platform) to the BUYER electronically. The service includes customer feedback collection, redirection, reporting and add-on modules.

## 3. Price and payment

- The subscription fee, including VAT, is shown on {{PRICING_PAGE_URL}} prior to order confirmation.
- Payment is processed via credit card, debit card or {{PAYMENT_PROVIDER}}.
- Billing cycle is {{BILLING_CYCLE}}; the fee is collected in advance at the start of each period.

## 4. Right of withdrawal

- Pursuant to Article 48 of Law No. 6502 and Article 15 of the Distance Contracts Regulation, the BUYER has **14 days** from contract conclusion to withdraw without justification or penalty.
- If withdrawal is exercised, a proportional charge is retained for the service provided up to that point; the remainder is refunded to the original payment instrument within 14 days.
- The BUYER may **lose** the right of withdrawal if they expressly consent to the start of performance before the withdrawal period ends, via a **separate, unticked checkbox** independent of the agreement-acceptance checkbox at checkout, and once performance has been completed (Reg. Art. 15/1-h). Without the BUYER's deliberate tick, performance does not start and the right of withdrawal is preserved in full.
- Without that consent, activation is deferred until after the 14-day withdrawal period; the BUYER may also request earlier activation within the period if they wish.
- Withdrawal notices may be sent to {{LEGAL_CONTACT_EMAIL}} or the postal address indicated at contract conclusion.

## 5. Delivery time and method

The service is activated digitally and immediately upon subscription activation. There is no physical delivery; the BUYER accesses the service via their account.

## 6. Invoicing

- An electronic invoice is issued at the end of each billing period and sent to the BUYER's e-mail on file.
- Invoices are retained for 5 years pursuant to Tax Procedure Law Art. 253.

## 7. Defective service and warranty

If the service does not meet the specifications agreed, the BUYER has the rights under Articles 11-14 of Law No. 6502: refund, free repair or replacement of the service.

## 8. Termination

- The BUYER may cancel the subscription at any time via the panel.
- The seller may terminate the agreement after a 14-day cure notice for breach of these terms or the Terms of Service.

## 9. Dispute resolution

- Consumer disputes below {{TKHK_THRESHOLD_AMOUNT}} TRY are heard by district / provincial Consumer Arbitration Committees.
- Above that threshold, Consumer Courts are competent.
- The BUYER may also choose the court at their place of residence (Art. 73/A).

## 10. Effect

This agreement enters into force when the BUYER electronically gives consent and remains in force throughout the service period. By giving consent, the BUYER confirms having read, understood and accepted the pre-contractual information and the agreement.`,
};
