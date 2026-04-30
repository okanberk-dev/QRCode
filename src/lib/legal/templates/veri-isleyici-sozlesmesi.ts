/**
 * Veri İşleyici Sözleşmesi (DPA — Data Processing Agreement) — KVKK m. 12
 * ve "Veri Sorumlusu - Veri İşleyen İlişkisi Hakkında" Kişisel Verileri
 * Koruma Kurulu rehberi çerçevesinde hazırlanmış metindir.
 *
 * Buaze restoran müşterilerinin verilerini "veri işleyen" sıfatıyla işler;
 * ilgili işletme (restoran sahibi) veri sorumlusudur. Bu metin, KVKK m. 12/2
 * gereği aralarındaki yazılı sözleşmeyi karşılar.
 */

export const VERI_ISLEYICI_SOZLESMESI_TR = {
  title: 'Veri İşleyici Sözleşmesi (DPA)',
  description:
    'KVKK m.12 kapsamında {{COMPANY_NAME}} ile işletme arasında, müşteri verilerinin işlenmesine dair yazılı veri işleyici sözleşmesi.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Taraflar

**Veri Sorumlusu** ("İşletme"): Platforma kayıtlı, müşterilerinden geri bildirim toplayan restoran / işletme sahibi.

**Veri İşleyen** ("Buaze"): {{COMPANY_NAME}}
- Adres: {{COMPANY_ADDRESS}}
- E-posta: {{LEGAL_CONTACT_EMAIL}}
- Mersis / Vergi No: {{COMPANY_TAX_ID}}

## 2. Tanımlar

- **Kişisel Veri:** KVKK m. 3'te tanımlandığı şekilde, kimliği belirli veya belirlenebilir gerçek kişiye ilişkin bilgi.
- **İşleme:** KVKK m. 3'te tanımlandığı şekilde her türlü işleme faaliyeti.
- **Veri İhlali:** Yetkisiz erişim, aktarım, ifşa veya kayıp.

## 3. İşleme amacı, kapsamı ve süresi

- **Amaç:** İşletmenin müşterilerinden alınan geri bildirimlerin toplanması, raporlanması ve hizmetin sunulması.
- **Kapsam:** İşletmenin platforma yüklediği müşteri kimlik, iletişim, yorum ve teknik veriler.
- **Süre:** Aboneliğin devamı süresince ve KVKK Aydınlatma Metni m. 6'daki saklama süreleri çerçevesinde.

## 4. İşletmenin (Veri Sorumlusu) yükümlülükleri

- KVKK m. 5 ve m. 6 kapsamında işleme için hukuki sebebi (sözleşme, açık rıza, meşru menfaat vb.) sağlamak,
- KVKK m. 10 kapsamında müşterilere aydınlatma yapmak,
- KVKK m. 11 kapsamında ilgili kişi haklarını kullanmasını sağlamak (Buaze gerektiğinde teknik destek verir),
- Veri Sorumluları Sicili (VERBİS) kayıt yükümlülüğü varsa kaydı tamamlamak,
- Buaze'ye yalnızca bu sözleşme amaçlarıyla sınırlı veri sağlamak.

## 5. Buaze'nin (Veri İşleyen) yükümlülükleri

Buaze, KVKK m. 12/3 uyarınca veri sorumlusu ile birlikte veri güvenliğinden müştereken sorumludur:

- Verileri yalnızca **veri sorumlusunun talimatları** doğrultusunda işler. İşletmenin talimatı dışında işleme yapmaz.
- KVKK m. 12'de öngörülen **idari ve teknik tedbirleri** alır:
  - Şifre hashlame (bcrypt), oturum yönetimi, JWT token + session revocation
  - TLS 1.2+ ile veri aktarımı
  - Erişim kontrolü, rol bazlı yetkilendirme (RBAC), audit log
  - Düzenli güvenlik tarama ve patch yönetimi
- Çalışanlarına gizlilik yükümlülüğü uygular ve gerekli eğitimi sağlar.
- Veri işleme alt yükleniciye aktarmak gerekirse İşletmeye bilgi verir; alt yüklenici aynı yükümlülüklere tabi tutulur (m. 8).
- Sözleşme sona erdiğinde verileri **silme veya iade etme** yükümlülüğü altındadır (m. 9).

## 6. Alt veri işleyenler

Buaze, hizmetin sunulması için aşağıdaki kategori alt yüklenicileri kullanır:

- Bulut altyapı (sunucu / veri tabanı barındırma)
- E-posta gönderim sağlayıcısı
- Hata izleme / gözlem (Sentry vb.)
- Ödeme altyapısı

Güncel alt yüklenici listesi {{LEGAL_CONTACT_EMAIL}} adresinden talep üzerine sağlanır. Yeni alt yüklenici eklenmesi durumunda 30 gün önceden bildirim yapılır; İşletme makul gerekçe ile itiraz edebilir.

## 7. Yurt dışı aktarım

KVKK m. 9 koşulları (yeterli korumaya sahip ülke kararı veya taahhütname) sağlanmadıkça yurt dışına aktarım yapılmaz. Mevcut altyapı sağlayıcılarımızın bulunduğu bölgeler {{LEGAL_CONTACT_EMAIL}} adresinden talep üzerine paylaşılır.

## 8. Veri ihlali bildirimi

- Buaze, ihlali öğrendiği andan itibaren **24 saat** içinde İşletmeye yazılı bildirim yapar.
- Bildirim; ihlalin niteliği, etkilenen veri kategorileri, etkilenen ilgili kişi sayısı tahmini, alınan / alınacak önlemleri içerir.
- İşletme, kendi yükümlülüğü olan KVKK Kurulu bildirimini (en geç 72 saat) gerçekleştirir; Buaze talep edilen bilgi ve belge desteğini sağlar.

## 9. Denetim hakkı

İşletme, yılda bir kez ve makul süre öncesinden bildirim yaparak, Buaze'nin bu sözleşmeye ve KVKK m. 12'ye uyumunu denetleyebilir. Denetim; uzaktan veya kabul edilmiş üçüncü taraf denetim raporu (örn. ISO 27001) ile yürütülür.

## 10. Sözleşme süresi ve sona erme

- Bu sözleşme, ana hizmet sözleşmesi (Platform Kullanım Sözleşmesi) süresince yürürlüktedir.
- Sözleşme sona erdiğinde Buaze, İşletme talebi üzerine verileri 30 gün içinde **silmek veya iade etmek** zorundadır. Yasal saklama süresi gerektiren veriler ilgili süre boyunca saklanmaya devam eder ve süresinde silinir.

## 11. Sorumluluk ve rücu

Buaze'nin bu sözleşmeden doğan toplam sorumluluğu, ihlalin gerçekleştiği döneme ait son 12 aylık abonelik bedeli ile sınırlıdır; TBK m. 115/2 anlamında ağır kusur veya kasıt halinde bu sınır uygulanmaz.

KVKK Kurulu tarafından İşletmeye (veri sorumlusuna) kesilen idari para cezası veya tazminat talebinin **tamamı veya bir kısmı Buaze'nin kusurundan kaynaklanıyorsa**, İşletme bu kısmı Buaze'ye rücu edebilir. Buaze, kendi kusur oranıyla sınırlı olmak üzere ödemekle yükümlüdür.

Aksi yönde — yani işletmenin kendi kusurundan kaynaklanan ihlallerden — Buaze sorumlu tutulamaz; bu durumda işletme, Buaze'nin uğradığı maliyetleri (avukat, dış denetim, müşteri bildirim masrafları) Buaze'ye karşılamayı taahhüt eder.

## 12. Yetkili hukuk ve mahkemeler

Sözleşme Türk hukukuna tabidir. {{COMPANY_COURT_CITY}} mahkemeleri ve icra daireleri yetkilidir.`,
};

export const VERI_ISLEYICI_SOZLESMESI_EN = {
  title: 'Data Processing Agreement (DPA)',
  description:
    'Written data processing agreement under KVKK Art. 12 between {{COMPANY_NAME}} and the business regarding processing of customer data.',
  effectiveLabel: 'Effective from',
  content: `## 1. Parties

**Data Controller** ("Business"): The restaurant / business operator registered on the platform that collects feedback from its customers.

**Data Processor** ("Buaze"): {{COMPANY_NAME}}
- Address: {{COMPANY_ADDRESS}}
- E-mail: {{LEGAL_CONTACT_EMAIL}}
- Tax / registration number: {{COMPANY_TAX_ID}}

## 2. Definitions

- **Personal data:** As defined in KVKK Art. 3 — information relating to an identified or identifiable natural person.
- **Processing:** Any operation as defined in KVKK Art. 3.
- **Data breach:** Unauthorised access, transfer, disclosure or loss.

## 3. Purpose, scope and duration

- **Purpose:** Collect, report and surface customer feedback for the Business.
- **Scope:** Customer identity, contact, comment and technical data uploaded to the platform by the Business.
- **Duration:** During the active subscription and in line with the retention periods set out in Section 6 of the KVKK Privacy Notice.

## 4. Business obligations (data controller)

- Provide a lawful basis for processing under KVKK Art. 5/6 (contract, explicit consent, legitimate interest).
- Inform customers as required by KVKK Art. 10.
- Enable customers to exercise their rights under KVKK Art. 11 (Buaze provides reasonable technical assistance).
- Register with VERBIS where applicable.
- Provide Buaze only with data needed for the agreed purposes.

## 5. Buaze obligations (data processor)

Under KVKK Art. 12/3 Buaze is jointly responsible with the controller for data security:

- Process data only on the **controller's instructions**.
- Maintain administrative and technical measures under KVKK Art. 12:
  - Password hashing (bcrypt), session and JWT management with revocation
  - TLS 1.2+ in transit
  - RBAC, access controls, audit logs
  - Regular security scans and patching
- Bind staff to confidentiality and provide training.
- Inform the Business before engaging sub-processors; impose equivalent obligations (Art. 8).
- On termination, **delete or return** data (Art. 9).

## 6. Sub-processors

Buaze relies on the following categories of sub-processors:

- Cloud infrastructure (hosting and database)
- E-mail provider
- Error tracking / observability (e.g. Sentry)
- Payment processor

The current list is available on request from {{LEGAL_CONTACT_EMAIL}}. Buaze gives 30 days' notice before adding a new sub-processor; the Business may object on reasonable grounds.

## 7. Cross-border transfers

No transfers outside Türkiye are made unless KVKK Art. 9 requirements (adequacy decision or undertaking) are met. Provider regions are available on request.

## 8. Data breach notification

- Buaze notifies the Business in writing within **24 hours** of becoming aware of a breach.
- The notice covers: nature of the breach, affected data categories, estimated number of affected data subjects, measures taken / planned.
- The Business completes its KVKK Authority notification (within 72 hours); Buaze provides the requested information and documentation support.

## 9. Audit right

The Business may audit Buaze's compliance with this agreement and KVKK Art. 12 once per year, with reasonable prior notice. Audits may be conducted remotely or via accepted third-party reports (e.g. ISO 27001).

## 10. Term and termination

- This agreement runs concurrently with the main service agreement (Platform User Agreement).
- On termination, Buaze must **delete or return** the data within 30 days of the Business's request. Data subject to mandatory legal retention is kept for the relevant period and deleted at the end.

## 11. Liability and recourse

Buaze's total liability under this agreement is capped at the subscription fees paid in the 12 months preceding the relevant event; the cap does not apply in cases of gross negligence or wilful misconduct (Code of Obligations Art. 115/2).

Where any administrative fine imposed by the KVKK Authority on the Business (controller), or any compensation claim, **stems wholly or partly from Buaze's fault**, the Business may recover that portion from Buaze. Buaze remains liable only to the extent of its own fault.

Conversely, Buaze is not liable for breaches caused by the Business's own fault; in that case the Business agrees to reimburse Buaze for costs incurred (legal counsel, third-party audit, customer notification expenses).

## 12. Governing law and jurisdiction

This agreement is governed by Turkish law. The courts and execution offices of {{COMPANY_COURT_CITY}} have exclusive jurisdiction.`,
};
