import { RtStickyFeature, type StickyItem } from '../ritim/interactive';
import { img } from '../ritim/media';

/**
 * How it works — "Ritim" sticky feature slider (`.rt-sticky-feature`): cream
 * 48 px panel, 48/52.8 list on the left (inactive items in ink-300), a
 * sticky 636×720 photo on the right that cross-fades with the active item.
 * The review flow is told once, the D1 way (§51): at or above the owner's
 * threshold the chosen platform's review page opens; below it the customer
 * can write privately first, and the public link stays on the same screen.
 */
const COPY: Record<'tr' | 'en', { title: string; lead: string; items: StickyItem[] }> = {
  tr: {
    title: 'QR kodla yorum toplama üç adımda işler',
    lead: 'Teknik bilgi gerekmez: QR kodunuzu panelden oluşturup yerleştirmeniz yeterli.',
    items: [
      {
        title: 'QR kodunuzu yerleştirin',
        body: 'Panelden QR kod oluşturun; isterseniz masa veya oda etiketi ekleyin. PNG olarak indirin ya da PDF olarak yazdırın.',
        img: img('masa-ustten'),
        caption: 'Masaya, adisyona, kapıya ya da pakete.',
      },
      {
        title: 'Müşteri puan verir',
        body: 'Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altında müşteri önce size yazabilir; herkese açık yorum bağlantısı aynı ekranda durur.',
        img: img('musteri-telefon'),
        caption: 'Her müşteri herkese açık yorum bağlantısını görür.',
      },
      {
        title: 'Geri bildirimi yanıtlayın',
        body: 'Özel geri bildirimler panelinize düşer. Müşteri e-posta bıraktıysa yanıtınız e-postayla gider; bırakmadıysa panelde kayıt olarak kalır.',
        img: img('destek-ekip'),
        caption: 'Yanıtınız e-postayla gider ya da panelde kalır.',
      },
      {
        title: 'Anında e-posta uyarısı',
        body: '1–3 yıldızlık her yeni geri bildirimde e-posta alırsınız; her pazartesi haftalık özet gelir. İkisini de ayarlardan kapatabilirsiniz.',
        img: img('kafe-sayac'),
        caption: 'Düşük puan geldiğinde hemen haberiniz olur.',
      },
      {
        title: 'Ekip ve çoklu işletme',
        body: 'Ekip arkadaşlarınızı yönetici, personel veya görüntüleyici rolüyle davet edin; birden çok işletme arasında tek hesaptan geçin.',
        img: img('mutfak-ekip'),
        caption: 'Şubelerinizi tek hesaptan yönetin.',
      },
    ],
  },
  en: {
    title: 'Collecting reviews with a QR code takes three steps',
    lead: 'No technical skills needed: create your QR code in the panel and put it where customers will see it.',
    items: [
      {
        title: 'Place your QR code',
        body: 'Create a QR code in the panel, with an optional table or room label. Download it as PNG or print it to PDF.',
        img: img('masa-ustten'),
        caption: 'On tables, bills, doors or packages.',
      },
      {
        title: 'The customer rates you',
        body: "At or above the threshold you set (5 stars by default), your chosen platform's review page opens. Below it, the customer can write to you first; the public review link stays on the same screen.",
        img: img('musteri-telefon'),
        caption: 'Every customer sees the public review link.',
      },
      {
        title: 'Reply to feedback',
        body: 'Private feedback lands in your panel. If the customer left an e-mail, your reply goes by e-mail; if not, it stays on record in the panel.',
        img: img('destek-ekip'),
        caption: 'Your reply goes by e-mail or stays in the panel.',
      },
      {
        title: 'Instant e-mail alerts',
        body: 'Get an e-mail for every new 1–3★ piece of feedback, plus a weekly summary every Monday. You can switch both off in settings.',
        img: img('kafe-sayac'),
        caption: 'Know right away when a low rating comes in.',
      },
      {
        title: 'Teams and branches',
        body: 'Invite teammates as managers, staff or viewers, and switch between several businesses in one account.',
        img: img('mutfak-ekip'),
        caption: 'Run all your branches from one account.',
      },
    ],
  },
};

export default function HomeHowItWorks({ locale }: { locale: 'tr' | 'en' }) {
  const c = COPY[locale];
  return (
    <section id="nasil-calisir" className="rt-section rt-reveal" aria-labelledby="how-title">
      <div className="rt-container">
        <RtStickyFeature
          head={
            <>
              <h2 id="how-title" className="rt-t-h1">
                {c.title}
              </h2>
              <p className="rt-t-lead">{c.lead}</p>
            </>
          }
          items={c.items}
        />
      </div>
    </section>
  );
}
