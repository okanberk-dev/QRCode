/**
 * İçerik Moderasyon ve Şikâyet Politikası — 5651 sayılı İnternet Ortamında
 * Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla
 * Mücadele Edilmesi Hakkında Kanun (m. 8 - m. 9) çerçevesinde "uyar-kaldır"
 * (notice-and-takedown) prosedürü ile içerik denetim yetkilerini düzenler.
 *
 * 5651 m. 5/2 uyarınca yer sağlayıcı (host) sıfatımızla içerikten doğrudan
 * sorumlu değiliz, ancak haberdar olduktan sonra hukuka aykırı içeriği
 * makul sürede kaldırmak zorundayız. Bu metin o akışı standardize eder.
 */

export const ICERIK_MODERASYON_TR = {
  title: 'İçerik Moderasyon ve Şikâyet Politikası',
  description:
    'Müşteri yorumları, telif ve kişilik hakkı şikâyetleri, "uyar-kaldır" (notice-and-takedown) prosedürü ve içerik kaldırma kararlarına itiraz hakkı.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Kapsam ve hukuki çerçeve

Bu politika, {{COMPANY_NAME}} ("Buaze") platformuna yüklenen müşteri yorumları, fotoğraflar, menü öğesi açıklamaları ve diğer kullanıcı içeriklerinin moderasyonunu düzenler. Buaze, 5651 sayılı Kanun m. 5 anlamında **yer sağlayıcı** statüsündedir; içeriği önceden denetleme yükümlülüğü yoktur, ancak hukuka aykırı içeriği **haberdar olduğunda** makul sürede kaldırma yükümlülüğü bulunur.

## 2. Buaze'nin denetim yetkileri

Buaze, aşağıdaki durumlarda kullanıcı içeriğini ön bildirimsiz **kaldırabilir, gizleyebilir veya düzenleyebilir**:

- Kabul Edilebilir Kullanım Politikası'na aykırılık tespiti,
- Yetkili kamu kurumlarından içerik kaldırma talebi (5651 m. 8 / m. 9),
- Mahkeme kararı veya hâkim emri,
- Otomatik moderasyon sistemlerinin (anti-spam, küfür filtresi, manipülasyon tespiti) tetikleyici sinyal vermesi.

İçerik silme ya da gizleme **takdir hakkımıza** dayanır; müşteri tarafa kararı bildiririz, gerekçe sunmak zorunda değiliz.

## 3. Şikâyet türleri ve başvuru kanalı

İçerikten zarar gördüğünü iddia eden gerçek veya tüzel kişiler aşağıdaki kanaldan başvurabilir:

- **E-posta:** {{LEGAL_CONTACT_EMAIL}} (telif, kişilik hakkı, KVKK, ticaret unvanı şikâyeti)
- **Posta:** {{COMPANY_ADDRESS}} (ıslak imzalı dilekçe ile)

Başvuruda **yer alması zorunlu bilgiler** (5651 m. 9 ile uyumlu):

- Şikâyet edenin kimlik ve iletişim bilgileri (gerçek kişide T.C. kimlik no veya pasaport no),
- Şikâyet konusu içeriğin **doğrudan URL'i** veya yorum kimliği,
- Şikâyetin **dayanağı** (telif ihlali / kişilik hakkı / KVKK / yanıltıcı yorum / vb.),
- Hak sahibi olduğunu kanıtlayan belge (telif eseri için tescil belgesi, kişilik hakkı için kimlik kartı, vb.),
- "İçeriğin hukuka aykırı olduğuna ve şikâyet hakkımı iyi niyetle kullandığıma dair beyan",
- Talep edilen aksiyon (silme / yanıt hakkı / düzeltme).

**Eksik başvurular** işleme alınmaz; eksiklikler 5 iş günü içinde tamamlanmazsa dosya kapatılır.

## 4. Süreç ve karar süreleri

| Aşama | Süre |
|---|---|
| Başvurunun teyit edilmesi | 24 saat |
| İçerik sahibine bildirim ve savunma süresi | 3 iş günü |
| Karar verilmesi (kaldırma / koruma / yanıt) | 7 iş günü |
| Kararın taraflara yazılı bildirimi | Karar tarihi + 24 saat |

Acil durumlarda (TCK m. 226 çocuk istismarı, terör propagandası, açık tehdit) içerik **derhal** kaldırılır; süreç kararla sonuçlanır.

## 5. Yanlış / kötü niyetli şikâyet

Buaze, kötü niyetli şikâyetlere karşı içerik sahibinin haklarını korur:

- Şikâyetin reddi halinde içerik sahibine yazılı bildirim yapılır,
- Sürekli kötü niyetli şikâyet halinde başvurucuya yaptırım uygulanır,
- TBK m. 49 (haksız fiil) çerçevesinde Buaze'nin uğradığı zarar başvurucuya rücu edilebilir.

## 6. Karara itiraz hakkı

İçerik sahibi veya şikâyetçi, karar tebliğ tarihinden itibaren **15 gün** içinde {{LEGAL_CONTACT_EMAIL}} adresine yazılı itiraz başvurusu yapabilir. İtirazlar farklı bir personel tarafından değerlendirilir; sonuç 10 iş günü içinde bildirilir.

İdari yola başvurma haklarınız saklıdır:

- **Bilgi Teknolojileri ve İletişim Kurumu (BTK)** İnternet Daire Başkanlığı (5651 m. 8)
- **Kişisel Verileri Koruma Kurulu** (KVKK m. 14 — VERBİS başvurusu)
- **Asliye Hukuk Mahkemesi** veya **Sulh Hukuk Mahkemesi** (kişilik hakkı, MK m. 24-25)
- **Tüketici Hakem Heyeti** (tüketici sıfatı varsa)

## 7. Bilgilendirme şeffaflığı

Yıllık olarak, kişisel veri içermeyecek şekilde **şeffaflık raporu** yayımlanır:

- Toplam başvuru sayısı,
- Kaldırılan / korunan içerik sayıları,
- En sık şikâyet türleri,
- Ortalama karar süreleri.

## 8. Saklama ve delil

Şikâyet dosyaları **2 yıl** saklanır (KVKK Aydınlatma Metni'ndeki retention sürelerine tabi). İlgili içerikler kaldırılsa dahi delil olarak arşivlenir; yetkili merci talebi ile paylaşılabilir (5651 m. 6).

## 9. İletişim

Tüm moderasyon ve şikâyet başvuruları için:

- E-posta: {{LEGAL_CONTACT_EMAIL}}
- Adres: {{COMPANY_ADDRESS}}`,
};

export const ICERIK_MODERASYON_EN = {
  title: 'Content Moderation & Complaints Policy',
  description:
    'Customer reviews, IP and personality-rights complaints, notice-and-takedown procedure and the right to challenge moderation decisions.',
  effectiveLabel: 'Effective from',
  content: `## 1. Scope and legal framework

This policy governs the moderation of customer reviews, photos, menu item descriptions and other user content uploaded to the {{COMPANY_NAME}} ("Buaze") platform. Under Article 5 of Turkish Internet Law No. 5651, Buaze is a **hosting provider**: not obliged to pre-screen content, but obliged to remove unlawful content within a reasonable period **once notified**.

## 2. Buaze's moderation rights

Buaze may **remove, hide or edit** user content without prior notice when:

- A breach of the Acceptable Use Policy is detected,
- A competent authority orders content removal (Internet Law Art. 8 / 9),
- A court order or judicial decision exists,
- Automated moderation systems (anti-spam, profanity filter, manipulation detection) flag the content.

Removal or hiding is at our **discretion**; we notify the affected party but are not obliged to provide a justification.

## 3. Complaint types and channels

Persons or legal entities claiming harm from content may file a complaint via:

- **E-mail:** {{LEGAL_CONTACT_EMAIL}} (IP, personality rights, KVKK, trade name)
- **Postal:** {{COMPANY_ADDRESS}} (wet-signed petition)

**Mandatory information** (aligned with Internet Law Art. 9):

- Complainant identity and contact details (Turkish ID or passport for individuals),
- **Direct URL** or comment ID of the disputed content,
- **Legal basis** (IP / personality rights / KVKK / misleading review / etc.),
- Proof of right (registration certificate for IP, identity card for personality rights, etc.),
- "Statement that the content is unlawful and the complaint is filed in good faith",
- Requested action (removal / right of reply / correction).

**Incomplete submissions** are not processed; missing items must be supplied within 5 business days or the file is closed.

## 4. Process and timing

| Step | Period |
|---|---|
| Acknowledgement of complaint | 24 hours |
| Notice to content owner + defence period | 3 business days |
| Decision (remove / preserve / reply) | 7 business days |
| Written notification to parties | Decision date + 24 hours |

Urgent cases (Penal Code Art. 226 child sexual abuse material, terror propaganda, explicit threats) are removed **immediately**; the process concludes with a final decision.

## 5. Bad-faith / abusive complaints

Buaze protects content owners against bad-faith complaints:

- A rejection is notified in writing,
- Repeated abusive complaints incur sanctions on the complainant,
- Damages incurred by Buaze due to abuse may be recovered (Code of Obligations Art. 49 — tort).

## 6. Right to challenge

The content owner or complainant may file a written challenge within **15 days** of notification by sending it to {{LEGAL_CONTACT_EMAIL}}. Challenges are reviewed by a separate staff member; the result is communicated within 10 business days.

Public-law remedies remain available:

- **Information and Communication Technologies Authority (BTK)** Internet Department (Internet Law Art. 8)
- **Personal Data Protection Authority** (KVKK Art. 14 — VERBIS application)
- **Civil Court of First Instance** or **Civil Peace Court** (personality rights, Civil Code Art. 24-25)
- **Consumer Arbitration Committee** (where consumer status applies)

## 7. Transparency

A **transparency report** is published annually, redacted of personal data:

- Total number of complaints,
- Removed / preserved content counts,
- Most frequent complaint categories,
- Average decision times.

## 8. Retention and evidence

Complaint files are retained for **2 years** (subject to the retention periods in the KVKK Privacy Notice). Content is archived as evidence even after removal; it may be shared with authorities upon valid request (Internet Law Art. 6).

## 9. Contact

For all moderation and complaints:

- E-mail: {{LEGAL_CONTACT_EMAIL}}
- Address: {{COMPANY_ADDRESS}}`,
};
