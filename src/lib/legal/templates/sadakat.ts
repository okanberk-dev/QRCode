/**
 * Loyalty card and customer account legal texts (CLAUDE.md §60, §61).
 *
 * Roles:
 *  - Each business runs its own loyalty programme and is the DATA CONTROLLER
 *    of its members' card data (name, phone, e-mail, visits, rewards).
 *    {{COMPANY_NAME}} (Buaze) provides the software and is its DATA
 *    PROCESSOR (KVKK m. 12, Veri İşleyici Sözleşmesi).
 *  - For the optional Buaze customer account (one login for every card),
 *    Buaze is the data controller of the account data.
 *
 * Business placeholders ({{ISLETME_ADI}}, {{ISLETME_ADRESI}},
 * {{ISLETME_ILETISIM}}) are filled per business on /l/<slug>/kosullar and
 * /l/<slug>/aydinlatma; the general pages fill them with a neutral phrase
 * (src/lib/legal/loyalty-legal.ts).
 */

// ─── 1. Membership terms (member ↔ business) ─────────────────────────────

export const SADAKAT_UYELIK_TR = {
  title: 'Sadakat Programı Üyelik Koşulları',
  description:
    '{{ISLETME_ADI}} sadakat programına (dijital damga / puan kartı) üyeliğin koşulları: kazanım, ödüller, süreler ve haklarınız.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Taraflar ve konu

Bu koşullar, {{ISLETME_ADI}} ("İşletme") tarafından sunulan sadakat programına ("Program") katılan kişi ("Üye") ile İşletme arasındaki ilişkiyi düzenler. Program, {{COMPANY_NAME}} ("Buaze") tarafından sağlanan yazılım üzerinden dijital kart olarak yürütülür. Buaze programın tarafı değildir; ödülleri sunan ve programın kurallarını belirleyen İşletmedir.

İşletme iletişim bilgileri: {{ISLETME_ILETISIM}}

## 2. Üyelik

- Üyelik ücretsizdir. 18 yaşından küçükler veli veya vasisinin onayıyla katılabilir.
- Üye olmak için ad, soyad ve cep telefonu numarası gerekir; e-posta ve doğum günü isteğe bağlıdır.
- Her kişi bir programda bir kart açabilir. Kart kişiye özeldir; devredilemez, satılamaz.
- Kart bağlantısı (QR kod ve kart kodu) kartın anahtarıdır. Üye bu bağlantıyı başkalarıyla paylaşmamakla yükümlüdür; paylaşımdan doğan kayıplardan İşletme ve Buaze sorumlu değildir.

## 3. Damga ve puan kazanımı

- Damga veya puan yalnızca İşletmede yapılan ziyaret ve alışverişler karşılığında, İşletme personeli tarafından kasada eklenir.
- Kazanım kuralları (ziyaret başına damga/puan, harcamaya göre puan, hoş geldin hediyesi) kart sayfasında ve katılım sayfasında yazılıdır.
- Aynı ziyaret için birden fazla kez damga/puan eklenmesini önlemek amacıyla İşletme bekleme süresi uygulayabilir.
- **Damga, puan veya ödül; yorum yazma, puan verme ya da herhangi bir platformda değerlendirme yapma karşılığında verilmez.** Program, müşteri yorumlarından tamamen bağımsızdır.

## 4. Ödüller

- Ödüllerin içeriği, bedeli (gereken damga/puan) ve geçerliliği İşletme tarafından belirlenir ve kart sayfasında gösterilir.
- Ödül, bakiye yettiğinde İşletmede, personele kart gösterilerek talep edilir; ödül verildiğinde bedeli bakiyeden düşülür.
- Ödüller nakde çevrilemez, başka kişiye devredilemez ve aksi İşletme tarafından belirtilmedikçe başka kampanyalarla birleştirilemez.
- Doğum günü hediyesi (varsa), doğum gününü bildiren üyeye doğduğu ay içinde yılda bir kez verilir.
- Seviyeler (varsa) ziyaret sayısına göre belirlenir; seviye ayrıcalıkları İşletmede uygulanır.

## 5. Süreler ve bakiyenin sona ermesi

- İşletme bir bakiye süresi belirlemişse, son ziyaretten itibaren bu süre boyunca ziyaret olmaması halinde bakiye sıfırlanır. Süre kart sayfasında gösterilir.
- İşletme programı duraklatabilir veya sona erdirebilir. Programın sona erdirilmesinden en az 30 gün önce kart sayfasında duyuru yapılır; bu süre içinde mevcut bakiye ile ödül talep edilebilir.
- İşletme kuralları ileriye dönük olarak değiştirebilir; değişiklik kart sayfasında gösterilir ve daha önce kazanılmış bakiyeyi geriye dönük olarak azaltamaz.

## 6. Kötüye kullanım

Hileli kazanım, başkasına ait kartın kullanılması, sistemin kötüye kullanılması veya personele yönelik uygunsuz davranış halinde İşletme ilgili kazanımları iptal edebilir veya üyeliği sona erdirebilir.

## 7. Üyelikten ayrılma

Üye dilediği zaman kart sayfasındaki "Programdan ayrıl ve verilerimi sil" seçeneğiyle veya İşletmeye başvurarak üyelikten ayrılabilir. Ayrılma ile kart, bakiye ve hareket geçmişi silinir; kullanılmamış bakiye iade edilmez ve nakde çevrilmez.

## 8. Kişisel veriler

Kişisel verilerin işlenmesine ilişkin bilgiler **Sadakat Programı Aydınlatma Metni**'nde yer alır. Kampanya ve fırsatlarla ilgili ticari elektronik ileti yalnızca ayrıca onay verilmesi halinde gönderilir ve bu onay her zaman geri alınabilir.

## 9. Sorumluluk

Ödüllerin sağlanmasından, programın kurallarından ve ürün/hizmetlerden İşletme sorumludur. Buaze, yazılımın kesintisiz çalışması için makul özeni gösterir; teknik kesintiler nedeniyle kart geçici olarak görüntülenemezse bakiye korunur.

## 10. Uyuşmazlıklar

Bu koşullar Türk hukukuna tabidir. Tüketici sıfatıyla Üye; uyuşmazlıklarda, Ticaret Bakanlığınca belirlenen parasal sınırlar dahilinde yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetine, sınırı aşan uyuşmazlıklarda Tüketici Mahkemelerine başvurabilir.`,
};

export const SADAKAT_UYELIK_EN = {
  title: 'Loyalty Programme Membership Terms',
  description:
    'Terms of membership in the {{ISLETME_ADI}} loyalty programme (digital stamp / points card): earning, rewards, expiry and your rights.',
  effectiveLabel: 'Effective date',
  content: `## 1. Parties and scope

These terms govern the relationship between {{ISLETME_ADI}} (the "Business") and the person who joins its loyalty programme (the "Member"). The programme runs as a digital card on software provided by {{COMPANY_NAME}} ("Buaze"). Buaze is not a party to the programme; the Business sets its rules and provides the rewards.

Business contact: {{ISLETME_ILETISIM}}

## 2. Membership

- Membership is free. Minors may join with the consent of a parent or guardian.
- Joining requires first name, last name and mobile number; e-mail and birthday are optional.
- One card per person per programme. The card is personal and cannot be transferred or sold.
- The card link (QR code and card code) is the key to the card; do not share it.

## 3. Earning stamps and points

- Stamps or points are added only by the Business's staff at the counter, for visits and purchases.
- The earning rules are shown on the card and join pages.
- The Business may apply a waiting time so a visit is not counted twice.
- **Stamps, points or rewards are never given for writing a review, giving a rating or any rating on any platform.**

## 4. Rewards

- The Business sets the rewards, their cost and validity, shown on the card page.
- Rewards are claimed at the Business by showing the card; the cost is deducted from the balance.
- Rewards cannot be exchanged for cash or transferred and, unless the Business says otherwise, cannot be combined with other offers.

## 5. Expiry and changes

- If the Business sets a balance validity, the balance resets after that period without a visit.
- The Business may pause or end the programme; ending is announced on the card page at least 30 days in advance.
- Rule changes apply going forward and do not reduce balances already earned.

## 6. Misuse

The Business may cancel earnings obtained by fraud or end a membership in case of misuse.

## 7. Leaving

The Member may leave at any time from the card page or by contacting the Business. Leaving deletes the card, balance and history; unused balance is not refunded.

## 8. Personal data

See the **Loyalty Programme Privacy Notice**. Marketing messages are sent only with separate consent, which can be withdrawn at any time.

## 9. Liability

The Business is responsible for the rewards and the programme rules. Buaze takes reasonable care to keep the software available.

## 10. Disputes

Turkish law applies. As a consumer, the Member may apply to the Consumer Arbitration Committees or Consumer Courts.`,
};

// ─── 2. Privacy notice (controller: the business) ────────────────────────

export const SADAKAT_AYDINLATMA_TR = {
  title: 'Sadakat Programı Aydınlatma Metni',
  description:
    '{{ISLETME_ADI}} sadakat programı kapsamında kişisel verilerinizin 6698 sayılı KVKK m. 10 uyarınca işlenmesine ilişkin bilgilendirme.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Veri sorumlusu

Sadakat programı kapsamındaki kişisel verileriniz, veri sorumlusu sıfatıyla **{{ISLETME_ADI}}** ("İşletme") tarafından işlenir.

- Adres: {{ISLETME_ADRESI}}
- İletişim: {{ISLETME_ILETISIM}}

Programın yazılımı, İşletme adına veri işleyen sıfatıyla {{COMPANY_NAME}} ("Buaze") tarafından sağlanır.

## 2. İşlenen kişisel veriler

- **Kimlik:** ad, soyad
- **İletişim:** cep telefonu numarası, (verdiyseniz) e-posta adresi
- **Müşteri işlem:** kart kodu, damga/puan bakiyesi, ziyaret ve ödül hareketleri, harcama tutarı (puan kartında personelin girdiği tutar), seviye
- **Doğum günü:** (verdiyseniz) gün ve ay — yıl bilgisi alınmaz
- **Pazarlama:** ticari ileti onayı ve tarihi
- **İşlem güvenliği:** katılım sırasında IP adresi ve tarayıcı bilgisi, işlemi yapan personel kaydı

## 3. İşleme amaçları ve hukuki sebepler

| Amaç | Hukuki sebep (KVKK m. 5) |
|---|---|
| Kartın açılması, damga/puan eklenmesi, ödüllerin verilmesi, kartın kasada bulunması | Sözleşmenin kurulması ve ifası (m. 5/2-c) |
| Aynı ziyaretin iki kez sayılmasının ve kötüye kullanımın önlenmesi, işlem kaydı | Meşru menfaat (m. 5/2-f), hukuki yükümlülük (m. 5/2-ç) |
| Doğum günü hediyesinin verilmesi | Sözleşmenin ifası (m. 5/2-c) — bilgi isteğe bağlıdır |
| Kampanya ve fırsatların SMS / e-posta ile duyurulması | Açık rıza ve 6563 sayılı Kanun m. 6 kapsamında onay |
| Kart bağlantısının e-posta ile gönderilmesi | Sözleşmenin ifası (m. 5/2-c) |

## 4. Toplama yöntemi

Veriler, QR kod veya NFC etiketiyle açılan katılım formundan, (kullanıyorsanız) Buaze müşteri hesabınızdan veya İşletme personeli tarafından kasada elektronik ortamda toplanır.

## 5. Aktarım

- Veriler, yazılım hizmeti için veri işleyen sıfatıyla Buaze'ye ve Buaze'nin altyapı sağlayıcılarına aktarılır. Altyapı sağlayıcıları: {{SUBPROCESSOR_TRANSFER_LIST}}. Yurt dışına aktarım KVKK m. 9'daki güvencelere uygun yapılır.
- Kanunen yetkili kamu kurum ve kuruluşlarına, talep halinde ve mevzuatın gerektirdiği ölçüde aktarılabilir.
- Verileriniz başka işletmelerle paylaşılmaz ve satılmaz.

## 6. Saklama süresi

Kart verileri üyelik süresince saklanır. Üyelikten ayrıldığınızda kart, bakiye ve hareket geçmişi silinir. İşlem kayıtları, mevzuattan doğan saklama yükümlülükleri sona erene kadar saklanabilir. Ticari ileti onay kayıtları, onayın geri alınmasından itibaren 3 yıl saklanır.

## 7. Haklarınız (KVKK m. 11)

Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.

Başvurularınızı İşletmeye ({{ISLETME_ILETISIM}}) yazılı olarak iletebilirsiniz. Kartınızı ve verilerinizi kart sayfasındaki "Programdan ayrıl ve verilerimi sil" seçeneğiyle de anında silebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır.`,
};

export const SADAKAT_AYDINLATMA_EN = {
  title: 'Loyalty Programme Privacy Notice',
  description:
    'How {{ISLETME_ADI}} processes your personal data in its loyalty programme (KVKK Art. 10).',
  effectiveLabel: 'Effective date',
  content: `## 1. Data controller

Your loyalty programme data is processed by **{{ISLETME_ADI}}** (the "Business") as data controller. Address: {{ISLETME_ADRESI}}. Contact: {{ISLETME_ILETISIM}}. The software is provided by {{COMPANY_NAME}} ("Buaze") as data processor on behalf of the Business.

## 2. Data processed

- Identity: first and last name
- Contact: mobile number, e-mail (if given)
- Customer transactions: card code, balance, visits, rewards, spend entered by staff (points cards), tier
- Birthday: day and month (if given), never the year
- Marketing: consent and its date
- Security: IP address and browser at joining, which staff member made each change

## 3. Purposes and legal grounds

- Opening the card, adding stamps / points, giving rewards: performance of a contract (Art. 5/2-c)
- Preventing double counting and misuse, keeping a log: legitimate interest (Art. 5/2-f)
- Birthday gift: performance of a contract (optional data)
- Marketing messages by SMS / e-mail: explicit consent and Law No. 6563 Art. 6
- Sending your card link by e-mail: performance of a contract

## 4. Transfers

To Buaze as processor and its infrastructure providers ({{SUBPROCESSOR_TRANSFER_LIST}}), with the safeguards of KVKK Art. 9 for transfers abroad, and to authorities where the law requires. Never sold or shared with other businesses.

## 5. Retention

For as long as you are a member. Leaving deletes the card, balance and history; logs required by law may be kept for the legal period. Consent records are kept for 3 years after withdrawal.

## 6. Your rights (KVKK Art. 11)

You may ask the Business ({{ISLETME_ILETISIM}}) for access, correction, deletion and the other rights under KVKK Art. 11, or delete your card at once from the card page. Requests are answered free of charge within 30 days.`,
};

// ─── 3. Customer account terms (Buaze ↔ customer) ────────────────────────

export const MUSTERI_HESABI_KOSULLAR_TR = {
  title: 'Buaze Müşteri Hesabı Kullanım Koşulları',
  description:
    'İşletmelerin sadakat kartlarını tek yerden yönetmenizi sağlayan ücretsiz Buaze müşteri hesabının kullanım koşulları.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Taraflar ve hizmet

Bu koşullar, {{COMPANY_NAME}} ("Buaze") ile Buaze müşteri hesabı ("Hesap") oluşturan kişi ("Kullanıcı") arasındaki ilişkiyi düzenler. Hesap; Buaze'yi kullanan işletmelerin sadakat programlarına katılmanızı, kartlarınızı tek yerden görmenizi ve profilinizi yönetmenizi sağlayan **ücretsiz** bir hizmettir.

## 2. Hesap oluşturma

- Hesap e-posta ve şifre ile veya Google hesabınızla oluşturulur. Ad, soyad ve e-posta zorunludur; telefon numarası sadakat kartı açmak için gerekir.
- Verdiğiniz bilgilerin doğru ve güncel olması sizin sorumluluğunuzdadır.
- Şifrenizin gizliliğinden siz sorumlusunuz. Hesabınızın izinsiz kullanıldığını düşünüyorsanız şifrenizi değiştirin ve {{SUPPORT_EMAIL}} adresine bildirin.
- 18 yaşından küçükler veli veya vasisinin onayıyla hesap açabilir.

## 3. İşletmelerle ilişkiniz

- Bir işletmenin sadakat programına hesabınızla katıldığınızda ad, soyad, telefon, (verdiyseniz) e-posta ve doğum günü bilgileriniz, onayınızla o işletmeye iletilir. Bu andan itibaren kart verileriniz bakımından o işletme veri sorumlusudur.
- Sadakat programlarının kuralları ve ödülleri ilgili işletme tarafından belirlenir ve sağlanır; Buaze bu programların tarafı değildir. Her programın **Sadakat Programı Üyelik Koşulları** ayrıca geçerlidir.
- Profilinizde yaptığınız ad, e-posta ve doğum günü değişiklikleri hesabınıza bağlı kartlara da yansıtılır.

## 4. Kullanım kuralları

Hesabı başkası adına açamaz, başkasının kartını hesabınıza ekleyemez, sistemi otomatik araçlarla kötüye kullanamaz, ödül veya damga elde etmek için hile yapamazsınız. Bu kurallara aykırılık halinde Buaze hesabı askıya alabilir veya kapatabilir.

## 5. Hesabın kapatılması

Hesabınızı profil sayfanızdan dilediğiniz zaman silebilirsiniz. Silme sırasında kartlarınızın da silinmesini seçebilirsiniz; seçmezseniz kartlar ilgili işletmelerde hesapsız kart olarak kalır ve her birini kart sayfasından ayrıca silebilirsiniz.

## 6. Hizmetin değiştirilmesi

Buaze hizmeti geliştirebilir veya değiştirebilir. Koşullardaki önemli değişiklikler hesabınızda veya e-posta ile duyurulur. Hesabınızı kullanmaya devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelmez; önemli değişikliklerde onayınız ayrıca istenir.

## 7. Sorumluluk

Buaze hizmetin kesintisiz ve güvenli çalışması için makul özeni gösterir. İşletmelerin sunduğu ürün, hizmet ve ödüllerden ilgili işletme sorumludur.

## 8. Uyuşmazlıklar

Bu koşullar Türk hukukuna tabidir. Tüketici sıfatıyla Kullanıcı; parasal sınırlar dahilinde Tüketici Hakem Heyetlerine, sınırı aşan uyuşmazlıklarda Tüketici Mahkemelerine başvurabilir.

İletişim: {{COMPANY_NAME}}, {{COMPANY_ADDRESS}} · {{SUPPORT_EMAIL}}`,
};

export const MUSTERI_HESABI_KOSULLAR_EN = {
  title: 'Buaze Customer Account Terms',
  description: 'Terms of the free Buaze customer account that keeps your loyalty cards in one place.',
  effectiveLabel: 'Effective date',
  content: `## 1. Parties and service

These terms govern the free Buaze customer account (the "Account") between {{COMPANY_NAME}} ("Buaze") and you. The Account lets you join the loyalty programmes of businesses that use Buaze, see your cards in one place and manage your profile.

## 2. Creating an account

- Sign up with e-mail and password or with Google. First name, last name and e-mail are required; a phone number is needed to open a loyalty card.
- Keep your details accurate and your password secret. Report misuse to {{SUPPORT_EMAIL}}.
- Minors need the consent of a parent or guardian.

## 3. You and the businesses

- When you join a programme with your Account, your name, phone, e-mail (if given) and birthday (if given) are shared with that business with your consent. The business is the data controller of your card data.
- Each business sets and provides its own programme and rewards; its **Loyalty Programme Membership Terms** also apply.
- Changes to your name, e-mail and birthday are copied to the cards linked to your Account.

## 4. Rules

Do not open an account for someone else, add someone else's card, misuse the service with automated tools or cheat for stamps or rewards. Buaze may suspend or close accounts that break these rules.

## 5. Closing your account

Delete your Account at any time from your profile, optionally with all your cards.

## 6. Liability and disputes

Buaze takes reasonable care to keep the service available and secure; businesses are responsible for their products and rewards. Turkish law applies; consumers may apply to Consumer Arbitration Committees or Consumer Courts.

Contact: {{COMPANY_NAME}}, {{COMPANY_ADDRESS}} · {{SUPPORT_EMAIL}}`,
};

// ─── 4. Customer account privacy notice (controller: Buaze) ──────────────

export const MUSTERI_HESABI_AYDINLATMA_TR = {
  title: 'Buaze Müşteri Hesabı Aydınlatma Metni',
  description:
    'Buaze müşteri hesabı kapsamında kişisel verilerinizin 6698 sayılı KVKK m. 10 uyarınca işlenmesine ilişkin bilgilendirme.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## 1. Veri sorumlusu

Müşteri hesabınıza ait kişisel veriler, veri sorumlusu sıfatıyla **{{COMPANY_NAME}}** ("Buaze") tarafından işlenir. Adres: {{COMPANY_ADDRESS}} · E-posta: {{KVKK_CONTACT_EMAIL}}

Hesabınızla katıldığınız sadakat programlarındaki kart verilerinizin veri sorumlusu ise ilgili işletmedir; bu veriler için o işletmenin **Sadakat Programı Aydınlatma Metni** geçerlidir.

## 2. İşlenen kişisel veriler

- **Kimlik:** ad, soyad
- **İletişim:** e-posta adresi, telefon numarası
- **Hesap:** şifrenin geri döndürülemez özeti (şifrenin kendisi saklanmaz), Google ile girişte Google hesap kimliği, dil tercihi, e-posta doğrulama durumu
- **Profil:** (verdiyseniz) doğum günü — gün ve ay
- **İşlem güvenliği:** giriş zamanları, IP adresi, tarayıcı bilgisi
- **Pazarlama:** ticari ileti onayı ve tarihi

## 3. Amaçlar ve hukuki sebepler

| Amaç | Hukuki sebep (KVKK m. 5) |
|---|---|
| Hesabın açılması, girişin sağlanması, kartlarınızın listelenmesi, profil yönetimi | Sözleşmenin kurulması ve ifası (m. 5/2-c) |
| Katıldığınız işletmeye bilgilerinizin iletilmesi | Sözleşmenin ifası (m. 5/2-c) ve katılım sırasında verdiğiniz onay |
| E-posta doğrulama ve şifre sıfırlama e-postaları | Sözleşmenin ifası (m. 5/2-c) |
| Hesap güvenliği, kötüye kullanımın önlenmesi | Meşru menfaat (m. 5/2-f), hukuki yükümlülük (m. 5/2-ç) |
| Buaze kampanya ve duyuruları | Açık rıza ve 6563 sayılı Kanun m. 6 kapsamında onay |

## 4. Toplama yöntemi

Veriler; kayıt ve profil formlarından, Google ile giriş yaptığınızda Google'ın paylaştığı ad, e-posta ve hesap kimliğinden elektronik ortamda toplanır.

## 5. Aktarım

- Bir sadakat programına katıldığınızda kimlik, iletişim ve doğum günü bilgileriniz ilgili işletmeye aktarılır.
- Hizmetin işletilmesi için altyapı sağlayıcılarımıza aktarılır: {{SUBPROCESSOR_TRANSFER_LIST}}. Yurt dışına aktarım KVKK m. 9'daki güvencelere uygun yapılır.
- Google ile girişte kimlik doğrulama Google tarafından yapılır.
- Kanunen yetkili kamu kurum ve kuruluşlarına mevzuatın gerektirdiği ölçüde aktarılabilir.

## 6. Saklama süresi

Hesap verileri hesap açık kaldığı sürece saklanır; hesabınızı sildiğinizde hesap verileri silinir. Güvenlik kayıtları mevzuattaki süreler boyunca, ticari ileti onay kayıtları onayın geri alınmasından itibaren 3 yıl saklanır.

## 7. Haklarınız (KVKK m. 11)

KVKK m. 11'deki haklarınızı {{KVKK_CONTACT_EMAIL}} adresine yazarak kullanabilirsiniz. Profilinizdeki bilgileri kendiniz düzeltebilir, hesabınızı profil sayfanızdan silebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır. Kişisel Verileri Koruma Kuruluna şikâyet hakkınız saklıdır.`,
};

export const MUSTERI_HESABI_AYDINLATMA_EN = {
  title: 'Buaze Customer Account Privacy Notice',
  description: 'How Buaze processes your customer account data (KVKK Art. 10).',
  effectiveLabel: 'Effective date',
  content: `## 1. Data controller

{{COMPANY_NAME}} ("Buaze") is the controller of your customer account data. Address: {{COMPANY_ADDRESS}} · E-mail: {{KVKK_CONTACT_EMAIL}}. For the cards in the programmes you join, the business is the controller (see its Loyalty Programme Privacy Notice).

## 2. Data processed

Name; e-mail and phone; a one-way hash of your password (never the password), your Google account ID if you sign in with Google, language and e-mail verification status; birthday (day and month, if given); sign-in times, IP address and browser; marketing consent.

## 3. Purposes and legal grounds

Running the account and showing your cards (contract, Art. 5/2-c); passing your details to a business you join (contract and your consent at joining); verification and password e-mails (contract); security and misuse prevention (legitimate interest, legal obligation); Buaze offers (explicit consent, Law No. 6563 Art. 6).

## 4. Transfers

To the businesses you join, to our infrastructure providers ({{SUBPROCESSOR_TRANSFER_LIST}}) with KVKK Art. 9 safeguards, to Google for Google sign-in, and to authorities where the law requires.

## 5. Retention and rights

Kept while the account is open and deleted when you delete it (security logs and consent records for the legal periods). Exercise your KVKK Art. 11 rights at {{KVKK_CONTACT_EMAIL}}; you can also edit or delete your account yourself.`,
};

// ─── 5. Business addendum (Buaze ↔ business) ─────────────────────────────

export const SADAKAT_ISLETME_EKI_TR = {
  title: 'Sadakat Programı İşletme Eki',
  description:
    'Buaze sadakat kartı modülünü kullanan işletmenin sorumlulukları: veri sorumluluğu, ödüller, ticari ileti ve Google kuralları.',
  effectiveLabel: 'Yürürlük tarihi',
  content: `Bu ek, {{COMPANY_NAME}} ("Buaze") ile Platform Kullanım Sözleşmesi kapsamında Buaze'yi kullanan işletme ("İşletme") arasında, sadakat kartı modülünün kullanımına ilişkin özel hükümleri içerir. Platform Kullanım Sözleşmesi ve Veri İşleyici Sözleşmesi (DPA) bu ekle birlikte uygulanır.

## 1. Roller

- İşletme, sadakat programının sahibidir ve üyelerinin kart verileri (ad, soyad, telefon, e-posta, doğum günü, ziyaret ve ödül hareketleri) bakımından **veri sorumlusudur**.
- Buaze, yazılımı sağlar ve bu veriler bakımından İşletme adına **veri işleyendir**; verileri yalnızca İşletmenin talimatı ve DPA doğrultusunda işler.
- Buaze müşteri hesabı verileri bakımından veri sorumlusu Buaze'dir; hesap sahibi bir müşteri programa katıldığında bilgileri onayıyla İşletmeye iletilir.

## 2. İşletmenin yükümlülükleri

- Program kurallarını, ödülleri ve koşulları açık ve doğru biçimde belirlemek; ilan ettiği ödülleri sağlamak.
- Katılım sayfasında gösterilen Sadakat Programı Aydınlatma Metni ve Üyelik Koşulları'ndaki veri sorumlusu bilgilerini (unvan, adres, iletişim) güncel tutmak.
- Üyelerin KVKK m. 11 kapsamındaki başvurularını yanıtlamak; silme taleplerini panelden yerine getirmek.
- Kasada müşteri adına kart açarken müşteriyi aydınlatma metni hakkında bilgilendirmek ve onayını almak.
- Personel erişimini yetkiye göre vermek (kasa personeli / yönetici) ve hesap güvenliğini sağlamak.
- Üye verilerini yalnızca programın yürütülmesi amacıyla kullanmak; satmamak ve başka amaçla paylaşmamak.

## 3. Ticari elektronik ileti

İşletme, yalnızca ticari ileti onayı veren üyelere ticari elektronik ileti gönderebilir; 6563 sayılı Kanun ve İleti Yönetim Sistemi (İYS) yükümlülüklerini (kayıt, ret bağlantısı, onay kaydı) kendisi yerine getirir. Buaze bu modül kapsamında üyelere ticari ileti göndermez.

## 4. Yorumlar ve platform kuralları

İşletme; damga, puan, ödül veya herhangi bir avantajı yorum yazma, puan verme ya da Google veya başka bir platformda değerlendirme yapma karşılığında vermeyeceğini kabul eder. Buaze, ödül metinlerinde bu yönde çağrışım tespit ettiğinde kaydı engelleyebilir.

## 5. Tüketici mevzuatı

Programın tüketiciye yönelik koşulları 6502 sayılı Tüketicinin Korunması Hakkında Kanun'a ve ilgili mevzuata uygun olmalıdır. Programın sona erdirilmesi halinde İşletme, üyelere makul bir süre (en az 30 gün) tanır.

## 6. Verilerin sonu

Modülün kapatılması veya aboneliğin sona ermesi halinde üye verileri silinmez; İşletme dışa aktarabilir. Hesabın silinmesi halinde veriler DPA'daki sürelerle silinir.

## 7. Sorumluluk

Ödüllerin sağlanmasından, program kurallarından ve üyelerle ilişkiden İşletme sorumludur. Buaze'nin sorumluluğu Platform Kullanım Sözleşmesi'ndeki sınırlarla belirlidir.`,
};

export const SADAKAT_ISLETME_EKI_EN = {
  title: 'Loyalty Programme Business Addendum',
  description:
    'Responsibilities of a business using the Buaze loyalty card: data controllership, rewards, marketing messages and Google rules.',
  effectiveLabel: 'Effective date',
  content: `This addendum between {{COMPANY_NAME}} ("Buaze") and the business using Buaze (the "Business") sets out special terms for the loyalty card module, together with the Platform User Agreement and the Data Processing Agreement (DPA).

## 1. Roles

The Business owns its programme and is the **data controller** of its members' card data; Buaze is the **data processor** acting on the Business's instructions under the DPA. Buaze is the controller of customer account data; details of an account holder who joins are passed to the Business with their consent.

## 2. Business obligations

Set clear rules and honour the rewards; keep the controller details on the privacy notice current; answer members' KVKK Art. 11 requests and delete on request; inform customers and obtain consent when opening a card for them at the counter; give staff access by role; use member data only to run the programme.

## 3. Marketing messages

Send marketing only to members who consented and meet Law No. 6563 and IYS obligations yourself. Buaze does not send marketing messages to members through this module.

## 4. Reviews

The Business will never give stamps, points, rewards or any advantage for writing a review or giving a rating on Google or any other platform. Buaze may block reward texts that suggest otherwise.

## 5. Consumer law and end of use

The programme must comply with Consumer Protection Law No. 6502; members get at least 30 days' notice before a programme ends. Member data is kept when the module is switched off and can be exported.`,
};
