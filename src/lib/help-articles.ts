import type { Locale } from '@/lib/translations';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import { HELP_CATEGORIES } from '@/lib/help-categories';
import { helpQueryWords, normalizeHelpSearchText, scoreHelpMatch } from '@/lib/help-search';

export { normalizeHelpSearchText } from '@/lib/help-search';

/**
 * Help Center articles (TR + EN) — the static source behind /help.
 *
 * Every statement here describes the product as it works today; each claim
 * was checked against the code (review flow + threshold, QR wizard, inbox,
 * notifications, team roles, billing, KVKK tools). When a feature changes,
 * change the article in the same PR.
 *
 * Rules (CLAUDE.md §22 + marketing spec 2026-11):
 * - TR and EN are built by one `pair()` call, so slug, category and order
 *   can never drift between locales.
 * - Body text is plain strings with two inline markers only:
 *   `**bold**` and `[label](/tr/help/slug)` (internal paths or https URLs).
 *   No raw HTML; `renderBody()` escapes everything else.
 * - Removed 2026-11 (no longer true for the product; 301 targets are listed
 *   in the help unit report): the whole API & webhook category,
 *   campaign-qr-utm, tags-and-assignment, slack-discord-webhook-routing,
 *   usage-thresholds-alerts, invoice-vat-and-titles,
 *   multi-account-and-franchise-billing, two-factor-and-session-management.
 */

export interface StaticHelpArticle {
  id: string;
  slug: string;
  locale: Locale;
  category: string;
  title: string;
  excerpt: string;
  /** Escaped HTML rendering of `bodyStruct` (kept for the JSON API and DB parity). */
  body: string;
  /** Structured body — the article page renders this directly. */
  bodyStruct?: BodyInput;
  searchTags: string[];
  isPublished: true;
  order: number;
  updatedAt: Date;
}

export type BodySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  /** Render `items` as a numbered list (step-by-step instructions). */
  ordered?: boolean;
};

export type BodyInput = {
  lead: string;
  /** One-sentence summary shown in a "Kısaca / In short" box. */
  keyInsight?: string;
  sections: BodySection[];
  checklist: string[];
  faq: { q: string; a: string }[];
  /** Short note about platform rules, shown after the sections. */
  policyNote?: string;
};

/** Date of the last full content review (shown as "Güncelleme"). */
export const HELP_CONTENT_UPDATED_AT = new Date('2026-11-14T09:00:00.000Z');

/* ------------------------------------------------------------------ */
/* Inline markup                                                        */
/* ------------------------------------------------------------------ */

export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'link'; text: string; href: string };

const INLINE_RE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function safeHref(href: string): string | null {
  const h = href.trim();
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (/^https:\/\/[^\s]+$/i.test(h)) return h;
  if (/^mailto:[^\s]+$/i.test(h)) return h;
  return null;
}

/** Split a body string into text / bold / link tokens. */
export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of input.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: 'text', text: input.slice(last, index) });
    if (match[1] !== undefined) {
      tokens.push({ type: 'strong', text: match[1] });
    } else {
      const href = safeHref(match[3] ?? '');
      tokens.push(href ? { type: 'link', text: match[2] ?? '', href } : { type: 'text', text: match[2] ?? '' });
    }
    last = index + match[0].length;
  }
  if (last < input.length) tokens.push({ type: 'text', text: input.slice(last) });
  return tokens;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Inline markup → escaped HTML. */
export function inlineToHtml(input: string): string {
  return parseInline(input)
    .map((token) => {
      if (token.type === 'strong') return `<strong>${escapeHtml(token.text)}</strong>`;
      if (token.type === 'link') return `<a href="${escapeHtml(token.href)}">${escapeHtml(token.text)}</a>`;
      return escapeHtml(token.text);
    })
    .join('');
}

/** Inline markup → plain text (search index, JSON-LD). */
export function inlineToPlain(input: string): string {
  return parseInline(input)
    .map((token) => token.text)
    .join('');
}

const BODY_LABELS = {
  tr: { summary: 'Kısaca', checklist: 'Kontrol listesi', faq: 'Sık sorulan sorular', note: 'Not' },
  en: { summary: 'In short', checklist: 'Checklist', faq: 'Frequently asked questions', note: 'Note' },
} as const;

export function helpBodyLabels(locale: Locale) {
  return BODY_LABELS[locale === 'en' ? 'en' : 'tr'];
}

function renderBody(input: BodyInput, locale: Locale): string {
  const labels = helpBodyLabels(locale);
  const parts: string[] = [`<p>${inlineToHtml(input.lead)}</p>`];
  if (input.keyInsight) {
    parts.push(`<blockquote><p><strong>${labels.summary}:</strong> ${inlineToHtml(input.keyInsight)}</p></blockquote>`);
  }
  for (const section of input.sections) {
    parts.push(`<h2>${escapeHtml(section.title)}</h2>`);
    for (const p of section.paragraphs ?? []) parts.push(`<p>${inlineToHtml(p)}</p>`);
    if (section.items?.length) {
      const tag = section.ordered ? 'ol' : 'ul';
      parts.push(`<${tag}>${section.items.map((item) => `<li>${inlineToHtml(item)}</li>`).join('')}</${tag}>`);
    }
  }
  if (input.policyNote) {
    parts.push(`<blockquote><p><strong>${labels.note}:</strong> ${inlineToHtml(input.policyNote)}</p></blockquote>`);
  }
  if (input.checklist.length) {
    parts.push(`<h2>${labels.checklist}</h2><ul>${input.checklist.map((item) => `<li>${inlineToHtml(item)}</li>`).join('')}</ul>`);
  }
  if (input.faq.length) {
    parts.push(
      `<h2>${labels.faq}</h2>${input.faq
        .map((item) => `<h3>${escapeHtml(item.q)}</h3><p>${inlineToHtml(item.a)}</p>`)
        .join('')}`,
    );
  }
  return parts.join('');
}

interface LocalizedArticle {
  title: string;
  excerpt: string;
  tags: string[];
  body: BodyInput;
}

function build(locale: Locale, category: string, order: number, slug: string, a: LocalizedArticle): StaticHelpArticle {
  return {
    id: `static-${locale}-${slug}`,
    slug,
    locale,
    category,
    title: a.title,
    excerpt: a.excerpt,
    body: renderBody(a.body, locale),
    bodyStruct: a.body,
    searchTags: a.tags.map((tag) => tag.toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US')),
    isPublished: true,
    order,
    updatedAt: HELP_CONTENT_UPDATED_AT,
  };
}

/** One article in both languages — same slug, category and order. */
function pair(
  category: string,
  order: number,
  slug: string,
  content: { tr: LocalizedArticle; en: LocalizedArticle },
): StaticHelpArticle[] {
  return [build('tr', category, order, slug, content.tr), build('en', category, order, slug, content.en)];
}

const GOOGLE_POLICY_URL = 'https://support.google.com/contributionpolicy/answer/7400114';

/* ------------------------------------------------------------------ */
/* Articles                                                             */
/* ------------------------------------------------------------------ */

export const STATIC_HELP_ARTICLES: StaticHelpArticle[] = [
  /* ---------------------------- Başlarken ---------------------------- */
  ...pair('getting-started', 10, 'quick-start', {
    tr: {
      title: 'Hızlı kurulum: kayıttan ilk geri bildirime',
      excerpt:
        'Hesap açma, ilk işletme, yorum bağlantıları ve ilk QR kodu: kurulumu sırasıyla yapın, QR kodunu basmadan önce müşteri akışını kendi telefonunuzda deneyin.',
      tags: ['kurulum', 'başlangıç', 'hesap açma', 'ilk qr', 'deneme süresi'],
      body: {
        lead: 'Buaze’yi kurmak için teknik bilgi gerekmez. Bu rehber, hesap açtığınız andan ilk geri bildirimi panelde gördüğünüz ana kadar yapılacakları sırasıyla anlatır.',
        keyInsight:
          'Hesap açın, işletmenizi ekleyin, yorum bağlantılarınızı girin, QR kodunuzu oluşturun ve basmadan önce akışı kendi telefonunuzda deneyin.',
        sections: [
          {
            title: '1. Hesabınızı açın',
            paragraphs: [
              'Kayıt olduğunuzda 14 günlük ücretsiz deneme başlar; kredi kartı istenmez. Ardından açılan kurulum sihirbazı işletmenizin adını, sektörünü, konumunu ve kullandığınız yorum platformlarını sorar; sihirbazı tamamladığınızda ilk işletmeniz oluşturulur. **Sonra tamamla** ile sihirbazı geçip işletmenizi daha sonra **İşletmeler** sayfasından da ekleyebilirsiniz.',
            ],
          },
          {
            title: '2. Yorum bağlantılarınızı ekleyin',
            paragraphs: [
              'Panelde **Platform bağlantıları** sayfasını açın ve Google satırındaki **Bağla** düğmesine basın. İşletmenizi adıyla arayıp listeden seçmeniz yeterlidir; Buaze resmi “yorum yaz” bağlantınızı oluşturur. Yemeksepeti, Getir, Trendyol GO, Tripadvisor ve diğer platformlarda ise ilgili satırı açıp yorum sayfanızın bağlantısını yapıştırın. Ayrıntılar: [Google yorum bağlantısını ekleme](/tr/help/google-review-link).',
            ],
          },
          {
            title: '3. QR kodunuzu oluşturun',
            paragraphs: [
              '**QR** sayfasında **Yeni QR oluştur** düğmesine basın. Sihirbazda işletmeyi seçer, isterseniz masa etiketi eklersiniz; yüksek puanların varsayılan platforma mı yoksa sizin seçtiğiniz bir platforma mı gideceğini belirler, rengi seçip önizlersiniz. Hazır QR kodunu PNG olarak indirebilir ya da PDF olarak yazdırabilirsiniz.',
            ],
          },
          {
            title: '4. Akışı kendi telefonunuzda deneyin',
            ordered: true,
            items: [
              'QR kodunu okutun; işletmenizin adının yer aldığı puan ekranı açılmalı.',
              'Eşik ve üzerindeki bir puan verin (varsayılan eşik 5 yıldızdır): seçtiğiniz platformun yorum sayfası açılmalı.',
              '1 ile 3 arasında bir puan verin: işletmenize özel geri bildirim formu açılmalı, platformun herkese açık yorum bağlantısı da aynı ekranda görünmeli.',
              'Formu gönderin: geri bildirim **Yorumlar** sayfasına düşmeli, düşük puan uyarısı da bildirim e-postanıza gelmeli.',
            ],
          },
        ],
        checklist: [
          'İşletme adı, sektör ve şehir doğru.',
          'Google yorum bağlantısı eklendi.',
          'Bildirim e-postası ekibin baktığı bir adrese gidiyor.',
          'QR kodu en az bir telefonla denendi.',
          'Yüksek ve düşük puan akışı kontrol edildi.',
        ],
        faq: [
          {
            q: 'Deneme süresinde kart bilgisi gerekiyor mu?',
            a: 'Hayır. 14 günlük deneme kart bilgisi olmadan başlar. Ücretli plana geçmek isterseniz **Hesabım → Plan ve faturalama** bölümünden aylık aboneliği başlatırsınız.',
          },
          {
            q: 'Deneme amaçlı gönderdiğim geri bildirimler raporlarımı etkiler mi?',
            a: 'Evet. Deneme amaçlı gönderilen geri bildirimler de gerçek kayıt olarak saklanır ve istatistiklere eklenir; panelde tek tek geri bildirim silme düğmesi yoktur. Denemeyi birkaç kayıtla sınırlı tutun.',
          },
          {
            q: 'Birden çok şubem var; hepsini ekleyebilir miyim?',
            a: 'Evet. Her şubeyi ayrı işletme olarak eklersiniz; her birinin kendi QR kodları, bağlantıları ve raporları olur. Ayrıntılar: [Birden çok işletmeyi tek hesaptan yönetme](/tr/help/multi-location-management).',
          },
        ],
      },
    },
    en: {
      title: 'Quick setup: from sign-up to your first feedback',
      excerpt:
        'Sign up, add your business, enter your review links and create your first QR code, then test the customer flow on your own phone before you print it.',
      tags: ['setup', 'getting started', 'sign up', 'first qr', 'free trial'],
      body: {
        lead: 'Setting up Buaze takes no technical knowledge. This guide walks you through everything from creating your account to seeing your first piece of feedback in the panel.',
        keyInsight:
          'Create your account, add your business, enter your review links, create your QR code and test the flow on your own phone before you print it.',
        sections: [
          {
            title: '1. Create your account',
            paragraphs: [
              'Signing up starts a 14-day free trial; no credit card is required. A setup wizard then asks for your business name, sector, location and the review platforms you use; your first business is created when you complete it. You can also choose **Finish later** and add your business afterwards from the **Locations** page.',
            ],
          },
          {
            title: '2. Add your review links',
            paragraphs: [
              'Open the **Platform links** page in the panel and press **Add link** on the Google row. Search for your business by name and pick it from the list; Buaze builds your official “write a review” link. For Yemeksepeti, Getir, Trendyol GO, Tripadvisor and the other platforms, open that platform’s row and paste the link to your review page. See [Adding your Google review link](/en/help/google-review-link).',
            ],
          },
          {
            title: '3. Create your QR code',
            paragraphs: [
              'On the **QR** page, press **Create QR code**. In the wizard you choose the business, optionally add a table label, decide whether high ratings go to your default platform or to a platform you pick, then choose the colours and preview. Download the finished QR code as a PNG or print it to PDF.',
            ],
          },
          {
            title: '4. Test the flow on your own phone',
            ordered: true,
            items: [
              'Scan the QR code; a rating screen showing your business name should open.',
              'Give a rating at or above your threshold (5 stars by default): your chosen platform’s review page should open.',
              'Give a rating from 1 to 3: your private feedback form should open, with the platform’s public review link on the same screen.',
              'Submit the form: the feedback should appear on the **Reviews** page and the low-rating alert should reach your notification e-mail.',
            ],
          },
        ],
        checklist: [
          'Business name, sector and city are correct.',
          'Your Google review link is added.',
          'The notification e-mail goes to an inbox your team reads.',
          'The QR code has been tested on at least one phone.',
          'Both the high- and low-rating flows have been checked.',
        ],
        faq: [
          {
            q: 'Do I need a card during the trial?',
            a: 'No. The 14-day trial starts without card details. To move to a paid plan, start a monthly subscription from **Account → Plan & billing**.',
          },
          {
            q: 'Does feedback I send while testing affect my reports?',
            a: 'Yes. Test submissions are stored like any other feedback and count towards your statistics, and the panel has no button for deleting individual feedback. Keep your tests to a few submissions.',
          },
          {
            q: 'I have several branches. Can I add them all?',
            a: 'Yes. Add each branch as a separate business; each one gets its own QR codes, links and reports. See [Managing several businesses from one account](/en/help/multi-location-management).',
          },
        ],
      },
    },
  }),

  ...pair('getting-started', 20, 'first-restaurant-setup', {
    tr: {
      title: 'İşletme bilgilerini doğru girme',
      excerpt:
        'İşletme adı, sayfa adresi, sektör, adres ve bildirim e-postası; müşterinin gördüğü ekranı, uyarıların nereye gideceğini ve önerilen platformları belirler.',
      tags: ['işletme', 'ayarlar', 'bildirim e-postası', 'sektör', 'adres'],
      body: {
        lead: 'İşletme ayarları yalnızca bir kimlik kartı değildir. Müşterinin puan ekranında gördüğü bilgileri, düşük puan uyarılarının hangi adrese gideceğini ve sektörünüze göre önerilen yorum platformlarını belirler.',
        keyInsight:
          'İlk QR kodunu basmadan önce işletme adını, sayfa adresini, sektörü ve bildirim e-postasını kontrol edin.',
        sections: [
          {
            title: 'Ayarlar nerede?',
            paragraphs: [
              'Panelde **İşletmeler** sayfasından işletmenizi açın ve **Ayarlar**’a geçin. Kimlik ve iletişim bilgileri **Genel bilgiler** sekmesindedir; platform bağlantıları, marka, çalışma saatleri ve durum ayarlarının her birinin kendi sekmesi vardır.',
            ],
          },
          {
            title: 'Kimlik bilgileri',
            items: [
              '**İşletme adı:** müşterinin puan ekranında ve size gelen e-postalarda görünür.',
              '**Sayfa adresi:** QR bağlantınızın sonundaki kısa addır (örneğin /r/isletme-adi). Yalnızca küçük harf, rakam ve kısa çizgi kullanılır. Ayrıntılar: [Sayfa adresi ve QR bağlantısı](/tr/help/slug-and-url).',
              '**Sektör:** panelde önerilen ve QR sihirbazında seçilebilen yorum platformlarını belirler. Örneğin konaklama işletmelerinde Booking.com ve Airbnb, restoranlarda Yemeksepeti ve Getir öne çıkar.',
            ],
          },
          {
            title: 'Adres ve bildirim e-postası',
            paragraphs: [
              'Adresiniz, müşterinin puan ekranında işletme adının altında görünür (masa etiketli QR kodlarında adresin yerine masa etiketi yazar). **Bildirim e-postası** ise 1–3 yıldızlı her yeni geri bildirimde uyarının gittiği adrestir; boş bırakırsanız uyarılar hesabınızın e-posta adresine gider. Müşteriye e-postayla gönderdiğiniz yanıtlarda da yanıt adresi olarak bu adres kullanılır. Geri bildirimleri ekipçe takip ediyorsanız ortak bir adres girin.',
            ],
          },
          {
            title: 'İşletmeyi geçici olarak durdurma',
            paragraphs: [
              '**Durum ve silme** sekmesinden işletmeyi duraklatabilirsiniz. Duraklatılan işletmenin QR sayfası müşteriye açılmaz ve yeni QR kodu oluşturulamaz; işletmeyi yeniden etkinleştirdiğinizde aynı QR kodları çalışmaya devam eder.',
            ],
          },
        ],
        checklist: [
          'İşletme adı doğru yazıldı.',
          'Sayfa adresi kısa ve okunaklı.',
          'Sektör seçildi.',
          'Bildirim e-postası ekibin baktığı bir adrese gidiyor.',
          'Adres güncel.',
        ],
        faq: [
          {
            q: 'Bildirim e-postasını boş bırakırsam ne olur?',
            a: 'Düşük puan uyarıları hesabınızın e-posta adresine gider. Ancak müşteriye e-postayla gönderdiğiniz yanıtlara müşterinin cevabı size ulaşmaz; bunun için bildirim e-postasını doldurun. Uyarıları kapatmak isterseniz **Hesabım → Bildirimler** bölümünü kullanın.',
          },
          {
            q: 'Sektörü sonradan değiştirebilir miyim?',
            a: 'Evet. Sektör, önerilen ve QR sihirbazında seçilebilen platformları değiştirir; daha önce kaydettiğiniz bağlantılar silinmez.',
          },
          {
            q: 'Bir işletmeyi tamamen silebilir miyim?',
            a: 'Evet, **Durum ve silme** sekmesinden. Silme işlemi o işletmenin geri bildirimlerini, QR kodlarını ve menüsünü de kaldırır; emin değilseniz önce duraklatmayı tercih edin.',
          },
        ],
      },
    },
    en: {
      title: 'Filling in your business details',
      excerpt:
        'Business name, page address, sector, address and notification e-mail decide what customers see, where alerts go and which review platforms are suggested.',
      tags: ['business', 'settings', 'notification e-mail', 'sector', 'address'],
      body: {
        lead: 'Your business settings are more than an ID card. They decide what customers see on the rating screen, which address receives low-rating alerts and which review platforms are suggested for your sector.',
        keyInsight:
          'Before printing your first QR code, check the business name, page address, sector and notification e-mail.',
        sections: [
          {
            title: 'Where are the settings?',
            paragraphs: [
              'In the panel, open your business from the **Locations** page and go to **Settings**. Identity and contact details are on the **General details** tab; platform links, brand, opening hours and status each have their own tab.',
            ],
          },
          {
            title: 'Identity',
            items: [
              '**Business name:** shown on the customer’s rating screen and in the e-mails you receive.',
              '**Page address:** the short name at the end of your QR link (for example /r/your-business). Only lowercase letters, numbers and hyphens are allowed. See [Your page address and QR link](/en/help/slug-and-url).',
              '**Sector:** decides which review platforms are suggested in the panel and can be chosen in the QR wizard. Hotels, for example, see Booking.com and Airbnb; restaurants see Yemeksepeti and Getir.',
            ],
          },
          {
            title: 'Address and notification e-mail',
            paragraphs: [
              'Your address appears under the business name on the customer’s rating screen (on QR codes with a table label, the label is shown instead). The **notification e-mail** is where an alert goes for every new 1–3 star feedback; if you leave it empty, alerts go to your account e-mail. It is also the reply-to address on the e-mail replies you send to customers. If your team follows feedback together, use a shared address.',
            ],
          },
          {
            title: 'Pausing a business',
            paragraphs: [
              'You can pause a business from the **Status & deletion** tab. A paused business’s QR page does not open for customers and no new QR codes can be created; once you reactivate it, the same QR codes work again.',
            ],
          },
        ],
        checklist: [
          'The business name is spelled correctly.',
          'The page address is short and readable.',
          'A sector is selected.',
          'The notification e-mail goes to an inbox your team reads.',
          'The address is up to date.',
        ],
        faq: [
          {
            q: 'What if I leave the notification e-mail empty?',
            a: 'Low-rating alerts go to your account e-mail. However, when a customer answers an e-mail reply you sent, their answer will not reach you; fill in the notification e-mail for that. To switch alerts off, use **Account → Notifications**.',
          },
          {
            q: 'Can I change the sector later?',
            a: 'Yes. The sector changes which platforms are suggested and can be chosen in the QR wizard; links you have already saved are not deleted.',
          },
          {
            q: 'Can I delete a business completely?',
            a: 'Yes, from the **Status & deletion** tab. Deleting a business also removes its feedback, QR codes and menu, so if you are unsure, pause it first.',
          },
        ],
      },
    },
  }),

  ...pair('getting-started', 30, 'dashboard-tour', {
    tr: {
      title: 'Paneli tanıyın: hangi sayfa ne işe yarar?',
      excerpt:
        'Panel, Yorumlar, Google Yorumları, Analitik, Müşteriler, QR ve Platform bağlantıları sayfalarının ne gösterdiğini ve günlük işte hangisine bakacağınızı öğrenin.',
      tags: ['panel', 'tur', 'menü', 'sayfalar', 'başlangıç'],
      body: {
        lead: 'Panele ilk girdiğinizde her şeyi aynı anda öğrenmeniz gerekmez. Bu rehber, kenar çubuğundaki sayfaları ve her birinin hangi soruyu yanıtladığını kısaca anlatır.',
        keyInsight:
          'Günlük iş için **Yorumlar** sayfası yeterlidir; genel tablo için **Panel**, dönemsel değerlendirme için **Analitik** sayfasına bakın.',
        sections: [
          {
            title: 'Özet ve gelen kutusu',
            items: [
              '**Panel:** seçili işletmenin genel puanı, toplam yorum sayısı, yanıt oranı, yeni müşteriler ve platformlara göre günlük yorum grafiği. Yeterli yorum biriktiğinde son 30 günde öne çıkan konular da burada görünür.',
              '**Yorumlar:** QR akışından gelen tüm geri bildirimler. Düşük puanlara yanıt yazdığınız, geri bildirimleri işaretleyip takip ettiğiniz yer burasıdır.',
              '**Google Yorumları:** Google puanınız, yorum sayınız, Google’ın gösterdiği en fazla 5 yorum ve 6 maddelik profil kontrol listesi. Google hesabıyla giriş gerekmez.',
            ],
          },
          {
            title: 'Raporlar ve müşteriler',
            items: [
              '**Analitik:** son 7, 30 ve 90 gün, 12 ay ya da seçtiğiniz bir aralık için puan, yanıt süresi, platform dağılımı ve gün-saat dağılımı. Raporu CSV olarak indirebilirsiniz.',
              '**Müşteriler:** e-posta veya telefon bırakan müşterilerin listesi ve segmentleri.',
              '**Anketler** ve **Denetim Merkezi:** QR ile açılan kısa anketler ve ekibiniz için kontrol listeleri.',
            ],
          },
          {
            title: 'Kurulum sayfaları',
            items: [
              '**QR:** QR kodlarını oluşturur, PNG olarak indirir ya da PDF olarak yazdırırsınız.',
              '**Menü:** QR menü özelliği açıksa dijital menünüzü buradan düzenlersiniz.',
              '**İşletmeler:** işletme ekler, ayarlarını açar ve tüm işletmelerinizin son 30 gününü yan yana görürsünüz.',
              '**Platform bağlantıları:** yorum bağlantılarınızı, yönlendirme eşiğini ve varsayılan platformu yönetirsiniz.',
              '**Hesabım:** profil, güvenlik, bildirimler, Pulse AI, plan ve faturalama, ekip ve KVKK ayarları.',
            ],
          },
        ],
        checklist: [
          'Kenar çubuğundaki işletme seçicide doğru işletme seçili.',
          'Yorumlar sayfasında düşük puan sekmesine bakıldı.',
          'Analitik sayfasında dönem seçildi.',
          'Hesabım → Bildirimler ayarları gözden geçirildi.',
        ],
        faq: [
          {
            q: 'Birden çok işletmeyi aynı anda görebilir miyim?',
            a: 'Sayfalar seçili işletmeyi gösterir; işletme değiştirmek için kenar çubuğundaki seçiciyi kullanın. Tüm işletmelerinizin son 30 gününü yan yana görmek için **İşletmeler** sayfasındaki tabloya bakın.',
          },
          {
            q: 'Yorumlar sayfasında seçtiğim görünüm kaydediliyor mu?',
            a: 'Seçtiğiniz sekme, tarih, puan ve platform sayfa adresine yazılır. Bağlantıyı yer imlerine ekleyerek ya da bir ekip arkadaşınıza göndererek aynı görünümü yeniden açabilirsiniz.',
          },
          {
            q: 'Panel telefonda çalışıyor mu?',
            a: 'Evet. Panel tarayıcıda çalışır ve telefon ekranına uyum sağlar; ayrıca indirmeniz gereken bir uygulama yoktur.',
          },
        ],
      },
    },
    en: {
      title: 'A tour of the panel: what each page is for',
      excerpt:
        'Learn what the Dashboard, Reviews, Google Reviews, Analytics, Customers, QR and Platform links pages show, and which one to open for your daily work.',
      tags: ['panel', 'tour', 'navigation', 'pages', 'getting started'],
      body: {
        lead: 'You do not need to learn everything on your first visit. This guide briefly explains the pages in the sidebar and the question each one answers.',
        keyInsight:
          'For daily work the **Reviews** page is enough; open the **Dashboard** for the overall picture and **Analytics** for a review of a period.',
        sections: [
          {
            title: 'Overview and inbox',
            items: [
              '**Dashboard:** the selected business’s average rating, total reviews, reply rate, new customers and a daily chart of reviews by platform. Once enough reviews come in, the topics mentioned most in the last 30 days appear here too.',
              '**Reviews:** all feedback from your QR flow. This is where you reply to low ratings and flag and follow up on feedback.',
              '**Google Reviews:** your Google rating, review count, up to 5 reviews that Google returns and a 6-item profile checklist. No Google sign-in is needed.',
            ],
          },
          {
            title: 'Reports and customers',
            items: [
              '**Analytics:** ratings, reply time, platform split and day/hour distribution for the last 7, 30 or 90 days, 12 months or a range you choose. You can download the report as CSV.',
              '**Customers:** the list and segments of customers who left an e-mail or phone number.',
              '**Surveys** and **Audit Center:** short surveys opened by QR, and checklists for your team.',
            ],
          },
          {
            title: 'Setup pages',
            items: [
              '**QR:** create QR codes, download them as PNG or print them to PDF.',
              '**Menu:** edit your digital menu when the QR menu feature is on.',
              '**Locations:** add businesses, open their settings and compare the last 30 days of all your businesses side by side.',
              '**Platform links:** manage your review links, the redirect threshold and the default platform.',
              '**Account:** profile, security, notifications, Pulse AI, plan and billing, team and privacy settings.',
            ],
          },
        ],
        checklist: [
          'The right business is selected in the sidebar switcher.',
          'You have looked at the low-rating tab on the Reviews page.',
          'A period is selected on the Analytics page.',
          'You have reviewed Account → Notifications.',
        ],
        faq: [
          {
            q: 'Can I see several businesses at once?',
            a: 'Pages show the selected business; use the switcher in the sidebar to change it. To compare the last 30 days of all your businesses, use the table on the **Locations** page.',
          },
          {
            q: 'Is the view I choose on the Reviews page saved?',
            a: 'The tab, date, rating and platform you choose are written into the page address. Bookmark the link or send it to a teammate to open the same view again.',
          },
          {
            q: 'Does the panel work on a phone?',
            a: 'Yes. The panel runs in the browser and adapts to phone screens; there is no separate app to install.',
          },
        ],
      },
    },
  }),

  ...pair('getting-started', 40, 'slug-and-url', {
    tr: {
      title: 'Sayfa adresi ve QR bağlantısı nasıl çalışır?',
      excerpt:
        'QR kodunuz /r/ ile başlayan sayfa adresinizi açar. Adres değişirse eski QR kodları çalışmaz; yönlendirilen platformu değiştirmek ise yeniden baskı gerektirmez.',
      tags: ['sayfa adresi', 'slug', 'qr bağlantısı', 'url', 'yeniden baskı'],
      body: {
        lead: 'Her işletmenin bir sayfa adresi vardır ve QR kodlarınız bu adresi açar. Adresi bir kez doğru seçmek, ileride QR kodlarını yeniden bastırma ihtiyacını ortadan kaldırır.',
        keyInsight:
          'Platform bağlantısını, eşiği veya varsayılan platformu panelden değiştirmek yeniden baskı gerektirmez; sayfa adresini değiştirmek ise eski QR kodlarını çalışmaz hâle getirir.',
        sections: [
          {
            title: 'QR kodunun içinde ne var?',
            paragraphs: [
              'QR kodu, işletmenizin Buaze sayfasının bağlantısını taşır: www.buaze.com/r/sayfa-adresi. Bağlantıya isteğe bağlı olarak masa etiketi ve sabit bir platform eklenebilir. Müşteri kodu okuttuğunda bu sayfa açılır; hangi yorum sayfasına gideceğine o anda paneldeki ayarlarınıza göre karar verilir.',
            ],
          },
          {
            title: 'İyi bir sayfa adresi',
            items: [
              'Kısa ve okunaklı olsun; çoğu zaman işletme adı yeterlidir.',
              'Yalnızca küçük harf, rakam ve kısa çizgi kullanılır; Türkçe harflerin yerine karşılıklarını yazın (ş yerine s gibi).',
              'Birden çok şubeniz varsa ayırt edici bir ek kullanın (ornek-kadikoy, ornek-besiktas).',
              'Kampanya veya dönem adı eklemeyin; adres uzun süre kullanılacak.',
            ],
          },
          {
            title: 'Adresi değiştirmeden önce',
            paragraphs: [
              'Sayfa adresini işletme ayarlarının **Genel bilgiler** sekmesinden değiştirebilirsiniz. Eski adresle basılmış QR kodları yeni adrese yönlendirilmez; bu kodlar artık işletmenizi açmaz. Değişiklik gerekiyorsa yeni QR kodlarını hazırlayın ve eski materyalleri aynı gün kaldırın.',
            ],
          },
        ],
        checklist: [
          'Sayfa adresi kısa ve okunaklı.',
          'Türkçe harf ve boşluk yok.',
          'Şubeler tutarlı eklerle ayrılıyor.',
          'Adres, QR basılmadan önce son hâlini aldı.',
        ],
        faq: [
          {
            q: 'Yönlendirilen platformu değiştirirsem QR kodunu yeniden basmam gerekir mi?',
            a: 'Hayır. QR kodu Buaze sayfanızı açtığı için platform bağlantısını, eşiği veya varsayılan platformu panelden değiştirdiğinizde aynı QR yeni ayarla çalışır. Yalnızca bir QR koduna sabitlenmiş platformu değiştirmek isterseniz yeni QR oluşturmanız gerekir.',
          },
          {
            q: 'Sayfa adresinde büyük harf kullanabilir miyim?',
            a: 'Hayır. Yalnızca küçük harf, rakam ve kısa çizgi kabul edilir.',
          },
          {
            q: 'İstediğim adresi başka bir işletme kullanıyorsa ne olur?',
            a: 'Her sayfa adresi tektir; kullanımdaki bir adres kaydedilmez. Ayırt edici bir ek deneyin.',
          },
        ],
      },
    },
    en: {
      title: 'Your page address and QR link explained',
      excerpt:
        'Your QR code opens your page address, which starts with /r/. If the address changes, old QR codes stop working; switching the target platform needs no reprint.',
      tags: ['page address', 'slug', 'qr link', 'url', 'reprint'],
      body: {
        lead: 'Every business has a page address, and your QR codes open it. Choosing the address carefully once spares you from reprinting QR codes later.',
        keyInsight:
          'Changing a platform link, the threshold or the default platform in the panel needs no reprint; changing the page address makes old QR codes stop working.',
        sections: [
          {
            title: 'What is inside the QR code?',
            paragraphs: [
              'The QR code carries the link to your Buaze page: www.buaze.com/r/your-page-address. An optional table label and a fixed platform can be added to the link. When a customer scans the code, this page opens, and the review page they are sent to is decided at that moment from your panel settings.',
            ],
          },
          {
            title: 'A good page address',
            items: [
              'Keep it short and readable; your business name is usually enough.',
              'Only lowercase letters, numbers and hyphens are allowed; replace Turkish letters with plain ones (s instead of ş).',
              'If you have several branches, add a distinguishing suffix (example-kadikoy, example-besiktas).',
              'Leave out campaign or season names; the address will be used for a long time.',
            ],
          },
          {
            title: 'Before you change the address',
            paragraphs: [
              'You can change the page address on the **General details** tab of your business settings. QR codes printed with the old address are not redirected, so they will no longer open your business. If you must change it, prepare new QR codes and remove the old materials on the same day.',
            ],
          },
        ],
        checklist: [
          'The page address is short and readable.',
          'It has no Turkish letters or spaces.',
          'Branches use consistent suffixes.',
          'The address is final before any QR code is printed.',
        ],
        faq: [
          {
            q: 'If I change the platform customers are sent to, do I need to reprint?',
            a: 'No. Because the QR code opens your Buaze page, the same QR follows any change you make in the panel to platform links, the threshold or the default platform. Only if you want to change the platform pinned to a QR code do you need to create a new one.',
          },
          {
            q: 'Can the page address contain capital letters?',
            a: 'No. Only lowercase letters, numbers and hyphens are accepted.',
          },
          {
            q: 'What if another business already uses the address I want?',
            a: 'Each page address is unique, so an address already in use cannot be saved. Try a distinguishing suffix.',
          },
        ],
      },
    },
  }),

  ...pair('getting-started', 50, 'brand-colors-logo', {
    tr: {
      title: 'Marka rengi ve logo nerede kullanılır?',
      excerpt:
        'Marka sekmesindeki logo ve renkler QR menüde, anketlerde ve QR renk seçeneğinde kullanılır. Puan ekranı ise standart tasarımdadır ve işletme adınızı gösterir.',
      tags: ['marka', 'logo', 'renk', 'menü', 'tasarım'],
      body: {
        lead: 'Marka ayarları, işletmenizin Buaze üzerindeki sayfalarda tanıdık görünmesini sağlar. Hangi ayarın nerede kullanıldığını bilmek, zamanınızı doğru yere ayırmanıza yardım eder.',
        keyInsight:
          'Logo ve renkler en çok QR menüde ve anketlerde görünür; müşterinin puan verdiği ekran ise Buaze’nin standart tasarımını kullanır.',
        sections: [
          {
            title: 'Nereden ayarlanır?',
            paragraphs: [
              'İşletme ayarlarında **Marka** sekmesini açın. Burada logo, birincil, ikincil ve vurgu rengi, yazı tipi ve slogan alanları bulunur. Ayarlar işletme başınadır; her şube kendi logosunu ve renklerini kullanabilir.',
            ],
          },
          {
            title: 'Ayarlar nerede görünür?',
            items: [
              '**Logo:** QR menünüzde ve menünün açılış ekranında.',
              '**Birincil renk:** menüde ayrıca bir vurgu rengi seçmediyseniz menüde; bunun yanında anketlerde, denetim formlarında ve QR oluştururken “marka rengi” seçeneğinde.',
              '**Vurgu rengi:** QR menünüzün vurgu rengi olarak.',
              '**Puan ekranı:** müşterinin puan verdiği sayfa Buaze’nin standart tasarımını kullanır; işletmenizin adını ve adresini gösterir.',
            ],
          },
          {
            title: 'Okunaklılık için',
            items: [
              'Logo küçük boyutta da okunaklı olsun; şeffaf arka planlı bir dosya daha temiz görünür.',
              'Açık renkleri beyaz zemin üzerinde yazı rengi olarak kullanmayın.',
              'QR rengi seçerken koyu ön plan ve açık arka plan kullanın; kontrast düşükse sihirbaz sizi uyarır.',
            ],
          },
        ],
        checklist: [
          'Logo yüklendi ve menüde net görünüyor.',
          'Birincil renk seçildi.',
          'Menü vurgu rengi markanızla uyumlu.',
          'Seçtiğiniz renklerdeki QR kodu telefonla okunuyor.',
        ],
        faq: [
          {
            q: 'Logomu puan ekranına ekleyebilir miyim?',
            a: 'Şu an hayır. Puan ekranı işletme adınızı ve adresinizi gösterir; logo ve renkler QR menüde ve anketlerde kullanılır.',
          },
          {
            q: 'Şubelerim farklı renkler kullanabilir mi?',
            a: 'Evet. Marka ayarları her işletme için ayrı tutulur.',
          },
          {
            q: 'QR kodunu marka rengimle oluşturabilir miyim?',
            a: 'Evet. QR sihirbazında 6 hazır renk, marka renginiz veya özel renk seçebilirsiniz. Renkler arasındaki kontrast düşükse sihirbaz uyarır; okunması zor bir QR oluşturulmaz.',
          },
        ],
      },
    },
    en: {
      title: 'Where your brand colour and logo appear',
      excerpt:
        'The logo and colours on the Brand tab appear in your QR menu, surveys and QR colour options. The rating screen uses a standard design with your business name.',
      tags: ['brand', 'logo', 'colour', 'menu', 'design'],
      body: {
        lead: 'Brand settings make your business look familiar on its Buaze pages. Knowing where each setting is used helps you spend your time in the right place.',
        keyInsight:
          'Your logo and colours appear mostly in the QR menu and surveys; the screen where customers give their rating uses Buaze’s standard design.',
        sections: [
          {
            title: 'Where do I set them?',
            paragraphs: [
              'Open the **Brand** tab in your business settings. It holds the logo, the primary, secondary and accent colours, the font and the tagline. Settings are per business, so each branch can use its own logo and colours.',
            ],
          },
          {
            title: 'Where do they appear?',
            items: [
              '**Logo:** in your QR menu and on the menu’s opening screen.',
              '**Primary colour:** in the menu when you have not picked a separate accent colour there; also in surveys, audit forms and as the “brand colour” option when you create a QR code.',
              '**Accent colour:** as the accent colour of your QR menu.',
              '**Rating screen:** the page where customers give their rating uses Buaze’s standard design and shows your business name and address.',
            ],
          },
          {
            title: 'Keep it readable',
            items: [
              'Make sure the logo is legible at small sizes; a file with a transparent background looks cleaner.',
              'Do not use light colours as text colours on a white background.',
              'For QR colours, use a dark foreground on a light background; the wizard warns you when the contrast is too low.',
            ],
          },
        ],
        checklist: [
          'The logo is uploaded and looks sharp in the menu.',
          'A primary colour is selected.',
          'The menu accent colour matches your brand.',
          'A QR code in your chosen colours scans on a phone.',
        ],
        faq: [
          {
            q: 'Can I add my logo to the rating screen?',
            a: 'Not at the moment. The rating screen shows your business name and address; your logo and colours are used in the QR menu and surveys.',
          },
          {
            q: 'Can my branches use different colours?',
            a: 'Yes. Brand settings are kept separately for each business.',
          },
          {
            q: 'Can I create a QR code in my brand colour?',
            a: 'Yes. In the QR wizard you can choose one of 6 preset colours, your brand colour or a custom colour. If the contrast between the colours is too low, the wizard warns you and does not create a hard-to-scan QR code.',
          },
        ],
      },
    },
  }),

  ...pair('getting-started', 60, 'common-onboarding-pitfalls', {
    tr: {
      title: 'Kurulumda sık yapılan hatalar',
      excerpt:
        'Sayfa adresini basımdan sonra değiştirmek, uyarıları kişisel e-postaya bağlamak, bağlantıyı denemeden basmak: kurulumda sık karşılaşılan hatalar ve çözümleri.',
      tags: ['kurulum', 'hata', 'sorun giderme', 'başlangıç', 'qr'],
      body: {
        lead: 'Kurulum kısa sürer, ama birkaç küçük atlama ilk haftalarda geri bildirimlerin gözden kaçmasına yol açabilir. Aşağıdaki hataların her biri birkaç dakikada önlenebilir.',
        keyInsight:
          'QR kodunu basmadan önce sayfa adresini kesinleştirin, bildirim e-postasını ortak bir adrese bağlayın ve akışı hem yüksek hem düşük puanla deneyin.',
        sections: [
          {
            title: '1. Sayfa adresini basımdan sonra değiştirmek',
            paragraphs: [
              'Eski adresle basılmış QR kodları yeni adrese yönlendirilmez. Adresi QR kodunu basmadan önce kesinleştirin; ayrıntılar [sayfa adresi rehberinde](/tr/help/slug-and-url).',
            ],
          },
          {
            title: '2. Uyarıları tek bir kişinin e-postasına bağlamak',
            paragraphs: [
              'Düşük puan uyarısı yalnızca bir kişinin gelen kutusuna gidiyorsa o kişi izindeyken geri bildirimler bekler. Bildirim e-postası olarak ekibin ortak adresini kullanın.',
            ],
          },
          {
            title: '3. Yorum bağlantısını denemeden basmak',
            paragraphs: [
              'Yanlış işletmeye ya da platformun ana sayfasına giden bir bağlantı, yorum yazmak isteyen müşteriyi boşa çıkarır. **Platform bağlantıları** sayfasında bağlantıyı test edin ve QR kodunu kendi telefonunuzla okutun.',
            ],
          },
          {
            title: '4. QR kodunu yalnızca masaya koymak',
            paragraphs: [
              'Her müşteri masada oturmaz. Paket servisi, kasayı ve çıkış kapısını da düşünün; yerleşim önerileri [QR yerleşim rehberinde](/tr/help/qr-placement-guide).',
            ],
          },
          {
            title: '5. Ekibi geç davet etmek',
            paragraphs: [
              'Geri bildirimleri yalnızca işletme sahibi takip ederse yanıtlar gecikir. Yanıt yazacak ekip arkadaşlarınızı ilk hafta davet edin; adımlar [ekip daveti rehberinde](/tr/help/invite-team-members).',
            ],
          },
        ],
        checklist: [
          'Sayfa adresi kesinleşti.',
          'Bildirim e-postası ortak bir adres.',
          'Her platform bağlantısı test edildi.',
          'QR kodu birden fazla noktada kullanılıyor.',
          'En az bir ekip arkadaşı davet edildi.',
        ],
        faq: [
          {
            q: 'Sayfa adresini değiştirdim; eski QR kodları ne olacak?',
            a: 'Eski adresle basılmış QR kodları artık işletmenizi açmaz. Yeni QR kodlarını oluşturup eski materyalleri değiştirmeniz gerekir.',
          },
          {
            q: 'Deneme süresinde kart bilgisi vermem gerekiyor mu?',
            a: 'Hayır. Deneme kart bilgisi olmadan başlar; ücretli plana geçtiğinizde ödeme adımı açılır.',
          },
          {
            q: 'Kurulumda takıldım; nereden yardım alabilirim?',
            a: `[${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazabilirsiniz. ${SUPPORT_HOURS.tr}`,
          },
        ],
      },
    },
    en: {
      title: 'Common setup mistakes and how to avoid them',
      excerpt:
        'Changing the page address after printing, sending alerts to one personal inbox, printing an untested link: the most common setup mistakes and how to fix them.',
      tags: ['setup', 'mistakes', 'troubleshooting', 'getting started', 'qr'],
      body: {
        lead: 'Setup is quick, but a few small slips can mean feedback is missed in the first weeks. Each of the mistakes below can be avoided in a few minutes.',
        keyInsight:
          'Before printing your QR code, finalise the page address, send alerts to a shared address and test the flow with both a high and a low rating.',
        sections: [
          {
            title: '1. Changing the page address after printing',
            paragraphs: [
              'QR codes printed with the old address are not redirected to the new one. Finalise the address before you print; see the [page address guide](/en/help/slug-and-url).',
            ],
          },
          {
            title: '2. Sending alerts to one person’s inbox',
            paragraphs: [
              'If low-rating alerts reach only one person, feedback waits while they are away. Use a shared team address as the notification e-mail.',
            ],
          },
          {
            title: '3. Printing a review link you have not tested',
            paragraphs: [
              'A link that opens the wrong business or a platform’s home page wastes the effort of a customer who wants to write a review. Test the link on the **Platform links** page and scan the QR code with your own phone.',
            ],
          },
          {
            title: '4. Putting the QR code only on tables',
            paragraphs: [
              'Not every customer sits at a table. Think about delivery bags, the till and the exit door too; see the [QR placement guide](/en/help/qr-placement-guide).',
            ],
          },
          {
            title: '5. Inviting your team late',
            paragraphs: [
              'If only the business owner follows feedback, replies are delayed. Invite the teammates who will write replies in the first week; the steps are in the [team invite guide](/en/help/invite-team-members).',
            ],
          },
        ],
        checklist: [
          'The page address is final.',
          'The notification e-mail is a shared address.',
          'Every platform link has been tested.',
          'The QR code is used in more than one place.',
          'At least one teammate has been invited.',
        ],
        faq: [
          {
            q: 'I changed the page address. What happens to my old QR codes?',
            a: 'QR codes printed with the old address no longer open your business. Create new QR codes and replace the old materials.',
          },
          {
            q: 'Do I need to give card details during the trial?',
            a: 'No. The trial starts without card details; the payment step opens only when you move to a paid plan.',
          },
          {
            q: 'I am stuck during setup. Where can I get help?',
            a: `Write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}). ${SUPPORT_HOURS.en}`,
          },
        ],
      },
    },
  }),

  /* ---------------------------- QR kodları --------------------------- */
  ...pair('qr-codes', 10, 'qr-placement-guide', {
    tr: {
      title: 'QR kodunu nereye koymalı: masa, fiş, kapı ve paket',
      excerpt:
        'QR kodu, müşterinin telefonu zaten elindeyken görünür olmalı. Masa, fiş, kapı ve paket servis için yerleşim önerileri ve basmadan önce yapılacak kontroller.',
      tags: ['qr', 'yerleşim', 'masa', 'fiş', 'paket servis'],
      body: {
        lead: 'QR kodunun ne kadar okutulacağı, en çok müşterinin onu hangi anda gördüğüne bağlıdır. En iyi sonuç, deneyim tazeyken ve müşterinin telefonu elindeyken alınır.',
        keyInsight:
          'QR kodunu, müşterinin telefonu zaten elinde olduğu bir noktaya koyun ve yanına ne olacağını anlatan kısa bir cümle ekleyin.',
        sections: [
          {
            title: 'Masada',
            paragraphs: [
              'Masadaki QR kodu servis sırasında ya da hesap beklenirken okutulur. Her masa için masa etiketli ayrı bir QR oluşturursanız, düşük puan e-postasında ve CSV dışa aktarımında geri bildirimin hangi masadan geldiği görünür.',
            ],
          },
          {
            title: 'Fişte ve kasada',
            paragraphs: [
              'Hesap ödendikten sonra deneyimin tamamı değerlendirilebilir. Fişe ya da kasaya konan QR kodu bu anı yakalar.',
            ],
          },
          {
            title: 'Kapıda ve paket serviste',
            paragraphs: [
              'Çıkış kapısındaki QR kodu, ayrılmadan önce bir şey söylemek isteyen müşteriye ulaşır. Paket servisteki QR kodu teslimat deneyimini ölçer; bu QR’ı ilgili teslimat platformuna sabitlerseniz eşik ve üzerinde puan veren müşteri o platformun yorum sayfasına gider.',
            ],
          },
          {
            title: 'Basmadan önce',
            items: [
              'QR kodunun çevresinde boşluk bırakın ve çok küçük basmayın.',
              'Koyu ön plan, açık arka plan kullanın.',
              'Parlak, ışığı yansıtan yüzeylerden kaçının.',
              'Basılı örneği farklı telefonlarla, masada oturan birinin mesafesinden okutun.',
              'Yanına kısa bir davet yazın, örneğin “Deneyiminizi bizimle paylaşın”.',
            ],
          },
        ],
        checklist: [
          'Her masanın QR kodu doğru etiketle oluşturuldu.',
          'Paket servis QR kodu doğru platforma sabitlendi.',
          'Basılı örnek farklı telefonlarla okutuldu.',
          'QR kodunun yanında kısa bir davet cümlesi var.',
        ],
        faq: [
          {
            q: 'Aynı QR kodunu her yerde kullanabilir miyim?',
            a: 'Kullanabilirsiniz. Ancak masa etiketli ayrı QR kodları, geri bildirimin hangi noktadan geldiğini düşük puan e-postasında ve CSV’de görmenizi sağlar.',
          },
          {
            q: 'Buaze baskıya hazır QR kartı veya çerçeve sunuyor mu?',
            a: 'Hayır. Buaze QR kodunu seçtiğiniz renklerle, sade biçimde üretir; PNG olarak indirebilir veya PDF olarak yazdırabilirsiniz. Kart, çerçeve ya da masa standı tasarımını kendiniz hazırlarsınız.',
          },
          {
            q: 'QR kodunun yanına yorum karşılığı indirim yazabilir miyim?',
            a: `Hayır. Yorum karşılığında indirim, hediye veya ödül vaat etmek [Google’ın yorum kurallarına](${GOOGLE_POLICY_URL}) aykırıdır. Yanına yalnızca deneyimi paylaşmaya davet eden bir cümle yazın.`,
          },
        ],
      },
    },
    en: {
      title: 'Where to put your QR code: table, receipt, door, bag',
      excerpt:
        'A QR code works best where customers already hold their phone. Placement tips for tables, receipts, doors and delivery bags, plus checks to run before printing.',
      tags: ['qr', 'placement', 'table', 'receipt', 'delivery'],
      body: {
        lead: 'How often a QR code is scanned depends mostly on when the customer sees it. The best moment is while the experience is fresh and the phone is already in hand.',
        keyInsight:
          'Put the QR code where customers already hold their phone, and add a short line next to it that says what happens when they scan.',
        sections: [
          {
            title: 'On the table',
            paragraphs: [
              'A table QR code is scanned during the meal or while waiting for the bill. If you create a separate QR code with a table label for each table, the low-rating e-mail and the CSV export show which table the feedback came from.',
            ],
          },
          {
            title: 'On the receipt and at the till',
            paragraphs: [
              'Once the bill is paid, the whole visit can be judged. A QR code on the receipt or at the till catches that moment.',
            ],
          },
          {
            title: 'At the door and on delivery bags',
            paragraphs: [
              'A QR code by the exit reaches customers who want to say something before they leave. A QR code on a delivery bag measures the delivery experience; if you pin it to that delivery platform, customers who rate at or above your threshold are sent to that platform’s review page.',
            ],
          },
          {
            title: 'Before you print',
            items: [
              'Leave clear space around the QR code and do not print it too small.',
              'Use a dark foreground on a light background.',
              'Avoid shiny surfaces that reflect light.',
              'Scan the printed sample with different phones from where a seated guest would hold them.',
              'Add a short invitation next to it, such as “Tell us about your visit”.',
            ],
          },
        ],
        checklist: [
          'Each table’s QR code is created with the right label.',
          'The delivery QR code is pinned to the right platform.',
          'The printed sample scans on different phones.',
          'A short invitation sits next to the QR code.',
        ],
        faq: [
          {
            q: 'Can I use the same QR code everywhere?',
            a: 'You can. Separate QR codes with table labels, however, show where feedback came from in the low-rating e-mail and the CSV export.',
          },
          {
            q: 'Does Buaze offer print-ready QR cards or frames?',
            a: 'No. Buaze generates a plain QR code in the colours you choose, which you can download as a PNG or print to PDF. You design the card, frame or table stand yourself.',
          },
          {
            q: 'Can I offer a discount for reviews next to the QR code?',
            a: `No. Promising a discount, gift or reward in exchange for a review is against [Google’s review policy](${GOOGLE_POLICY_URL}). Write only a line that invites customers to share their experience.`,
          },
        ],
      },
    },
  }),

  ...pair('qr-codes', 20, 'qr-platform-table-links', {
    tr: {
      title: 'QR bağlantısında masa etiketi ve platform seçimi',
      excerpt:
        'QR oluştururken masa etiketi ekleyebilir, yüksek puanların gideceği platformu sabitleyebilirsiniz. İki seçimin ne işe yaradığını ve nerede göründüğünü öğrenin.',
      tags: ['masa etiketi', 'platform', 'qr bağlantısı', 'sabit platform', 'parametre'],
      body: {
        lead: 'QR sihirbazındaki iki isteğe bağlı seçim, aynı işletme için farklı noktalara farklı QR kodları hazırlamanızı sağlar: masa etiketi ve sabit platform.',
        keyInsight:
          'Masa etiketi geri bildirimin hangi noktadan geldiğini gösterir; sabit platform ise eşik ve üzerinde puan veren müşterinin hangi yorum sayfasına gideceğini belirler.',
        sections: [
          {
            title: 'Masa etiketi',
            paragraphs: [
              '**Masa numarası** alanına en fazla 20 karakter yazabilirsiniz; harf, rakam, kısa çizgi ve alt çizgi kullanılır (örneğin A1, BAHCE-3). Etiket, düşük puan e-postasında ve CSV dışa aktarımındaki “QR etiketi” sütununda görünür. Yalnızca masa için değil, bir alan ya da nokta için de kullanabilirsiniz (örneğin PAKET, KASA).',
            ],
          },
          {
            title: 'Platform seçimi',
            paragraphs: [
              '**Varsayılan platforma gönder** seçeneği, işletme ayarlarındaki varsayılan platformu kullanır. **Belirli bir platforma sabitle** seçeneğinde, bu QR kodunu okutan ve eşik ve üzerinde puan veren müşteri yalnızca seçtiğiniz platformun yorum sayfasına gider. Listede, bağlantısını eklediğiniz ve sektörünüze uyan platformlar görünür.',
            ],
          },
          {
            title: 'Platform belirtilmezse',
            paragraphs: [
              'QR koduna platform sabitlenmemişse sırasıyla varsayılan platformunuz, sektörünüze göre öncelikli platform ve bağlantısı olan diğer platformlar denenir. Hiçbir platform bağlantısı yoksa müşteri teşekkür ekranını görür.',
            ],
          },
          {
            title: 'Bağlantının yapısı',
            paragraphs: [
              'Sihirbazın oluşturduğu bağlantı şu biçimdedir: /r/sayfa-adresi?source=qr&table=A1&platform=yemeksepeti. Bağlantıyı elle düzenlemeniz gerekmez; sihirbaz sizin için oluşturur.',
            ],
          },
        ],
        checklist: [
          'Masa etiketleri tutarlı bir düzenle yazıldı.',
          'Paket servis QR kodları ilgili teslimat platformuna sabitlendi.',
          'Varsayılan platform seçildi.',
          'Her QR kodu telefonla denendi.',
        ],
        faq: [
          {
            q: 'Masa etiketi gelen kutusunda görünüyor mu?',
            a: 'Hayır. Masa etiketi düşük puan e-postasında ve CSV dışa aktarımında görünür; gelen kutusunda ve analitikte ayrı bir kırılım olarak gösterilmez.',
          },
          {
            q: 'Sabitlenmiş platformun bağlantısı bozulursa ne olur?',
            a: 'Günlük otomatik kontrolde başarısız olan bir bağlantı 24 saat boyunca atlanır ve müşteri sıradaki uygun platforma gider. Ayrıntılar: [Bağlantı kontrolleri ve bozuk bağlantılar](/tr/help/platform-link-checks).',
          },
          {
            q: 'Bir QR kodunun platformunu sonradan değiştirebilir miyim?',
            a: 'Sabit platform QR kodunun bağlantısının içindedir; değiştirmek için yeni bir QR oluşturun. Platform sabitlenmemiş QR kodları ise varsayılan platformu değiştirdiğinizde yeni ayarı izler.',
          },
        ],
      },
    },
    en: {
      title: 'Table labels and platform choice in QR links',
      excerpt:
        'When creating a QR code you can add a table label and pin the platform that high ratings go to. Learn what each choice does and where it shows up.',
      tags: ['table label', 'platform', 'qr link', 'pinned platform', 'parameter'],
      body: {
        lead: 'Two optional choices in the QR wizard let you prepare different QR codes for different spots in the same business: the table label and the pinned platform.',
        keyInsight:
          'The table label shows where feedback came from; the pinned platform decides which review page customers who rate at or above your threshold are sent to.',
        sections: [
          {
            title: 'Table label',
            paragraphs: [
              'The **Table number** field takes up to 20 characters: letters, numbers, hyphens and underscores (for example A1, PATIO-3). The label appears in the low-rating e-mail and in the “QR etiketi” (QR label) column of the CSV export. You can use it for an area or a spot as well as a table (for example DELIVERY, TILL).',
            ],
          },
          {
            title: 'Platform choice',
            paragraphs: [
              '**Use default platform** uses the default platform from your business settings. With **Pin to specific platform**, a customer who scans this QR code and rates at or above your threshold is sent only to the review page of the platform you choose. The list shows platforms whose link you have added and that suit your sector.',
            ],
          },
          {
            title: 'When no platform is pinned',
            paragraphs: [
              'If no platform is pinned to the QR code, Buaze tries your default platform, then the priority platform for your sector, then any other platform with a link, in that order. If no platform link exists, the customer sees the thank-you screen.',
            ],
          },
          {
            title: 'What the link looks like',
            paragraphs: [
              'The link the wizard builds looks like this: /r/your-page-address?source=qr&table=A1&platform=yemeksepeti. You do not need to edit it by hand; the wizard builds it for you.',
            ],
          },
        ],
        checklist: [
          'Table labels follow a consistent pattern.',
          'Delivery QR codes are pinned to the right delivery platform.',
          'A default platform is selected.',
          'Every QR code has been tested on a phone.',
        ],
        faq: [
          {
            q: 'Does the table label show in the inbox?',
            a: 'No. The table label appears in the low-rating e-mail and the CSV export; the inbox and analytics do not break results down by it.',
          },
          {
            q: 'What if the pinned platform’s link breaks?',
            a: 'A link that fails the daily automatic check is skipped for 24 hours and the customer goes to the next suitable platform. See [Link checks and broken links](/en/help/platform-link-checks).',
          },
          {
            q: 'Can I change a QR code’s platform later?',
            a: 'The pinned platform is part of the QR code’s link, so create a new QR code to change it. QR codes without a pinned platform follow your default platform whenever you change it.',
          },
        ],
      },
    },
  }),

  ...pair('qr-codes', 30, 'bulk-qr-generation', {
    tr: {
      title: 'Çok masalı işletmede QR kodlarını planlama',
      excerpt:
        'Panelde QR kodları tek tek oluşturulur; toplu üretim yoktur. Çok sayıda masa veya şube için etiket düzeni, oluşturma sırası ve baskı kontrolü nasıl planlanır?',
      tags: ['çok masa', 'toplu qr', 'şube', 'baskı', 'masa etiketi'],
      body: {
        lead: 'Çok sayıda masası ya da birden çok şubesi olan işletmelerde QR kodlarını hazırlamak, baştan bir düzen kurulduğunda kolaylaşır. Bu rehber, hata payını azaltan bir çalışma sırası önerir.',
        keyInsight:
          'Panelde her QR kodu sihirbazla tek tek oluşturulur; önce etiket listesini yazın, sonra QR kodlarını sırayla oluşturup her birini telefonla deneyin.',
        sections: [
          {
            title: 'Önce etiket listesi',
            paragraphs: [
              'Masa numaralarını baskıdan önce bir listede netleştirin. Salon, bahçe veya kat gibi alanları bir önekle ayırın (S1, S2, B1). Etiketler en fazla 20 karakterdir ve yalnızca harf, rakam, kısa çizgi ve alt çizgi içerir.',
            ],
          },
          {
            title: 'QR kodlarını oluşturma',
            paragraphs: [
              'Listedeki her masa için **QR** sayfasında **Yeni QR oluştur** ile bir QR kodu hazırlayın ve masa etiketini girin. Oluşturduğunuz QR kodları sayfada listelenir; her birini PNG olarak indirebilir veya PDF olarak yazdırabilirsiniz. Panelde toplu üretim veya toplu indirme yoktur.',
            ],
          },
          {
            title: 'Şubeler',
            paragraphs: [
              'Her şube ayrı bir işletmedir; kendi sayfa adresi ve kendi QR kodları vardır. Bir şubenin QR kodunu başka bir şubede kullanmayın, yoksa geri bildirim yanlış işletmeye düşer.',
            ],
          },
          {
            title: 'Baskı kontrolü',
            paragraphs: [
              'Matbaaya göndermeden önce birkaç QR kodunu rastgele seçip telefonla okutun; doğru işletmenin açıldığını kontrol edin.',
            ],
          },
        ],
        checklist: [
          'Etiket listesi yazıldı.',
          'Her QR kodu doğru işletmede oluşturuldu.',
          'Her masa için doğru etiket girildi.',
          'Rastgele seçilen QR kodları telefonla denendi.',
        ],
        faq: [
          {
            q: 'Toplu QR üretme veya indirme var mı?',
            a: 'Hayır. QR kodları panelde tek tek oluşturulur, indirilir veya yazdırılır.',
          },
          {
            q: 'Eski bir şubenin QR kodlarını yeni şubede kullanabilir miyim?',
            a: 'Hayır. QR kodu belirli bir işletmenin sayfasını açar; yeni şube için yeni QR kodları oluşturun.',
          },
        ],
      },
    },
    en: {
      title: 'Planning QR codes for a business with many tables',
      excerpt:
        'QR codes are created one by one in the panel; there is no bulk generation. How to plan labels, the order of work and print checks for many tables or branches.',
      tags: ['many tables', 'bulk qr', 'branches', 'printing', 'table label'],
      body: {
        lead: 'For businesses with many tables or several branches, preparing QR codes gets easier when you set up an order first. This guide suggests a way of working that keeps mistakes down.',
        keyInsight:
          'In the panel, each QR code is created one at a time in the wizard; write your label list first, then create the QR codes in order and test each one on a phone.',
        sections: [
          {
            title: 'Start with a label list',
            paragraphs: [
              'Settle the table numbers in a list before printing. Separate areas such as the dining room, garden or floor with a prefix (D1, D2, G1). Labels are up to 20 characters and contain only letters, numbers, hyphens and underscores.',
            ],
          },
          {
            title: 'Creating the QR codes',
            paragraphs: [
              'For each table on the list, press **Create QR code** on the **QR** page and enter the table label. The QR codes you create are listed on the page; download each one as a PNG or print it to PDF. The panel has no bulk generation or bulk download.',
            ],
          },
          {
            title: 'Branches',
            paragraphs: [
              'Each branch is a separate business with its own page address and its own QR codes. Do not use one branch’s QR code at another branch, or the feedback will land in the wrong business.',
            ],
          },
          {
            title: 'Print check',
            paragraphs: [
              'Before sending files to the printer, pick a few QR codes at random and scan them with a phone to check that the right business opens.',
            ],
          },
        ],
        checklist: [
          'The label list is written.',
          'Each QR code was created in the right business.',
          'Each table has the right label.',
          'Randomly chosen QR codes were tested on a phone.',
        ],
        faq: [
          {
            q: 'Can I generate or download QR codes in bulk?',
            a: 'No. QR codes are created, downloaded or printed one at a time in the panel.',
          },
          {
            q: 'Can I reuse an old branch’s QR codes at a new branch?',
            a: 'No. A QR code opens one specific business’s page; create new QR codes for the new branch.',
          },
        ],
      },
    },
  }),

  ...pair('qr-codes', 40, 'qr-print-materials', {
    tr: {
      title: 'Basılı QR materyallerini güncel tutma',
      excerpt:
        'Etiketler yıpranır, masa kartları kaybolur, eski baskılar ortada kalır. Basılı QR materyallerini düzenli kontrol etmek ve gerektiğinde yenilemek için öneriler.',
      tags: ['baskı', 'etiket', 'masa kartı', 'bakım', 'qr'],
      body: {
        lead: 'QR kodunun dijital tarafı sabit kalsa da basılı materyal yıpranır, kaybolur ya da yanlışlıkla eskisiyle değiştirilir. Basılı materyalleri düzenli kontrol etmek, okunmayan bir QR kodunun müşteriyi boşa çıkarmasını önler.',
        keyInsight:
          'Basılı QR kodlarını ayda bir dolaşıp okutun; yıpranmış ya da yanlış işletmeyi açan materyali hemen değiştirin.',
        sections: [
          {
            title: 'Yıpranma kontrolü',
            paragraphs: [
              'Parlak yüzeylerdeki etiketler zamanla silikleşir, dış mekândaki baskılar güneşte solar. Düzenli bir tur, müşterinin okutamadığı bir QR kodunu sizden önce fark etmenizi sağlar.',
            ],
          },
          {
            title: 'Düzen için öneriler',
            items: [
              'Basılı materyalin köşesine küçük bir sürüm notu ekleyin (örneğin “2026-11”).',
              'Birkaç yedek etiketi işletmede bulundurun.',
              'Yeni baskı geldiğinde eskilerini toplayın.',
              'Şube sorumlusuna kısa bir kontrol listesi verin.',
            ],
          },
          {
            title: 'Ne zaman yeniden basmak gerekir?',
            items: [
              'Sayfa adresini değiştirdiğinizde.',
              'Bir QR koduna sabitlenmiş platformu değiştirmek istediğinizde.',
              'Baskı yıprandığında ya da okutulamadığında.',
            ],
          },
        ],
        checklist: [
          'Basılı QR kodları ayda bir okutuluyor.',
          'Yedek etiketler hazır.',
          'Eski baskılar toplandı.',
          'Dekorasyon değiştiğinde QR kodlarının yeri gözden geçirildi.',
        ],
        faq: [
          {
            q: 'Varsayılan platformu değiştirdim; QR kodlarını yeniden basmam gerekir mi?',
            a: 'Hayır. Platform sabitlenmemiş QR kodları, panelde yaptığınız değişikliği hemen izler. Yeniden baskı yalnızca sayfa adresi veya QR koduna sabitlenmiş platform değiştiğinde gerekir.',
          },
          {
            q: 'Eski bir baskı hâlâ çalışıyor mu?',
            a: 'Sayfa adresiniz değişmediyse ve işletmeniz duraklatılmadıysa eski baskı da işletmenizin sayfasını açar.',
          },
        ],
      },
    },
    en: {
      title: 'Keeping printed QR materials up to date',
      excerpt:
        'Stickers wear out, table cards go missing and old prints stay in use. Tips for checking printed QR materials regularly and replacing them when needed.',
      tags: ['printing', 'sticker', 'table card', 'maintenance', 'qr'],
      body: {
        lead: 'Even when the digital side of a QR code stays the same, printed material wears out, gets lost or is swapped for an old version by mistake. Checking it regularly keeps an unreadable code from wasting a customer’s effort.',
        keyInsight:
          'Walk around once a month and scan your printed QR codes; replace anything worn or anything that opens the wrong business straight away.',
        sections: [
          {
            title: 'Checking for wear',
            paragraphs: [
              'Stickers on shiny surfaces fade over time and outdoor prints bleach in the sun. A regular walk-round lets you spot a code customers cannot scan before they do.',
            ],
          },
          {
            title: 'Staying organised',
            items: [
              'Add a small version note in a corner of the print (for example “2026-11”).',
              'Keep a few spare stickers on site.',
              'Collect old prints when the new ones arrive.',
              'Give each branch lead a short checklist.',
            ],
          },
          {
            title: 'When do you need to reprint?',
            items: [
              'When you change the page address.',
              'When you want to change the platform pinned to a QR code.',
              'When the print is worn or will not scan.',
            ],
          },
        ],
        checklist: [
          'Printed QR codes are scanned once a month.',
          'Spare stickers are ready.',
          'Old prints have been collected.',
          'QR positions were reviewed after any redecoration.',
        ],
        faq: [
          {
            q: 'I changed the default platform. Do I need to reprint my QR codes?',
            a: 'No. QR codes without a pinned platform follow changes you make in the panel straight away. You only need to reprint when the page address or a QR code’s pinned platform changes.',
          },
          {
            q: 'Does an old print still work?',
            a: 'If your page address has not changed and your business is not paused, an old print still opens your business’s page.',
          },
        ],
      },
    },
  }),

  ...pair('qr-codes', 50, 'qr-scan-rate-optimization', {
    tr: {
      title: 'Müşterilerin QR kodunu daha çok okutması için',
      excerpt:
        'Yerleşim, davet cümlesi ve görünürlük QR kodunun ne kadar okutulduğunu belirler. Gelen geri bildirim sayısını izleyerek hangi değişikliğin işe yaradığını görün.',
      tags: ['okutma', 'yerleşim', 'davet cümlesi', 'görünürlük', 'qr'],
      body: {
        lead: 'Basılmış her QR kodu okutulmaz. Müşterinin kodu fark etmesi, ne olacağını anlaması ve bunu kolay bulması gerekir. Bu rehber, okutulma ihtimalini artıran küçük değişiklikleri anlatır.',
        keyInsight:
          'QR kodunu görünür bir yere koyun, yanına kısa ve dürüst bir davet yazın ve değişikliğin etkisini sonraki haftalarda gelen geri bildirim sayısından izleyin.',
        sections: [
          {
            title: 'Yerleşim',
            paragraphs: [
              'Müşteri telefonunu en çok menüye bakarken, hesabı beklerken ve sırada beklerken eline alır. QR kodu bu anların en az birinde göz hizasında olmalı.',
            ],
          },
          {
            title: 'Davet cümlesi',
            paragraphs: [
              'Yalnızca “QR’ı okutun” yazmak yerine ne olacağını söyleyin: **“Ziyaretinizi puanlayın ve görüşünüzü bizimle paylaşın.”** Cümle kısa, dürüst ve herkese aynı olsun; belirli bir puan istemeyin, karşılığında bir şey vaat etmeyin.',
            ],
          },
          {
            title: 'Görünürlük',
            items: [
              'QR kodunun çevresinde boşluk bırakın.',
              'Koyu-açık kontrastı güçlü tutun.',
              'Loş alanlarda iyi aydınlatılmış bir nokta seçin.',
              'Yansıyan, parlak yüzeylerden kaçının.',
            ],
          },
          {
            title: 'Etkisini ölçme',
            paragraphs: [
              'Panel QR okutma sayısını göstermez; değişikliğin etkisini gelen geri bildirim sayısından izlersiniz. Bir değişiklikten önceki ve sonraki haftalarda **Analitik** sayfasındaki toplam yorum sayısını karşılaştırın. Masa etiketli QR kodları kullanıyorsanız CSV dışa aktarımında masa bazında da bakabilirsiniz.',
            ],
          },
        ],
        policyNote: `Buaze müşteriye belirli bir puan dayatmaz ve yorum karşılığında indirim, hediye veya ödül sunmaz. Materyallerinizde de yorum karşılığı teklif vermeyin; [Google’ın yorum kuralları](${GOOGLE_POLICY_URL}) bunu yasaklar.`,
        checklist: [
          'QR kodu müşterinin telefonu elindeyken göreceği bir yerde.',
          'Davet cümlesi kısa ve herkese aynı.',
          'Kontrast ve aydınlatma yeterli.',
          'Değişiklik öncesi ve sonrası geri bildirim sayısı karşılaştırıldı.',
        ],
        faq: [
          {
            q: 'QR kodumun kaç kez okutulduğunu görebilir miyim?',
            a: 'Panelde QR okutma sayısı gösterilmez. Gelen geri bildirim sayısını **Analitik** ve **Yorumlar** sayfalarından izleyebilirsiniz.',
          },
          {
            q: 'Müşteriden belirli bir puan isteyebilir miyim?',
            a: 'Hayır. Davet cümlesi tarafsız olmalı; “5 yıldız verin” gibi ifadeler platform kurallarına aykırıdır ve müşterinin güvenini zedeler.',
          },
        ],
      },
    },
    en: {
      title: 'Helping more customers scan your QR code',
      excerpt:
        'Placement, the invitation line and visibility decide how often a QR code is scanned. Watch how much feedback comes in to see which change actually helps.',
      tags: ['scanning', 'placement', 'invitation', 'visibility', 'qr'],
      body: {
        lead: 'Not every printed QR code gets scanned. Customers need to notice it, understand what will happen and find it easy. This guide covers small changes that make a scan more likely.',
        keyInsight:
          'Put the QR code where it is easy to see, add a short and honest invitation next to it, and judge the effect by how much feedback you receive in the following weeks.',
        sections: [
          {
            title: 'Placement',
            paragraphs: [
              'Customers pick up their phone most often while reading the menu, waiting for the bill and standing in a queue. The QR code should be at eye level during at least one of these moments.',
            ],
          },
          {
            title: 'The invitation line',
            paragraphs: [
              'Instead of just “Scan the QR”, say what happens: **“Rate your visit and share your thoughts with us.”** Keep it short, honest and the same for everyone; do not ask for a particular rating or promise anything in return.',
            ],
          },
          {
            title: 'Visibility',
            items: [
              'Leave clear space around the QR code.',
              'Keep a strong dark-on-light contrast.',
              'In dim rooms, choose a well-lit spot.',
              'Avoid shiny surfaces that reflect light.',
            ],
          },
          {
            title: 'Measuring the effect',
            paragraphs: [
              'The panel does not show QR scan counts, so you track the effect through how much feedback you receive. Compare total reviews on the **Analytics** page for the weeks before and after a change. If you use QR codes with table labels, you can also look by table in the CSV export.',
            ],
          },
        ],
        policyNote: `Buaze does not push customers towards a particular rating and does not offer discounts, gifts or rewards for reviews. Do not offer anything in return for a review on your materials either; [Google’s review policy](${GOOGLE_POLICY_URL}) forbids it.`,
        checklist: [
          'The QR code is where customers see it with a phone in hand.',
          'The invitation is short and the same for everyone.',
          'Contrast and lighting are good enough.',
          'Feedback numbers before and after the change were compared.',
        ],
        faq: [
          {
            q: 'Can I see how many times my QR code was scanned?',
            a: 'The panel does not show QR scan counts. You can follow how much feedback comes in on the **Analytics** and **Reviews** pages.',
          },
          {
            q: 'Can I ask customers for a particular rating?',
            a: 'No. The invitation should be neutral; lines such as “give us 5 stars” break platform rules and cost you customers’ trust.',
          },
        ],
      },
    },
  }),

  /* -------------------------- Yorum yönetimi ------------------------- */
  ...pair('review-management', 10, 'handle-negative-feedback', {
    tr: {
      title: 'Düşük puanlı geri bildirimleri yanıtlama',
      excerpt:
        '1–3 yıldızlı geri bildirim geldiğinde e-posta uyarısı alırsınız. Müşteri e-posta bıraktıysa panelden e-postayla yanıt verebilirsiniz. Adımlar ve yanıt ipuçları.',
      tags: ['düşük puan', 'olumsuz geri bildirim', 'yanıt', 'e-posta', 'müşteri memnuniyeti'],
      body: {
        lead: 'Düşük puan, doğru ele alındığında müşteriyle yeniden bağ kurmanın bir fırsatıdır. Buaze bu geri bildirimleri size hızla ulaştırır ve panelden yanıt vermenizi sağlar.',
        keyInsight:
          'Uyarı geldiğinde geri bildirimi okuyun, müşteri e-posta bıraktıysa kısa ve sahiplenen bir yanıtı panelden gönderin, gerekiyorsa geri bildirimi işaretleyip takibe alın.',
        sections: [
          {
            title: 'Geri bildirim size nasıl ulaşır?',
            paragraphs: [
              'Müşteri QR kodunu okutur ve puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür. 1–3 yıldızlı her yeni geri bildirimde bildirim e-postanıza anında uyarı gider.',
            ],
          },
          {
            title: 'Yanıt gönderme',
            ordered: true,
            items: [
              '**Yorumlar** sayfasında geri bildirimi açın; düşük puanlıları **Düşük puan** sekmesinde bulabilirsiniz.',
              'Yanıtınızı yazın ya da Pulse AI taslağını düzenleyin.',
              'Müşteri e-posta bıraktıysa **Müşteriye e-posta gönder** kutusunu işaretli bırakın; bırakmadıysa yanıt panelde kayıt olarak saklanır.',
              'Sorumluluk onayını işaretleyip gönderin.',
            ],
          },
          {
            title: 'Yanıt dili',
            items: [
              'Müşterinin söylediği sorunu kendi cümlelerinizle tekrar edin.',
              'Savunmaya geçmeyin; deneyimi sahiplenin.',
              'Tek ve somut bir sonraki adım önerin.',
              'Kişisel veri, dış bağlantı veya hukuki tehdit içeren ifadeler kullanmayın.',
            ],
          },
          {
            title: 'Gönderim kuralları',
            paragraphs: [
              'Yanıt yazma 1–3 yıldızlı geri bildirimler için açıktır ve her geri bildirime bir yanıt gönderilir; e-posta iletilemezse yeniden deneyebilirsiniz. Her yanıt gönderilmeden önce güvenlik kontrolünden geçer: tehdit, hakaret, küfür, kişisel veri, yorum karşılığında teklif ve işletmenize ait olmayan bağlantılar içeren metinler gönderilmez. E-posta, Buaze’nin gönderim adresinden işletmeniz adına gider; işletme ayarlarında bildirim e-postası girdiyseniz müşterinin cevabı bu adrese gelir.',
            ],
          },
        ],
        policyNote:
          'Buaze yorum silmez, gizlemez veya değiştirmez. Düşük puan veren müşteri de herkese açık yorum bağlantısını görür; müşteriyi yorum yazmaktan caydıracak bir dil kullanmayın.',
        checklist: [
          'Düşük puan uyarısı açık.',
          'Geri bildirim okundu ve gerekiyorsa işaretlendi.',
          'Yanıt kısa, sahiplenen ve somut.',
          'Müşteri e-posta bıraktıysa yanıt e-postayla gönderildi.',
        ],
        faq: [
          {
            q: 'Düşük puan veren müşteri Google’a yorum yazabilir mi?',
            a: 'Evet. Eşiğin altındaki puanlarda müşteri önce size yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür ve müşteri dilediği yerde yorum yazabilir.',
          },
          {
            q: 'Yüksek puanlı geri bildirimlere yanıt verebilir miyim?',
            a: 'Panelden yanıt yazma 1–3 yıldızlı geri bildirimler için açıktır. Yüksek puanlar gelen kutusunda listelenir ve işaretlenebilir.',
          },
          {
            q: 'Yanıtım neden gönderilmedi?',
            a: 'Metin güvenlik kontrolüne takılmış olabilir; ekranda hangi kuralın tetiklendiği yazar. Metni düzeltip yeniden gönderebilirsiniz.',
          },
        ],
      },
    },
    en: {
      title: 'Responding to low-rated feedback',
      excerpt:
        'You get an e-mail alert when 1–3 star feedback arrives. If the customer left an e-mail, you can reply from the panel by e-mail. Steps and tips for replying.',
      tags: ['low rating', 'negative feedback', 'reply', 'e-mail', 'customer satisfaction'],
      body: {
        lead: 'Handled well, a low rating is a chance to reconnect with a customer. Buaze gets this feedback to you quickly and lets you reply from the panel.',
        keyInsight:
          'When the alert arrives, read the feedback, send a short reply that takes ownership if the customer left an e-mail, and flag the feedback if it needs follow-up.',
        sections: [
          {
            title: 'How does feedback reach you?',
            paragraphs: [
              'The customer scans the QR code and gives a rating. At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen. Every new 1–3 star feedback triggers an instant alert to your notification e-mail.',
            ],
          },
          {
            title: 'Sending a reply',
            ordered: true,
            items: [
              'Open the feedback on the **Reviews** page; low ratings are on the **Low rating** tab.',
              'Write your reply or edit the Pulse AI draft.',
              'If the customer left an e-mail, keep **Email the customer** ticked; if not, the reply is saved as a record in the panel.',
              'Tick the responsibility confirmation and send.',
            ],
          },
          {
            title: 'How to write it',
            items: [
              'Repeat the customer’s issue in your own words.',
              'Do not get defensive; take ownership of the experience.',
              'Offer one concrete next step.',
              'Leave out personal data, outside links and legal threats.',
            ],
          },
          {
            title: 'Sending rules',
            paragraphs: [
              'Replies can be written to 1–3 star feedback, one reply per piece of feedback; if the e-mail cannot be delivered, you can try again. Each reply passes a safety check before it is sent: text with threats, insults, profanity, personal data, offers in exchange for reviews or links that are not your business’s own is not sent. The e-mail goes out from Buaze’s sending address on your business’s behalf; if you have set a notification e-mail in your business settings, the customer’s answer goes to that address.',
            ],
          },
        ],
        policyNote:
          'Buaze does not delete, hide or edit reviews. Customers who give a low rating also see the public review link, so avoid any wording that discourages them from posting a review.',
        checklist: [
          'Low-rating alerts are on.',
          'The feedback has been read and flagged if needed.',
          'The reply is short, takes ownership and is concrete.',
          'If the customer left an e-mail, the reply was sent by e-mail.',
        ],
        faq: [
          {
            q: 'Can a customer who gave a low rating still post on Google?',
            a: 'Yes. Below your threshold, the customer can write to you first; the public review link is on the same screen and the customer can post a review wherever they like.',
          },
          {
            q: 'Can I reply to high-rated feedback?',
            a: 'Replies from the panel are open for 1–3 star feedback. High ratings are listed in the inbox and can be flagged.',
          },
          {
            q: 'Why was my reply not sent?',
            a: 'The text may have failed the safety check; the screen shows which rule was triggered. Edit the text and send it again.',
          },
        ],
      },
    },
  }),

  ...pair('review-management', 20, 'reply-workflow-ai', {
    tr: {
      title: 'Pulse AI ile yanıt taslakları hazırlama',
      excerpt:
        'Pulse AI her geri bildirim için 2–4 cümlelik yanıt taslağı hazırlar; tonu siz seçer, metni siz düzenler ve onaylarsınız. Hiçbir yanıt siz göndermeden çıkmaz.',
      tags: ['pulse ai', 'yapay zeka', 'yanıt taslağı', 'ton', 'yanıt'],
      body: {
        lead: 'Pulse AI, düşük puanlı geri bildirimlere yanıt yazmayı hızlandırmak için kısa bir taslak hazırlar. Taslak bir başlangıç noktasıdır; son metni siz belirlersiniz.',
        keyInsight:
          'Pulse AI taslak yazar, gönderme kararı her zaman sizindir: tonu seçin, taslağı müşterinin anlattığına göre düzenleyin ve kendiniz gönderin.',
        sections: [
          {
            title: 'Taslak nasıl hazırlanır?',
            paragraphs: [
              'Geri bildirimi açtığınızda **Taslak oluştur** ile bir öneri alırsınız. Tonu samimi, resmi veya özür dileyen olarak değiştirebilirsiniz; ton değişince taslak yeniden hazırlanır. Taslaklar 2–4 cümledir, Türkçe ya da İngilizce yazılır, emoji içermez ve ücretsiz ikram gibi vaatler sunmaz. Yapay zekâ o an kullanılamazsa hazır bir şablon taslak gösterilir.',
            ],
          },
          {
            title: 'Otomatik taslak',
            paragraphs: [
              '**Hesabım → Pulse AI** bölümünde otomatik taslak ayarını açarsanız yeni 1–3 yıldızlı geri bildirimler için taslak kendiliğinden hazırlanır. Ayar varsayılan olarak kapalıdır; kapalıyken taslağı istediğiniz zaman elle oluşturursunuz. Varsayılan tonu da aynı bölümden seçersiniz.',
            ],
          },
          {
            title: 'Göndermeden önce',
            items: [
              'Müşterinin anlattığı sorunu taslakta açıkça görün; eksikse ekleyin.',
              'Varsayım içeren cümleleri çıkarın.',
              'Tek ve somut bir sonraki adım bırakın.',
              'Metnin işletmenizin diliyle uyumlu olduğundan emin olun.',
            ],
          },
        ],
        checklist: [
          'Taslak baştan sona okundu.',
          'Ton geri bildirime uygun.',
          'Somut bir sonraki adım var.',
          'Kişisel veri ve dış bağlantı yok.',
        ],
        faq: [
          {
            q: 'Pulse AI yanıtı kendiliğinden gönderir mi?',
            a: 'Hayır. Pulse AI yalnızca taslak hazırlar; yanıtı siz düzenleyip gönderirsiniz. **Olduğu gibi gönder** de sizin onayınızla ve sorumluluk onayını işaretledikten sonra çalışır.',
          },
          {
            q: 'Taslak için hangi bilgiler kullanılır?',
            a: 'İşletmenizin adı ve türü, müşterinin adı, puanı, platform ve yorum metni. Taslağı hazırlamak için bu bilgiler yapay zekâ hizmet sağlayıcımız OpenAI’ye gönderilir; sipariş geçmişi veya konum gibi başka bir bilgi kullanılmaz.',
          },
          {
            q: 'Taslaklar hangi dillerde hazırlanır?',
            a: 'Türkçe ve İngilizce.',
          },
        ],
      },
    },
    en: {
      title: 'Drafting replies with Pulse AI',
      excerpt:
        'Pulse AI drafts a 2–4 sentence reply for each piece of feedback; you choose the tone, edit the text and approve it. No reply goes out unless you send it.',
      tags: ['pulse ai', 'ai', 'reply draft', 'tone', 'reply'],
      body: {
        lead: 'Pulse AI prepares a short draft to make replying to low-rated feedback faster. The draft is a starting point; you decide the final text.',
        keyInsight:
          'Pulse AI writes a draft and the decision to send is always yours: choose the tone, edit the draft to match what the customer said and send it yourself.',
        sections: [
          {
            title: 'How is a draft prepared?',
            paragraphs: [
              'When you open a piece of feedback, **Generate draft** gives you a suggestion. You can switch the tone between warm, formal and apologetic; changing the tone regenerates the draft. Drafts are 2–4 sentences, written in Turkish or English, contain no emoji and never offer freebies. If AI is unavailable at that moment, a ready template draft is shown instead.',
            ],
          },
          {
            title: 'Automatic drafts',
            paragraphs: [
              'If you switch on automatic drafts under **Account → Pulse AI**, a draft is prepared on its own for new 1–3 star feedback. The setting is off by default; while it is off, you create drafts by hand whenever you like. You also choose the default tone there.',
            ],
          },
          {
            title: 'Before you send',
            items: [
              'Make sure the draft clearly reflects the customer’s issue; add it if it is missing.',
              'Remove sentences that assume things.',
              'Leave one concrete next step.',
              'Check that the text sounds like your business.',
            ],
          },
        ],
        checklist: [
          'The draft was read in full.',
          'The tone suits the feedback.',
          'There is a concrete next step.',
          'There is no personal data and no outside link.',
        ],
        faq: [
          {
            q: 'Does Pulse AI send replies on its own?',
            a: 'No. Pulse AI only prepares drafts; you edit and send the reply. **Send as is** also works only with your approval, after you tick the responsibility confirmation.',
          },
          {
            q: 'What information is used for a draft?',
            a: 'Your business name and type, the customer’s name, rating, platform and comment. To prepare the draft, this information is sent to our AI provider, OpenAI; nothing else, such as order history or location, is used.',
          },
          {
            q: 'Which languages are drafts written in?',
            a: 'Turkish and English.',
          },
        ],
      },
    },
  }),

  ...pair('review-management', 30, 'notification-emails', {
    tr: {
      title: 'Düşük puan uyarısı ve haftalık özet e-postası',
      excerpt:
        '1–3 yıldızlı her yeni geri bildirimde anında e-posta uyarısı, her pazartesi haftalık özet. Bu e-postaların kime gittiğini ve nasıl açılıp kapatıldığını öğrenin.',
      tags: ['bildirim', 'e-posta', 'uyarı', 'haftalık özet', 'düşük puan'],
      body: {
        lead: 'Geri bildirimleri takip etmek için paneli sürekli açık tutmanız gerekmez. Buaze önemli olayları e-postayla bildirir; panelde de bildirim zili vardır.',
        keyInsight:
          'Düşük puan uyarısı işletmenin bildirim e-postasına anında gider; haftalık özet her pazartesi gelir. İkisini de **Hesabım → Bildirimler** bölümünden açıp kapatırsınız.',
        sections: [
          {
            title: 'Düşük puan uyarısı',
            paragraphs: [
              '1–3 yıldızlı her yeni geri bildirimde, işletme ayarlarındaki bildirim e-postasına anında uyarı gider; adres boşsa hesabınızın e-posta adresi kullanılır. Uyarıda puan, müşterinin yorumu ve varsa masa etiketi yer alır. Paneldeki bildirim zili de yeni düşük puanları gösterir.',
            ],
          },
          {
            title: 'Haftalık özet',
            paragraphs: [
              'Her pazartesi öğle saatlerinde (Türkiye saati) haftalık puan eğilimini ve öne çıkan geri bildirimleri içeren bir özet e-postası gelir. Ekiple haftalık değerlendirme yapıyorsanız bu e-posta iyi bir başlangıç noktasıdır. Ayrıntılar: [Geri bildirimleri haftada bir ekiple okumak](/tr/help/weekly-review-ritual).',
            ],
          },
          {
            title: 'Diğer otomatik e-postalar',
            items: [
              'Son 7 günün ortalaması önceki dört haftaya göre en az 0,5 yıldız düştüğünde ve son 7 günde en az 5 yorum varsa pazartesi günü gelen puan düşüşü uyarısı.',
              'Deneme süresinin bitmesine 3 gün ve 1 gün kala hatırlatma.',
              'Yeni bir cihazdan girişte ve şifreniz değiştiğinde güvenlik bildirimi.',
            ],
          },
          {
            title: 'Ayarlar',
            paragraphs: [
              '**Hesabım → Bildirimler** bölümünde düşük puan uyarısını, haftalık raporu ve deneme hatırlatmalarını ayrı ayrı açıp kapatabilirsiniz. Uyarının gideceği adresi işletme ayarlarının **Genel bilgiler** sekmesinden değiştirirsiniz.',
            ],
          },
        ],
        checklist: [
          'Bildirim e-postası ekibin baktığı bir adres.',
          'Düşük puan uyarısı açık.',
          'Haftalık rapor açık.',
          'Uyarı e-postaları istenmeyen klasörüne düşmüyor.',
        ],
        faq: [
          {
            q: 'Bildirimleri Slack, SMS veya mobil bildirim olarak alabilir miyim?',
            a: 'Hayır. Bildirimler e-postayla ve paneldeki bildirim zili üzerinden gelir.',
          },
          {
            q: 'Uyarıyı birden fazla kişiye gönderebilir miyim?',
            a: 'Uyarı tek bir bildirim adresine gider. Birden fazla kişinin görmesi gerekiyorsa ekibin ortak e-posta adresini bildirim adresi olarak girin.',
          },
          {
            q: 'Uyarıyı kapatırsam geri bildirimler kaybolur mu?',
            a: 'Hayır. Uyarı kapalıyken de geri bildirimler kaydedilir ve **Yorumlar** sayfasında görünür; yalnızca e-posta gönderilmez.',
          },
        ],
      },
    },
    en: {
      title: 'Low-rating alerts and the weekly summary e-mail',
      excerpt:
        'An instant e-mail alert for every new 1–3 star feedback and a weekly summary every Monday. Find out who receives these e-mails and how to switch them on or off.',
      tags: ['notifications', 'e-mail', 'alert', 'weekly summary', 'low rating'],
      body: {
        lead: 'You do not have to keep the panel open to follow feedback. Buaze reports important events by e-mail, and the panel has a notification bell too.',
        keyInsight:
          'The low-rating alert goes straight to the business’s notification e-mail and the weekly summary arrives every Monday. Switch either of them on or off under **Account → Notifications**.',
        sections: [
          {
            title: 'Low-rating alert',
            paragraphs: [
              'For every new 1–3 star feedback, an alert goes straight to the notification e-mail in your business settings; if that address is empty, your account e-mail is used. The alert includes the rating, the customer’s comment and the table label if there is one. The notification bell in the panel also shows new low ratings.',
            ],
          },
          {
            title: 'Weekly summary',
            paragraphs: [
              'Every Monday around noon (Turkey time), a summary e-mail arrives with your weekly rating trend and standout feedback. If your team reviews feedback weekly, this e-mail is a good starting point. See [A weekly feedback review with your team](/en/help/weekly-review-ritual).',
            ],
          },
          {
            title: 'Other automatic e-mails',
            items: [
              'A rating-drop alert on Mondays when the last 7 days’ average is at least 0.5 stars below the previous four weeks and there were at least 5 reviews in the last 7 days.',
              'Reminders 3 days and 1 day before your trial ends.',
              'Security notices when you sign in from a new device and when your password changes.',
            ],
          },
          {
            title: 'Settings',
            paragraphs: [
              'Under **Account → Notifications** you can switch the low-rating alert, the weekly report and trial reminders on or off separately. Change the address the alert goes to on the **General details** tab of your business settings.',
            ],
          },
        ],
        checklist: [
          'The notification e-mail is an address your team reads.',
          'The low-rating alert is on.',
          'The weekly report is on.',
          'Alert e-mails are not landing in the spam folder.',
        ],
        faq: [
          {
            q: 'Can I get notifications in Slack, by SMS or as mobile push?',
            a: 'No. Notifications arrive by e-mail and through the notification bell in the panel.',
          },
          {
            q: 'Can the alert go to more than one person?',
            a: 'The alert goes to a single notification address. If several people need to see it, enter your team’s shared e-mail address as the notification address.',
          },
          {
            q: 'If I switch the alert off, is feedback lost?',
            a: 'No. Feedback is still saved and shown on the **Reviews** page while the alert is off; only the e-mail is not sent.',
          },
        ],
      },
    },
  }),

  ...pair('review-management', 40, 'review-search-and-filters', {
    tr: {
      title: 'Gelen kutusunda arama, sekmeler ve işaretleme',
      excerpt:
        'Yorumlar sayfasında sekmeler, tarih, puan ve platform seçimleri, arama kutusu ve işaretleme ile geri bildirimleri düzenli tutun ve takip edilecekleri ayırın.',
      tags: ['gelen kutusu', 'arama', 'sekme', 'işaretle', 'beklemede'],
      body: {
        lead: 'Geri bildirim sayısı arttığında her birini sırayla okumak zorlaşır. Yorumlar sayfasındaki araçlar, önce bakılması gerekenleri ayırmanıza ve hiçbir şeyin gözden kaçmamasına yardım eder.',
        keyInsight:
          'Sekmelerle durumu, tarih, puan ve platform seçimleriyle dönemi daraltın; takip edilecekleri işaretleyin, bekleyenleri **Beklemede** sekmesinde toplayın.',
        sections: [
          {
            title: 'Sekmeler',
            items: [
              '**Tümü:** seçili işletmenin bütün geri bildirimleri.',
              '**Okunmamış:** henüz açmadığınız geri bildirimler.',
              '**Düşük puan:** 1–3 yıldızlı geri bildirimler.',
              '**Yanıtlandı:** yanıt gönderdiğiniz ya da kaydettiğiniz geri bildirimler.',
              '**Beklemede:** **Beklemeye al** ile sonraya bıraktıklarınız.',
            ],
          },
          {
            title: 'Listeyi daraltma',
            paragraphs: [
              'Tarih (bugün, son 7 gün, son 30 gün veya tüm zamanlar), puan ve platform seçimleriyle listeyi daraltabilirsiniz. **Yanıtsızlar** ve **Yalnız işaretliler** düğmeleri yalnızca ilgili geri bildirimleri gösterir. Arama kutusu müşteri adında ve yorum metninde arar.',
            ],
          },
          {
            title: 'İşaretleme ve bekletme',
            paragraphs: [
              'Geri bildirimin ayrıntısındaki **İşaretle** düğmesi, takip edilmesi gereken bir kaydı ayırmanızı sağlar; **Beklemeye al** ise yanıtı sonraya bıraktığınız kayıtları **Beklemede** sekmesinde toplar. Vardiya değişiminde ya da haftalık değerlendirmede bu iki listeye bakmanız yeterlidir.',
            ],
          },
          {
            title: 'Görünümü paylaşma',
            paragraphs: [
              'Seçtiğiniz sekme ve seçimler sayfa adresine yazılır. Bağlantıyı bir ekip arkadaşınıza gönderdiğinizde aynı görünümü açar.',
            ],
          },
        ],
        checklist: [
          'Düşük puan sekmesi her gün kontrol ediliyor.',
          'Takip gerektirenler işaretleniyor.',
          'Sonraya kalanlar Beklemede sekmesinde.',
          'Seçimler kontrol edilmeden sayılar yorumlanmıyor.',
        ],
        faq: [
          {
            q: 'Arama hangi alanlarda çalışır?',
            a: 'Müşteri adında ve yorum metninde, listede yüklü olan geri bildirimler arasında. Daha geniş bir dönemde aramak için CSV dışa aktarımını bir tablo programında açabilirsiniz.',
          },
          {
            q: 'Geri bildirimleri etiketleyebilir veya bir ekip arkadaşıma atayabilir miyim?',
            a: 'Hayır. Gelen kutusunda etiket ve atama yoktur; takip için **İşaretle** ve **Beklemeye al** kullanılır.',
          },
          {
            q: 'Beklenmedik bir sayı görüyorum; ne yapmalıyım?',
            a: 'Önce seçili işletmeyi, sekmeyi ve tarih, puan, platform seçimlerini kontrol edin. **Temizle** düğmesi tüm seçimleri sıfırlar.',
          },
        ],
      },
    },
    en: {
      title: 'Search, tabs and flags in the inbox',
      excerpt:
        'On the Reviews page, tabs, date, rating and platform choices, the search box and flags keep feedback organised and set aside what needs follow-up.',
      tags: ['inbox', 'search', 'tabs', 'flag', 'pending'],
      body: {
        lead: 'As feedback grows, reading every item in order gets harder. The tools on the Reviews page help you see what needs attention first and make sure nothing slips through.',
        keyInsight:
          'Use tabs for status and the date, rating and platform choices to narrow the period; flag what needs follow-up and collect what can wait on the **Pending** tab.',
        sections: [
          {
            title: 'Tabs',
            items: [
              '**All:** every piece of feedback for the selected business.',
              '**Unread:** feedback you have not opened yet.',
              '**Low rating:** 1–3 star feedback.',
              '**Replied:** feedback you have replied to or saved a reply for.',
              '**Pending:** items you set aside with **Mark pending**.',
            ],
          },
          {
            title: 'Narrowing the list',
            paragraphs: [
              'Narrow the list by date (today, the last 7 days, the last 30 days or all time), rating and platform. The **Unreplied** and **Flagged only** buttons show just those items. The search box looks in customer names and comment text.',
            ],
          },
          {
            title: 'Flagging and pending',
            paragraphs: [
              'The **Flag** button in the feedback detail marks an item that needs follow-up, and **Mark pending** collects items you will reply to later on the **Pending** tab. At a shift change or in a weekly review, these two lists are all you need to check.',
            ],
          },
          {
            title: 'Sharing a view',
            paragraphs: [
              'The tab and choices you select are written into the page address. When you send the link to a teammate, it opens the same view.',
            ],
          },
        ],
        checklist: [
          'The low-rating tab is checked every day.',
          'Items needing follow-up are flagged.',
          'Items for later are on the Pending tab.',
          'Numbers are only read after checking the current choices.',
        ],
        faq: [
          {
            q: 'Which fields does search cover?',
            a: 'Customer names and comment text, among the feedback loaded in the list. To search a longer period, open the CSV export in a spreadsheet.',
          },
          {
            q: 'Can I tag feedback or assign it to a teammate?',
            a: 'No. The inbox has no tags or assignment; use **Flag** and **Mark pending** to follow up.',
          },
          {
            q: 'I see an unexpected number. What should I do?',
            a: 'First check the selected business, the tab and the date, rating and platform choices. The **Clear** button resets every choice.',
          },
        ],
      },
    },
  }),

  ...pair('review-management', 50, 'weekly-review-ritual', {
    tr: {
      title: 'Geri bildirimleri haftada bir ekiple okumak',
      excerpt:
        'Geri bildirimler her gün gelir, kararlar çoğu zaman haftalık alınır. Pazartesi gelen özet e-postası ve Analitik sayfasıyla yarım saatlik değerlendirme planı.',
      tags: ['haftalık', 'ekip toplantısı', 'değerlendirme', 'analitik', 'süreç'],
      body: {
        lead: 'Tek bir geri bildirim bir anekdottur; bir haftanın geri bildirimleri ise karar vermek için kullanılabilecek bir resimdir. Kısa ve düzenli bir haftalık değerlendirme, geri bildirimleri somut iyileştirmelere dönüştürür.',
        keyInsight:
          'Her hafta aynı gün kısa bir toplantı yapın: önce geçen haftanın kararına bakın, sonra özeti ve düşük puanları okuyun, tek bir değişikliğe karar verin.',
        sections: [
          {
            title: 'Yarım saatlik bir düzen',
            ordered: true,
            items: [
              'Geçen hafta alınan kararın uygulanıp uygulanmadığına bakın.',
              'Pazartesi gelen haftalık özeti ve **Analitik** sayfasında son 7 günü inceleyin.',
              'Düşük puanlı geri bildirimlerden birkaçını birlikte okuyun.',
              'Bu hafta yapılacak tek bir somut değişikliğe karar verin ve bir sorumlu belirleyin.',
            ],
          },
          {
            title: 'Kimler katılmalı?',
            paragraphs: [
              'İşletme sahibi ya da müdür, vardiya sorumlusu ve mutfak veya hizmet tarafından bir temsilci yeterlidir. Masada karar verebilecek kişiler olsun.',
            ],
          },
          {
            title: 'Neye bakılır?',
            items: [
              'Puan eğilimi ve geri bildirim sayısı.',
              'Platforma ve günün saatine göre dağılım.',
              'Yeterli yorum varsa Analitik’te öne çıkan konular.',
              'Yanıtlanmamış ve işaretli geri bildirimler.',
            ],
          },
        ],
        checklist: [
          'Toplantı her hafta aynı gün takvimde.',
          'Geçen haftanın kararı kontrol edildi.',
          'Kararlar yazılı ve her birinin bir sorumlusu var.',
          'Yanıtsız geri bildirim kalmadı.',
        ],
        faq: [
          {
            q: 'Sakin haftalarda toplantıyı atlayabilir miyiz?',
            a: 'Kısaltabilirsiniz ama atlamamanız iyi olur; düzen bozulunca alışkanlık da kaybolur.',
          },
          {
            q: 'Geri bildirimleri ekibin tamamıyla paylaşmalı mıyım?',
            a: 'Olumlu geri bildirimleri paylaşmak motive eder; olumsuzları kişileri suçlamadan paylaşmak gelişim sağlar. Ayrıntılar: [Geri bildirimleri ekibinizle paylaşma](/tr/help/review-culture-team-sharing).',
          },
        ],
      },
    },
    en: {
      title: 'A weekly feedback review with your team',
      excerpt:
        'Feedback arrives every day, but decisions are often made weekly. A half-hour review plan built on the Monday summary e-mail and the Analytics page.',
      tags: ['weekly', 'team meeting', 'review', 'analytics', 'process'],
      body: {
        lead: 'One piece of feedback is an anecdote; a week of feedback is a picture you can decide from. A short, regular weekly review turns feedback into concrete improvements.',
        keyInsight:
          'Hold a short meeting on the same day each week: first check last week’s decision, then read the summary and the low ratings, and decide on one change.',
        sections: [
          {
            title: 'A half-hour format',
            ordered: true,
            items: [
              'Check whether last week’s decision was carried out.',
              'Go through the Monday summary e-mail and the last 7 days on the **Analytics** page.',
              'Read a few low-rated feedback together.',
              'Decide on one concrete change for this week and name someone responsible.',
            ],
          },
          {
            title: 'Who should attend?',
            paragraphs: [
              'The owner or manager, the shift lead and someone from the kitchen or service side are enough. Make sure the people at the table can make decisions.',
            ],
          },
          {
            title: 'What to look at',
            items: [
              'The rating trend and the amount of feedback.',
              'The split by platform and by time of day.',
              'Topics highlighted in Analytics, when there are enough reviews.',
              'Unreplied and flagged feedback.',
            ],
          },
        ],
        checklist: [
          'The meeting is in the calendar on the same day each week.',
          'Last week’s decision was checked.',
          'Decisions are written down, each with an owner.',
          'No feedback is left unreplied.',
        ],
        faq: [
          {
            q: 'Can we skip the meeting in quiet weeks?',
            a: 'You can shorten it, but try not to skip it; once the rhythm breaks, the habit goes too.',
          },
          {
            q: 'Should I share feedback with the whole team?',
            a: 'Sharing positive feedback motivates; sharing negative feedback without blaming people helps everyone improve. See [Sharing feedback with your team](/en/help/review-culture-team-sharing).',
          },
        ],
      },
    },
  }),

  ...pair('review-management', 60, 'review-culture-team-sharing', {
    tr: {
      title: 'Geri bildirimleri ekibinizle paylaşma',
      excerpt:
        'Olumlu ve olumsuz geri bildirimleri ekibinizle nasıl, ne sıklıkla ve hangi dille paylaşırsınız? Moral bozmadan öğrenmeyi destekleyen bir paylaşım düzeni.',
      tags: ['ekip', 'paylaşım', 'motivasyon', 'iletişim', 'kültür'],
      body: {
        lead: 'Geri bildirimleri ekiple paylaşmak basit görünür; yanlış yapıldığında moral bozar, doğru yapıldığında ekibin işini nasıl yaptığını gösteren bir aynaya dönüşür. Anahtar, tutarlılık ve suçlamayan bir dildir.',
        keyInsight:
          'Olumlu geri bildirimleri düzenli olarak ekiple okuyun, olumsuzları kişilere değil işleyişe bağlayın ve müşterinin kişisel bilgilerini paylaşmayın.',
        sections: [
          {
            title: 'Olumlu geri bildirimler',
            paragraphs: [
              'Haftada bir, en güzel birkaç geri bildirimi ekiple okuyun. “Kahve önerisi çok iyiydi” gibi somut bir not, emeğin görüldüğünü hissettirir.',
            ],
          },
          {
            title: 'Olumsuz geri bildirimler',
            paragraphs: [
              'Olumsuz geri bildirimi bir kişiye değil, işleyişe bağlayın. “Servis yavaştı” notu bir çalışana yöneltilmiş bir suçlama değil, vardiya planı hakkında bir ipucudur.',
            ],
          },
          {
            title: 'Hangi kanalda?',
            items: [
              'Olumlu notlar: ekip toplantısı veya ekibin kullandığı mesajlaşma grubu.',
              'Tekrarlayan konular: [haftalık değerlendirme](/tr/help/weekly-review-ritual).',
              'Acil bir olumsuz geri bildirim: doğrudan vardiya sorumlusu.',
              'Müşteriye dönüş: [düşük puanlı geri bildirimleri yanıtlama](/tr/help/handle-negative-feedback) rehberi.',
            ],
          },
          {
            title: 'Kişisel veriye dikkat',
            paragraphs: [
              'Geri bildirimi paylaşırken müşterinin adını, e-postasını veya telefonunu paylaşmanız gerekmez; konuyu anlatmak yeterlidir. Geri bildirimleri müşterinin izni olmadan sosyal medyada yayımlamayın.',
            ],
          },
        ],
        checklist: [
          'Olumlu geri bildirimler düzenli olarak paylaşılıyor.',
          'Olumsuzlar kişi değil işleyiş üzerinden konuşuluyor.',
          'Müşterinin kişisel bilgileri paylaşılmıyor.',
          'Sosyal medyada izinsiz alıntı yapılmıyor.',
        ],
        faq: [
          {
            q: 'Olumsuz geri bildirimleri ekipten saklamak doğru mu?',
            a: 'Hayır. Saklamak güveni azaltır. Paylaşımın amacı suçlamak değil, işleyişi birlikte iyileştirmek olmalı.',
          },
          {
            q: 'Müşteri yorumlarını sosyal medyada paylaşabilir miyim?',
            a: 'Müşterinin açık izni olmadan hayır. Alıntı yapmak istiyorsanız önce izin alın.',
          },
        ],
      },
    },
    en: {
      title: 'Sharing feedback with your team',
      excerpt:
        'How, how often and in what tone should you share positive and negative feedback with your team? A way of sharing that supports learning without hurting morale.',
      tags: ['team', 'sharing', 'motivation', 'communication', 'culture'],
      body: {
        lead: 'Sharing feedback with your team looks simple. Done badly, it hurts morale; done well, it becomes a mirror that shows the team how it works. The keys are consistency and language that does not blame.',
        keyInsight:
          'Read positive feedback with the team regularly, link negative feedback to how things work rather than to people, and keep customers’ personal details out of it.',
        sections: [
          {
            title: 'Positive feedback',
            paragraphs: [
              'Once a week, read a few of the best pieces of feedback with the team. A specific note such as “the coffee recommendation was great” shows that effort is noticed.',
            ],
          },
          {
            title: 'Negative feedback',
            paragraphs: [
              'Link negative feedback to how things work, not to a person. “Service was slow” is not an accusation against one employee; it is a clue about the shift plan.',
            ],
          },
          {
            title: 'Which channel?',
            items: [
              'Positive notes: a team huddle or the messaging group your team already uses.',
              'Recurring topics: the [weekly review](/en/help/weekly-review-ritual).',
              'An urgent negative piece of feedback: straight to the shift lead.',
              'Following up with the customer: the guide to [responding to low-rated feedback](/en/help/handle-negative-feedback).',
            ],
          },
          {
            title: 'Mind personal data',
            paragraphs: [
              'When sharing feedback, you do not need to share the customer’s name, e-mail or phone number; describing the issue is enough. Do not publish feedback on social media without the customer’s permission.',
            ],
          },
        ],
        checklist: [
          'Positive feedback is shared regularly.',
          'Negatives are discussed in terms of process, not people.',
          'Customers’ personal details are not shared.',
          'Nothing is quoted on social media without permission.',
        ],
        faq: [
          {
            q: 'Is it right to keep negative feedback from the team?',
            a: 'No. Hiding it reduces trust. The aim of sharing should be to improve how things work together, not to blame.',
          },
          {
            q: 'Can I post customer reviews on social media?',
            a: 'Not without the customer’s explicit permission. Ask first if you want to quote someone.',
          },
        ],
      },
    },
  }),

  ...pair('review-management', 70, 'csv-export-bi', {
    tr: {
      title: 'Verileri CSV olarak dışa aktarma',
      excerpt:
        'Geri bildirimleri, analitik raporunu, müşteri listesini ve anket ile denetim yanıtlarını CSV olarak indirip Excel veya Google E-Tablolar’da inceleyebilirsiniz.',
      tags: ['csv', 'dışa aktarma', 'excel', 'rapor', 'tablo'],
      body: {
        lead: 'Paneldeki raporların ötesine geçmek ya da verileri muhasebe ve operasyon tablolarıyla birleştirmek istediğinizde CSV dışa aktarımı en hızlı yoldur.',
        keyInsight:
          'Yorumlar, Analitik, Müşteriler, Anketler ve Denetim Merkezi sayfalarından CSV indirebilirsiniz; dosyalar Türkçe karakterler bozulmadan açılacak biçimde hazırlanır.',
        sections: [
          {
            title: 'Neler dışa aktarılabilir?',
            items: [
              '**Yorumlar sayfası (Dışa aktar):** tarih, puan, KVKK onayı, platform, kaynak, yorum, işletme ve masa etiketi; seçili işletme, tarih, puan ve platform seçimlerine göre.',
              '**Analitik sayfası (Rapor indir):** seçili dönemdeki her geri bildirim için puan, yorum, yanıt durumu ve yanıt süresi; KVKK onayı veren müşterilerin e-posta adresi ya da telefonu da yer alır.',
              '**Müşteriler sayfası (CSV indir):** iletişim bilgisi bırakan müşterilerin listesi.',
              '**Anket ve denetim yanıtları:** her anketin ve denetimin kendi sayfasından.',
            ],
          },
          {
            title: 'Tablo programında açarken',
            items: [
              'Dosyayı doğrudan Excel veya Google E-Tablolar ile açın; Türkçe karakterler korunur.',
              'Puan sütununu sayı olarak biçimlendirin.',
              'Tarih sütunları uluslararası biçimdedir (yıl-ay-gün); saatler UTC’dir, Türkiye saati için 3 saat ekleyin.',
              'Tablo programının sıralama ve gruplama araçlarıyla sonuçlara platform veya masa bazında bakın.',
            ],
          },
          {
            title: 'Dosyayı güvenle saklama',
            paragraphs: [
              'Dışa aktarılan dosyalarda yorum metinleri ve müşterilerin iletişim bilgileri gibi kişisel veriler bulunabilir. Dosyayı yalnızca gereken kişilerle paylaşın ve işiniz bitince silin; ayrıntılar: [Dışa aktarılan dosyalarda kişisel veri](/tr/help/export-and-pii).',
            ],
          },
        ],
        checklist: [
          'Gereken dönem ve işletme seçildi.',
          'Dosya yalnızca gereken kişilerle paylaşıldı.',
          'Puan ve tarih sütunları doğru biçimde.',
          'İş bitince dosya silindi.',
        ],
        faq: [
          {
            q: 'Buaze’nin bir API’si veya webhook’u var mı?',
            a: 'Hayır. Müşterilere açık bir API veya webhook şu an yok; verilerinizi CSV olarak indirebilirsiniz.',
          },
          {
            q: 'Dışa aktarılan dosyalarda müşterinin e-postası var mı?',
            a: 'Yorumlar sayfasının dosyasında yok. **Analitik** sayfasının raporunda ve **Müşteriler** sayfasının dosyasında, KVKK onayı veren müşterilerin e-posta adresi ya da telefonu bulunur; bu dosyaları özenle paylaşın.',
          },
          {
            q: 'Dışa aktarımın bir sınırı var mı?',
            a: 'Yorumlar ve Analitik dosyaları tek seferde en fazla 10.000 satır içerir. Yorumlar sayfasında tarih seçimi **Tüm zamanlar** iken dışa aktarım son 90 günü kapsar; daha eski kayıtlar için Analitik sayfasında 12 ay ya da özel bir tarih aralığı seçin.',
          },
        ],
      },
    },
    en: {
      title: 'Exporting your data as CSV',
      excerpt:
        'Download your feedback, the analytics report, your customer list and survey and audit responses as CSV and work with them in Excel or Google Sheets.',
      tags: ['csv', 'export', 'excel', 'report', 'spreadsheet'],
      body: {
        lead: 'When you want to go beyond the panel’s reports or combine your data with finance and operations sheets, a CSV export is the quickest way.',
        keyInsight:
          'You can download CSV files from the Reviews, Analytics, Customers, Surveys and Audit Center pages; the files are prepared so Turkish characters open correctly.',
        sections: [
          {
            title: 'What can be exported?',
            items: [
              '**Reviews page (Export):** date, rating, KVKK consent, platform, source, comment, business and table label, following the business, date, rating and platform you have selected.',
              '**Analytics page (Export report):** rating, comment, reply status and reply time for each piece of feedback in the selected period, plus the e-mail address or phone number of customers who gave KVKK consent.',
              '**Customers page (Export CSV):** the list of customers who left contact details.',
              '**Survey and audit responses:** from each survey’s and audit’s own page.',
            ],
          },
          {
            title: 'Opening the file in a spreadsheet',
            items: [
              'Open the file directly in Excel or Google Sheets; Turkish characters are kept intact.',
              'Format the rating column as a number.',
              'Date columns use the international format (year-month-day); times are in UTC, so add 3 hours for Turkey time.',
              'Use your spreadsheet’s sort and group tools to look at results by platform or table.',
            ],
          },
          {
            title: 'Keeping the file safe',
            paragraphs: [
              'Exported files can contain personal data such as comments and customers’ contact details. Share the file only with people who need it and delete it when you are done; see [Personal data in exported files](/en/help/export-and-pii).',
            ],
          },
        ],
        checklist: [
          'The right period and business are selected.',
          'The file was shared only with people who need it.',
          'The rating and date columns are formatted correctly.',
          'The file was deleted when the work was done.',
        ],
        faq: [
          {
            q: 'Does Buaze have an API or webhooks?',
            a: 'No. There is no customer-facing API or webhook today; you can download your data as CSV.',
          },
          {
            q: 'Do the exported files include customers’ e-mail addresses?',
            a: 'Not the Reviews page file. The **Analytics** report and the **Customers** file include the e-mail address or phone number of customers who gave KVKK consent, so share those files with care.',
          },
          {
            q: 'Is there a limit to an export?',
            a: 'The Reviews and Analytics files contain up to 10,000 rows at a time. On the Reviews page, when the date choice is **All time**, the export covers the last 90 days; for older records, choose 12 months or a custom date range on the Analytics page.',
          },
        ],
      },
    },
  }),

  /* ----------------------- Platform bağlantıları --------------------- */
  ...pair('integrations', 10, 'google-review-link', {
    tr: {
      title: 'Google yorum bağlantısını ekleme',
      excerpt:
        'İşletmenizi adıyla arayıp seçin; Buaze resmi Google “yorum yaz” bağlantınızı oluşturur. Google hesabıyla giriş gerekmez. Bağlantıyı yayına almadan önce deneyin.',
      tags: ['google', 'yorum bağlantısı', 'place id', 'google haritalar', 'işletme profili'],
      body: {
        lead: 'Google bağlantısı, yorum yazmak isteyen müşterinin doğru işletme profiline ulaşmasını sağlar. Yanlış veya eski bir bağlantı, iyi niyetli müşteriyi boşa çıkarır.',
        keyInsight:
          'En kolay yol, **Platform bağlantıları** sayfasında işletmenizi adıyla arayıp listeden seçmektir; Buaze doğrudan yorum yazma ekranını açan bağlantıyı oluşturur.',
        sections: [
          {
            title: 'İşletmenizi arayıp seçin',
            ordered: true,
            items: [
              'Panelde **Platform bağlantıları** sayfasını açın ve Google satırındaki **Bağla** düğmesine basın (bağlantı eklediyseniz düğmenin adı **Yönet** olur).',
              '**İşletme adı ve semt** alanına işletmenizi yazın ve **Ara** düğmesine basın.',
              'Sonuçlardan kendi işletmenizi bulun ve **Bu işletmeyi seç** düğmesine basın; adres ve kategoriye bakarak doğru şubeyi seçin.',
              'Buaze, seçtiğiniz işletme için resmi “yorum yaz” bağlantısını oluşturup kaydeder.',
            ],
          },
          {
            title: 'Elle eklemek isterseniz',
            paragraphs: [
              'İşletmenizi listede bulamazsanız bağlantıyı aynı sayfadaki bağlantı alanına elle girebilirsiniz: Google’ın verdiği kısa yorum bağlantısı (g.page/r/…), yorum yazma bağlantısı veya Google Haritalar’daki işletme bağlantısı kabul edilir. Hangi biçimin nasıl çalıştığı [Google bağlantı türleri](/tr/help/google-maps-link-vs-place-id) rehberinde.',
            ],
          },
          {
            title: 'Google Yorumları sayfası',
            paragraphs: [
              'İşletmenizi seçtikten sonra **Google Yorumları** sayfasında Google puanınızı, yorum sayınızı, Google’ın gösterdiği en fazla 5 yorumu ve 6 maddelik profil kontrol listesini görürsünüz. Bu görünüm için Google hesabıyla giriş yapmanız gerekmez. Google yorumlarına panelden yanıt verme, Google’ın erişim onayına bağlıdır ve şu an genel kullanıma açık değildir.',
            ],
          },
        ],
        policyNote: `Buaze yorum silmez, gizlemez veya değiştirmez ve yorum karşılığında ödül sunmaz. Müşteriyi yanıltan, yorum metni dayatan ya da yorum karşılığında teklif içeren uygulamalar [Google’ın yorum kurallarına](${GOOGLE_POLICY_URL}) aykırıdır.`,
        checklist: [
          'Doğru işletme ve şube seçildi.',
          'Bağlantı telefonda yorum yazma ekranını açıyor.',
          'Her şubenin kendi Google bağlantısı var.',
          'Google Yorumları sayfasında puan ve yorum sayısı görünüyor.',
        ],
        faq: [
          {
            q: 'Google hesabımla giriş yapmam gerekiyor mu?',
            a: 'Hayır. Bağlantıyı oluşturmak ve Google Yorumları sayfasındaki görünüm için Google hesabıyla giriş gerekmez.',
          },
          {
            q: 'Google yorumlarına panelden yanıt verebilir miyim?',
            a: 'Şu an hayır. Bu özellik Google’ın erişim onayına bağlıdır ve genel kullanıma açık değildir. Yanıtlarınızı Google İşletme Profili üzerinden yazabilirsiniz.',
          },
          {
            q: 'Birden fazla Google profilim var; ne yapmalıyım?',
            a: 'Her şubeyi ayrı işletme olarak ekleyin ve her birinde kendi Google profilini seçin.',
          },
        ],
      },
    },
    en: {
      title: 'Adding your Google review link',
      excerpt:
        'Search for your business by name and pick it; Buaze builds your official Google “write a review” link. No Google sign-in needed. Test it before you print.',
      tags: ['google', 'review link', 'place id', 'google maps', 'business profile'],
      body: {
        lead: 'Your Google link takes customers who want to write a review to the right business profile. A wrong or outdated link wastes the effort of a willing customer.',
        keyInsight:
          'The easiest way is to search for your business by name on the **Platform links** page and pick it from the list; Buaze builds the link that opens the review form directly.',
        sections: [
          {
            title: 'Search for your business and pick it',
            ordered: true,
            items: [
              'Open the **Platform links** page in the panel and press **Add link** on the Google row (once a link is saved, the button reads **Manage**).',
              'Type your business into the **Business name and area** field and press **Search**.',
              'Find your business in the results and press **Select this business**; use the address and category to pick the right branch.',
              'Buaze builds and saves the official “write a review” link for the business you picked.',
            ],
          },
          {
            title: 'Adding it by hand',
            paragraphs: [
              'If your business does not appear in the list, you can enter the link yourself in the link field on the same page: the short review link Google gives you (g.page/r/…), a write-a-review link or your business’s link from Google Maps are accepted. How each format works is explained in [Google link types](/en/help/google-maps-link-vs-place-id).',
            ],
          },
          {
            title: 'The Google Reviews page',
            paragraphs: [
              'Once your business is selected, the **Google Reviews** page shows your Google rating, review count, up to 5 reviews that Google returns and a 6-item profile checklist. You do not need to sign in with Google for this view. Replying to Google reviews from the panel depends on Google’s access approval and is not generally available yet.',
            ],
          },
        ],
        policyNote: `Buaze does not delete, hide or edit reviews and does not offer rewards for reviews. Practices that mislead customers, dictate review text or offer something in exchange for a review are against [Google’s review policy](${GOOGLE_POLICY_URL}).`,
        checklist: [
          'The right business and branch are selected.',
          'The link opens the review form on a phone.',
          'Each branch has its own Google link.',
          'The Google Reviews page shows your rating and review count.',
        ],
        faq: [
          {
            q: 'Do I need to sign in with my Google account?',
            a: 'No. Building the link and the view on the Google Reviews page need no Google sign-in.',
          },
          {
            q: 'Can I reply to Google reviews from the panel?',
            a: 'Not at the moment. This feature depends on Google’s access approval and is not generally available. You can write replies in your Google Business Profile.',
          },
          {
            q: 'I have more than one Google profile. What should I do?',
            a: 'Add each branch as a separate business and pick its own Google profile in each one.',
          },
        ],
      },
    },
  }),

  ...pair('integrations', 20, 'google-maps-link-vs-place-id', {
    tr: {
      title: 'Google bağlantısı: Place ID, kısa link ve Haritalar',
      excerpt:
        'Place ID, g.page kısa bağlantısı ve Google Haritalar bağlantısı farklı davranır. Hangisini kullanırsanız kullanın, Buaze mümkünse yorum yazma ekranını açar.',
      tags: ['google', 'place id', 'google haritalar', 'kısa link', 'yorum bağlantısı'],
      body: {
        lead: 'Google için tek bir bağlantı türü yoktur. Bağlantıyı elle girmeniz gerekirse hangi biçimin nasıl çalıştığını bilmek, müşterinin gerçekten yorum yazma ekranına ulaşmasını sağlar.',
        keyInsight:
          'İşletmenizi aratıp seçmek en güvenli yoldur; Buaze, Google’ın işletmenize verdiği Place ID ile yorum yazma bağlantısını kendisi oluşturur. Elle giriyorsanız g.page/r/ ile başlayan kısa yorum bağlantısını tercih edin.',
        sections: [
          {
            title: 'Kabul edilen biçimler',
            items: [
              '**Place ID** (genellikle ChIJ ile başlar): Google’ın işletmenize verdiği kimliktir. İşletmenizi aratıp seçtiğinizde Buaze bunu kaydeder ve doğrudan yorum yazma ekranını açan bağlantıyı oluşturur. Bağlantı alanına tek başına yazılamaz; elle eklemek isterseniz aşağıdaki yorum yazma bağlantısının içinde kullanın.',
              '**Kısa yorum bağlantısı** (g.page/r/…): Google İşletme Profili’nin verdiği bağlantıdır, olduğu gibi kullanılır.',
              '**Yorum yazma bağlantısı** (search.google.com/local/writereview?placeid=…): olduğu gibi kullanılır.',
              '**Google Haritalar bağlantısı** (google.com/maps/place/…): içinden Place ID çıkarılabiliyorsa yorum yazma bağlantısına çevrilir; çıkarılamazsa ve kısa Haritalar bağlantılarında (maps.app.goo.gl/…) müşteri işletmenizin Haritalar sayfasına gider ve yorum yazmayı orada seçer.',
            ],
          },
          {
            title: 'Kaydederken yapılan kontroller',
            paragraphs: [
              'Bağlantıyı https:// ile başlayan tam hâliyle yapıştırın; Google’a ait bir adres değilse kaydedilmez. Google’ın ana sayfası gibi, belirli bir işletmeye gitmeyen bir bağlantı girerseniz kaydedilir ama uyarı gösterilir; bu durumda bağlantıyı düzeltin.',
            ],
          },
          {
            title: 'Telefonda nasıl açılır?',
            paragraphs: [
              'Google Haritalar uygulaması yüklü telefonlarda bağlantı uygulamada açılabilir; bu beklenen bir davranıştır. Denemeyi hem uygulaması olan hem olmayan bir telefonda yapın.',
            ],
          },
        ],
        checklist: [
          'Bağlantı türü bilinçli seçildi.',
          'Telefonda yorum yazma ekranı açılıyor.',
          'Her şubenin kendi bağlantısı var.',
          'Kaydederken uyarı gösterilmedi.',
        ],
        faq: [
          {
            q: 'Henüz bir Google işletme profilim yok; ne yapmalıyım?',
            a: 'Önce Google İşletme Profili’nizi oluşturup doğrulayın. Profil olmadan müşteri yorum yazacağı bir sayfa bulamaz.',
          },
          {
            q: 'Google profilim askıya alındıysa ne olur?',
            a: 'Bağlantı açılmazsa günlük kontrolde başarısız görünür ve 24 saat boyunca atlanır; müşteri varsa başka bir uygun platforma gider. Profil yeniden açılınca bağlantıyı test edin.',
          },
        ],
      },
    },
    en: {
      title: 'Google link types: Place ID, short link and Maps',
      excerpt:
        'A Place ID, a g.page short link and a Google Maps link behave differently. Whichever one you use, Buaze opens the review form directly whenever it can.',
      tags: ['google', 'place id', 'google maps', 'short link', 'review link'],
      body: {
        lead: 'There is no single kind of Google link. If you need to enter the link by hand, knowing how each format works makes sure customers really reach the review form.',
        keyInsight:
          'Searching for your business and picking it is the safest way; Buaze then builds the review link itself from the Place ID Google gives your business. If you enter a link by hand, use the short review link that starts with g.page/r/.',
        sections: [
          {
            title: 'Accepted formats',
            items: [
              '**Place ID** (usually starts with ChIJ): the ID Google gives your business. When you search for your business and pick it, Buaze saves it and builds a link that opens the review form directly. It cannot be typed into the link field on its own; to add it by hand, use it inside the write-a-review link below.',
              '**Short review link** (g.page/r/…): the link Google Business Profile gives you, used as is.',
              '**Write-a-review link** (search.google.com/local/writereview?placeid=…): used as is.',
              '**Google Maps link** (google.com/maps/place/…): if a Place ID can be extracted, it is turned into a review link; if not, and for short Maps links (maps.app.goo.gl/…), the customer lands on your Maps page and chooses to write a review there.',
            ],
          },
          {
            title: 'Checks when you save',
            paragraphs: [
              'Paste the full link, starting with https://; a link that is not a Google address is not saved. If you enter a link that does not lead to a specific business, such as Google’s home page, it is saved with a warning; correct it in that case.',
            ],
          },
          {
            title: 'How it opens on a phone',
            paragraphs: [
              'On phones with the Google Maps app installed, the link may open in the app; this is expected. Test it on a phone with the app and on one without.',
            ],
          },
        ],
        checklist: [
          'The link type was chosen on purpose.',
          'The review form opens on a phone.',
          'Each branch has its own link.',
          'No warning was shown when saving.',
        ],
        faq: [
          {
            q: 'I do not have a Google Business Profile yet. What should I do?',
            a: 'Create and verify your Google Business Profile first. Without a profile, customers have no page to write a review on.',
          },
          {
            q: 'What if my Google profile is suspended?',
            a: 'If the link does not open, it fails the daily check and is skipped for 24 hours; customers go to another suitable platform if there is one. Test the link again once the profile is back.',
          },
        ],
      },
    },
  }),

  ...pair('integrations', 30, 'redirect-threshold', {
    tr: {
      title: 'Yönlendirme eşiği ve varsayılan platform',
      excerpt:
        'Eşik, yorum sayfasının hangi puanlarda doğrudan açılacağını belirler: varsayılan yalnızca 5 yıldız, isterseniz 4 ve 5 yıldız. Varsayılan platform nasıl seçilir?',
      tags: ['eşik', 'yönlendirme', 'varsayılan platform', 'yıldız', 'akış'],
      body: {
        lead: 'Müşteri QR kodunu okutup puan verdiğinde ne göreceğini iki ayar belirler: yönlendirme eşiği ve varsayılan platform. İkisi de **Platform bağlantıları** sayfasındadır.',
        keyInsight:
          'Eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        sections: [
          {
            title: 'Akış adım adım',
            ordered: true,
            items: [
              'Müşteri QR kodunu okutur ve 1 ile 5 yıldız arasında puan verir.',
              'Puan eşiğinizde veya üzerindeyse seçtiğiniz platformun yorum sayfası kısa bir geçişle açılır.',
              'Puan eşiğin altındaysa işletmenize özel geri bildirim formu açılır; aynı ekranda “… üzerinde yorum yaz” bağlantısı da görünür.',
              'Müşteri formu gönderirse geri bildirim **Yorumlar** sayfanıza düşer; isterse herkese açık bağlantıdan yorum yazar.',
            ],
          },
          {
            title: 'Eşik seçenekleri',
            items: [
              '**Yalnızca 5 yıldız** (varsayılan): 1–4 yıldız önce işletmenize özel forma düşer.',
              '**4 ve 5 yıldız:** 1–3 yıldız önce işletmenize özel forma düşer.',
            ],
          },
          {
            title: 'Varsayılan platform',
            paragraphs: [
              'Varsayılan platform, QR koduna platform sabitlenmemişse müşterinin gönderileceği yorum sayfasıdır. Bağlantısını eklediğiniz platformlardan birini seçin. Varsayılan platformun bağlantısı silinirse ya da çalışmazsa sektörünüze göre öncelikli platform, o da yoksa bağlantısı olan başka bir platform kullanılır.',
            ],
          },
        ],
        policyNote:
          'Buaze yorum silmez, gizlemez veya değiştirmez; yorum karşılığında indirim, hediye veya ödül sunmaz. Herkese açık yorum bağlantısı her puanda gösterilir ve her müşteri dilediği yerde yorum yazabilir.',
        checklist: [
          'Eşik bilinçli olarak seçildi.',
          'Varsayılan platform seçildi ve bağlantısı çalışıyor.',
          'Akış yüksek ve düşük puanla telefonda denendi.',
          'Düşük puan formunun altında herkese açık bağlantı görünüyor.',
        ],
        faq: [
          {
            q: 'Eşiğin altında puan veren müşteri herkese açık yorum yazabilir mi?',
            a: 'Evet. Herkese açık yorum bağlantısı özel geri bildirim formuyla aynı ekranda görünür; müşteri formu doldurmadan da bağlantıyı kullanabilir.',
          },
          {
            q: 'Eşiği değiştirince QR kodlarını yeniden basmam gerekir mi?',
            a: 'Hayır. Eşik panelden değişir ve tüm QR kodlarınıza hemen yansır.',
          },
          {
            q: 'Müşteri birden fazla platform görür mü?',
            a: 'Yüksek puandan sonra tek bir platformun yorum sayfası açılır: QR koduna sabitlenen platform; o yoksa varsayılan platformunuz, o da yoksa sektörünüze göre öncelikli platform.',
          },
        ],
      },
    },
    en: {
      title: 'The redirect threshold and default platform',
      excerpt:
        'The threshold decides at which ratings the platform’s review page opens directly: 5 stars only by default, or 4 and 5 stars. How to choose the default platform.',
      tags: ['threshold', 'redirect', 'default platform', 'stars', 'flow'],
      body: {
        lead: 'Two settings decide what customers see after they scan your QR code and give a rating: the redirect threshold and the default platform. Both are on the **Platform links** page.',
        keyInsight:
          'At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        sections: [
          {
            title: 'The flow step by step',
            ordered: true,
            items: [
              'The customer scans the QR code and gives a rating from 1 to 5 stars.',
              'If the rating is at or above your threshold, your chosen platform’s review page opens after a short transition.',
              'If the rating is below the threshold, your private feedback form opens, with a “Write a review on …” link on the same screen.',
              'If the customer submits the form, the feedback lands on your **Reviews** page; they can also write a public review through the link.',
            ],
          },
          {
            title: 'Threshold options',
            items: [
              '**5 stars only** (default): 1–4 stars land in your private form first.',
              '**4 and 5 stars:** 1–3 stars land in your private form first.',
            ],
          },
          {
            title: 'Default platform',
            paragraphs: [
              'The default platform is the review page customers are sent to when no platform is pinned to the QR code. Choose one of the platforms whose link you have added. If the default platform’s link is removed or stops working, the priority platform for your sector is used, or failing that, another platform with a link.',
            ],
          },
        ],
        policyNote:
          'Buaze does not delete, hide or edit reviews, and does not offer discounts, gifts or rewards for reviews. The public review link is shown for every rating and every customer can post a review wherever they like.',
        checklist: [
          'The threshold was chosen on purpose.',
          'A default platform is selected and its link works.',
          'The flow was tested on a phone with a high and a low rating.',
          'The public link is visible under the low-rating form.',
        ],
        faq: [
          {
            q: 'Can a customer who rates below the threshold still write a public review?',
            a: 'Yes. The public review link is on the same screen as the private feedback form, and the customer can use it without filling in the form.',
          },
          {
            q: 'Do I need to reprint my QR codes after changing the threshold?',
            a: 'No. The threshold changes in the panel and applies to all your QR codes immediately.',
          },
          {
            q: 'Does the customer see more than one platform?',
            a: 'After a high rating, a single platform’s review page opens: the platform pinned to the QR code; failing that, your default platform, and failing that, the priority platform for your sector.',
          },
        ],
      },
    },
  }),

  ...pair('integrations', 40, 'delivery-platform-links', {
    tr: {
      title: 'Yemeksepeti, Getir ve Trendyol GO bağlantıları',
      excerpt:
        'Paket servis yapıyorsanız teslimat platformlarındaki yorum sayfalarınızın bağlantısını ekleyin ve paketteki QR kodunu ilgili platforma sabitleyin.',
      tags: ['yemeksepeti', 'getir', 'trendyol go', 'paket servis', 'teslimat'],
      body: {
        lead: 'Teslimat deneyimi, işletme içindeki deneyimden farklıdır. Teslimat platformlarının bağlantılarını ayrı tutmak, paketle gelen müşteriyi doğru yorum sayfasına göndermenizi sağlar.',
        keyInsight:
          'Her teslimat platformu için yorum yapılabilen işletme sayfanızın bağlantısını ekleyin ve paketteki QR kodunu o platforma sabitleyin.',
        sections: [
          {
            title: 'Hangi bağlantı eklenmeli?',
            paragraphs: [
              'Platformdaki kendi işletme sayfanızın kalıcı bağlantısını ekleyin; kısaltılmış veya kampanya bağlantıları yerine işletme sayfasını kullanın. Bazı platformlarda ana sayfa bağlantısı kaydedilir ama uyarı gösterilir; uyarı çıkmasa da bağlantıyı telefonda açıp doğru sayfaya gittiğini kontrol edin.',
            ],
          },
          {
            title: 'Paketteki QR kodu',
            paragraphs: [
              'Paket servis için ayrı bir QR oluşturun, masa etiketine örneğin PAKET yazın ve QR’ı ilgili platforma sabitleyin. Eşik ve üzerinde puan veren müşteri o platformun yorum sayfasına gider; daha düşük puan veren müşteri önce size yazabilir ve aynı ekranda o platformun herkese açık yorum bağlantısını görür.',
            ],
          },
          {
            title: 'Raporlarda',
            paragraphs: [
              'Geri bildirimlerin hangi platform üzerinden geldiği gelen kutusunda ve **Analitik** sayfasındaki platform dağılımında görünür. Buaze bu platformlardaki yorumları panele aktarmaz ve onlara yanıt vermez; yalnızca müşteriyi doğru sayfaya gönderir.',
            ],
          },
        ],
        checklist: [
          'Her platform için işletme sayfası bağlantısı eklendi.',
          'Bağlantılar telefonda açılıyor.',
          'Paket QR kodu doğru platforma sabitlendi.',
          'Kaydederken uyarı gösterilmedi.',
        ],
        faq: [
          {
            q: 'Teslimat platformlarındaki yorumlar panelde görünür mü?',
            a: 'Hayır. Buaze bu platformlardaki yorumları içeri aktarmaz. Panelde QR akışından gelen geri bildirimler görünür.',
          },
          {
            q: 'Bir platformu kullanmıyorsam alanı boş bırakabilir miyim?',
            a: 'Evet. Bağlantısı olmayan platformlar akışta kullanılmaz.',
          },
          {
            q: 'Siparişle eşleştirme yapılıyor mu?',
            a: 'Hayır. Buaze teslimat platformlarının sipariş bilgilerine bağlanmaz.',
          },
        ],
      },
    },
    en: {
      title: 'Yemeksepeti, Getir and Trendyol GO links',
      excerpt:
        'If you deliver, add the links to your review pages on the delivery platforms and pin the QR code on your delivery bags to the right platform.',
      tags: ['yemeksepeti', 'getir', 'trendyol go', 'delivery', 'takeaway'],
      body: {
        lead: 'The delivery experience is different from the one inside your business. Keeping delivery platform links separate lets you send delivery customers to the right review page.',
        keyInsight:
          'For each delivery platform, add the link to your business page where reviews can be written, and pin the QR code on your bags to that platform.',
        sections: [
          {
            title: 'Which link should I add?',
            paragraphs: [
              'Add the permanent link to your own business page on the platform; use the business page rather than shortened or campaign links. On some platforms a home page link is saved with a warning; even without a warning, open the link on a phone and check that it reaches the right page.',
            ],
          },
          {
            title: 'The QR code on the bag',
            paragraphs: [
              'Create a separate QR code for delivery, put something like DELIVERY in the table label and pin the QR code to the right platform. Customers who rate at or above your threshold go to that platform’s review page; customers who rate lower can write to you first and see that platform’s public review link on the same screen.',
            ],
          },
          {
            title: 'In your reports',
            paragraphs: [
              'Which platform feedback came through shows in the inbox and in the platform split on the **Analytics** page. Buaze does not import reviews from these platforms or reply to them; it only sends customers to the right page.',
            ],
          },
        ],
        checklist: [
          'A business page link is added for each platform.',
          'The links open on a phone.',
          'The delivery QR code is pinned to the right platform.',
          'No warning was shown when saving.',
        ],
        faq: [
          {
            q: 'Do reviews from the delivery platforms show in the panel?',
            a: 'No. Buaze does not import reviews from these platforms. The panel shows feedback that comes through your QR flow.',
          },
          {
            q: 'Can I leave a platform empty if I do not use it?',
            a: 'Yes. Platforms without a link are not used in the flow.',
          },
          {
            q: 'Is feedback matched to orders?',
            a: 'No. Buaze does not connect to the delivery platforms’ order data.',
          },
        ],
      },
    },
  }),

  ...pair('integrations', 50, 'tripadvisor-foursquare', {
    tr: {
      title: 'Tripadvisor, Booking.com, Airbnb ve diğerleri',
      excerpt:
        'Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare bağlantılarını nasıl ekleyeceğinizi ve hangi sektörlerde öne çıktıklarını öğrenin.',
      tags: ['tripadvisor', 'booking.com', 'airbnb', 'yandex', 'yelp', 'foursquare'],
      body: {
        lead: 'Buaze 10 herkese açık yorum platformunu destekler: Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare. Bu rehber, Google ve teslimat platformları dışındakileri anlatır.',
        keyInsight:
          'İşletmenizin profili olan ve müşterilerinizin gerçekten kullandığı platformları ekleyin; boş ya da az kullanılan bir profile müşteri göndermek yerine ana profilinizi güçlendirin.',
        sections: [
          {
            title: 'Sektöre göre öne çıkanlar',
            items: [
              '**Konaklama:** Tripadvisor, Booking.com, Airbnb; ayrıca Yelp, Foursquare ve Yandex.',
              '**Restoran ve kafe:** Tripadvisor, Yelp, Foursquare ve Yandex, Google ve teslimat platformlarının yanında.',
              '**Klinik, güzellik ve perakende:** Google’ın yanında Yandex.',
              '**Hukuk bürosu, spor salonu ve eğitim:** yalnızca Google.',
            ],
          },
          {
            title: 'Bağlantıyı ekleme',
            paragraphs: [
              '**Platform bağlantıları** sayfasında ilgili platformun alanına işletme ya da tesis sayfanızın bağlantısını yapıştırın. Bağlantının alan adı kontrol edilir; yanlış platforma ait bir adres kaydedilmez.',
            ],
          },
          {
            title: 'Teşekkür ekranındaki ek bağlantılar',
            paragraphs: [
              'Özel geri bildirim formunu gönderen müşteriye teşekkür ekranında, eklediyseniz Tripadvisor ve Yandex Haritalar’da da paylaşma seçeneği gösterilir.',
            ],
          },
          {
            title: 'Sosyal medya ve diğer bağlantılar',
            paragraphs: [
              'Instagram, Facebook, WhatsApp, web sitesi ve rezervasyon bağlantıları da kaydedilebilir; bunlar yorum platformu değildir ve yüksek puan akışında kullanılmaz. “Diğer” alanına girilen bağlantı da kaydedilir ama QR akışında kullanılmaz.',
            ],
          },
        ],
        checklist: [
          'Yalnızca gerçekten kullanılan platformlar eklendi.',
          'Bağlantılar işletme sayfasını açıyor.',
          'Varsayılan platform bilinçli seçildi.',
          'Bağlantılar test edildi.',
        ],
        faq: [
          {
            q: 'Expedia, Agoda veya Trustpilot destekleniyor mu?',
            a: 'Hayır. Desteklenen 10 platform Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare’dir.',
          },
          {
            q: 'Bu platformlardaki yorumlar panele aktarılıyor mu?',
            a: 'Hayır. Buaze bu platformların bağlantılarını yönetir ve müşteriyi doğru sayfaya gönderir; yorumları içeri aktarmaz.',
          },
        ],
      },
    },
    en: {
      title: 'Tripadvisor, Booking.com, Airbnb and other platforms',
      excerpt:
        'How to add your Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare links, which sectors each one suits and how they appear in the customer flow.',
      tags: ['tripadvisor', 'booking.com', 'airbnb', 'yandex', 'yelp', 'foursquare'],
      body: {
        lead: 'Buaze supports 10 public review platforms: Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare. This guide covers the ones other than Google and the delivery platforms.',
        keyInsight:
          'Add the platforms where your business has a profile and your customers actually go; rather than sending customers to an empty or rarely used profile, strengthen your main one.',
        sections: [
          {
            title: 'What matters by sector',
            items: [
              '**Hotels and stays:** Tripadvisor, Booking.com, Airbnb; also Yelp, Foursquare and Yandex.',
              '**Restaurants and cafés:** Tripadvisor, Yelp, Foursquare and Yandex, alongside Google and the delivery platforms.',
              '**Clinics, beauty and retail:** Yandex alongside Google.',
              '**Law firms, gyms and education:** Google only.',
            ],
          },
          {
            title: 'Adding the link',
            paragraphs: [
              'On the **Platform links** page, paste the link to your business or property page into that platform’s field. The link’s domain is checked, so an address that belongs to a different platform is not saved.',
            ],
          },
          {
            title: 'Extra links on the thank-you screen',
            paragraphs: [
              'Customers who submit the private feedback form also see an option to share on Tripadvisor and Yandex Maps on the thank-you screen, if you have added those links.',
            ],
          },
          {
            title: 'Social media and other links',
            paragraphs: [
              'Instagram, Facebook, WhatsApp, website and reservation links can be saved too; they are not review platforms and are not used in the high-rating flow. A link entered in the “Other” field is also saved but is not used in the QR flow.',
            ],
          },
        ],
        checklist: [
          'Only platforms you really use are added.',
          'The links open your business page.',
          'The default platform was chosen on purpose.',
          'The links have been tested.',
        ],
        faq: [
          {
            q: 'Are Expedia, Agoda or Trustpilot supported?',
            a: 'No. The 10 supported platforms are Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare.',
          },
          {
            q: 'Are reviews from these platforms imported into the panel?',
            a: 'No. Buaze manages links to these platforms and sends customers to the right page; it does not import their reviews.',
          },
        ],
      },
    },
  }),

  ...pair('integrations', 60, 'platform-link-checks', {
    tr: {
      title: 'Bağlantı kontrolleri ve bozuk bağlantılar',
      excerpt:
        'Bağlantılar kaydedilirken kontrol edilir ve her gün otomatik test edilir. Son 24 saatte testi geçemeyen bağlantı akışta atlanır; neler yapabileceğinizi öğrenin.',
      tags: ['bağlantı testi', 'bozuk bağlantı', 'kontrol', 'platform', 'akış'],
      body: {
        lead: 'Bir yorum bağlantısı zamanla bozulabilir: işletme sayfası taşınır, profil kapanır ya da adres yanlış girilir. Buaze bağlantılarınızı düzenli kontrol eder ve sorunlu bir bağlantıya müşteri göndermez.',
        keyInsight:
          'Bağlantılar her gün otomatik test edilir; son 24 saatte başarısız olan bağlantı akışta atlanır ve müşteri sıradaki uygun platforma gider.',
        sections: [
          {
            title: 'Kaydederken',
            paragraphs: [
              'Bağlantının ilgili platforma ait bir adres olup olmadığına bakılır; değilse kaydedilmez. Bazı platformlarda bağlantı ana sayfa gibi görünüyor ya da yorum sayfasına benzemiyorsa kaydedilir ama uyarı gösterilir.',
            ],
          },
          {
            title: 'Her gün',
            paragraphs: [
              'Kaydedilmiş bağlantılar her gün otomatik olarak test edilir. Son 24 saat içinde testte başarısız olan bağlantı müşteri akışında kullanılmaz; sırasıyla varsayılan platform, sektörünüze göre öncelikli platform ve bağlantısı olan diğer platformlar denenir.',
            ],
          },
          {
            title: 'Elle test etme',
            paragraphs: [
              '**Platform bağlantıları** sayfasındaki **Tümünü kontrol et** düğmesi seçili işletmenin bütün bağlantılarını yeniden test eder. Tek bir bağlantı için o platformun sayfasını açıp **Kontrol et** düğmesine basın; değişiklik yaptıysanız önce kaydedin. Son kontrolün zamanı ve sonucu her platformda görünür.',
            ],
          },
          {
            title: 'Test başarısızsa',
            items: [
              'Bağlantıyı kendi tarayıcınızda açın ve doğru işletme sayfasını gösterdiğini kontrol edin.',
              'Sayfa açılmıyorsa platformdaki güncel bağlantıyı alıp kaydedin.',
              'Sayfa açılıyorsa tekrar test edin; bazı platformlar otomatik kontrolleri engelleyebilir ve başarısız test her zaman bağlantının bozuk olduğu anlamına gelmez.',
            ],
          },
        ],
        checklist: [
          'Her bağlantının son test sonucu kontrol edildi.',
          'Başarısız bağlantılar tarayıcıda açıldı.',
          'Güncel bağlantılar kaydedildi.',
          'Varsayılan platformun bağlantısı çalışıyor.',
        ],
        faq: [
          {
            q: 'Test, bağlantının benim işletmeme ait olduğunu doğrular mı?',
            a: 'Hayır. Test yalnızca bağlantının açıldığını kontrol eder; doğru işletmeye ait olduğunu siz kontrol etmelisiniz.',
          },
          {
            q: 'Bozuk bir bağlantı ne kadar süre atlanır?',
            a: 'Son başarısız testten sonraki 24 saat boyunca. Bağlantı yeniden başarılı test edildiğinde tekrar kullanılır.',
          },
        ],
      },
    },
    en: {
      title: 'Link checks and broken links',
      excerpt:
        'Links are checked when you save them and tested automatically every day. A link that failed in the last 24 hours is skipped in the flow; here is what to do.',
      tags: ['link test', 'broken link', 'check', 'platform', 'flow'],
      body: {
        lead: 'A review link can break over time: a business page moves, a profile closes or an address is entered wrongly. Buaze checks your links regularly and does not send customers to a link with a problem.',
        keyInsight:
          'Links are tested automatically every day; a link that failed in the last 24 hours is skipped and the customer goes to the next suitable platform.',
        sections: [
          {
            title: 'When you save',
            paragraphs: [
              'Buaze checks that the link belongs to the right platform; if not, it is not saved. On some platforms, a link that looks like a home page or not like a review page is saved with a warning.',
            ],
          },
          {
            title: 'Every day',
            paragraphs: [
              'Saved links are tested automatically every day. A link that failed a test in the last 24 hours is not used in the customer flow; the default platform, the priority platform for your sector and any other platform with a link are tried in that order.',
            ],
          },
          {
            title: 'Testing by hand',
            paragraphs: [
              'On the **Platform links** page, **Check all** re-tests every link of the selected business. For a single link, open that platform’s page and press **Check link**; save any changes first. The time and result of the last check are shown for each platform.',
            ],
          },
          {
            title: 'If a test fails',
            items: [
              'Open the link in your own browser and check that it shows the right business page.',
              'If the page does not open, get the current link from the platform and save it.',
              'If the page opens, test again; some platforms block automated checks, so a failed test does not always mean the link is broken.',
            ],
          },
        ],
        checklist: [
          'The last test result of each link was checked.',
          'Failed links were opened in a browser.',
          'Current links were saved.',
          'The default platform’s link works.',
        ],
        faq: [
          {
            q: 'Does the test confirm the link belongs to my business?',
            a: 'No. The test only checks that the link opens; you need to check that it belongs to the right business.',
          },
          {
            q: 'How long is a broken link skipped?',
            a: 'For 24 hours after the last failed test. Once the link passes a test again, it is used again.',
          },
        ],
      },
    },
  }),

  /* --------------------------- Ekip ve roller ------------------------ */
  ...pair('team-roles', 10, 'invite-team-members', {
    tr: {
      title: 'Ekip arkadaşlarını davet etme ve işletme erişimi',
      excerpt:
        'Ekip arkadaşlarınızı e-postayla davet edin, rollerini seçin ve hangi işletmeleri göreceklerini belirleyin. Davet bağlantısı 7 gün geçerlidir.',
      tags: ['ekip', 'davet', 'rol', 'işletme erişimi', 'kullanıcı'],
      body: {
        lead: 'Ekip erişimi, her kişinin yalnızca ihtiyaç duyduğu işletmeleri görmesini sağlar. Bu hem işi hızlandırır hem de yanlış işletmede işlem yapılmasını önler.',
        keyInsight:
          'Davetleri **Hesabım → Ekip ve roller** bölümünden gönderirsiniz; davet 7 gün geçerlidir ve kişiye yalnızca seçtiğiniz işletmelerde, seçtiğiniz rolle erişim verir.',
        sections: [
          {
            title: 'Davet gönderme',
            ordered: true,
            items: [
              '**Hesabım → Ekip ve roller** bölümünü açın.',
              '**Üye davet et** düğmesine basın ve ekip arkadaşınızın e-posta adresini girin.',
              'Rolünü seçin: yönetici, personel veya görüntüleyici.',
              '**Konum erişimi** bölümünde erişeceği işletmeleri seçin; hiçbirini seçmezseniz tüm işletmelerinize erişir.',
              '**Daveti gönder** düğmesine basın; ekip arkadaşınız e-postadaki bağlantıyla katılır.',
            ],
          },
          {
            title: 'Davetin geçerliliği',
            paragraphs: [
              'Davet bağlantısı 7 gün geçerlidir. Süre dolarsa daveti yeniden gönderebilirsiniz; aynı adrese bir saat içinde ikinci kez davet gönderilmez. Bir e-posta adresi aynı anda yalnızca bir ekipte etkin üye olabilir.',
            ],
          },
          {
            title: 'Erişimi kaldırma',
            paragraphs: [
              'Ayrılan bir çalışanı aynı bölümden ekipten çıkarın. Ekip listesinde her üyenin rolü, durumu ve son görülme zamanı yer alır. Davetleri yalnızca hesap sahibi gönderebilir.',
            ],
          },
        ],
        checklist: [
          'E-posta adresi doğru.',
          'Rol, kişinin işiyle uyumlu.',
          'İşletme erişimi gerektiği kadar.',
          'Ayrılan çalışanlar ekipten çıkarıldı.',
        ],
        faq: [
          {
            q: 'İşletme seçmezsem ne olur?',
            a: 'Ekip arkadaşınız tüm işletmelerinize erişir; sonradan eklediğiniz işletmeler de buna dahildir.',
          },
          {
            q: 'Ekip arkadaşım başka birini davet edebilir mi?',
            a: 'Hayır. Davetleri yalnızca hesap sahibi gönderir.',
          },
          {
            q: 'Davet e-postası gelmedi; ne yapmalıyım?',
            a: 'Adresi kontrol edin ve istenmeyen e-posta klasörüne bakılmasını isteyin. Bir saat geçtikten sonra daveti yeniden gönderebilirsiniz.',
          },
        ],
      },
    },
    en: {
      title: 'Inviting teammates and choosing their businesses',
      excerpt:
        'Invite teammates by e-mail, give each one a role and choose which businesses they can see. Invite links stay valid for 7 days; only the owner sends them.',
      tags: ['team', 'invite', 'role', 'business access', 'user'],
      body: {
        lead: 'Team access lets each person see only the businesses they need. It speeds up the work and prevents changes in the wrong business.',
        keyInsight:
          'You send invites from **Account → Team & roles**; an invite is valid for 7 days and gives access only to the businesses and role you choose.',
        sections: [
          {
            title: 'Sending an invite',
            ordered: true,
            items: [
              'Open **Account → Team & roles**.',
              'Press **Invite member** and enter your teammate’s e-mail address.',
              'Choose their role: manager, staff or viewer.',
              'Under **Location access**, choose the businesses they can access; if you select none, they can access all of your businesses.',
              'Press **Send invite**; your teammate joins through the link in the e-mail.',
            ],
          },
          {
            title: 'How long an invite lasts',
            paragraphs: [
              'The invite link is valid for 7 days. If it expires, you can send it again; a second invite to the same address cannot be sent within an hour. An e-mail address can be an active member of only one team at a time.',
            ],
          },
          {
            title: 'Removing access',
            paragraphs: [
              'Remove someone who leaves from the same section. The team list shows each member’s role, status and when they were last seen. Only the account owner can send invites.',
            ],
          },
        ],
        checklist: [
          'The e-mail address is correct.',
          'The role matches the person’s job.',
          'Business access is no wider than needed.',
          'People who have left were removed from the team.',
        ],
        faq: [
          {
            q: 'What if I do not select any business?',
            a: 'Your teammate can access all of your businesses, including any you add later.',
          },
          {
            q: 'Can my teammate invite someone else?',
            a: 'No. Only the account owner sends invites.',
          },
          {
            q: 'The invite e-mail has not arrived. What should I do?',
            a: 'Check the address and ask your teammate to look in their spam folder. After an hour, you can send the invite again.',
          },
        ],
      },
    },
  }),

  ...pair('team-roles', 20, 'role-permissions', {
    tr: {
      title: 'Rol yetkileri: yönetici, personel, görüntüleyici',
      excerpt:
        'Hesap sahibi, yönetici, personel ve görüntüleyici neler yapabilir? Faturalandırma, ekip daveti ve işletme silme yalnızca hesap sahibine açıktır.',
      tags: ['rol', 'yetki', 'yönetici', 'personel', 'görüntüleyici'],
      body: {
        lead: 'Ekipte herkesin aynı yetkiye ihtiyacı yoktur. Rolleri doğru seçmek, verileri korur ve günlük işi sadeleştirir.',
        keyInsight:
          'Yönetici ve personel, erişebildikleri işletmelerde yanıt yazabilir ve ayarları değiştirebilir; görüntüleyici yalnızca görür. Faturalandırma, ekip daveti ve işletme silme hesap sahibine aittir.',
        sections: [
          {
            title: 'Roller',
            items: [
              '**Hesap sahibi:** hesabı açan kişidir. Tüm işletmelere erişir, ekip davet eder, faturalandırmayı yönetir ve işletme silebilir.',
              '**Yönetici:** erişebildiği işletmelerde geri bildirimlere yanıt yazar, QR kodu oluşturur ve ayarları değiştirir.',
              '**Personel:** yöneticiyle aynı işlemleri yapabilir; ekibinizde görev ayrımını göstermek için kullanılır.',
              '**Görüntüleyici:** erişebildiği işletmelerdeki verileri görür, değişiklik yapamaz ve yanıt yazamaz.',
            ],
          },
          {
            title: 'Yalnızca hesap sahibinin yapabildikleri',
            items: [
              'Ekip arkadaşı davet etmek ve ekipten çıkarmak.',
              'Planı yükseltmek, aboneliği yönetmek ve iptal etmek.',
              'Bir işletmeyi silmek.',
            ],
          },
          {
            title: 'Rol seçerken',
            paragraphs: [
              'Kişiye işi için gereken en dar yetkiyi verin. Raporları izleyecek ama yanıt yazmayacak biri için görüntüleyici rolü yeterlidir. Rolü kişiye değil göreve göre seçmek, çalışan değiştiğinde düzeni korur.',
            ],
          },
        ],
        checklist: [
          'Her üyenin rolü göreviyle uyumlu.',
          'Raporları yalnızca izleyenler görüntüleyici rolünde.',
          'İşletme erişimleri gerektiği kadar.',
          'Rol listesi düzenli gözden geçiriliyor.',
        ],
        faq: [
          {
            q: 'Yönetici ile personel arasında yetki farkı var mı?',
            a: 'Şu an iki rol aynı işlemleri yapabilir. Ekip içinde görev ayrımını göstermek için ikisini ayrı kullanabilirsiniz.',
          },
          {
            q: 'Ekip üyelerim faturalandırmayı yönetebilir mi?',
            a: 'Hayır. Planı yükseltmek, aboneliği yönetmek ve iptal etmek yalnızca hesap sahibine açıktır.',
          },
          {
            q: 'Görüntüleyici yanıt yazabilir mi?',
            a: 'Hayır. Görüntüleyici yalnızca görür.',
          },
        ],
      },
    },
    en: {
      title: 'Roles and permissions: manager, staff, viewer',
      excerpt:
        'Learn what the account owner, manager, staff and viewer roles can do. Billing, team invites and deleting a business are open only to the account owner.',
      tags: ['role', 'permissions', 'manager', 'staff', 'viewer'],
      body: {
        lead: 'Not everyone on the team needs the same permissions. Choosing roles carefully protects your data and keeps daily work simple.',
        keyInsight:
          'Managers and staff can reply and change settings in the businesses they can access; viewers can only look. Billing, team invites and deleting a business belong to the account owner.',
        sections: [
          {
            title: 'Roles',
            items: [
              '**Account owner:** the person who created the account. Has access to all businesses, invites the team, manages billing and can delete a business.',
              '**Manager:** replies to feedback, creates QR codes and changes settings in the businesses they can access.',
              '**Staff:** can do the same as a manager; useful for showing who does what in your team.',
              '**Viewer:** sees the data in the businesses they can access but cannot change anything or reply.',
            ],
          },
          {
            title: 'What only the account owner can do',
            items: [
              'Invite teammates and remove them from the team.',
              'Upgrade the plan, manage the subscription and cancel it.',
              'Delete a business.',
            ],
          },
          {
            title: 'Choosing a role',
            paragraphs: [
              'Give each person the narrowest access their job needs. For someone who follows reports but does not reply, the viewer role is enough. Choosing roles by task rather than by person keeps things in order when staff change.',
            ],
          },
        ],
        checklist: [
          'Each member’s role matches their task.',
          'People who only follow reports have the viewer role.',
          'Business access is no wider than needed.',
          'The role list is reviewed regularly.',
        ],
        faq: [
          {
            q: 'Is there a difference in permissions between manager and staff?',
            a: 'At the moment both roles can do the same things. You can use them separately to show how work is divided in your team.',
          },
          {
            q: 'Can team members manage billing?',
            a: 'No. Upgrading the plan, managing the subscription and cancelling are open only to the account owner.',
          },
          {
            q: 'Can a viewer reply to feedback?',
            a: 'No. A viewer can only look.',
          },
        ],
      },
    },
  }),

  ...pair('team-roles', 30, 'multi-location-management', {
    tr: {
      title: 'Birden çok işletmeyi tek hesaptan yönetme',
      excerpt:
        'Tek hesapta birden çok işletme: aranabilir işletme seçici, son 30 günü yan yana gösteren tablo, tüm işletmelerin platform bağlantıları ve ekip erişimi.',
      tags: ['çok şube', 'işletmeler', 'franchise', 'işletme seçici', 'karşılaştırma'],
      body: {
        lead: 'Birden çok şube yönettiğinizde asıl ihtiyaç, her şubeyi ayrı ayrı açmadan genel resmi görmek ve doğru kişiye doğru şubeyi vermektir.',
        keyInsight:
          'Her şube ayrı bir işletmedir; işletmeler arasında kenar çubuğundaki seçiciyle geçer, hepsini **İşletmeler** tablosunda yan yana karşılaştırırsınız.',
        sections: [
          {
            title: 'İşletmeler arasında geçiş',
            paragraphs: [
              'Kenar çubuğundaki işletme seçici aranabilir; çok sayıda işletmeniz varsa adıyla bulabilir, son kullandıklarınıza hızla dönebilirsiniz. Panel, Yorumlar ve Analitik gibi sayfalar seçili işletmeyi gösterir.',
            ],
          },
          {
            title: 'İşletmeler tablosu',
            paragraphs: [
              '**İşletmeler** sayfası tüm işletmelerinizi yan yana gösterir: son 30 günün yorum sayısı ve puanı, bekleyen düşük puanlar, bağlantı sağlığı ve son yorum. Dikkat gerektiren işletmeler ayrı bir sekmede toplanır.',
            ],
          },
          {
            title: 'Tüm işletmelerin bağlantıları',
            paragraphs: [
              '**Platform bağlantıları** sayfasındaki **Tüm işletmeler** görünümü, hangi işletmede hangi platformun eklendiğini ve sorunlu bağlantıları tek tabloda gösterir. Instagram, Facebook ve WhatsApp bağlantısını bir işletmeye kaydettikten sonra diğer işletmelerinize tek seferde uygulayabilirsiniz; yorum platformlarında her şubenin kendi sayfası olduğu için bu seçenek yoktur.',
            ],
          },
          {
            title: 'Ekip erişimi',
            paragraphs: [
              'Şube sorumlularını davet ederken yalnızca kendi şubelerini seçin; bölge sorumlusuna birkaç şube verebilirsiniz. Ayrıntılar: [Ekip arkadaşlarını davet etme](/tr/help/invite-team-members).',
            ],
          },
        ],
        checklist: [
          'Her şube ayrı işletme olarak eklendi.',
          'Her şubenin kendi Google ve platform bağlantıları var.',
          'Şube sorumluları yalnızca kendi şubelerine erişiyor.',
          'İşletmeler tablosu haftada bir kontrol ediliyor.',
        ],
        faq: [
          {
            q: 'Her işletme için ayrı fatura alabilir miyim?',
            a: 'Hayır. Abonelik ve faturalar hesap sahibine aittir; işletme başına ayrı fatura veya grup faturası yoktur. Sorularınız için [faturalandırma rehberlerine](/tr/help/category/billing) bakın.',
          },
          {
            q: 'Tüm şubelerin geri bildirimlerini tek listede görebilir miyim?',
            a: 'Gelen kutusu seçili işletmeyi gösterir. Şubeleri karşılaştırmak için İşletmeler tablosunu, ayrıntı için ilgili işletmeye geçmeyi kullanın.',
          },
        ],
      },
    },
    en: {
      title: 'Managing several businesses from one account',
      excerpt:
        'Several businesses in one account: a searchable business switcher, a table comparing the last 30 days, platform links across all businesses and team access.',
      tags: ['multiple branches', 'locations', 'franchise', 'business switcher', 'comparison'],
      body: {
        lead: 'When you run several branches, what you really need is the overall picture without opening each branch, and the right branches for the right people.',
        keyInsight:
          'Each branch is a separate business; you move between them with the switcher in the sidebar and compare them all side by side in the **Locations** table.',
        sections: [
          {
            title: 'Switching between businesses',
            paragraphs: [
              'The business switcher in the sidebar is searchable; with many businesses you can find one by name and jump back to the ones you used recently. Pages such as the Dashboard, Reviews and Analytics show the selected business.',
            ],
          },
          {
            title: 'The Locations table',
            paragraphs: [
              'The **Locations** page shows all your businesses side by side: reviews and rating for the last 30 days, pending low ratings, link health and the latest review. Businesses that need attention are collected on a separate tab.',
            ],
          },
          {
            title: 'Links across all businesses',
            paragraphs: [
              'The **All businesses** view on the **Platform links** page shows in one table which platforms each business has added and which links have problems. Once you save an Instagram, Facebook or WhatsApp link for one business, you can apply it to your other businesses in one go; this option does not exist for review platforms, because each branch has its own page there.',
            ],
          },
          {
            title: 'Team access',
            paragraphs: [
              'When inviting branch leads, select only their own branches; a regional lead can be given several. See [Inviting teammates](/en/help/invite-team-members).',
            ],
          },
        ],
        checklist: [
          'Each branch is added as a separate business.',
          'Each branch has its own Google and platform links.',
          'Branch leads can access only their own branches.',
          'The Locations table is checked once a week.',
        ],
        faq: [
          {
            q: 'Can I get a separate invoice for each business?',
            a: 'No. The subscription and invoices belong to the account owner; there are no per-business or group invoices. See the [billing guides](/en/help/category/billing).',
          },
          {
            q: 'Can I see all branches’ feedback in one list?',
            a: 'The inbox shows the selected business. Use the Locations table to compare branches and switch to a business for the details.',
          },
        ],
      },
    },
  }),

  ...pair('team-roles', 40, 'access-review-monthly', {
    tr: {
      title: 'Ekip erişimini düzenli gözden geçirme',
      excerpt:
        'Ayda bir kısa bir kontrolle ekip listesini güncel tutun: ayrılanları çıkarın, rolleri ve işletme erişimlerini gözden geçirin, hesap etkinlik günlüğüne bakın.',
      tags: ['erişim', 'güvenlik', 'ekip listesi', 'etkinlik günlüğü', 'rutin'],
      body: {
        lead: 'Ekip listesi zamanla büyür: yeni gelen davet edilir, ama ayrılan herkes hatırlanmaz. Ayda bir yapılan kısa bir kontrol bu birikimi temizler.',
        keyInsight:
          'Ayda bir ekip listesine ve hesap etkinlik günlüğüne bakın; ayrılanları çıkarın, rolleri ve işletme erişimlerini işe göre daraltın.',
        sections: [
          {
            title: 'Neye bakılır?',
            items: [
              'Ekip listesinde uzun süredir görülmeyen üyeler.',
              'Görevi değiştiği hâlde rolü aynı kalan kişiler.',
              'Kapanan bir şubeye hâlâ erişen üyeler.',
              'Kabul edilmemiş eski davetler.',
            ],
          },
          {
            title: 'Hesap etkinlik günlüğü',
            paragraphs: [
              '**Hesabım** sayfasındaki **Hesap aktivitesi** bölümü, hesabınızda kimin neyi değiştirdiğini gösterir. Beklenmedik bir değişiklik görürseniz ilgili ekip arkadaşınızla konuşun ve gerekirse erişimini kaldırın.',
            ],
          },
          {
            title: 'Karar kuralı',
            paragraphs: [
              'Ayrılan çalışanı hemen ekipten çıkarın. Görevi değişen kişinin rolünü ve işletmelerini güncelleyin. Uzun süredir giriş yapmayan biri hâlâ ekipteyse erişimin gerçekten gerekip gerekmediğini sorun.',
            ],
          },
        ],
        checklist: [
          'Ekip listesi bu ay gözden geçirildi.',
          'Ayrılanlar çıkarıldı.',
          'Roller ve işletme erişimleri güncel.',
          'Hesap aktivitesine bakıldı.',
        ],
        faq: [
          {
            q: 'Bir üyeyi çıkarmak yerine yetkisini azaltabilir miyim?',
            a: 'Evet. Rolünü görüntüleyici yapabilir ya da erişebildiği işletmeleri daraltabilirsiniz.',
          },
          {
            q: 'Kendi hesabımdaki açık oturumları nasıl görürüm?',
            a: 'Hesabım sayfasının **Güvenlik** bölümünde aktif oturumlarınızı görüp sonlandırabilirsiniz. Ayrıntılar: [Hesap güvenliği](/tr/help/security-best-practices).',
          },
        ],
      },
    },
    en: {
      title: 'Reviewing team access regularly',
      excerpt:
        'Keep the team list current with a short monthly check: remove people who have left, review roles and business access, and look at the account activity log.',
      tags: ['access', 'security', 'team list', 'activity log', 'routine'],
      body: {
        lead: 'A team list grows over time: new people are invited, but not everyone who leaves is remembered. A short check once a month clears that build-up.',
        keyInsight:
          'Once a month, look at the team list and the account activity log; remove people who have left and narrow roles and business access to what each job needs.',
        sections: [
          {
            title: 'What to look for',
            items: [
              'Members who have not been seen in the team list for a long time.',
              'People whose job changed but whose role did not.',
              'Members who still have access to a closed branch.',
              'Old invites that were never accepted.',
            ],
          },
          {
            title: 'The account activity log',
            paragraphs: [
              'The **Account activity** section on the **Account** page shows who changed what in your account. If you see an unexpected change, talk to the teammate concerned and remove their access if needed.',
            ],
          },
          {
            title: 'A simple rule',
            paragraphs: [
              'Remove anyone who leaves straight away. Update the role and businesses of anyone whose job changes. If someone who has not signed in for a long time is still on the team, ask whether they really need access.',
            ],
          },
        ],
        checklist: [
          'The team list was reviewed this month.',
          'People who left were removed.',
          'Roles and business access are current.',
          'The account activity log was checked.',
        ],
        faq: [
          {
            q: 'Can I reduce a member’s permissions instead of removing them?',
            a: 'Yes. Change their role to viewer or narrow the businesses they can access.',
          },
          {
            q: 'How do I see the open sessions on my own account?',
            a: 'In the **Security** section of the Account page you can see and end your active sessions. See [Account security](/en/help/security-best-practices).',
          },
        ],
      },
    },
  }),

  ...pair('team-roles', 50, 'team-onboarding-checklist', {
    tr: {
      title: 'Yeni ekip arkadaşının ilk haftası',
      excerpt:
        'Yeni ekip arkadaşının paneli verimli kullanmaya başlaması için beş günlük bir plan: erişim, gelen kutusu, yanıt yazma, Pulse AI ve haftalık değerlendirme.',
      tags: ['yeni ekip üyesi', 'eğitim', 'ilk hafta', 'alışma', 'ekip'],
      body: {
        lead: 'Davet edilen kişi ilk gün verimli olmaz. İlk hafta planlı geçerse geri bildirim okumak, yanıt yazmak ve takip etmek kısa sürede alışkanlığa dönüşür.',
        keyInsight:
          'İlk hafta her gün tek bir konuya odaklanın ve bir ekip arkadaşını yeni gelenin sorularını yanıtlamakla görevlendirin.',
        sections: [
          {
            title: 'Beş günlük plan',
            ordered: true,
            items: [
              'Hesaba giriş, rolün ve erişilen işletmelerin kontrolü; paneli telefonda da açma.',
              '**Yorumlar** sayfası: sekmeler, arama ve geri bildirimleri okuma.',
              'Düşük puanlara yanıt yazma ve sorumluluk onayı.',
              'Pulse AI taslağını düzenleme, **İşaretle** ve **Beklemeye al** ile takip.',
              'Haftalık değerlendirmeye katılma ve sorumluluk alanlarını netleştirme.',
            ],
          },
          {
            title: 'Bir yol arkadaşı',
            paragraphs: [
              'İlk hafta için deneyimli bir ekip arkadaşını yol arkadaşı olarak belirleyin. Her gün kısa bir kontrol bile öğrenmeyi hızlandırır.',
            ],
          },
          {
            title: 'Hafta sonunda',
            paragraphs: [
              'Yeni ekip arkadaşınızın kendi başına bir düşük puanı okuyup yanıtlayabildiğini ve takip gerektirenleri işaretleyebildiğini kontrol edin. Amaç performans ölçmek değil, alışkanlığın oluştuğunu görmek.',
            ],
          },
        ],
        checklist: [
          'Rol ve işletme erişimi doğru.',
          'Panel masaüstünde ve telefonda denendi.',
          'En az birkaç yanıt birlikte yazıldı.',
          'İlk haftalık değerlendirmeye katıldı.',
        ],
        faq: [
          {
            q: 'Yarı zamanlı çalışanlar için plan kısaltılmalı mı?',
            a: 'Adımları haftalara yayabilirsiniz; önemli olan sırayı korumaktır.',
          },
          {
            q: 'Yeni gelen yalnızca raporları izleyecekse?',
            a: 'Görüntüleyici rolü yeterlidir; plandaki yanıt yazma adımlarını atlayabilirsiniz.',
          },
        ],
      },
    },
    en: {
      title: 'A new teammate’s first week',
      excerpt:
        'A five-day plan to help a new teammate get comfortable with the panel: access, the inbox, writing replies, Pulse AI drafts and the weekly feedback review.',
      tags: ['new teammate', 'training', 'first week', 'onboarding', 'team'],
      body: {
        lead: 'An invited teammate is not productive on day one. If the first week is planned, reading feedback, writing replies and following up quickly become habits.',
        keyInsight:
          'Focus on one topic each day in the first week, and ask a colleague to answer the newcomer’s questions.',
        sections: [
          {
            title: 'A five-day plan',
            ordered: true,
            items: [
              'Signing in, checking the role and the businesses they can access; opening the panel on a phone too.',
              'The **Reviews** page: tabs, search and reading feedback.',
              'Replying to low ratings and the responsibility confirmation.',
              'Editing a Pulse AI draft, and following up with **Flag** and **Mark pending**.',
              'Joining the weekly review and agreeing on areas of responsibility.',
            ],
          },
          {
            title: 'A buddy',
            paragraphs: [
              'Name an experienced colleague as a buddy for the first week. Even a short daily check-in speeds up learning.',
            ],
          },
          {
            title: 'At the end of the week',
            paragraphs: [
              'Check that your new teammate can read and reply to a low rating on their own and flag what needs follow-up. The aim is not to measure performance but to see that the habit has formed.',
            ],
          },
        ],
        checklist: [
          'Role and business access are correct.',
          'The panel was tried on desktop and on a phone.',
          'A few replies were written together.',
          'They joined the first weekly review.',
        ],
        faq: [
          {
            q: 'Should the plan be shorter for part-time staff?',
            a: 'You can spread the steps over several weeks; what matters is keeping the order.',
          },
          {
            q: 'What if the newcomer will only follow reports?',
            a: 'The viewer role is enough; you can skip the reply steps in the plan.',
          },
        ],
      },
    },
  }),

  ...pair('team-roles', 60, 'shift-handoff-reviews', {
    tr: {
      title: 'Vardiya değişiminde geri bildirim devri',
      excerpt:
        'Açık kalan geri bildirimlerin vardiyalar arasında kaybolmaması için kısa bir devir düzeni: Yanıtsızlar, İşaretliler ve Beklemede listeleri üzerinden ilerleyin.',
      tags: ['vardiya', 'devir', 'takip', 'gelen kutusu', 'ekip'],
      body: {
        lead: 'Sabah vardiyasında gelen bir düşük puan akşama kadar yanıtsız kalırsa müşteri iki kez kaybedilir: önce deneyimde, sonra takipte. Kısa bir devir düzeni bunu önler.',
        keyInsight:
          'Vardiya değişiminde aynı üç listeye birlikte bakın: Yanıtsızlar, İşaretliler ve Beklemede.',
        sections: [
          {
            title: 'Kısa bir devir listesi',
            items: [
              '**Yanıtsızlar** düğmesiyle yanıt bekleyen geri bildirimler.',
              '**Yalnız işaretliler** ile takip gerektirenler.',
              '**Beklemede** sekmesinde sonraya bırakılanlar.',
              'Gelecek vardiyanın bilmesi gereken özel bir durum varsa kısa bir not.',
            ],
          },
          {
            title: 'Ortak görünüm',
            paragraphs: [
              'İki vardiya sorumlusu aynı görünüme baksın. Yorumlar sayfasında seçtiğiniz sekme ve seçimler sayfa adresine yazılır; bağlantıyı paylaşarak aynı listeyi açabilirsiniz.',
            ],
          },
          {
            title: 'Hafta sonu ve tatil',
            paragraphs: [
              'Ekip planlanırken hafta sonu sık unutulur. Cuma akşamından pazartesi sabahına kadar düşük puan uyarılarını kimin takip edeceğini önceden belirleyin.',
            ],
          },
        ],
        checklist: [
          'Devirde üç listeye bakılıyor.',
          'Ortak görünüm bağlantısı paylaşıldı.',
          'Hafta sonu sorumlusu belli.',
          'Devir notları kaybolmayacak bir yerde.',
        ],
        faq: [
          {
            q: 'Küçük bir ekipte devir gerekli mi?',
            a: 'Evet. Tek kişilik bir vardiyada bile sonraki kişiye kısa bir not bırakmak sürprizleri önler.',
          },
          {
            q: 'Geri bildirimi belirli bir kişiye atayabilir miyim?',
            a: 'Hayır. Gelen kutusunda atama yoktur; takip için **İşaretle** ve **Beklemeye al** kullanılır.',
          },
        ],
      },
    },
    en: {
      title: 'Handing over feedback between shifts',
      excerpt:
        'A short handover routine so open feedback is not lost between shifts: go through the Unreplied, Flagged and Pending lists together before the next shift starts.',
      tags: ['shift', 'handover', 'follow-up', 'inbox', 'team'],
      body: {
        lead: 'If a low rating that arrives in the morning shift is still unanswered in the evening, the customer is lost twice: once in the experience and again in the follow-up. A short handover routine prevents that.',
        keyInsight: 'At each shift change, look at the same three lists together: Unreplied, Flagged and Pending.',
        sections: [
          {
            title: 'A short handover checklist',
            items: [
              'Feedback waiting for a reply, via the **Unreplied** button.',
              'Items needing follow-up, via **Flagged only**.',
              'Items set aside on the **Pending** tab.',
              'A short note if the next shift needs to know about anything special.',
            ],
          },
          {
            title: 'A shared view',
            paragraphs: [
              'Both shift leads should look at the same view. The tab and choices on the Reviews page are written into the page address, so sharing the link opens the same list.',
            ],
          },
          {
            title: 'Weekends and holidays',
            paragraphs: [
              'Weekends are often forgotten when planning a team. Decide in advance who follows low-rating alerts from Friday evening to Monday morning.',
            ],
          },
        ],
        checklist: [
          'The three lists are checked at handover.',
          'The shared view link has been shared.',
          'Someone is responsible at weekends.',
          'Handover notes are kept where they will not get lost.',
        ],
        faq: [
          {
            q: 'Is a handover needed in a small team?',
            a: 'Yes. Even in a one-person shift, a short note for the next person prevents surprises.',
          },
          {
            q: 'Can I assign feedback to a specific person?',
            a: 'No. The inbox has no assignment; use **Flag** and **Mark pending** to follow up.',
          },
        ],
      },
    },
  }),

  /* --------------------------- Faturalandırma ------------------------ */
  ...pair('billing', 10, 'plans-trial-upgrade', {
    tr: {
      title: 'Ücretsiz deneme ve plana geçiş',
      excerpt:
        '14 günlük deneme kredi kartı istemeden başlar. Deneme bitmeden aylık plana geçebilirsiniz; süre dolduğunda panele giriş, plan alınana kadar durur.',
      tags: ['deneme süresi', 'plan', 'abonelik', 'fiyat', 'yükseltme'],
      body: {
        lead: 'Buaze’yi 14 gün boyunca ücretsiz deneyebilirsiniz. Bu rehber, deneme süresinde nelere bakmanız gerektiğini ve ücretli plana nasıl geçeceğinizi anlatır.',
        keyInsight:
          'Deneme kart bilgisi olmadan başlar; ücretli plana **Hesabım → Plan ve faturalama** bölümündeki **Planı yükselt** düğmesiyle geçersiniz.',
        sections: [
          {
            title: 'Deneme süresince',
            items: [
              'İşletmenizi, yorum bağlantılarınızı ve ilk QR kodunuzu kurun.',
              'QR kodunu gerçek müşterilerle kullanın ve geri bildirimlerin nasıl geldiğini görün.',
              'Ekibinizi davet edip yanıt akışını deneyin.',
              'Deneme bitimine 3 gün ve 1 gün kala hatırlatma e-postası gelir.',
            ],
          },
          {
            title: 'Plana geçme',
            paragraphs: [
              '**Hesabım → Plan ve faturalama** bölümünde **Planı yükselt** düğmesine basın ve planınızı seçin. Aylık abonelik USD olarak, kartla, Dodo Payments üzerinden alınır. Planlar ve güncel fiyatlar [fiyatlandırma sayfasında](/tr/pricing) yer alır.',
            ],
          },
          {
            title: 'Deneme biterse',
            paragraphs: [
              `Deneme süresi dolduğunda bir plan alınana kadar panele giriş yapılamaz; verileriniz otomatik olarak silinmez. Bu durumda plan almak için [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
            ],
          },
        ],
        checklist: [
          'Deneme bitiş tarihi biliniyor.',
          'QR akışı gerçek müşterilerle denendi.',
          'Ekip davet edildi.',
          'Plan, deneme bitmeden seçildi.',
        ],
        faq: [
          {
            q: 'Deneme için kredi kartı gerekiyor mu?',
            a: 'Hayır. Deneme kart bilgisi olmadan başlar; kart bilgisi yalnızca plana geçerken istenir.',
          },
          {
            q: 'Planlar arasında özellik farkı var mı?',
            a: `Planların kapsamı ve fiyatları fiyatlandırma sayfasında yer alır. Sorunuz varsa satın almadan önce [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
          },
          {
            q: 'Fiyatlar hangi para biriminde?',
            a: 'Fiyatlar USD olarak gösterilir ve ödeme USD ile alınır.',
          },
        ],
      },
    },
    en: {
      title: 'Your free trial and choosing a plan',
      excerpt:
        'The 14-day trial starts without a credit card. You can move to a monthly plan before it ends; when it expires, panel access stops until a plan is bought.',
      tags: ['free trial', 'plan', 'subscription', 'pricing', 'upgrade'],
      body: {
        lead: 'You can try Buaze free for 14 days. This guide explains what to look at during the trial and how to move to a paid plan.',
        keyInsight:
          'The trial starts without card details; you move to a paid plan with the **Upgrade plan** button under **Account → Plan & billing**.',
        sections: [
          {
            title: 'During the trial',
            items: [
              'Set up your business, your review links and your first QR code.',
              'Use the QR code with real customers and see how feedback comes in.',
              'Invite your team and try the reply flow.',
              'A reminder e-mail arrives 3 days and 1 day before the trial ends.',
            ],
          },
          {
            title: 'Moving to a plan',
            paragraphs: [
              'Under **Account → Plan & billing**, press **Upgrade plan** and choose your plan. Monthly subscriptions are charged in USD, by card, through Dodo Payments. Plans and current prices are on the [pricing page](/en/pricing).',
            ],
          },
          {
            title: 'If the trial ends',
            paragraphs: [
              `When the trial expires, you cannot sign in to the panel until a plan is bought; your data is not deleted automatically. To buy a plan at that point, write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
            ],
          },
        ],
        checklist: [
          'You know when the trial ends.',
          'The QR flow was tried with real customers.',
          'The team has been invited.',
          'A plan was chosen before the trial ended.',
        ],
        faq: [
          {
            q: 'Do I need a credit card for the trial?',
            a: 'No. The trial starts without card details; they are asked for only when you move to a plan.',
          },
          {
            q: 'Do the plans differ in features?',
            a: `What each plan includes and its price are on the pricing page. If you have a question, write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) before buying.`,
          },
          {
            q: 'Which currency are prices in?',
            a: 'Prices are shown and charged in USD.',
          },
        ],
      },
    },
  }),

  ...pair('billing', 20, 'invoices-cancelation', {
    tr: {
      title: 'Faturalar, kart değişikliği ve abonelik iptali',
      excerpt:
        'Faturalarınızı panelde görür, aboneliğinizi ve kartınızı müşteri portalından yönetirsiniz. İptal ettiğinizde ödenmiş dönemin sonuna kadar erişiminiz sürer.',
      tags: ['fatura', 'iptal', 'kart', 'abonelik', 'müşteri portalı'],
      body: {
        lead: 'Faturalandırmada en önemli şey sürpriz yaşamamaktır. Faturalarınızın nerede olduğunu, kartınızı nasıl değiştireceğinizi ve iptalin nasıl işlediğini bilmek işinizi kolaylaştırır.',
        keyInsight:
          'Faturalar **Hesabım → Plan ve faturalama** bölümünde listelenir; aboneliği ve kartı **Aboneliği yönet** ile açılan müşteri portalından yönetir, oradan iptal edersiniz.',
        sections: [
          {
            title: 'Faturalar',
            paragraphs: [
              '**Hesabım → Plan ve faturalama** bölümünde faturalarınız tarih, fatura numarası, tutar ve durumla listelenir; PDF’i olan faturaları buradan indirebilirsiniz.',
            ],
          },
          {
            title: 'Kartı değiştirme ve iptal',
            paragraphs: [
              '**Aboneliği yönet** düğmesi, ödeme sağlayıcımız Dodo Payments’ın müşteri portalını açar. Ödeme kartınızı buradan değiştirir, aboneliğinizi buradan iptal edersiniz. İptal ettiğinizde ödenmiş dönemin sonuna kadar panele erişiminiz sürer. Faturalandırmayı yalnızca hesap sahibi yönetebilir.',
            ],
          },
          {
            title: 'İptalden önce',
            items: [
              'İhtiyacınız olan raporları CSV olarak indirin.',
              'Basılı QR kodlarının dönem sonunda nasıl kullanılacağına karar verin.',
              'Ekip erişimlerini gözden geçirin.',
            ],
          },
        ],
        checklist: [
          'Faturalar indirildi ve saklandı.',
          'Kart bilgisi güncel.',
          'Raporlar dışa aktarıldı.',
          'İptal tarihi ve dönem sonu biliniyor.',
        ],
        faq: [
          {
            q: 'Faturadaki şirket bilgilerini nasıl değiştiririm?',
            a: `Fatura unvanı, adres veya vergi numarasıyla ilgili değişiklikler için [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
          },
          {
            q: 'İade alabilir miyim?',
            a: 'İade ve cayma koşulları [İade ve İptal Politikası](/tr/iade-iptal-politikasi) sayfasında açıklanır.',
          },
          {
            q: 'Aboneliği iptal etmek hesabımı siler mi?',
            a: 'Hayır. İptal yalnızca aboneliği sonlandırır. Hesabınızı silmek ayrı bir işlemdir; ayrıntılar [veri saklama ve hesap silme](/tr/help/data-retention-anonymization) rehberinde.',
          },
        ],
      },
    },
    en: {
      title: 'Invoices, changing your card and cancelling',
      excerpt:
        'See your invoices in the panel and manage your subscription and card in the customer portal. If you cancel, your access continues to the end of the paid period.',
      tags: ['invoice', 'cancel', 'card', 'subscription', 'customer portal'],
      body: {
        lead: 'In billing, the main thing is avoiding surprises. Knowing where your invoices are, how to change your card and how cancelling works makes things easier.',
        keyInsight:
          'Invoices are listed under **Account → Plan & billing**; you manage your subscription and card, and cancel, in the customer portal that **Manage subscription** opens.',
        sections: [
          {
            title: 'Invoices',
            paragraphs: [
              'Under **Account → Plan & billing**, your invoices are listed with date, invoice number, amount and status; invoices that have a PDF can be downloaded there.',
            ],
          },
          {
            title: 'Changing your card and cancelling',
            paragraphs: [
              '**Manage subscription** opens the customer portal of our payment provider, Dodo Payments. You change your payment card and cancel your subscription there. If you cancel, your panel access continues to the end of the paid period. Only the account owner can manage billing.',
            ],
          },
          {
            title: 'Before you cancel',
            items: [
              'Download the reports you need as CSV.',
              'Decide what happens to printed QR codes at the end of the period.',
              'Review team access.',
            ],
          },
        ],
        checklist: [
          'Invoices were downloaded and stored.',
          'Card details are up to date.',
          'Reports were exported.',
          'You know the cancellation date and the end of the period.',
        ],
        faq: [
          {
            q: 'How do I change the company details on my invoice?',
            a: `For changes to the invoice name, address or tax number, write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
          },
          {
            q: 'Can I get a refund?',
            a: 'Refund and withdrawal terms are explained in the [Refund and Cancellation Policy](/en/iade-iptal-politikasi).',
          },
          {
            q: 'Does cancelling the subscription delete my account?',
            a: 'No. Cancelling only ends the subscription. Deleting your account is a separate step; see [data retention and account deletion](/en/help/data-retention-anonymization).',
          },
        ],
      },
    },
  }),

  ...pair('billing', 30, 'annual-vs-monthly-plans', {
    tr: {
      title: 'Aylık ve yıllık ödeme',
      excerpt:
        'Aylık abonelik panelden kartla başlatılır. Yıllık ödeme seçeneği için bizimle iletişime geçersiniz. Hangi durumda hangisinin uygun olduğuna dair notlar.',
      tags: ['aylık', 'yıllık', 'plan', 'ödeme', 'abonelik'],
      body: {
        lead: 'Ödeme döngüsü seçimi yalnızca fiyat değil, esneklik kararıdır. Aylık ödeme, iş modeli henüz oturmamış işletmeye esneklik sağlar; yıllık ödeme ise uzun süreli kullanımı planlayanlar içindir.',
        keyInsight:
          `Aylık aboneliği panelden kendiniz başlatırsınız; yıllık ödeme için [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
        sections: [
          {
            title: 'Aylık abonelik',
            paragraphs: [
              'Aylık abonelik **Hesabım → Plan ve faturalama** bölümünden kartla başlatılır ve USD olarak alınır. İstediğiniz zaman müşteri portalından iptal edebilirsiniz; erişiminiz ödenmiş dönemin sonuna kadar sürer.',
            ],
          },
          {
            title: 'Yıllık ödeme',
            paragraphs: [
              'Fiyatlandırma sayfası yıllık fiyatları da gösterir. Yıllık ödeme şu an panelden kendiliğinden başlatılamaz; bu seçenek için bizimle iletişime geçin.',
            ],
          },
          {
            title: 'Hangisi size uygun?',
            items: [
              'Yeni açılan veya kısa süreli kullanım planlayan işletmeler için aylık ödeme daha esnektir.',
              'Kullanımı oturmuş, uzun süre devam edecek işletmeler yıllık ödemeyi değerlendirebilir.',
              'Karar vermeden önce deneme süresinde akışı gerçek müşterilerle deneyin.',
            ],
          },
        ],
        checklist: [
          'Ödeme döngüsü kullanım planına göre seçildi.',
          'Yenileme tarihi takvimde.',
          'İade ve iptal koşulları okundu.',
        ],
        faq: [
          {
            q: 'Aylıktan yıllığa geçebilir miyim?',
            a: `Yıllık ödeme için [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın; geçişi birlikte planlarız.`,
          },
          {
            q: 'Yıllık planı erken iptal edersem ne olur?',
            a: 'İade ve cayma koşulları [İade ve İptal Politikası](/tr/iade-iptal-politikasi) sayfasında açıklanır.',
          },
        ],
      },
    },
    en: {
      title: 'Monthly and yearly billing',
      excerpt:
        'You start a monthly subscription from the panel by card. For yearly billing, get in touch with us. Notes on when each option makes the most sense.',
      tags: ['monthly', 'yearly', 'plan', 'payment', 'subscription'],
      body: {
        lead: 'Choosing a billing cycle is about flexibility as much as price. Monthly billing gives flexibility while your business is still finding its feet; yearly billing is for those who plan to use Buaze for the long term.',
        keyInsight:
          `You start a monthly subscription yourself from the panel; for yearly billing, write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
        sections: [
          {
            title: 'Monthly subscription',
            paragraphs: [
              'A monthly subscription is started by card under **Account → Plan & billing** and charged in USD. You can cancel it in the customer portal at any time; your access continues to the end of the paid period.',
            ],
          },
          {
            title: 'Yearly billing',
            paragraphs: [
              'The pricing page shows yearly prices too. Yearly billing cannot be started from the panel yet; get in touch with us for this option.',
            ],
          },
          {
            title: 'Which one suits you?',
            items: [
              'For a new business or short-term use, monthly billing is more flexible.',
              'Businesses with settled use that will continue for a long time can consider yearly billing.',
              'Before deciding, try the flow with real customers during the trial.',
            ],
          },
        ],
        checklist: [
          'The billing cycle matches your plans.',
          'The renewal date is in your calendar.',
          'You have read the refund and cancellation terms.',
        ],
        faq: [
          {
            q: 'Can I switch from monthly to yearly?',
            a: `Write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) about yearly billing and we will plan the switch with you.`,
          },
          {
            q: 'What if I cancel a yearly plan early?',
            a: 'Refund and withdrawal terms are explained in the [Refund and Cancellation Policy](/en/iade-iptal-politikasi).',
          },
        ],
      },
    },
  }),

  /* -------------------------- Güvenlik ve KVKK ----------------------- */
  ...pair('security-kvkk', 10, 'kvkk-consent-data', {
    tr: {
      title: 'Müşteri onayları ve formda toplanan veriler',
      excerpt:
        'Geri bildirim formu KVKK aydınlatma onayı ister; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. Form neleri ister, onaylar nasıl kaydedilir?',
      tags: ['kvkk', 'onay', 'açık rıza', 'pazarlama izni', 'müşteri verisi'],
      body: {
        lead: 'Geri bildirim toplarken amaç, deneyimi iyileştirmek için gereken bilgiyi hukuka uygun biçimde almaktır. Buaze’nin müşteri formu buna göre tasarlanmıştır.',
        keyInsight:
          'Form, gönderim için KVKK aydınlatma onayını ister; pazarlama izni ayrı bir kutudur ve varsayılan olarak işaretsizdir. Onaylar kayıt altına alınır.',
        sections: [
          {
            title: 'Formda hangi bilgiler istenir?',
            paragraphs: [
              'Özel geri bildirim formunda müşteri yorumunu ve isterse konu seçimlerini yazar; adını ve e-posta adresini bırakması isteğe bağlıdır. Herkese açık yorum bağlantısını açmak için kişisel veri gerekmez. Anketlerde ayrıca telefon numarası istenebilir.',
            ],
          },
          {
            title: 'Onaylar',
            items: [
              'KVKK aydınlatma onayı, formun gönderilebilmesi için gereklidir.',
              'Pazarlama izni ayrı bir kutudur ve varsayılan olarak işaretsizdir; müşteri isterse işaretler.',
              'Verilen onaylar, hangi metne ve ne zaman verildiğiyle birlikte kaydedilir.',
            ],
          },
          {
            title: 'Veri sorumlusu kimdir?',
            paragraphs: [
              'Müşterilerinizin bıraktığı veriler için veri sorumlusu işletmenizdir; Buaze bu verileri sizin adınıza işler. Bu ilişki [Veri İşleyici Sözleşmesi](/tr/veri-isleyici-sozlesmesi)’nde düzenlenir; Buaze’nin kendi aydınlatma metni [KVKK sayfasında](/tr/kvkk). Pulse AI yanıt taslakları ve öne çıkan konular için yorum metinleri yapay zekâ hizmet sağlayıcımız OpenAI’ye gönderilir; alt işleyicilerin listesi aynı sözleşmededir.',
            ],
          },
        ],
        checklist: [
          'Form yalnızca gereken bilgileri istiyor.',
          'Pazarlama iznine dayanmayan bir iletişim yapılmıyor.',
          'İşletmenizin aydınlatma metni güncel.',
          'Müşteri listesine erişim gerektiği kadar.',
        ],
        faq: [
          {
            q: 'Müşterinin e-posta bırakması zorunlu mu?',
            a: 'Hayır. E-posta isteğe bağlıdır; bırakılmadığında yanıtınız panelde kayıt olarak saklanır.',
          },
          {
            q: 'Pazarlama izni olmayan müşteriye kampanya e-postası gönderebilir miyim?',
            a: 'Hayır. Buaze üzerinden toplu kampanya e-postası gönderilmez; kendi kanallarınızda da pazarlama iletisini yalnızca izin veren müşterilere gönderin.',
          },
        ],
      },
    },
    en: {
      title: 'Customer consent and what data is collected',
      excerpt:
        'The feedback form asks for KVKK notice consent; marketing consent is separate and unticked by default. Learn what the form asks for and how consent is recorded.',
      tags: ['kvkk', 'consent', 'privacy', 'marketing consent', 'customer data'],
      body: {
        lead: 'The aim when collecting feedback is to take the information needed to improve the experience, lawfully. Buaze’s customer form is designed with that in mind.',
        keyInsight:
          'The form requires KVKK notice consent to submit; marketing consent is a separate box that is unticked by default. Consents are recorded.',
        sections: [
          {
            title: 'What does the form ask for?',
            paragraphs: [
              'In the private feedback form, the customer writes their comment and can pick topics; leaving a name and e-mail address is optional. Opening the public review link needs no personal data. Surveys can also ask for a phone number.',
            ],
          },
          {
            title: 'Consent',
            items: [
              'KVKK notice consent is required before the form can be submitted.',
              'Marketing consent is a separate box that is unticked by default; customers tick it only if they want to.',
              'Consents are recorded together with the text they were given for and when.',
            ],
          },
          {
            title: 'Who is the data controller?',
            paragraphs: [
              'Your business is the data controller for the data your customers leave; Buaze processes it on your behalf. This relationship is set out in the [Data Processing Agreement](/en/veri-isleyici-sozlesmesi); Buaze’s own privacy notice is on the [KVKK page](/en/kvkk). For Pulse AI reply drafts and highlighted topics, comment text is sent to our AI provider, OpenAI; the list of sub-processors is in the same agreement.',
            ],
          },
        ],
        checklist: [
          'The form asks only for what is needed.',
          'No marketing contact is made without marketing consent.',
          'Your business’s privacy notice is up to date.',
          'Access to the customer list is no wider than needed.',
        ],
        faq: [
          {
            q: 'Does the customer have to leave an e-mail?',
            a: 'No. The e-mail is optional; if none is left, your reply is saved as a record in the panel.',
          },
          {
            q: 'Can I send campaign e-mails to customers without marketing consent?',
            a: 'No. Buaze does not send bulk campaign e-mails; in your own channels too, send marketing only to customers who have agreed to it.',
          },
        ],
      },
    },
  }),

  ...pair('security-kvkk', 20, 'security-best-practices', {
    tr: {
      title: 'Hesap güvenliği: şifre, oturumlar ve erişim',
      excerpt:
        'Aktif oturumlarınızı görüp sonlandırın, şifrenizi değiştirin, yeni cihaz uyarılarını takip edin ve ekip erişimini en dar yetkiyle sınırlayın.',
      tags: ['güvenlik', 'şifre', 'oturum', 'erişim', 'hesap'],
      body: {
        lead: 'Hesap güvenliği tek bir ayardan değil, birkaç alışkanlıktan oluşur: güçlü bir şifre, açık oturumların takibi ve ekip erişiminin düzenli gözden geçirilmesi.',
        keyInsight:
          'Tanımadığınız bir oturum görürseniz diğer cihazlardan çıkış yapın ve şifrenizi değiştirin; şifre değişince tüm oturumlar kapanır.',
        sections: [
          {
            title: 'Şifre',
            paragraphs: [
              '**Hesabım → Güvenlik** bölümünden şifrenizi değiştirebilirsiniz; yeni şifre en az 8 karakter olmalıdır. Şifreniz değiştiğinde güvenlik için tüm oturumlar kapanır ve size bir bildirim e-postası gelir. Başka hizmetlerde kullandığınız bir şifreyi kullanmayın.',
            ],
          },
          {
            title: 'Aktif oturumlar',
            paragraphs: [
              'Aynı bölümde hesabınızın açık olduğu cihazları ve tarayıcıları görürsünüz. Tek bir oturumu sonlandırabilir ya da **Diğer cihazlardan çıkış** ile bulunduğunuz cihaz dışındaki tüm oturumları kapatabilirsiniz. Hesabınıza yeni bir cihazdan girildiğinde de e-posta uyarısı gelir.',
            ],
          },
          {
            title: 'Ekip erişimi',
            items: [
              'Herkese işi için gereken en dar rolü verin.',
              'Ayrılan çalışanı hemen ekipten çıkarın.',
              'Ortak bir hesap paylaşmak yerine herkesi kendi e-postasıyla davet edin.',
              'Hesap etkinlik günlüğüne düzenli bakın.',
            ],
          },
        ],
        checklist: [
          'Şifre benzersiz ve en az 8 karakter.',
          'Aktif oturumlar bu ay kontrol edildi.',
          'Ayrılanlar ekipten çıkarıldı.',
          'Herkes kendi hesabıyla giriş yapıyor.',
        ],
        faq: [
          {
            q: 'İki adımlı doğrulama (2FA) var mı?',
            a: 'Şu an panelde iki adımlı doğrulama yok. Hesabınızı güçlü ve benzersiz bir şifre, oturum kontrolü ve yeni cihaz uyarılarıyla koruyun.',
          },
          {
            q: 'Buaze benden şifremi ister mi?',
            a: `Hayır. Buaze e-postayla veya telefonla şifrenizi sormaz. Böyle bir istek alırsanız bağlantıya tıklamayın ve [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine bildirin.`,
          },
          {
            q: 'Şifremi unuttum; ne yapmalıyım?',
            a: 'Giriş sayfasındaki şifre sıfırlama bağlantısını kullanın; e-posta adresinize sıfırlama bağlantısı gönderilir.',
          },
        ],
      },
    },
    en: {
      title: 'Account security: password, sessions and access',
      excerpt:
        'See and end your active sessions, change your password, watch for new-device alerts and keep team access to the narrowest role each person needs.',
      tags: ['security', 'password', 'session', 'access', 'account'],
      body: {
        lead: 'Account security comes from a few habits rather than a single setting: a strong password, keeping an eye on open sessions and reviewing team access regularly.',
        keyInsight:
          'If you see a session you do not recognise, sign out of other devices and change your password; changing the password ends all sessions.',
        sections: [
          {
            title: 'Password',
            paragraphs: [
              'You can change your password under **Account → Security**; a new password must be at least 8 characters. When your password changes, all sessions are ended for safety and you receive a notification e-mail. Do not reuse a password from another service.',
            ],
          },
          {
            title: 'Active sessions',
            paragraphs: [
              'The same section lists the devices and browsers where your account is signed in. You can end a single session, or use **Sign out other devices** to end every session except the one you are using. You also get an e-mail alert when someone signs in to your account from a new device.',
            ],
          },
          {
            title: 'Team access',
            items: [
              'Give everyone the narrowest role their job needs.',
              'Remove people who leave from the team straight away.',
              'Invite everyone with their own e-mail instead of sharing one account.',
              'Check the account activity log regularly.',
            ],
          },
        ],
        checklist: [
          'The password is unique and at least 8 characters.',
          'Active sessions were checked this month.',
          'People who left were removed from the team.',
          'Everyone signs in with their own account.',
        ],
        faq: [
          {
            q: 'Is there two-factor authentication (2FA)?',
            a: 'There is no two-factor authentication in the panel at the moment. Protect your account with a strong, unique password, session checks and new-device alerts.',
          },
          {
            q: 'Will Buaze ever ask for my password?',
            a: `No. Buaze never asks for your password by e-mail or phone. If you get such a request, do not click any link and report it to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
          },
          {
            q: 'I forgot my password. What should I do?',
            a: 'Use the password reset link on the sign-in page; a reset link is sent to your e-mail address.',
          },
        ],
      },
    },
  }),

  ...pair('security-kvkk', 30, 'export-and-pii', {
    tr: {
      title: 'Dışa aktarılan dosyalarda kişisel veri',
      excerpt:
        'Dışa aktarılan CSV’ler ve hesap veri dosyası, yorumlar ve müşteri bilgileri gibi kişisel veriler içerebilir. Bu dosyaları güvenle paylaşmak için öneriler.',
      tags: ['dışa aktarma', 'kişisel veri', 'kvkk', 'paylaşım', 'csv'],
      body: {
        lead: 'Müşteri verileri panelde rol ve işletme bazlı erişimle korunur. Bir dosya indirildiği anda bu koruma dosyayla birlikte gitmez; sorumluluk dosyayı indiren kişiye geçer.',
        keyInsight:
          'Yalnızca gerektiğinde dışa aktarın, dosyayı güvenli bir kanaldan yalnızca gereken kişiyle paylaşın ve iş bitince silin.',
        sections: [
          {
            title: 'Hangi dosyalarda kişisel veri olabilir?',
            items: [
              '**Müşteriler** dışa aktarımı: iletişim bilgisi bırakan müşterilerin adı, e-posta adresi ve telefonu.',
              '**Analitik** raporu: yorum metinleri ve KVKK onayı veren müşterilerin e-posta adresi ya da telefonu.',
              '**Yorumlar** dışa aktarımı: yorum metinleri ve masa etiketleri.',
              '**Anket ve denetim** dışa aktarımları: verilen yanıtlar.',
              '**Verilerimi indir:** hesabınızın verilerini içeren dosya (saatte bir kez indirilebilir).',
            ],
          },
          {
            title: 'Paylaşırken',
            items: [
              'Dosyayı herkese açık bir klasöre ya da genel bir mesajlaşma grubuna yüklemeyin.',
              'Mümkünse süreli ve yalnızca belirli kişilerin açabildiği bir paylaşım bağlantısı kullanın.',
              'Dosyayı kimin aldığını bir yere not edin.',
            ],
          },
          {
            title: 'Cihaz düzeni',
            paragraphs: [
              'İş bitince dosyayı silin, çöp kutusunu boşaltın ve bulut eşitleme klasörlerinde kopya kalmadığını kontrol edin. Dosyayı telefona indirdiyseniz oradan da silin.',
            ],
          },
        ],
        checklist: [
          'Dışa aktarma gerçekten gerekliydi.',
          'Dosya güvenli bir kanaldan paylaşıldı.',
          'Kimin aldığı not edildi.',
          'İş bitince dosya silindi.',
        ],
        faq: [
          {
            q: 'Bir müşteri kendi verilerini isterse ne yapmalıyım?',
            a: `Müşterinin talebini veri sorumlusu olarak siz yanıtlarsınız. Panelde bulamadığınız bir bilgi ya da bir kaydın silinmesi gerekiyorsa [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
          },
          {
            q: 'Ekip üyelerim dışa aktarma yapabilir mi?',
            a: 'Evet, erişebildikleri işletmeler için; görüntüleyici rolündeki üyeler de dosya indirebilir. Bu yüzden müşteri verisine erişimi, işletme seçimiyle yalnızca gereken kişilere verin ve dışa aktarmayı kimlerin yapacağını ekibinizle önceden konuşun.',
          },
        ],
      },
    },
    en: {
      title: 'Personal data in exported files',
      excerpt:
        'CSV exports and your account data file can contain personal data such as comments and customer details. Tips for sharing and storing these files safely.',
      tags: ['export', 'personal data', 'privacy', 'sharing', 'csv'],
      body: {
        lead: 'In the panel, customer data is protected by role- and business-based access. Once a file is downloaded, that protection does not travel with it; responsibility passes to the person who downloaded it.',
        keyInsight:
          'Export only when needed, share the file through a secure channel with only the person who needs it, and delete it when the work is done.',
        sections: [
          {
            title: 'Which files can contain personal data?',
            items: [
              'The **Customers** export: the name, e-mail address and phone number of customers who left contact details.',
              'The **Analytics** report: comments and the e-mail address or phone number of customers who gave KVKK consent.',
              'The **Reviews** export: comments and table labels.',
              '**Survey and audit** exports: the answers given.',
              '**Export my data:** the file with your account’s data (can be downloaded once an hour).',
            ],
          },
          {
            title: 'When sharing',
            items: [
              'Do not upload the file to a public folder or a general group chat.',
              'Where possible, use a share link that expires and opens only for named people.',
              'Note down who received the file.',
            ],
          },
          {
            title: 'Device hygiene',
            paragraphs: [
              'When the work is done, delete the file, empty the bin and check that no copy is left in cloud sync folders. If you downloaded it to a phone, delete it there too.',
            ],
          },
        ],
        checklist: [
          'The export was really needed.',
          'The file was shared through a secure channel.',
          'You noted who received it.',
          'The file was deleted when the work was done.',
        ],
        faq: [
          {
            q: 'What should I do if a customer asks for their data?',
            a: `As the data controller, you answer the customer’s request. If you cannot find something in the panel or a record needs to be deleted, write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
          },
          {
            q: 'Can my team members export data?',
            a: 'Yes, for the businesses they can access; members with the viewer role can download files too. So give access to businesses with customer data only to the people who need it, and agree with your team in advance who will export data.',
          },
        ],
      },
    },
  }),

  ...pair('security-kvkk', 40, 'incident-response-basics', {
    tr: {
      title: 'Hesabınızda şüpheli bir durum görürseniz',
      excerpt:
        'Tanımadığınız bir oturum, beklenmedik bir değişiklik ya da veri sızıntısı şüphesinde ilk adımlar: oturumları kapatın, şifrenizi değiştirin ve bize yazın.',
      tags: ['güvenlik olayı', 'şüpheli giriş', 'veri ihlali', 'kvkk', 'oturum'],
      body: {
        lead: 'Bir güvenlik olayında ne yapacağınızı önceden bilmek, panik içinde yanlış adım atmanızı önler. Aşağıdaki adımlar hem hesabınızı korumanıza hem de sonraki süreci doğru yürütmenize yardım eder.',
        keyInsight:
          `Önce erişimi kesin (diğer cihazlardan çıkış, şifre değişikliği, ekipten çıkarma), sonra ne olduğunu not edin ve [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
        sections: [
          {
            title: 'İlk adımlar',
            ordered: true,
            items: [
              '**Hesabım → Güvenlik** bölümünden diğer cihazlardaki oturumları kapatın.',
              'Şifrenizi değiştirin; şifre değişince tüm oturumlar kapanır.',
              'Şüphelendiğiniz bir ekip üyesi varsa ekipten çıkarın.',
              '**Hesap aktivitesi** bölümünde hangi değişikliklerin yapıldığına bakın ve not alın.',
              `Ne gördüğünüzü, ne zaman fark ettiğinizi ve hangi adımları attığınızı [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
            ],
          },
          {
            title: 'Kişisel veri etkilendiyse',
            paragraphs: [
              'Müşterilerinizin verileri için veri sorumlusu işletmenizdir. KVKK, kişisel veri ihlallerinin Kişisel Verileri Koruma Kurulu’na en kısa sürede bildirilmesini öngörür; süre ve içerik Kurul kararlarında belirlenmiştir. Bildirim gerekip gerekmediğine hukuk danışmanınızla birlikte karar verin; Buaze tarafındaki bilgiler için bize yazın. Buaze’nin kendi süreci [Veri İhlali Müdahale Politikası](/tr/veri-ihlali-mudahale) sayfasında.',
            ],
          },
          {
            title: 'Sonrasında',
            paragraphs: [
              'Olayın nedenini ve aldığınız önlemleri kısa bir notla kayda geçirin. Aynı sorunun tekrarlanmaması için ekip erişimlerini ve şifre alışkanlıklarını gözden geçirin.',
            ],
          },
        ],
        checklist: [
          'Diğer oturumlar kapatıldı.',
          'Şifre değiştirildi.',
          'Şüpheli erişimler kaldırıldı.',
          'Olay ve atılan adımlar not edildi.',
          'Buaze’ye bilgi verildi.',
        ],
        faq: [
          {
            q: 'Yeni cihaz uyarısı aldım ama giriş yapan bendim; ne yapmalıyım?',
            a: 'Bir şey yapmanız gerekmez. Uyarı, hesabınıza yeni bir cihazdan girildiğinde gönderilir.',
          },
          {
            q: 'Buaze tarafında bir olay olursa bana haber verilir mi?',
            a: 'Buaze’nin ihlal durumunda izlediği süreç ve işletmelere bildirim yükümlülükleri Veri İhlali Müdahale Politikası ve Veri İşleyici Sözleşmesi’nde açıklanır.',
          },
        ],
      },
    },
    en: {
      title: 'If something looks wrong in your account',
      excerpt:
        'First steps when you see a session you do not recognise, an unexpected change or a suspected data leak: end sessions, change your password and write to us.',
      tags: ['security incident', 'suspicious sign-in', 'data breach', 'kvkk', 'session'],
      body: {
        lead: 'Knowing in advance what to do in a security incident keeps you from taking a wrong step in a panic. The steps below help you protect your account and handle what comes next properly.',
        keyInsight:
          `First cut off access (sign out other devices, change your password, remove the team member), then note what happened and write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
        sections: [
          {
            title: 'First steps',
            ordered: true,
            items: [
              'End the sessions on other devices under **Account → Security**.',
              'Change your password; all sessions end when it changes.',
              'If you suspect a team member, remove them from the team.',
              'Look at the **Account activity** section to see which changes were made, and note them down.',
              `Write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) with what you saw, when you noticed it and which steps you took.`,
            ],
          },
          {
            title: 'If personal data is affected',
            paragraphs: [
              'Your business is the data controller for your customers’ data. KVKK requires personal data breaches to be reported to the Turkish Personal Data Protection Authority without delay; the deadline and the content of the report are set by the Authority’s decisions. Decide with your legal adviser whether a report is needed; write to us for information on Buaze’s side. Buaze’s own process is described in the [Data Breach Response Policy](/en/veri-ihlali-mudahale).',
            ],
          },
          {
            title: 'Afterwards',
            paragraphs: [
              'Record the cause of the incident and the measures you took in a short note. Review team access and password habits so the same problem does not happen again.',
            ],
          },
        ],
        checklist: [
          'Other sessions were ended.',
          'The password was changed.',
          'Suspicious access was removed.',
          'The incident and your steps were noted.',
          'Buaze was informed.',
        ],
        faq: [
          {
            q: 'I got a new-device alert but it was me signing in. What should I do?',
            a: 'Nothing. The alert is sent whenever your account is signed in from a new device.',
          },
          {
            q: 'Will I be told if something happens on Buaze’s side?',
            a: 'The process Buaze follows in a breach and its duty to notify businesses are described in the Data Breach Response Policy and the Data Processing Agreement.',
          },
        ],
      },
    },
  }),

  ...pair('security-kvkk', 50, 'data-retention-anonymization', {
    tr: {
      title: 'Veri saklama, anonimleştirme ve hesap silme',
      excerpt:
        'IP adresleri 90 gün sonra anonimleştirilir. Hesap verilerinizi indirebilir, hesabınızı 30 gün içinde geri alabileceğiniz şekilde silebilirsiniz. Ayrıntılar.',
      tags: ['veri saklama', 'anonimleştirme', 'hesap silme', 'kvkk', 'ip adresi'],
      body: {
        lead: 'Hangi verinin ne kadar süre saklandığını bilmek, hem müşterilerinize karşı şeffaf olmanızı hem de kendi saklama politikanızı yazmanızı kolaylaştırır.',
        keyInsight:
          'Müşteri IP adresleri 90 gün sonra anonimleştirilir; geri bildirimler siz silene kadar saklanır. Hesabınızı silmeyi planladığınızda 30 gün içinde vazgeçebilirsiniz.',
        sections: [
          {
            title: 'Buaze’de saklama',
            items: [
              '**IP adresleri:** geri bildirim kayıtlarındaki IP adresleri 90 gün sonra otomatik olarak anonimleştirilir.',
              '**Geri bildirimler:** işletmeniz ya da hesabınız silinene kadar saklanır.',
              '**Veritabanı:** AB’de (Frankfurt) bulunur; e-posta gönderimi ve yapay zekâ gibi hizmetlerde ABD’deki alt işleyiciler kullanılır. Liste [Veri İşleyici Sözleşmesi](/tr/veri-isleyici-sozlesmesi)’ndedir.',
            ],
          },
          {
            title: 'Verilerinizi indirme',
            paragraphs: [
              '**Hesabım** sayfasındaki **Verilerimi indir** düğmesiyle hesabınızın verilerini bir dosya olarak indirebilirsiniz; bu işlem saatte bir kez yapılabilir.',
            ],
          },
          {
            title: 'Hesabı silme',
            paragraphs: [
              'Hesabınızı **Hesabım → Güvenlik** bölümündeki **Hesabı sil** düğmesiyle silebilirsiniz; onay için hesap e-postanızı yazmanız istenir. Silme planlandığında onay e-postası gelir ve 30 gün içinde istediğiniz zaman vazgeçebilirsiniz. Süre dolduğunda hesabınız ve işletmelerinize ait geri bildirimler, QR kodları ve menüler dahil veriler silinir; yasal saklama yükümlülüğü olan fatura kayıtları kimliksizleştirilerek saklanır.',
            ],
          },
        ],
        checklist: [
          'Kendi saklama politikanız yazılı.',
          'Silmeden önce gereken raporlar indirildi.',
          'Müşteri talepleri için bir süreç belirlendi.',
        ],
        faq: [
          {
            q: 'Tek bir geri bildirimi silebilir miyim?',
            a: `Panelde tek tek geri bildirim silme düğmesi yoktur. Bir kaydın silinmesi gerekiyorsa [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) adresine yazın.`,
          },
          {
            q: 'Verilerim yalnızca AB’de mi saklanıyor?',
            a: 'Veritabanı AB’dedir (Frankfurt); bazı alt işleyiciler ABD’dedir. Tam liste Veri İşleyici Sözleşmesi’nde yer alır.',
          },
          {
            q: 'Abonelik iptali verilerimi siler mi?',
            a: 'Hayır. Verileriniz yalnızca hesabınızı ya da işletmenizi sildiğinizde silinir.',
          },
        ],
      },
    },
    en: {
      title: 'Data retention, anonymisation and account deletion',
      excerpt:
        'IP addresses are anonymised after 90 days. You can download your account data and delete your account with 30 days to change your mind. The details.',
      tags: ['data retention', 'anonymisation', 'account deletion', 'privacy', 'ip address'],
      body: {
        lead: 'Knowing which data is kept and for how long helps you be open with your customers and write your own retention policy.',
        keyInsight:
          'Customer IP addresses are anonymised after 90 days; feedback is kept until you delete it. When you schedule your account for deletion, you can change your mind within 30 days.',
        sections: [
          {
            title: 'Retention at Buaze',
            items: [
              '**IP addresses:** IP addresses in feedback records are anonymised automatically after 90 days.',
              '**Feedback:** kept until your business or your account is deleted.',
              '**Database:** located in the EU (Frankfurt); some services, such as e-mail delivery and AI, use sub-processors in the US. The list is in the [Data Processing Agreement](/en/veri-isleyici-sozlesmesi).',
            ],
          },
          {
            title: 'Downloading your data',
            paragraphs: [
              'Use **Export my data** on the **Account** page to download your account’s data as a file; this can be done once an hour.',
            ],
          },
          {
            title: 'Deleting your account',
            paragraphs: [
              'You can delete your account with **Delete account** under **Account → Security**; to confirm, you type your account e-mail. When deletion is scheduled, you receive a confirmation e-mail and can cancel at any time within 30 days. After that, your account and your businesses’ data, including feedback, QR codes and menus, are deleted; invoice records that must be kept by law are kept with personal details removed.',
            ],
          },
        ],
        checklist: [
          'Your own retention policy is written down.',
          'Reports you need were downloaded before deleting.',
          'There is a process for customer requests.',
        ],
        faq: [
          {
            q: 'Can I delete a single piece of feedback?',
            a: `The panel has no button for deleting individual feedback. If a record needs to be deleted, write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
          },
          {
            q: 'Is my data stored only in the EU?',
            a: 'The database is in the EU (Frankfurt); some sub-processors are in the US. The full list is in the Data Processing Agreement.',
          },
          {
            q: 'Does cancelling my subscription delete my data?',
            a: 'No. Your data is deleted only when you delete your account or your business.',
          },
        ],
      },
    },
  }),
];

/* ------------------------------------------------------------------ */
/* Lookups                                                              */
/* ------------------------------------------------------------------ */

/**
 * Curated cross-topic list shown on the hub under "Önce bunları okuyun".
 * Editorial choice, not popularity (there is no view-count data).
 * quick-start is not here because the hub already features it in the
 * "Başlarken" card.
 */
export const HELP_START_HERE_SLUGS = [
  'redirect-threshold',
  'google-review-link',
  'qr-placement-guide',
  'handle-negative-feedback',
] as const;

const CATEGORY_RANK = new Map(HELP_CATEGORIES.map((category, index) => [category.slug, index]));

function byCategoryThenOrder(a: { category: string; order: number }, b: { category: string; order: number }) {
  const rank = (CATEGORY_RANK.get(a.category) ?? 99) - (CATEGORY_RANK.get(b.category) ?? 99);
  return rank || a.order - b.order;
}

export function getStaticHelpArticles(locale: Locale, category?: string) {
  return STATIC_HELP_ARTICLES.filter(
    (article) => article.locale === locale && (!category || article.category === category),
  ).sort(byCategoryThenOrder);
}

export function getStaticHelpArticle(locale: Locale, slug: string) {
  return STATIC_HELP_ARTICLES.find((article) => article.locale === locale && article.slug === slug) ?? null;
}

export function getStaticHelpCategoryCounts(locale: Locale) {
  const counts: Record<string, number> = {};
  for (const article of STATIC_HELP_ARTICLES) {
    if (article.locale !== locale) continue;
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }
  return counts;
}

/** Text a static article is searched by: title, excerpt, tags, headings, summary and FAQ questions. */
export function helpArticleSearchText(article: StaticHelpArticle): string {
  const struct = article.bodyStruct;
  const parts = [article.title, article.excerpt, ...article.searchTags];
  if (struct) {
    parts.push(inlineToPlain(struct.keyInsight ?? ''));
    for (const section of struct.sections) parts.push(section.title);
    for (const item of struct.faq) parts.push(item.q);
  }
  return normalizeHelpSearchText(parts.join(' '));
}

/**
 * Every word of the query must appear somewhere in the article text.
 * Title matches rank first; ties keep the category order.
 */
export function searchStaticHelpArticles(locale: Locale, query: string, take = 30) {
  const words = helpQueryWords(query);
  if (words.length === 0) return [];
  return getStaticHelpArticles(locale)
    .map((article) => {
      const score = scoreHelpMatch(words, helpArticleSearchText(article), normalizeHelpSearchText(article.title));
      return score === null ? null : { article, score };
    })
    .filter((hit): hit is { article: StaticHelpArticle; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((hit) => hit.article);
}
