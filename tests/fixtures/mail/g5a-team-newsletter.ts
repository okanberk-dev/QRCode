// g5a — team & newsletter mails (team-invite, team-member-joined,
// team-member-removed, newsletter, owner-segment-mail).
import { renderTeamInvite } from '../../../src/lib/email/templates/team-invite';
import { renderTeamMemberJoined } from '../../../src/lib/email/templates/team-member-joined';
import { renderTeamMemberRemoved } from '../../../src/lib/email/templates/team-member-removed';
import { renderNewsletter, type NewsletterPost } from '../../../src/lib/email/templates/newsletter';
import { renderOwnerSegmentMail } from '../../../src/lib/email/templates/owner-segment-mail';
import {
  APP_URL,
  LONG_COMMENT,
  LONG_EMAIL,
  LONG_NAME,
  LONG_URL,
  LONG_WORD,
  type MailFixture,
  type MailFixtureLocale,
} from './_env';

const TEAM_URL = `${APP_URL}/tr/dashboard/account?section=team`;
const ACCEPT_URL = `${APP_URL}/tr/accept-invite?token=3f9a1c7e5b2d4a60b8e1c9d7a4f2e6b0c1d3a5e7f9b2c4d6e8a0b1c3d5e7f9a1`;
const UNSUB_URL = `${APP_URL}/api/newsletter/unsubscribe?token=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718`;

// Role labels are passed in already localised by the callers (team routes).
const role = (locale: MailFixtureLocale, kind: 'manager' | 'staff' | 'viewer' = 'manager'): string => {
  const tr = { manager: 'Yönetici', staff: 'Personel', viewer: 'Görüntüleyici' };
  const en = { manager: 'Manager', staff: 'Staff', viewer: 'Viewer' };
  return (locale === 'en' ? en : tr)[kind];
};

const LONG_ROLE = 'Bölge Operasyon ve Müşteri Deneyimi Yöneticisi (Çok Şubeli)';
const SEVEN_DIGITS = '1.234.567';

// Hostile free text: every user-controlled field must stay inert (see
// tests/mail-g5a-injection.test.ts). The title payload targets the <title> and
// preheader sinks in pulseLayout.
export const INJECT_TITLE = '</title><b id="INJ">x</b>';
export const INJECT_TAG = '<img src=x onerror=1>';

export const FIXTURES_G5A: MailFixture[] = [
  // ── team-invite ──────────────────────────────────────────────────────
  {
    id: 'team-invite',
    template: 'team-invite',
    render: async (locale) =>
      renderTeamInvite(
        {
          name: 'Ayşe Kaya',
          ownerName: 'Mert Demir',
          restaurantNames: ['Kadıköy Bistro', 'Moda Kahve Dükkanı'],
          roleLabel: role(locale),
          acceptUrl: ACCEPT_URL,
          expiresInDays: 7,
        },
        locale,
      ),
  },
  {
    id: 'team-invite:stress',
    template: 'team-invite',
    stress: true,
    render: async (locale) =>
      renderTeamInvite(
        {
          name: LONG_WORD,
          ownerName: LONG_NAME,
          restaurantNames: [
            LONG_NAME,
            `${LONG_WORD} Şubesi`,
            'Moda Kahve Dükkanı',
            'Beşiktaş Çarşı Dönercisi',
            'Cihangir Meyhanesi & Balık Evi',
            'Bebek Sahil Kafe',
            'Karaköy Lokantası',
            'Nişantaşı Pastanesi ve Kahve Evi',
          ],
          roleLabel: LONG_ROLE,
          acceptUrl: LONG_URL,
          expiresInDays: 14,
        },
        locale,
      ),
  },
  {
    id: 'team-invite:all-locations',
    template: 'team-invite',
    render: async (locale) =>
      renderTeamInvite(
        {
          name: null,
          ownerName: 'Zeynep Arslan',
          restaurantNames: [],
          roleLabel: role(locale, 'staff'),
          acceptUrl: ACCEPT_URL,
        },
        locale,
      ),
  },
  {
    id: 'team-invite:one-day',
    template: 'team-invite',
    render: async (locale) =>
      renderTeamInvite(
        {
          name: 'Can Öztürk',
          ownerName: 'Mert Demir',
          restaurantNames: ['Kadıköy Bistro'],
          roleLabel: role(locale, 'viewer'),
          acceptUrl: ACCEPT_URL,
          expiresInDays: 1,
        },
        locale,
      ),
  },

  {
    id: 'team-invite:inject',
    template: 'team-invite',
    render: async (locale) =>
      renderTeamInvite(
        {
          name: INJECT_TAG,
          ownerName: INJECT_TITLE,
          restaurantNames: [INJECT_TAG, 'Kadıköy Bistro'],
          roleLabel: INJECT_TITLE,
          acceptUrl: `${APP_URL}/tr/accept-invite?token=abc"><script>1</script>`,
        },
        locale,
      ),
  },
  {
    id: 'team-invite:two-days',
    template: 'team-invite',
    render: async (locale) =>
      renderTeamInvite(
        {
          name: 'Elif Şahin',
          ownerName: 'Mert Demir',
          restaurantNames: ['Kadıköy Bistro', 'Moda Kahve Dükkanı', 'Nişantaşı Pastanesi ve Kahve Evi'],
          roleLabel: role(locale, 'staff'),
          acceptUrl: ACCEPT_URL,
          expiresInDays: 2,
        },
        locale,
      ),
  },

  // ── team-member-joined ───────────────────────────────────────────────
  {
    id: 'team-member-joined',
    template: 'team-member-joined',
    render: (locale) =>
      renderTeamMemberJoined(
        {
          ownerName: 'Mert',
          memberName: 'Ayşe Kaya',
          roleLabel: role(locale),
          locationNames: ['Kadıköy Bistro', 'Moda Kahve Dükkanı'],
          teamUrl: TEAM_URL,
        },
        locale,
      ),
  },
  {
    id: 'team-member-joined:stress',
    template: 'team-member-joined',
    stress: true,
    render: (locale) =>
      renderTeamMemberJoined(
        {
          ownerName: LONG_NAME,
          memberName: LONG_EMAIL,
          roleLabel: LONG_ROLE,
          locationNames: [LONG_NAME, `${LONG_WORD} Şubesi`, 'Moda Kahve Dükkanı', 'Bebek Sahil Kafe', 'Karaköy Lokantası'],
          teamUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'team-member-joined:all-locations',
    template: 'team-member-joined',
    render: (locale) =>
      renderTeamMemberJoined(
        {
          ownerName: null,
          memberName: 'Can Öztürk',
          roleLabel: role(locale, 'staff'),
          locationNames: null,
          teamUrl: TEAM_URL,
        },
        locale,
      ),
  },

  {
    id: 'team-member-joined:long-names',
    template: 'team-member-joined',
    render: (locale) =>
      renderTeamMemberJoined(
        {
          ownerName: 'Mert',
          memberName: 'Mehmet Ali Yıldırım-Özkaya',
          roleLabel: locale === 'en' ? 'Regional Operations Manager' : 'Bölge Operasyon Yöneticisi',
          locationNames: ['Balıkçı Ahmet Usta Ürünleri', 'Ünlü Oğulları Lokantası', 'Nişantaşı Pastanesi ve Kahve Evi'],
          teamUrl: TEAM_URL,
        },
        locale,
      ),
  },
  {
    id: 'team-member-joined:inject',
    template: 'team-member-joined',
    render: (locale) =>
      renderTeamMemberJoined(
        {
          ownerName: INJECT_TAG,
          memberName: INJECT_TITLE,
          roleLabel: INJECT_TITLE,
          locationNames: [INJECT_TAG],
          teamUrl: `${TEAM_URL}"><script>1</script>`,
        },
        locale,
      ),
  },

  // ── team-member-removed ──────────────────────────────────────────────
  {
    id: 'team-member-removed',
    template: 'team-member-removed',
    render: (locale) =>
      renderTeamMemberRemoved(
        {
          ownerName: 'Mert',
          memberName: 'Ayşe Kaya',
          memberEmail: 'ayse.kaya@kadikoybistro.co',
          roleLabel: role(locale),
          teamUrl: TEAM_URL,
        },
        locale,
      ),
  },
  {
    id: 'team-member-removed:stress',
    template: 'team-member-removed',
    stress: true,
    render: (locale) =>
      renderTeamMemberRemoved(
        {
          ownerName: LONG_NAME,
          memberName: LONG_WORD,
          memberEmail: LONG_EMAIL,
          roleLabel: LONG_ROLE,
          teamUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'team-member-removed:no-owner',
    template: 'team-member-removed',
    render: (locale) =>
      renderTeamMemberRemoved(
        {
          ownerName: null,
          memberName: 'Can Öztürk',
          memberEmail: 'can@kadikoybistro.co',
          roleLabel: role(locale, 'viewer'),
          teamUrl: TEAM_URL,
        },
        locale,
      ),
  },

  {
    id: 'team-member-removed:inject',
    template: 'team-member-removed',
    render: (locale) =>
      renderTeamMemberRemoved(
        {
          ownerName: INJECT_TAG,
          memberName: INJECT_TITLE,
          memberEmail: INJECT_TITLE,
          roleLabel: INJECT_TITLE,
          teamUrl: `${TEAM_URL}"><script>1</script>`,
        },
        locale,
      ),
  },

  // ── newsletter ───────────────────────────────────────────────────────
  {
    id: 'newsletter',
    template: 'newsletter',
    render: (locale) => renderNewsletter({ issueNumber: 4, posts: POSTS, unsubscribeUrl: UNSUB_URL }, locale),
  },
  {
    id: 'newsletter:stress',
    template: 'newsletter',
    stress: true,
    render: (locale) =>
      renderNewsletter(
        {
          issueNumber: 12,
          featured: {
            title: `${LONG_NAME}: ${LONG_WORD}`,
            excerpt: LONG_COMMENT,
            url: LONG_URL,
            category: 'Çok Uzun Bir Kategori Adı',
            readMinutes: 123,
          },
          posts: STRESS_POSTS,
          stats: [
            { value: SEVEN_DIGITS, label: 'toplam yorum, çok uzun bir açıklama' },
            { value: '+1.842%', label: LONG_WORD },
            { value: '%96,4', label: 'sessiz kalır' },
          ],
          unsubscribeUrl: LONG_URL,
          exploreUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'newsletter:with-stats',
    template: 'newsletter',
    render: (locale) =>
      renderNewsletter(
        {
          issueNumber: 5,
          posts: POSTS,
          stats: [
            { value: '%96', label: 'sessiz kalır' },
            { value: '+184%', label: 'organik yorum' },
            { value: '1,4 sn', label: 'ortalama yanıt' },
          ],
          unsubscribeUrl: UNSUB_URL,
        },
        locale,
      ),
  },
  {
    id: 'newsletter:two-stats',
    template: 'newsletter',
    render: (locale) =>
      renderNewsletter(
        {
          issueNumber: 6,
          posts: POSTS.slice(0, 3),
          stats: [
            { value: '12.480', label: 'yanıtlanan yorum' },
            { value: '4,7', label: 'ortalama puan' },
          ],
          unsubscribeUrl: UNSUB_URL,
        },
        locale,
      ),
  },
  {
    id: 'newsletter:custom',
    template: 'newsletter',
    render: (locale) =>
      renderNewsletter(
        {
          issueNumber: 7,
          posts: POSTS,
          customSubject: 'Pulse #07 — Yaz sezonu için hazır mısın?',
          customTitle: 'Yaz sezonunda yorumlarını nasıl yönetirsin?',
          customIntro: 'Turist yoğunluğu arttığında yorum hacmi iki katına çıkıyor. Bu sayıda sezonu rahat geçirmen için üç pratik anlattık.',
          unsubscribeUrl: UNSUB_URL,
        },
        locale,
      ),
  },
  {
    id: 'newsletter:single-post',
    template: 'newsletter',
    render: (locale) =>
      renderNewsletter({ issueNumber: 8, posts: POSTS.slice(0, 1), unsubscribeUrl: UNSUB_URL }, locale),
  },
  {
    id: 'newsletter:explicit-featured',
    template: 'newsletter',
    render: (locale) =>
      renderNewsletter(
        {
          featured: { ...POSTS[0], excerpt: null, readMinutes: null, category: null },
          posts: [{ title: 'Kısa başlık', url: `${APP_URL}/tr/blog/kisa`, excerpt: null }],
          unsubscribeUrl: UNSUB_URL,
        },
        locale,
      ),
  },
  {
    id: 'newsletter:no-posts',
    template: 'newsletter',
    render: (locale) => renderNewsletter({ issueNumber: 9, posts: [], unsubscribeUrl: UNSUB_URL }, locale),
  },

  {
    id: 'newsletter:inject',
    template: 'newsletter',
    render: (locale) =>
      renderNewsletter(
        {
          issueNumber: 10,
          posts: [{ title: INJECT_TAG, excerpt: INJECT_TITLE, url: `${APP_URL}/tr/blog/x"><script>1</script>`, category: INJECT_TAG }],
          customSubject: INJECT_TITLE,
          customTitle: INJECT_TAG,
          customIntro: INJECT_TAG,
          unsubscribeUrl: UNSUB_URL,
        },
        locale,
      ),
  },

  // ── owner-segment-mail ───────────────────────────────────────────────
  {
    id: 'owner-segment-mail',
    template: 'owner-segment-mail',
    render: async (locale) =>
      renderOwnerSegmentMail(
        {
          subject: locale === 'en' ? 'New: monthly health report is live' : 'Yeni: aylık sağlık raporu yayında',
          body:
            locale === 'en'
              ? 'We have shipped the monthly health report for every connected business.\n\nWhat changes for you:\n- One score that combines profile, replies and reputation\n- A short list of the five most valuable next steps\n- A comparison with your first month on Buaze\n\nOpen the panel and the Google Reviews page to see yours. Reply to this mail if anything looks off.'
              : 'Bağlı her işletme için aylık sağlık raporunu yayına aldık.\n\nSenin için değişenler:\n- Profil, yanıt ve itibarı birleştiren tek bir skor\n- En değerli beş sonraki adımın kısa listesi\n- Buaze’deki ilk ayınla karşılaştırma\n\nPaneli ve Google Yorumları sayfasını açıp kendi raporunu görebilirsin. Bir şey yanlış görünürse bu maile yanıt ver.',
          ownerName: 'Mert',
        },
        locale,
      ),
  },
  {
    id: 'owner-segment-mail:stress',
    template: 'owner-segment-mail',
    stress: true,
    render: async (locale) =>
      renderOwnerSegmentMail(
        {
          subject: `${LONG_NAME} için önemli bir güncelleme ve çok uzun bir konu satırı ${LONG_WORD}`,
          body: `${LONG_COMMENT}\n\n${LONG_URL}\n\n${LONG_EMAIL}\n\n1.\n2.\n3.\n\n${LONG_WORD}`,
          ownerName: LONG_NAME,
          appUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'owner-segment-mail:inject',
    template: 'owner-segment-mail',
    render: async (locale) =>
      renderOwnerSegmentMail(
        {
          subject: INJECT_TITLE,
          body: `${INJECT_TAG}\n\n- ${INJECT_TAG}\n- ${INJECT_TITLE}`,
          ownerName: INJECT_TAG,
          appUrl: `${APP_URL}/tr/dashboard"><script>1</script>`,
        },
        locale,
      ),
  },
  {
    id: 'owner-segment-mail:no-name',
    template: 'owner-segment-mail',
    render: async (locale) =>
      renderOwnerSegmentMail(
        {
          subject: '',
          body: locale === 'en' ? 'Short heads-up: scheduled maintenance tonight 02:00-02:30.' : 'Kısa bilgi: bu gece 02:00-02:30 arası planlı bakım var.',
          ownerName: null,
        },
        locale,
      ),
  },
];

const POSTS: NewsletterPost[] = [
  {
    title: 'Pulse AI 2.0: ses tonun, makinen.',
    excerpt: 'Yeni model, marka diline göre fine-tune ediliyor. Türkçe hassasiyeti belirgin biçimde arttı.',
    url: `${APP_URL}/tr/blog/pulse-ai-2`,
    category: 'Ürün',
    readMinutes: 12,
  },
  {
    title: "Kadıköy Bistro 6 ayda nasıl 4,2'den 4,7'ye çıktı",
    excerpt: 'Yorum yönetimi pratiği ve Google rehberi.',
    url: `${APP_URL}/tr/blog/kadikoy-vakasi`,
    category: 'Vaka',
    readMinutes: 8,
  },
  {
    title: '2026 Q1 yorum davranış raporu',
    excerpt: '12.000 yorum, 4 sektör, 1 net çıkarım.',
    url: `${APP_URL}/tr/blog/q1-rapor`,
    category: 'Veri',
    readMinutes: 6,
  },
  {
    title: 'Düşük puanlı yorumlar: tehdit mi, fırsat mı?',
    excerpt: 'Pulse ekibinden bir görüş yazısı.',
    url: `${APP_URL}/tr/blog/dusuk-puan`,
    category: 'Görüş',
    readMinutes: 7,
  },
  {
    title: 'QR menüde sezon geçişi: 10 dakikada nasıl güncellenir',
    excerpt: null,
    url: `${APP_URL}/tr/blog/qr-menu-sezon`,
    category: 'Rehber',
  },
];

const STRESS_POSTS: NewsletterPost[] = [
  {
    title: `${LONG_NAME} neden her ay yorum sayısını ikiye katlıyor ve bunu nasıl yapıyor`,
    excerpt: LONG_COMMENT,
    url: LONG_URL,
    category: 'Çok Uzun Bir Kategori Adı',
    readMinutes: 123,
  },
  {
    title: LONG_WORD,
    excerpt: LONG_WORD,
    url: LONG_URL,
    category: LONG_WORD,
    readMinutes: 9,
  },
  { title: 'Kısa', excerpt: null, url: LONG_URL, category: null },
  {
    title: 'Dördüncü yazı: çok uzun bir başlık ve çok uzun bir açıklama ile satır sonu davranışı',
    excerpt: 'Bu yazı, mobil ekranda başlığın ve açıklamanın birden fazla satıra yayıldığı durumu kontrol etmek için yazıldı.',
    url: LONG_URL,
    category: 'Rehber',
    readMinutes: 15,
  },
  { title: 'Beşinci yazı (listede gösterilmez)', excerpt: 'x', url: LONG_URL, category: 'Test', readMinutes: 1 },
];
