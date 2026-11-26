/**
 * Homepage FAQ — one array feeds both the visible accordion (HomeFaq) and the
 * FAQPage JSON-LD in src/app/[locale]/page.tsx, so structured data always
 * matches what is on the page (spec D12).
 *
 * Every answer is true for the product today (spec D1/D2/D8): the review
 * flow is described with the owner's threshold, compliance is described as
 * behaviour (never "uyumlu/certified"), prices are not printed here (they
 * live in the plan table), and the AI provider is named where data is
 * discussed.
 */

import { DATA_COPY } from '@/lib/legal/subprocessors';

export interface HomeFaqItem {
  q: string;
  a: string;
}

export const HOME_FAQ: Record<'tr' | 'en', readonly HomeFaqItem[]> = {
  tr: [
    {
      q: 'Buaze nedir, nasıl çalışır?',
      a: 'Buaze, işletmelerin QR kodla müşteri geri bildirimi toplamasını ve yorum platformlarındaki bağlantılarını tek hesaptan yönetmesini sağlayan bir yazılımdır. Müşteri QR kodu okutur ve puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
    },
    {
      q: "Buaze, Google'ın yorum kurallarına göre nasıl çalışır?",
      a: 'Buaze yorum silmez, gizlemez veya değiştirmez; sahte yorum yazmaz ve yorum karşılığında indirim, hediye ya da ödül sunmaz. Herkese açık yorum bağlantısı her puanda gösterilir: eşik ve üzerindeki puanlarda yorum sayfası açılır, eşiğin altında ise bağlantı özel geri bildirim formuyla aynı ekranda yer alır. Eşiği 4 ya da 5 yıldız olarak siz belirlersiniz.',
    },
    {
      q: 'Buaze’yi nasıl kurarım?',
      a: 'Hesabınızı açıp işletmenizi ekleyin. Google işletme profilinizi adıyla aratıp seçtiğinizde Buaze, Google yorum bağlantınızı oluşturur; isterseniz diğer platformların bağlantılarını da eklersiniz. Ardından QR kodunuzu PNG olarak indirir ya da PDF olarak yazdırır, masaya, adisyona veya pakete yerleştirirsiniz. Teknik bilgi gerekmez.',
    },
    {
      q: 'Pulse AI yanıtları kendiliğinden gönderir mi?',
      a: `Hayır. Pulse AI yalnızca 2–4 cümlelik bir yanıt taslağı hazırlar; sıcak, resmi veya özür dileyen tonu seçersiniz, taslak Türkçe ya da İngilizce olur. Taslağı düzenler, gönderip göndermeyeceğinize siz karar verirsiniz. Taslağı hazırlamak için ${DATA_COPY.aiSent.tr}.`,
    },
    {
      q: 'Sadakat kartı yorumlarla bağlantılı mı?',
      a: 'Hayır. Sadakat kartı yalnız ziyaret ve alışverişle dolar; yorum ya da puan karşılığında damga, indirim veya ödül verilmez. Müşteri kasadaki QR ya da NFC etiketiyle uygulama indirmeden katılır, personel kartını telefonla okutup damga ekler. Birden çok şubeniz varsa tek kart hepsinde geçerlidir.',
    },
    {
      q: 'Buaze ücretli mi, deneme süresi var mı?',
      a: '14 gün ücretsiz deneyebilirsiniz; kayıt sırasında kredi kartı istenmez. Deneme bitince aylık ya da yıllık ödemeyle devam edersiniz; güncel fiyatlar fiyatlandırma sayfasındadır ve kartla ödeme Türk lirası olarak alınır. Otomatik çekim yoktur; her ödeme bir ay ya da bir yıl açar.',
    },
  ],
  en: [
    {
      q: 'What is Buaze and how does it work?',
      a: "Buaze is software that lets businesses collect customer feedback with QR codes and manage their review-platform links from one account. The customer scans the QR code and gives a rating. At or above the threshold you set (5 stars by default), your chosen platform's review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.",
    },
    {
      q: "How does Buaze work with Google's review rules?",
      a: 'Buaze does not delete, hide or edit reviews, does not write fake reviews and offers no discount, gift or reward in exchange for a review. The public review link is shown at every rating: at or above your threshold the review page opens, and below it the link appears on the same screen as the private feedback form. You set the threshold at 4 or 5 stars.',
    },
    {
      q: 'How do I set it up?',
      a: 'Create an account and add your business. Search for your Google Business Profile by name and select it, and Buaze builds your Google review link; you can add the links of other platforms too. Then download your QR code as PNG or print it to PDF, and place it on tables, bills or packages. No technical skills are needed.',
    },
    {
      q: 'Does Pulse AI ever send a reply without me?',
      a: `No. Pulse AI only prepares a 2–4 sentence reply draft; you choose a warm, formal or apologetic tone, and the draft is written in Turkish or English. You edit it and decide whether to send it. To write the draft, ${DATA_COPY.aiSent.en}.`,
    },
    {
      q: 'Is the loyalty card linked to reviews?',
      a: 'No. The loyalty card fills with visits and purchases only; no stamp, discount or reward is given for a review or a rating. Customers join with the QR or an NFC tag at the counter without an app, and staff scan their card with a phone to add a stamp. With several branches, one card works at all of them.',
    },
    {
      q: 'How much does it cost, and is there a free trial?',
      a: 'You can try Buaze free for 14 days, with no credit card at sign-up. After the trial you continue with a monthly or yearly payment; current prices are on the pricing page, and card payments are taken in Turkish lira. Nothing is charged automatically; each payment opens one month or one year.',
    },
  ],
};
