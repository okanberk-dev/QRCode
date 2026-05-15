/**
 * İade ve İptal Politikası — TKHK 6502 + Mesafeli Sözleşmeler Yönetmeliği
 * çerçevesinde, dijital hizmet niteliğindeki SaaS abonelikleri için iade
 * koşulları + cayma akışı + ödeme iadesi süreçlerinin operasyonel açıklaması.
 *
 * Mesafeli Hizmet Sözleşmesi'nde m. 4 cayma hakkı düzenlenir; bu metin
 * pratiği — talep formu, e-posta yolu, beklenen süreler, kısmi iade
 * hesabı — ayrıntılandırır.
 */

export const IADE_IPTAL_POLITIKASI_TR = {
  title: 'İade ve İptal Politikası',
  description:
    'Abonelik iptali, cayma hakkı kullanımı, kısmi iade hesabı ve ödeme iadesi sürecine ilişkin operasyonel rehber.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Kapsam

Bu politika, {{COMPANY_NAME}} tarafından sunulan SaaS aboneliğinin iptali ve iade taleplerinin nasıl işleneceğini açıklar. Politika, {{LEGAL_CONTACT_EMAIL}} adresinden talep edilebilen Mesafeli Hizmet Sözleşmesi'nin tamamlayıcısıdır.

## 2. Cayma hakkı (yeni abonelikler)

- Abonelik aktifleştikten sonra **14 gün** içinde cayma hakkı vardır (TKHK m. 48 + Yönetmelik m. 15).
- Hizmetin başlatılması için sipariş anında verilen "ifaya başlama onayı", ifanın tamamlanmasından sonra cayma hakkını sona erdirir (Yönetmelik m. 15/1-h).
- Cayma süresi içinde talep edilirse, kullanılan günler kadar **orantılı bedel** tahsil edilir; kalan tutar 14 gün içinde iade edilir.

## 3. Abonelik iptali (genel)

- Üye, abonelik panelinden tek tıkla iptali başlatabilir.
- İptal sonrası ödenmiş dönem sonuna kadar hizmet alınmaya devam edilir; **dönem sonunda otomatik yenileme yapılmaz**.
- Aboneliğin yenilendiği gün dahilinde aynı dönem için iptal talep edilirse, hizmet henüz **kullanılmamış** ise tam iade yapılır; başlatılmışsa kısmi iade kuralı (m. 2) uygulanır.

### 3.1 Yarım kullanılmış aylık abonelik

Aylık abonelik döneminde aboneliği erken sonlandıran üye için **pro-rata (orantılı) iade yapılmaz** — bu, dijital hizmet niteliği ve hizmetin tüm ay boyunca erişilebilir olması sebebiyledir (TKHK m. 15/1-h). Üye, dönem bitimine kadar hizmet kullanma hakkını korur; yenileme tarihi geldiğinde abonelik otomatik kapanır.

Cayma hakkı süresi (m. 2) ve hizmet ifa edilmemesi gibi yasal istisnalar bu kuraldan etkilenmez.

### 3.2 Fiyat / kapsam değişikliği sonrası iptal

Buaze, [Kullanım Sözleşmesi](/kullanim-sozlesmesi) m. 16 ve [Kullanım Şartları](/kullanim-sartlari) m. 6 uyarınca fiyat veya plan kapsamını 30 (otuz) gün önceden bildirim ile değiştirebilir. Bu değişiklik üyeye fesih hakkı vermez; mevcut plan abonelik dönemi sonuna kadar **eski kapsam + eski fiyat** ile devam eder. Sonraki dönemde yeni kapsam / fiyat geçerli olur.

Üye yeni kapsamı kabul etmiyorsa abonelik döneminin sonunda yenileme yapmayarak ayrılabilir; ancak içinde bulunulan dönemin iadesi talep edilemez.

## 4. İade hesabı

- Aylık abonelik: **pro-rata iade yok** (m. 3.1) — kullanılan gün hesabı sadece cayma hakkı süresinde uygulanır.
- Yıllık abonelik: kullanılan ay sayısı × aylık birim fiyat tutarı kesilir; kalan iade edilir (cayma hakkı kapsamında).
- Hediye / promosyon dönemi varsa, indirim yansıması iadeden düşülür.
- Vergi (KDV) iade tutarına dahil olarak hesaplanır; fatura iptal / iade faturası ile düzenlenir.

## 5. Ödeme aracı bazlı iade

- Kredi kartı / banka kartı: ilgili banka tarafından **3-14 iş günü** içinde işlenir; bu süre {{COMPANY_NAME}}'in kontrolünde değildir.
- Banka transferi (havale): {{COMPANY_NAME}} tarafından 5 iş günü içinde gönderilir.
- Faturalı ödeme (kurumsal): bir sonraki dönem fatura mahsubu yapılır veya talep üzerine banka transferi.

## 6. İade kapsamı dışında kalan durumlar

Aşağıdaki kalemler iade edilmez:

- Sözleşmenin kullanıcı tarafından **TKHK ve sözleşme'ye aykırılık** sebebiyle feshi (örn. yasaklı kullanımlar — Kullanım Şartları m. 4)
- Hizmetin **özel olarak yapılandırıldığı** ek modüller (kurumsal entegrasyon, white-label setup) — Yönetmelik m. 15/1-ç
- Önceki dönemlerde kullanılmış kuponlar, sadakat puanları, hediye kontörler

## 7. Talep nasıl yapılır?

Cayma veya iade talebi:

- **Panel:** /dashboard/account?section=billing → "Aboneliği iptal et" → kısmi iade gerekiyorsa "İade talep et" akışı
- **E-posta:** {{LEGAL_CONTACT_EMAIL}} adresine başvuru — talebin alındığı 24 saat içinde teyit ile yanıtlanır
- **Form:** {{LEGAL_CONTACT_EMAIL}} adresine yapılan başvuruda en az aşağıdaki bilgilerin yer alması yeterlidir:
  - Adı soyadı / işletme adı
  - Hesap e-postası
  - Talep konusu (cayma / iptal / kısmi iade)
  - Talep gerekçesi (cayma için zorunlu değil; istenirse boş bırakılabilir)

## 8. Hak arama yolları

Talebinizin sonucundan memnun değilseniz:

- {{TKHK_THRESHOLD_AMOUNT}} TL altı uyuşmazlıklar için **Tüketici Hakem Heyeti** (ikametgâh ya da satıcı il / ilçe)
- Üzerindeki tutarlar için **Tüketici Mahkemesi**
- Online uyuşmazlık çözümü: e-Devlet üzerinden Tüketici Şikâyet Sistemi'ne (https://tuketicisikayeti.ticaret.gov.tr) başvurabilirsiniz.

## 9. Politika güncellemeleri

Bu politika, mevzuat değişiklikleri veya operasyonel iyileştirmeler doğrultusunda güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır; abonelere e-posta ile bildirilir.`,
};

export const IADE_IPTAL_POLITIKASI_EN = {
  title: 'Refund & Cancellation Policy',
  description:
    'Operational guide for subscription cancellation, exercise of right of withdrawal, pro-rata refunds and payment processing.',
  effectiveLabel: 'Effective from',
  content: `## 1. Scope

This policy explains how {{COMPANY_NAME}} handles cancellation and refund requests for the SaaS subscription. It complements the Distance Services Agreement, available on request at {{LEGAL_CONTACT_EMAIL}}.

## 2. Right of withdrawal (new subscriptions)

- A 14-day right of withdrawal applies after activation (Law No. 6502 Art. 48 + Regulation Art. 15).
- Performance start consent given at checkout ends the right of withdrawal once performance is completed (Reg. Art. 15/1-h).
- If invoked within the window, a **pro-rata charge** is retained for the days used; the remainder is refunded within 14 days.

## 3. Subscription cancellation (general)

- The user may cancel from the subscription panel with one click.
- After cancellation, the service remains active until the end of the paid period; **no auto-renewal** at period end.
- If cancellation is requested on the day of renewal and the new period has not been used, a full refund is issued; otherwise the pro-rata rule (Section 2) applies.

### 3.1 Partially used monthly subscription

For users who end a monthly subscription early, **no pro-rata refund** is provided — the service is a digital subscription available throughout the month (Law No. 6502 Art. 15/1-h). The user retains access until the end of the billing period; auto-renewal stops at the renewal date.

Statutory exceptions (the withdrawal window in Section 2, non-performance, etc.) are not affected.

### 3.2 Cancellation after price / scope changes

Under [User Agreement](/kullanim-sozlesmesi) Section 16 and [Terms](/kullanim-sartlari) Section 6, Buaze may amend pricing or plan scope with **30 (thirty) days'** prior notice. Such changes **do not give the user a right to terminate**; the current plan continues at the **old scope and price** until the end of the period. The new scope / price applies in the following period.

If the user does not accept the new scope, they may simply not renew at the end of the period; the current period is not refundable.

## 4. Refund calculation

- Monthly subscription: **no pro-rata refund** (Section 3.1) — daily-usage maths only applies inside the withdrawal window.
- Annual subscription: charge = months used × monthly unit price; remainder refunded (within the withdrawal window).
- Promotional discounts are deducted from the refund.
- VAT is included in the refund; an invoice cancellation / credit note is issued.

## 5. Refund by payment method

- Credit / debit card: processed by the issuing bank within **3-14 business days**; outside {{COMPANY_NAME}}'s control.
- Bank transfer: sent by {{COMPANY_NAME}} within 5 business days.
- Invoice (corporate): netted off in the next billing cycle, or by transfer on request.

## 6. Out-of-scope cases

Refunds are not available for:

- Termination by user due to **breach of Terms** (e.g. prohibited uses — Terms Art. 4)
- **Custom-configured** add-ons (corporate integration, white-label setup) — Reg. Art. 15/1-ç
- Coupons, loyalty points or gift credits already used

## 7. How to apply

Cancellation or refund request:

- **Panel:** /dashboard/account?section=billing → "Cancel subscription" → "Request refund" if a partial refund applies
- **E-mail:** Send to {{LEGAL_CONTACT_EMAIL}} — confirmation within 24 hours
- **Form:** Include at minimum:
  - Name / company
  - Account e-mail
  - Subject (withdrawal / cancellation / partial refund)
  - Reason (optional for withdrawal)

## 8. Recourse

If you are not satisfied:

- For amounts under {{TKHK_THRESHOLD_AMOUNT}} TRY: **Consumer Arbitration Committee** (residence or seller location)
- For larger amounts: **Consumer Court**
- Online dispute resolution: Turkish Government Consumer Complaint System (https://tuketicisikayeti.ticaret.gov.tr).

## 9. Updates

This policy may be revised in line with regulation or operational improvements. The latest version is always published here, and subscribers are notified by e-mail.`,
};
