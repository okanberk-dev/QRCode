/**
 * Ticari Elektronik İleti İzni — 6563 sayılı Elektronik Ticaretin
 * Düzenlenmesi Hakkında Kanun ("ETK") m. 6 ve "Ticari İletişim ve
 * Ticari Elektronik İletiler Hakkında Yönetmelik" çerçevesinde,
 * SMS / e-posta / arama ile pazarlama yapılabilmesi için ALICI'dan
 * onceden alınan AÇIK onay metnidir. İYS (İleti Yönetim Sistemi) m. 6
 * uyarınca zorunlu kayıt edilir.
 */

export const TICARI_ILETI_TR = {
  title: 'Ticari Elektronik İleti İzni',
  description:
    '{{COMPANY_NAME}} tarafından SMS, e-posta veya arama ile gönderilecek ticari elektronik iletilere yönelik onay metni (ETK m. 6).',
  effectiveLabel: 'Yürürlük tarihi',
  content: `## Beyan

6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ("ETK") m. 6, Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik ve 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") m. 5/1 kapsamında, aşağıdaki açıklamaları okuduğumu ve benimle ETK kapsamında ticari elektronik ileti gönderilmesine **onay verdiğimi** beyan ederim.

## 1. İletinin gönderici tarafı

İletilerin gönderim sorumlusu {{COMPANY_NAME}} ve gerektiğinde işbirliği yaptığı aracı hizmet sağlayıcılarıdır. Hizmet aldığım restoran / işletme, kendi adına bu iletiyi tetikleyen taraf olabilir.

## 2. İletilebilecek kanallar

- E-posta
- SMS / MMS
- Otomatik arama
- Anlık bildirim (push)
- Mobil uygulama içi mesaj

## 3. İçerik

Ticari elektronik iletiler şunları kapsayabilir:

- Kampanya, indirim, kupon, sadakat programı
- Yeni menü ve ürün duyuruları
- Etkinlik davetleri ve sezonsal kutlamalar
- Müşteri memnuniyeti ve geri bildirim anketleri
- Açıkça pazarlama amaçlı olmayan, hizmetin işleyişine ilişkin bilgilendirme iletileri ETK m. 6 dışında kalır ve onay aranmaksızın gönderilebilir.

## 4. İYS (İleti Yönetim Sistemi)

ETK m. 6 ve İleti Yönetim Sistemi Yönetmeliği uyarınca onayım, gönderim öncesinde İYS'ye (iys.org.tr) kaydedilecektir. iys.org.tr üzerinden kimlik doğrulamasıyla giriş yaparak izinlerimi görüntüleyebilir, kanal bazında değiştirebilir veya tamamen reddedebilirim.

## 5. Ret hakkı

Bu izni hiçbir gerekçe göstermeksizin ve **ücretsiz** olarak her zaman geri çekebilirim:

- Her iletide bulunması zorunlu olan "RED" / "ÇIK" / "Bültenden çık" bağlantısını kullanarak,
- iys.org.tr üzerinden,
- {{KVKK_CONTACT_EMAIL}} adresine başvurarak.

Ret talebim alındığı tarihten itibaren en geç 3 iş günü içinde işleme alınır.

## 6. Saklama

İletişim onayım ve ret kayıtlarım, ispat yükümlülüğü gereği iznin sona ermesinden itibaren en az 3 yıl süreyle saklanır.

## 7. Bilgi güvenliği

İletilen veriler KVKK m. 12 uyarınca yetkisiz erişime, değiştirilmeye ve ifşaya karşı uygun teknik ve idari tedbirlerle korunur.

## 8. Onay kapsamı

İşbu izin, hizmetten yararlanmamın ön şartı **değildir**. Bu onayı vermesem dahi platform üzerindeki temel hizmetlerden yararlanabilir, geri bildirim formunu gönderebilirim.

Yukarıdaki bilgileri okudum, anladım ve **AÇIK RIZA / ONAY** veriyorum.`,
};

export const TICARI_ILETI_EN = {
  title: 'Commercial Electronic Message Consent',
  description:
    'Consent statement for commercial electronic messages sent by SMS, e-mail or call from {{COMPANY_NAME}} (Turkish ETK Art. 6).',
  effectiveLabel: 'Effective from',
  content: `## Statement

I confirm that I have read the explanations below and that I **consent** to receiving commercial electronic messages from {{COMPANY_NAME}}, in line with Article 6 of Turkish Law on the Regulation of Electronic Commerce No. 6563 ("ETK"), the related Regulation on Commercial Communication and Commercial Electronic Messages and Article 5/1 of the Personal Data Protection Law No. 6698 ("KVKK").

## 1. Sender

Messages are sent by {{COMPANY_NAME}} or its delegated intermediary service providers. The restaurant / business I interacted with may also be the party triggering the message.

## 2. Channels

- E-mail
- SMS / MMS
- Automated calls
- Push notifications
- In-app messages

## 3. Content

Commercial electronic messages may include:

- Campaigns, discounts, coupons, loyalty programmes
- New menu and product announcements
- Event invitations and seasonal greetings
- Customer satisfaction and feedback surveys
- Service-related, non-marketing notifications fall outside ETK Art. 6 and may be sent without separate consent.

## 4. IYS (Message Management System)

Under ETK Art. 6 and the related regulation, my consent will be recorded in the official IYS database (iys.org.tr) prior to any send. I may log in to iys.org.tr after identity verification to view, modify or fully revoke my consent on a channel-by-channel basis.

## 5. Right to opt out

I may withdraw this consent at any time, **free of charge** and without justification:

- Using the mandatory "REJECT" / "Unsubscribe" link in every message,
- Through iys.org.tr,
- By contacting {{KVKK_CONTACT_EMAIL}}.

My request is actioned within 3 business days at the latest.

## 6. Retention

My consent and opt-out records are retained for at least 3 years following expiration of the consent, as required for evidence purposes.

## 7. Information security

Transmitted data is protected against unauthorised access, alteration and disclosure with appropriate technical and organisational measures, in accordance with KVKK Art. 12.

## 8. Scope of consent

This consent is **not** a precondition for using the service. Even without granting it, I may continue to use core platform features and submit feedback.

I have read the above and hereby give my **EXPLICIT CONSENT**.`,
};
