/**
 * Bilgi Güvenliği Politikası — KVKK m. 12 ve "Kişisel Veri Güvenliği Rehberi"
 * (Kişisel Verileri Koruma Kurumu, Aralık 2018) çerçevesinde uygulanan
 * idari ve teknik tedbirleri kamuya açıklayan metin.
 *
 * ISO 27001 / 27701 sertifikası alınana kadar denetlenebilir bir referans
 * olarak işlev görür. Kurumsal müşterilerin "güvenlik politikanız var mı?"
 * sorusuna doğrudan cevap verir; SOC2 yerine ikame olarak kullanılabilir.
 */

export const BILGI_GUVENLIGI_TR = {
  title: 'Bilgi Güvenliği Politikası',
  description:
    '{{COMPANY_NAME}} platformunun KVKK m.12 kapsamında uyguladığı idari ve teknik güvenlik tedbirleri.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Amaç ve kapsam

Bu politika, {{COMPANY_NAME}} ("Buaze") tarafından sunulan platformda işlenen tüm verilerin gizliliğini, bütünlüğünü ve erişilebilirliğini sağlamak için uyguladığımız idari ve teknik tedbirleri belgelemektedir. 6698 sayılı KVKK m. 12 ve Kişisel Verileri Koruma Kurumu'nun "Kişisel Veri Güvenliği Rehberi" temel alınmıştır.

## 2. Yönetim ve sorumluluk

- **Bilgi Güvenliği Sorumlusu:** Şirket içi atanmış yönetici, KVKK uyumunu, güvenlik tedbirlerini ve ihlal müdahalesini koordine eder.
- **Veri Sorumlusu Temsilcisi:** VERBİS kayıt yükümlülüğü kapsamında atanmış kişi.
- **Üçüncü taraf alt yükleniciler:** KVKK m. 8 ve veri işleyici sözleşmesi (DPA) ile bağlıdır.

## 3. İdari tedbirler

- **Erişim politikası:** Personel yalnızca işi için zorunlu verilere erişir (least privilege). Erişim talepleri gerekçeli ve kayıtlıdır.
- **Eğitim:** Tüm personel her yıl en az bir kez KVKK + bilgi güvenliği eğitimi alır. Yeni başlayan kişiler işe başlamadan önce eğitim alır.
- **Gizlilik yükümlülüğü:** Personel ve üçüncü taraflar gizlilik sözleşmesi imzalar; sözleşme görev sona erse de süresiz devam eder.
- **Disiplin politikası:** Politika ihlalleri yazılı uyarıdan iş ilişkisi feshine kadar kademeli yaptırıma tabidir.
- **Sözleşmesel kontroller:** Tüm alt yüklenicilerle yazılı veri işleyici sözleşmesi (DPA) imzalanır; periyodik denetim yapılır.
- **VERBİS:** Yasal eşik aşıldığında VERBİS kaydı tamamlanır ve güncel tutulur.

## 4. Teknik tedbirler

### 4.1 Erişim ve kimlik doğrulama

- **Şifre politikası:** Min. 8 karakter, harf+rakam zorunlu, bcrypt hash ile saklanır (12 round).
- **İki faktörlü kimlik doğrulama (2FA):** TOTP tabanlı; admin hesapları için zorunlu, son kullanıcılarda opsiyonel.
- **Oturum yönetimi:** JWT + httpOnly + secure cookie + 7 gün TTL. UserSession tablosu ile sunucu-tarafı revoke edilebilir; "Diğer cihazlardan çık" kullanıcıya açık.
- **Brute-force koruma:** Login + reset password endpoint'lerinde rate limit (Upstash Redis tabanlı).
- **Rol bazlı yetkilendirme (RBAC):** superadmin / manager / restaurant_owner / team_member rolleri; IDOR kontrolleri her API'de aktif.

### 4.2 Veri aktarım güvenliği

- TLS 1.2+ zorunlu; HSTS header'ı ile downgrade saldırısı engellenir.
- Sertifikalar Let's Encrypt veya equivalent CA ile otomatik yenilenir.
- Cross-Origin Resource Sharing (CORS) kuralları whitelist mantığında uygulanır.

### 4.3 Veri tabanı ve depolama

- Veri tabanı sağlayıcısı (Supabase / PostgreSQL): TLS, satır seviyesi güvenlik (RLS) destekli.
- Yedekleme: günlük otomatik yedek, 7 gün saklama, off-site replica.
- Hassas alanlar şifrelenir veya hash'lenir (şifre, OAuth token, 2FA secret).
- Data-at-rest şifreleme bulut sağlayıcı tarafında AES-256.

### 4.4 Uygulama güvenliği

- **OWASP Top 10**: SQL injection (Prisma parametreli sorgu), XSS (React default escape), CSRF (SameSite cookie), SSRF (URL allowlist), server-side input validation.
- **reCAPTCHA Enterprise**: Kayıt, login, public form'larda bot koruması.
- **Honeypot alanları**: Bot otomatik form gönderimine karşı.
- **Content Security Policy (CSP)**: Inline script + eval engellenir.
- **Bağımlılık güvenliği**: \`npm audit\` periyodik tarama; yüksek risk açık 7 gün içinde patch'lenir.

### 4.5 Loglama ve izleme

- Sentry: hata izleme + performance tracing (KVKK uyumlu, PII send_default_pii=false).
- Audit log: admin yazma işlemleri (\`admin_audit_logs\` tablosu).
- IP retention: {{IP_RETENTION_DAYS}} gün; sonrasında anonimleştirme cron'u çalışır.
- Erişim logları min. 6 ay saklanır.

### 4.6 Yedekleme ve iş sürekliliği

- **RPO** (Recovery Point Objective): max. 24 saat veri kaybı.
- **RTO** (Recovery Time Objective): max. 4 saat içinde geri yükleme.
- Yıllık tatbikat: yedekten geri yükleme + felaket kurtarma senaryosu test edilir.

## 5. Veri ihlali müdahale süreci

Detaylı akış için "Veri İhlali Müdahale Politikası" sayfasına bakınız. Özet:

- 24 saat içinde iç ekibe bildirim,
- 72 saat içinde KVKK Kurulu'na bildirim (eğer eşik aşılırsa),
- İlgili kişilere makul sürede haber verme.

## 6. Üçüncü taraf güvenlik denetimi

Buaze, yıllık olarak veya talep üzerine bağımsız bilgi güvenliği denetimine açıktır. Kurumsal müşteriler {{LEGAL_CONTACT_EMAIL}} adresine başvurarak:

- Penetration test özet raporu (NDA altında),
- Mimari diyagramlar (NDA altında),
- ISO 27001 / 27701 sertifika hazırlık durumu

talep edebilir.

## 7. Politika gözden geçirme

Bu politika **yılda bir kez** veya teknolojide / mevzuatta köklü değişiklik olduğunda gözden geçirilir. Gözden geçirme sonucu yapılan değişiklikler bu sayfada yayımlanır; köklü değişiklikler kayıtlı kullanıcılara e-posta ile bildirilir.

## 8. İletişim

- Bilgi güvenliği konuları: {{KVKK_CONTACT_EMAIL}}
- Şüpheli faaliyet bildirimi: {{LEGAL_CONTACT_EMAIL}}
- Bug bounty / vulnerability disclosure: {{KVKK_CONTACT_EMAIL}} (responsible disclosure 90 gün)`,
};

export const BILGI_GUVENLIGI_EN = {
  title: 'Information Security Policy',
  description:
    'Administrative and technical security measures applied by the {{COMPANY_NAME}} platform under KVKK Art.12.',
  effectiveLabel: 'Effective from',
  content: `## 1. Purpose and scope

This policy documents the administrative and technical measures {{COMPANY_NAME}} ("Buaze") applies to maintain confidentiality, integrity and availability of all data processed on the platform. It is based on Article 12 of the Turkish KVKK (Personal Data Protection Law) and the "Personal Data Security Guide" issued by the Personal Data Protection Authority (December 2018).

## 2. Governance and responsibilities

- **Information Security Officer:** An internal manager coordinates KVKK compliance, security measures and incident response.
- **Data Controller Representative:** Person assigned for VERBIS (Turkish data controllers' registry) compliance.
- **Sub-processors:** Bound by KVKK Art. 8 and the Data Processing Agreement (DPA).

## 3. Administrative measures

- **Access policy:** Staff access only data necessary for their role (least privilege). Access requests are justified and logged.
- **Training:** All staff complete KVKK + security training at least once a year. New hires are trained before getting access.
- **Confidentiality:** Staff and third parties sign confidentiality agreements; obligations survive termination.
- **Discipline:** Policy violations face graded sanctions from written warning to termination.
- **Contractual controls:** Every sub-processor signs a written DPA; periodic audits are conducted.
- **VERBIS:** Registration is completed and maintained when statutory thresholds are exceeded.

## 4. Technical measures

### 4.1 Access and authentication

- **Password policy:** min. 8 chars, alphanumeric required, stored as bcrypt hash (12 rounds).
- **Two-factor authentication (2FA):** TOTP-based; mandatory for admin accounts, optional for end users.
- **Session management:** JWT + httpOnly + secure cookie + 7-day TTL. Server-side revocation via the UserSession table; "Sign out other devices" exposed to users.
- **Brute-force protection:** Rate limit (Upstash Redis) on login + password reset endpoints.
- **Role-based access (RBAC):** superadmin / manager / restaurant_owner / team_member roles; IDOR checks on every API.

### 4.2 Data in transit

- TLS 1.2+ enforced; HSTS prevents downgrade attacks.
- Certificates auto-renewed via Let's Encrypt or equivalent CA.
- CORS rules applied as a whitelist.

### 4.3 Database and storage

- Database provider (Supabase / PostgreSQL): TLS, row-level security supported.
- Backups: daily automated, 7-day retention, off-site replica.
- Sensitive fields are encrypted or hashed (passwords, OAuth tokens, 2FA secrets).
- Data-at-rest encryption: AES-256 at the cloud provider.

### 4.4 Application security

- **OWASP Top 10**: SQL injection (Prisma parameterised queries), XSS (React escaping), CSRF (SameSite cookie), SSRF (URL allowlist), server-side input validation.
- **reCAPTCHA Enterprise**: Bot protection on signup, login and public forms.
- **Honeypot fields**: Anti-bot decoy inputs.
- **Content Security Policy (CSP)**: inline script + eval blocked.
- **Dependency hygiene**: \`npm audit\` periodic scans; high-severity issues patched within 7 days.

### 4.5 Logging and monitoring

- Sentry: error tracking + performance tracing (KVKK-compliant, send_default_pii=false).
- Audit log: admin write operations (\`admin_audit_logs\` table).
- IP retention: {{IP_RETENTION_DAYS}} days; anonymisation cron runs thereafter.
- Access logs retained at least 6 months.

### 4.6 Backup and continuity

- **RPO** (Recovery Point Objective): max 24 hours of data loss.
- **RTO** (Recovery Time Objective): max 4 hours to restore.
- Annual drills: backup restore + disaster recovery scenarios are tested.

## 5. Data breach response

Full procedure in the "Data Breach Response Policy". Summary:

- Internal alert within 24 hours,
- Notification to KVKK Authority within 72 hours (if threshold met),
- Affected data subjects notified within a reasonable period.

## 6. Independent security audits

Buaze is open to independent information security audits annually or on request. Corporate customers may request via {{LEGAL_CONTACT_EMAIL}}:

- Penetration test summary report (under NDA),
- Architecture diagrams (under NDA),
- ISO 27001 / 27701 certification readiness.

## 7. Policy review

This policy is reviewed **annually** or upon material technology / regulatory change. Updates are published here; material changes are e-mailed to registered users.

## 8. Contact

- Security topics: {{KVKK_CONTACT_EMAIL}}
- Suspicious activity: {{LEGAL_CONTACT_EMAIL}}
- Vulnerability disclosure: {{KVKK_CONTACT_EMAIL}} (90-day responsible disclosure)`,
};
