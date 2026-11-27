import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BarChart3, Bell, Building2, Cake, Crown, MailOpen, Nfc, Palette, QrCode, ScanLine, ShieldCheck, UserRound } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';

// /features/loyalty — digital loyalty card (CLAUDE.md §60, §61). Facts from
// src/lib/loyalty.ts (stamps: up to 30 per reward, 1–10 per visit; points:
// per visit + per spend step; up to 6 rewards, 3 tiers; 6 templates; visit
// cooldown; balance expiry 90/180/365/730 days; yearly birthday gift),
// /api/restaurants/[id]/loyalty/* (counter lookup by QR / code / phone /
// name, CSV export, join QR PNG/SVG + A5 poster, branches, win-back
// settings), staff mode of the card link (src/lib/loyalty-staff.ts), card
// notifications (reward ready + birthday, opt-in, src/lib/loyalty-push.ts),
// win-back e-mail (off by default, consent only, 30–90 days, once per 90
// days) and the /l pages (no app, live card, customer can delete the card).
// Never tied to reviews (Google policy). No SMS, no Apple / Google Wallet.

const SLUG = 'loyalty';

const META = {
  tr: {
    title: 'Dijital sadakat kartı: kafe, restoran ve berber için damga kartı',
    description:
      'Uygulamasız dijital damga ya da puan kartı: müşteri QR ile katılır, siz kartını telefonla okutup damga eklersiniz. Şubelerde tek kart, ödül bildirimi, NFC.',
  },
  en: {
    title: 'Digital loyalty card: stamp cards for cafés, restaurants and barbers',
    description:
      'An app-free digital stamp or points card: customers join with a QR, you scan their card with a phone and add stamps. One card for all branches, reward alerts, NFC.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: { name: 'Sadakat kartı', serviceType: 'Dijital sadakat ve damga kartı', howToName: 'Dijital sadakat kartı nasıl kurulur' },
  en: { name: 'Loyalty card', serviceType: 'Digital loyalty and stamp card', howToName: 'How to set up a digital loyalty card' },
};

function LoyaltyMock({ locale }: { locale: FeatureLocale }) {
  const tr = locale === 'tr';
  return (
    <div className="mx-auto w-full max-w-[420px] space-y-3">
      <LoyaltyCardFace
        businessName={tr ? 'Örnek Kafe' : 'Sample Café'}
        programName={tr ? 'Kahve kartı' : 'Coffee card'}
        kind="stamps"
        balance={7}
        rewards={[{ title: tr ? 'Ücretsiz kahve' : 'Free coffee', cost: 9 }]}
        memberName={tr ? 'Ayşe' : 'Alex'}
        code="KX7M42"
        locale={locale}
      />
      <div className="rounded-[16px] border border-[#EDEDED] bg-white p-4">
        <p className="text-[12px] font-medium text-[#737373]">{tr ? 'Kasa ekranı' : 'Counter screen'}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">Ayşe · KX7 M42</span>
          <span className="rounded-[10px] bg-[#5D3EBC] px-3 py-2 text-[13px] font-semibold text-white">
            {tr ? '+1 damga ekle' : 'Add 1 stamp'}
          </span>
        </div>
      </div>
    </div>
  );
}

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Sadakat kartı',
      title: 'Dijital sadakat kartı: damga ya da puan, uygulamasız',
      lead: 'Müşteri kasadaki QR ile kartını telefonunda açar; siz panelden ziyaret ekler, ödülü verirsiniz. Kâğıt kart kaybolmaz, kimse uygulama indirmez.',
      secondary: { href: `${base}/pricing`, label: 'Paketleri görün' },
      mockCaption:
        'Örnek ekran: dokuz kutulu bir kahve kartında yedi damga ve kasa ekranında “+1 damga ekle” düğmesi.',
      definition: {
        eyebrow: 'Tanım',
        title: 'Dijital sadakat kartı nedir?',
        paragraphs: [
          'Dijital sadakat kartı, kâğıt damga kartının telefondaki karşılığıdır. Müşteri kasadaki QR kodu okutur, adını ve telefonunu yazar; kartı tarayıcıda açılır ve ana ekrana eklenebilir. Uygulama indirmesi gerekmez.',
          'Her ziyarette personel kartın QR’ını okutur ya da kart kodunu, telefon numarasını yazar ve damga / puan ekler. Bakiye ödülün bedeline ulaşınca ödül kasada verilir ve bakiyeden düşülür.',
          'Kart yalnız ziyaret ve alışverişle dolar. Yorum ya da puan karşılığında damga verilmez; Google kuralları yorum karşılığında ödüle izin vermez.',
        ],
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Sadakat kartında neler var',
        items: [
          {
            icon: QrCode,
            title: 'Damga ya da puan kartı',
            body: 'Damga kartında ödül en çok 30 damgadır ve bir ziyarette 1–10 damga eklenir. Puan kartında ziyaret başına puan ve harcamaya göre puan (örneğin her 10 TL’ye 1 puan) tanımlarsınız. En çok 6 ödül ekleyebilirsiniz.',
          },
          {
            icon: ScanLine,
            title: 'Telefonla okut, damga ekle',
            body: 'Panelde giriş yaptığınız telefonla müşterinin kart QR’ını telefonun kendi kamerasıyla okutun: kart doğrudan kasa ekranı olarak açılır, tek dokunuşla damga eklersiniz. Panelin kasa ekranında kart kodu, telefon ya da isimle de bulursunuz; kartı olmayana kasada kart açarsınız.',
          },
          {
            icon: Bell,
            title: 'Anlık kart ve bildirimler',
            body: 'Kasada eklenen damga müşterinin açık kartına saniyeler içinde düşer. Müşteri isterse kartında bildirimleri açar: ödülü hazır olduğunda ve doğum gününde haber alır. Reklam bildirimi gönderilmez; iPhone’da kartın ana ekrana eklenmesi gerekir.',
          },
          {
            icon: Building2,
            title: 'Şubelerde tek kart',
            body: 'Birden çok işletmeniz varsa şubeleri ana işletmenin kartına bağlayın: müşteri hangi şubeye giderse gitsin aynı kartta biriktirir. Kart ve ödüller tek yerden yönetilir, her damganın hangi şubede verildiği kaydedilir.',
          },
          {
            icon: Crown,
            title: 'Seviyeler',
            body: 'Ziyaret sayısına göre en çok 3 seviye (örneğin 10. ziyaretten sonra Gümüş). Seviye ve ayrıcalığı müşterinin kartında ve kasa ekranında görünür.',
          },
          {
            icon: Cake,
            title: 'Doğum günü hediyesi ve hoş geldin',
            body: 'Doğum gününü yazan üyeye, doğduğu ay içinde yılda bir kez hediye verilir. Katılanlara ilk günden hoş geldin damgası / puanı ekleyebilirsiniz.',
          },
          {
            icon: MailOpen,
            title: 'Geri çağırma maili',
            body: 'Bir süredir gelmeyen üyelere (30–90 gün, siz seçersiniz) kartlarını hatırlatan kısa bir e-posta. Yalnız e-posta bırakıp kampanya iznini veren üyelere, aynı kişiye en çok 90 günde bir gider; her mailde tek tıkla ayrılma bağlantısı vardır. Varsayılan olarak kapalıdır.',
          },
          {
            icon: ShieldCheck,
            title: 'Kötüye kullanıma karşı',
            body: 'Aynı karta belirlediğiniz süre içinde ikinci kez damga eklenmez (kasada onayla geçilebilir); her işlem kimin yaptığıyla kaydedilir. Bakiye, seçtiğiniz süre boyunca ziyaret olmazsa sıfırlanabilir.',
          },
          {
            icon: BarChart3,
            title: 'Üyeler ve istatistik',
            body: 'Üye sayısı, son 30 gündeki ziyaretler, tekrar gelen üye oranı ve verilen ödüller. Üyelerin ad, soyad ve telefonu sizde; listeyi kampanya izni tarihleriyle birlikte CSV olarak indirin.',
          },
          {
            icon: Palette,
            title: 'Size özel müşteri sayfası',
            body: 'Müşterinin açtığı sayfayı siz tasarlarsınız: logo, kapak fotoğrafı, karşılama metni, en çok 4 kampanya, menü, yol tarifi ve sosyal bağlantılar. Panelde telefon önizlemesiyle görürsünüz.',
          },
          {
            icon: UserRound,
            title: 'Müşteri hesabı ve Google ile giriş',
            body: 'Müşteri isterse ücretsiz Buaze hesabıyla (Google ya da e-posta) tek dokunuşla katılır; kartları telefon değiştirse de hesabında kalır. Hesapsız katılım da açıktır.',
          },
          {
            icon: Nfc,
            title: 'NFC etiketi ve anahtarlık',
            body: 'Masaya yapıştırdığınız NFC etiketine dokunan müşterinin katılım sayfası açılır; müşterinin kartını anahtarlığa da yazabilirsiniz. Android’de Chrome ile etiketi panelden yazar ve kilitlersiniz, böylece kimse başka bir adrese yönlendiremez.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'Sadakat kartını dört adımda kurun',
        items: [
          { title: 'Şablon seçin', body: 'Kafe, restoran, berber, güzellik salonu, fırın ya da genel şablondan başlayın.' },
          { title: 'Kuralları ve ödülleri yazın', body: 'Kart türünü, ödülleri, isterseniz seviyeleri, doğum günü hediyesini ve kart rengini belirleyin.' },
          { title: 'QR’ı kasaya koyun', body: 'Katılım QR’ını PNG olarak indirin ya da A5 afişi yazdırın, kasanın yanına koyun.' },
          { title: 'Kasada okutun', body: 'Müşteri kartını gösterir; siz telefonun kamerasıyla ya da panelin kasa ekranından okutup damgayı ekler, ödülü verirsiniz.' },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'Sadakat kartı bir bakışta',
        items: [
          { value: '2', label: 'Kart türü: damga ya da puan' },
          { value: '6', label: 'Kart başına en fazla ödül' },
          { value: '3', label: 'Ziyarete göre seviye' },
          { value: '6', label: 'Hazır şablon' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Sektörünüze uygun kart',
        lead: 'Hazır şablonlar en yaygın sadakat düzenlerine göre yazıldı.',
        items: [
          { slug: 'restaurants', use: 'Kafe için 9 kahveye 1 kahve damga kartı; restoran için harcamaya göre puan ve ikram ödülleri.' },
          { slug: 'beauty-salon', use: 'Berber için 6 tıraşa 1 tıraş; güzellik salonu için puan ve seviyeler.' },
          { slug: 'retail', use: 'Fırın ve mağaza için 10 alışverişe 1 ürün hediye.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Sadakat kartı hakkında sorular',
        items: [
          {
            q: 'Müşterinin uygulama indirmesi gerekiyor mu?',
            a: 'Hayır. Kart telefonun tarayıcısında açılır; müşteri isterse ana ekranına ekler. E-posta adresini yazan müşteriye kartın bağlantısı e-postayla da gönderilir.',
          },
          {
            q: 'Damga nasıl eklenir?',
            a: 'En kolayı: panele giriş yaptığınız telefonla müşterinin kart QR’ını telefonun kendi kamerasıyla okutun; kart kasa ekranı olarak açılır ve damgayı tek dokunuşla eklersiniz (iPhone ve Android). Panelin “Kasa” ekranında kart kodu, telefon numarası ya da isimle de bulabilirsiniz.',
          },
          {
            q: 'Birden çok şubem var; tek kart olur mu?',
            a: 'Evet. Şubeleri ana işletmenin kartına bağlarsınız; müşteri her şubede aynı kartta biriktirir ve ödülünü istediği şubede alır. Kart, ödüller ve müşteri sayfası ana işletmeden yönetilir.',
          },
          {
            q: 'Müşteriye bildirim ya da e-posta gidiyor mu?',
            a: 'Yalnız müşteri isterse. Kartında bildirimleri açan müşteriye ödülü hazır olduğunda ve doğum gününde bildirim gider. Geri çağırma maili varsayılan olarak kapalıdır; açarsanız yalnız kampanya iznini veren üyelere gider ve her mailde tek tıkla ayrılma bağlantısı vardır.',
          },
          {
            q: 'Aynı ziyarette iki kez damga eklenirse?',
            a: 'Belirlediğiniz süre içinde (örneğin 1 saat) aynı karta ikinci damga eklenmez. Gerçekten yeni bir ziyaretse personel onaylayarak ekler; bu işlem ayrıca kaydedilir.',
          },
          {
            q: 'Yorum yazan müşteriye damga verebilir miyim?',
            a: 'Hayır. Kart yalnız ziyaret ve alışverişle dolar. Google, yorum karşılığında ödül vermeyi yasaklar; Buaze’de yorum akışı ile sadakat kartı birbirine bağlı değildir ve ödül metinlerinde yorum karşılığı ödül çağrışımı engellenir.',
          },
          {
            q: 'Üye bilgileri kimde ve nasıl korunuyor?',
            a: 'Müşteri katılırken aydınlatma metnini onaylar; kampanya izni ayrı bir kutudur ve varsayılan olarak işaretsizdir. Kart sayfası arama motorlarına kapalıdır. Müşteri kart sayfasından programdan ayrılıp verilerini silebilir; siz de üyeyi panelden silebilirsiniz.',
          },
          {
            q: 'Hangi paketlerde var?',
            a: 'Büyüme ve Zincir paketlerinde vardır; 14 günlük ücretsiz denemede de kullanabilirsiniz. Birden çok işletmeniz varsa her biri kendi kartını kurabilir ya da şube olarak tek karta bağlanabilir.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'Sadakat kartıyla birlikte çalışır',
        items: relatedFeatureLinks(['menu', 'surveys', 'review-management'], locale),
      },
      ctaTitle: 'Sadakat kartınızı bugün kurun',
    };
  }

  return {
    eyebrow: 'Loyalty card',
    title: 'Digital loyalty card: stamps or points, no app',
    lead: 'Customers open their card on their phone with the QR at the counter; you add visits and give rewards from the panel. No paper card to lose, no app to install.',
    secondary: { href: `${base}/pricing`, label: 'See plans' },
    mockCaption: 'Sample screen: a nine-box coffee card with seven stamps and an “Add 1 stamp” button on the counter screen.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is a digital loyalty card?',
      paragraphs: [
        'A digital loyalty card is the phone version of a paper stamp card. The customer scans the QR code at the counter and enters their name and phone number; the card opens in the browser and can be added to the home screen. No app is needed.',
        'On every visit, staff scan the QR on the card or type the card code or phone number and add stamps or points. Once the balance reaches a reward’s cost, the reward is given at the counter and taken off the balance.',
        'The card fills with visits and purchases only. Stamps are never given for a review or a rating; Google does not allow rewards for reviews.',
      ],
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What the loyalty card includes',
      items: [
        {
          icon: QrCode,
          title: 'Stamp or points card',
          body: 'On a stamp card a reward costs up to 30 stamps and a visit adds 1–10. On a points card you set points per visit and points by spend (for example 1 point for every 10 TL). Add up to 6 rewards.',
        },
        {
          icon: ScanLine,
          title: 'Scan with a phone, add a stamp',
          body: 'On a phone signed in to the panel, scan the customer’s card QR with the phone’s own camera: the card opens as the counter screen and you add a stamp in one tap. On the panel’s counter screen you can also find cards by code, phone or name, and open a card for a customer who has none.',
        },
        {
          icon: Bell,
          title: 'Live card and notifications',
          body: 'A stamp added at the counter lands on the customer’s open card within seconds. If they choose, customers turn on notifications on their card and hear when a reward is ready and on their birthday. No promotional notifications; on iPhone the card must be added to the home screen first.',
        },
        {
          icon: Building2,
          title: 'One card for all branches',
          body: 'If you run several businesses, link the branches to the home business’s card: customers collect on the same card wherever they visit. The card and rewards are managed in one place, and every stamp records the branch that gave it.',
        },
        {
          icon: Crown,
          title: 'Tiers',
          body: 'Up to 3 tiers by visit count (for example Silver from visit 10). The tier and its perk show on the customer’s card and on the counter screen.',
        },
        {
          icon: Cake,
          title: 'Birthday gift and welcome bonus',
          body: 'Members who give their birthday get a gift once a year in their birth month. You can also give new members a welcome stamp or points.',
        },
        {
          icon: MailOpen,
          title: 'Win-back e-mail',
          body: 'A short e-mail reminding members who have not visited for a while (30–90 days, you choose). It goes only to members who gave an e-mail and agreed to offers, at most once in 90 days per person, with a one-click opt-out in every mail. Off by default.',
        },
        {
          icon: ShieldCheck,
          title: 'Built against misuse',
          body: 'A card cannot get a second stamp within the time you set (staff can override with a confirmation), and every action records who did it. A balance can lapse after the period you choose without a visit.',
        },
        {
          icon: BarChart3,
          title: 'Members and statistics',
          body: 'Member count, visits in the last 30 days, the share of returning members and rewards given. You keep members’ names and phone numbers; export the list as CSV with the consent dates.',
        },
        {
          icon: Palette,
          title: 'Your own customer page',
          body: 'You design the page customers open: logo, cover photo, welcome text, up to 4 offers, menu, directions and social links, with a phone preview in the panel.',
        },
        {
          icon: UserRound,
          title: 'Customer account and Google sign-in',
          body: 'Customers can join in one tap with a free Buaze account (Google or e-mail); their cards stay in the account even on a new phone. Joining without an account works too.',
        },
        {
          icon: Nfc,
          title: 'NFC tags and key fobs',
          body: 'A tap on an NFC sticker on the table opens the join page, and you can write a customer’s card to a key fob. On Android, write and lock the tag from the panel in Chrome so nobody can point it elsewhere.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'Set up your loyalty card in four steps',
      items: [
        { title: 'Pick a template', body: 'Start from café, restaurant, barber, beauty salon, bakery or a general template.' },
        { title: 'Write the rules and rewards', body: 'Choose the card type, the rewards and, if you like, tiers, a birthday gift and the card colour.' },
        { title: 'Put the QR at the counter', body: 'Download the join QR as PNG or print the A5 poster and place it next to the till.' },
        { title: 'Scan at the counter', body: 'The customer shows their card; you scan it with the phone’s camera or on the counter screen, add the stamp and give the reward.' },
      ],
    },
    facts: {
      eyebrow: 'In short',
      title: 'The loyalty card at a glance',
      items: [
        { value: '2', label: 'Card types: stamps or points' },
        { value: '6', label: 'Rewards per card, at most' },
        { value: '3', label: 'Tiers by visits' },
        { value: '6', label: 'Ready templates' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'A card that fits your business',
      lead: 'The templates follow the most common loyalty set-ups.',
      items: [
        { slug: 'restaurants', use: 'Cafés: buy 9 coffees, get 1 free. Restaurants: points by spend and treats as rewards.' },
        { slug: 'beauty-salon', use: 'Barbers: every 7th cut free. Beauty salons: points and tiers.' },
        { slug: 'retail', use: 'Bakeries and shops: every 11th item free.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about the loyalty card',
      items: [
        {
          q: 'Do customers need to install an app?',
          a: 'No. The card opens in the phone’s browser and the customer can add it to the home screen. Customers who give an e-mail address also get the card link by e-mail.',
        },
        {
          q: 'How are stamps added?',
          a: 'The easiest way: on a phone signed in to the panel, scan the customer’s card QR with the phone’s own camera; the card opens as the counter screen and you add the stamp in one tap (iPhone and Android). On the panel’s “Counter” screen you can also find a card by code, phone number or name.',
        },
        {
          q: 'I have several branches; can they share one card?',
          a: 'Yes. Link the branches to the home business’s card; customers collect on the same card at every branch and redeem wherever they like. The card, rewards and customer page are managed at the home business.',
        },
        {
          q: 'Do customers get notifications or e-mails?',
          a: 'Only if they want them. Customers who turn notifications on in their card hear when a reward is ready and on their birthday. The win-back e-mail is off by default; if you turn it on it goes only to members who agreed to offers, with a one-click opt-out in every mail.',
        },
        {
          q: 'What if a visit gets stamped twice?',
          a: 'Within the time you set (for example 1 hour) a card cannot get a second stamp. If it really is a new visit, staff confirm and add it; that action is recorded separately.',
        },
        {
          q: 'Can I give a stamp to customers who write a review?',
          a: 'No. The card fills with visits and purchases only. Google forbids rewards for reviews; in Buaze the review flow and the loyalty card are not connected, and reward texts that hint at a reward for a review are blocked.',
        },
        {
          q: 'Who holds member data, and how is it protected?',
          a: 'Customers accept the privacy notice when they join; marketing consent is a separate box, unticked by default. The card page is closed to search engines. Customers can leave the programme and delete their data from the card page, and you can delete a member in the panel.',
        },
        {
          q: 'Which plans include it?',
          a: 'It is in the Growth and Scale plans and in the 14-day free trial. With several businesses, each can set up its own card or join one card as a branch.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with the loyalty card',
      items: relatedFeatureLinks(['menu', 'surveys', 'review-management'], locale),
    },
    ctaTitle: 'Set up your loyalty card today',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function LoyaltyFeaturePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<LoyaltyMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
