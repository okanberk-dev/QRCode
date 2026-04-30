/**
 * Veri İhlali Müdahale Politikası — Kişisel Verileri Koruma Kurulu'nun
 * 24.01.2019 tarih ve 2019/10 sayılı kararı uyarınca, kişisel veri ihlali
 * halinde 72 saat içinde Kurul'a bildirim + ilgili kişilere uygun yolla
 * haber verme yükümlülüğünün iç prosedürünü düzenler.
 *
 * Hem Buaze veri sorumlusu sıfatıyla bildirim yapması gereken senaryoları
 * (kendi sistemleri etkilenirse) hem de veri işleyen sıfatıyla işletmeye
 * (veri sorumlusu) bildirim yaparak işletmenin Kurul'a bildirimine
 * yardım etmesi gereken senaryoları kapsar (DPA m. 8 ile uyumlu).
 */

export const VERI_IHLALI_MUDAHALE_TR = {
  title: 'Veri İhlali Müdahale Politikası',
  description:
    'Kişisel veri ihlali tespiti, KVKK Kurul bildirimi (72 saat) ve ilgili kişilerin bilgilendirilmesi prosedürü.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Amaç

Bu politika, {{COMPANY_NAME}} ("Buaze") sistemlerinde gerçekleşebilecek veri ihlali olaylarının tespiti, sınıflandırılması, raporlanması ve bildirilmesi süreçlerini düzenler. KVKK m. 12/5 ve Kişisel Verileri Koruma Kurulu'nun 24.01.2019 tarih ve 2019/10 sayılı kararı temel alınmıştır.

## 2. Veri ihlali tanımı

Veri ihlali; kişisel verilerin kanuna aykırı olarak elde edilmesi, ifşa edilmesi, değiştirilmesi, silinmesi veya yetkisiz erişime maruz kalmasıdır. Örnekler:

- Yetkisiz kişinin sistemlere erişimi,
- Veri tabanı yedeğinin sızdırılması,
- Çalınan / kaybolan cihazda kişisel veri bulunması,
- Yanlış yapılandırma sonucu verilerin internet üzerinde açıkta kalması,
- Phishing yoluyla personel hesabının ele geçirilmesi,
- Üçüncü taraf tedarikçide gerçekleşen ve Buaze'ye sıçrayan ihlal,
- Fidye yazılımı (ransomware) saldırısı.

İhlal şüphesi de bu prosedürü tetikler — kesinlik aranmaz; tedbir önceliklidir.

## 3. Müdahale ekibi

- **Bilgi Güvenliği Sorumlusu** (lider) — koordinasyon, karar
- **Yazılım Mühendisi** (teknik) — log analizi, kapatma
- **Hukuk** ({{LEGAL_CONTACT_EMAIL}}) — bildirim metni, hukuki süreç
- **Veri Sorumlusu Temsilcisi** — VERBİS güncelleme

## 4. Müdahale aşamaları

### Aşama 1 — Tespit (T+0)

Anomali tespiti otomatik (Sentry alert, SIEM, izinsiz giriş alarmı) veya manuel (kullanıcı şikâyeti, dış bildirim) yapılabilir. Tespit anında:

- Olay {{KVKK_CONTACT_EMAIL}} adresine raporlanır.
- Müdahale ekibi içinde olay bildirilir.

### Aşama 2 — Çevreleme (T+0 — T+24 saat)

- Etkilenen sistem izole edilir; saldırının yayılması engellenir.
- Kanıtlar korunur (snapshot, log, hash).
- Geçici düzeltmeler uygulanır (ilgili hesap askıya alma, parola sıfırlama, oturum revoke).

### Aşama 3 — Değerlendirme (T+24 saat içinde)

- Etkilenen veri kategorisi (kimlik, iletişim, müşteri yorumu, kredi kartı vb.).
- Etkilenen ilgili kişi sayısı tahmini.
- İhlalin "yüksek risk" oluşturup oluşturmadığı değerlendirilir.
- Etkilenen müşteri varsa **ilgili işletmeye 24 saat** içinde bildirim (DPA m. 8).

### Aşama 4 — Bildirim (T+72 saat içinde)

**KVKK Kurulu'na bildirim** (Buaze'nin veri sorumlusu olduğu durumda):

Kurul'un veri ihlali bildirim formu ile yapılır (https://veriihlalibildirimi.kvkk.gov.tr). Form içeriği:

- İhlalin gerçekleştiği zaman ve süre,
- İhlal türü (yetkisiz erişim, ifşa, kayıp, vb.),
- Etkilenen kişisel veri kategorileri,
- Etkilenen kişi sayısı (yaklaşık),
- Olası sonuçlar,
- Alınan / alınacak teknik ve idari tedbirler.

**Veri sorumlusuna bildirim** (Buaze veri işleyen ise):

İşletme (veri sorumlusu), kendi yükümlülüğü olan Kurul bildirimini gerçekleştirebilmesi için en geç **24 saat** içinde DPA m. 8 uyarınca bilgilendirilir; gerekli teknik ve hukuki destek sağlanır.

**İlgili kişilere bildirim** (yüksek risk varsa):

Yüksek risk değerlendirilen ihlallerde, etkilenen kullanıcılara makul sürede ve uygun yolla (e-posta, panel mesajı) bildirim yapılır. Bildirim açık ve sade dilde:

- İhlalin niteliği,
- Olası sonuçlar,
- Kullanıcının alabileceği önlemler (parola değişimi, dolandırıcılık takibi),
- İletişim için {{KVKK_CONTACT_EMAIL}}.

### Aşama 5 — Kök neden analizi (T+30 gün içinde)

- 5-Why veya RCA metodolojisi ile kök sebep belirlenir.
- Düzeltici aksiyon planı hazırlanır (kod fix, mimari değişiklik, eğitim ihtiyacı).
- Etkilenen sistemde benzer ihlal tekrarını önleyecek kontroller eklenir.

### Aşama 6 — Belgeleme

- Tüm olaylar veri ihlali kayıt defterine işlenir (KVKK Kurulu denetimine açık).
- Olay raporu en az 5 yıl saklanır.

## 5. İçeriden gelen bildirimleri teşvik

Personel, müşteri veya üçüncü taraf, ihlal şüphesini ihbar etmek için aşağıdaki kanallardan birini kullanabilir:

- {{KVKK_CONTACT_EMAIL}} (kişisel veri ihlali)
- {{LEGAL_CONTACT_EMAIL}} (hukuki şüphe)
- Anonim ihbar formu (ileride eklenecek)

İyi niyetle yapılan ihbarcılar için **misilleme yasağı** uygulanır.

## 6. Yıllık tatbikat

Müdahale ekibi her yıl **bir tatbikat** yapar:

- Senaryo bazlı simülasyon (örn. veri tabanı sızıntısı),
- Bildirim metinleri prova edilir,
- Süreç boşlukları belirlenip prosedüre eklenir.

## 7. Şeffaflık

İhlal sonrası süreç tamamlandıktan sonra (kanıt korumayı tehlikeye atmadan), kişisel veri içermeyen bir özet açıklama yayımlanabilir. KVKK Kurulu'nun bildirim formuna kamuya açık erişim Kurul tarafından sağlanır.

## 8. İletişim

- Veri ihlali bildirimi: {{KVKK_CONTACT_EMAIL}}
- Hukuki danışma: {{LEGAL_CONTACT_EMAIL}}`,
};

export const VERI_IHLALI_MUDAHALE_EN = {
  title: 'Data Breach Response Policy',
  description:
    'Detection, KVKK Authority notification (72 hours) and data-subject notification procedures for personal data breaches.',
  effectiveLabel: 'Effective from',
  content: `## 1. Purpose

This policy governs detection, classification, reporting and notification of personal data breaches that may occur in {{COMPANY_NAME}} ("Buaze") systems. It is based on KVKK Article 12/5 and the Personal Data Protection Authority decision dated 24.01.2019 (No. 2019/10).

## 2. Definition of breach

A data breach is the unlawful acquisition, disclosure, alteration, deletion or unauthorised access of personal data. Examples:

- Unauthorised access to systems,
- Database backup leak,
- Stolen / lost device containing personal data,
- Misconfiguration exposing data on the public internet,
- Personnel account compromise via phishing,
- Sub-processor breach affecting Buaze data,
- Ransomware attack.

Suspicion alone triggers this procedure — certainty is not required; precaution prevails.

## 3. Response team

- **Information Security Officer** (lead) — coordination and decisions
- **Software Engineer** (technical) — log analysis, containment
- **Legal** ({{LEGAL_CONTACT_EMAIL}}) — notification text, legal process
- **Data Controller Representative** — VERBIS update

## 4. Phases

### Phase 1 — Detection (T+0)

Anomalies are caught automatically (Sentry alert, SIEM, intrusion alarm) or manually (user complaint, external notice). On detection:

- The incident is reported to {{KVKK_CONTACT_EMAIL}}.
- The response team is alerted.

### Phase 2 — Containment (T+0 to T+24 hours)

- The affected system is isolated; further spread is prevented.
- Evidence is preserved (snapshots, logs, hashes).
- Temporary remediation: account suspension, password reset, session revocation.

### Phase 3 — Assessment (within T+24 hours)

- Affected data categories (identity, contact, customer comments, payment, etc.).
- Estimated number of affected data subjects.
- Whether the breach poses a "high risk".
- If business customers are affected, **notification within 24 hours** to the relevant business (DPA Art. 8).

### Phase 4 — Notification (within T+72 hours)

**Notification to the KVKK Authority** (where Buaze is the controller):

Filed via the breach notification form at https://veriihlalibildirimi.kvkk.gov.tr. Required content:

- Time and duration of the breach,
- Type of breach (unauthorised access, disclosure, loss, etc.),
- Affected categories of personal data,
- Approximate number of data subjects affected,
- Likely consequences,
- Technical and administrative measures taken / to be taken.

**Notification to the controller** (where Buaze is the processor):

The business (controller) must be informed within **24 hours** under DPA Art. 8 so it can fulfil its own KVKK Authority notification duty; technical and legal support is provided.

**Notification to data subjects** (where high risk):

For high-risk breaches, affected users are notified by appropriate means (e-mail, panel message) within a reasonable period in clear, plain language including:

- Nature of the breach,
- Likely consequences,
- Steps the user can take (password change, fraud monitoring),
- Contact: {{KVKK_CONTACT_EMAIL}}.

### Phase 5 — Root-cause analysis (within T+30 days)

- 5-Why or RCA methodology to identify root cause.
- Corrective action plan: code fixes, architectural changes, training needs.
- Controls added to prevent recurrence.

### Phase 6 — Documentation

- All incidents are recorded in the breach register (open to KVKK Authority audit).
- Incident reports retained at least 5 years.

## 5. Encouraging internal reporting

Staff, customers and third parties may report suspected breaches via:

- {{KVKK_CONTACT_EMAIL}} (personal data breach)
- {{LEGAL_CONTACT_EMAIL}} (legal concerns)
- Anonymous reporting form (planned)

A **non-retaliation** policy applies to good-faith reporters.

## 6. Annual drill

The response team runs **one drill per year**:

- Scenario-based simulation (e.g. database leak),
- Notification drafts are rehearsed,
- Process gaps are identified and added to the procedure.

## 7. Transparency

After the post-incident process is complete (without compromising evidence), a redacted summary may be published. Public access to KVKK Authority breach notifications is provided by the Authority.

## 8. Contact

- Data breach reports: {{KVKK_CONTACT_EMAIL}}
- Legal advice: {{LEGAL_CONTACT_EMAIL}}`,
};
