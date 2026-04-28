/* Mock data for the prototype */

const NOW = new Date('2026-04-26');

const PERSONAS = {
  restaurant: {
    name: 'Karaköy Lokantası',
    type: 'restaurant',
    typeLabel: { tr: 'Restoran', en: 'Restaurant' },
    locations: 3,
    userName: 'Ayşe Demir',
    userInitial: 'A',
    userRole: { tr: 'İşletme Sahibi', en: 'Owner' },
    address: 'Kemankeş Cd. No:32, Karaköy, İstanbul',
    phone: '+90 212 555 0142',
    primaryPlatform: 'google',
  },
  clinic: {
    name: 'Vita Estetik Klinik',
    type: 'clinic',
    typeLabel: { tr: 'Klinik', en: 'Clinic' },
    locations: 1,
    userName: 'Dr. Mehmet Yıldız',
    userInitial: 'M',
    userRole: { tr: 'Klinik Sahibi', en: 'Owner' },
    address: 'Bağdat Cd. No:114, Caddebostan, İstanbul',
    phone: '+90 216 555 0218',
    primaryPlatform: 'google',
  },
  salon: {
    name: 'Lume Beauty',
    type: 'salon',
    typeLabel: { tr: 'Güzellik Salonu', en: 'Beauty Salon' },
    locations: 2,
    userName: 'Selin Aksoy',
    userInitial: 'S',
    userRole: { tr: 'İşletme Sahibi', en: 'Owner' },
    address: 'Teşvikiye Cd. No:88, Nişantaşı, İstanbul',
    phone: '+90 212 555 0394',
    primaryPlatform: 'google',
  },
};

const PLAN_DEFAULT = {
  label: 'GROWTH PLAN',
  quotaLabel: { tr: 'Yorum kotan', en: 'Review quota' },
  quotaValue: '847 / 2000',
  progress: 42,
  cta: { tr: 'Planı yönet', en: 'Manage plan' },
};

const PLAN_ADMIN = {
  label: 'SUPERADMIN',
  quotaLabel: { tr: 'Sistem erişimi', en: 'System access' },
  quotaValue: { tr: 'Tam erişim', en: 'Full access' },
  cta: { tr: 'Sistem ayarları', en: 'System settings' },
};

const STATS_OWNER = {
  totalReviews: 847,
  avgRating: 4.6,
  scans: 2340,
  redirects: 612,
  lowRated: 51,
  newWeek: 73,
};

/* 7-day trend (scans, ratings) */
const TREND_7D = [
  { d: 'Pzt', scans: 240, rating: 4.5 },
  { d: 'Sal', scans: 312, rating: 4.6 },
  { d: 'Çar', scans: 278, rating: 4.4 },
  { d: 'Per', scans: 410, rating: 4.7 },
  { d: 'Cum', scans: 525, rating: 4.7 },
  { d: 'Cmt', scans: 348, rating: 4.5 },
  { d: 'Paz', scans: 227, rating: 4.6 },
];

/* Star distribution */
const STAR_DIST = [
  { star: 5, count: 612, pct: 72 },
  { star: 4, count: 184, pct: 22 },
  { star: 3, count: 28, pct: 3 },
  { star: 2, count: 14, pct: 2 },
  { star: 1, count: 9, pct: 1 },
];

/* Recent feedbacks */
const FEEDBACKS = [
  { id: 'fb1', name: 'Burak K.', email: 'burak***@gmail.com', phone: '+90 53* *** 1842', rating: 5, comment: 'Yemekler harikaydı, özellikle ezogelin çorbası nefisti. Servis çok ilgili. Kesinlikle tekrar geleceğim.', branch: 'Karaköy', table: 12, source: 'qr', platform: 'google', redirected: true, kvkk: true, marketing: true, time: '2 saat önce', timeEn: '2h ago' },
  { id: 'fb2', name: 'Elif S.', email: 'elifsoy***@hotmail.com', phone: '+90 55* *** 0291', rating: 2, comment: 'Servis çok yavaştı, garson kibar değildi. Yemekler soğumuştu. İlgilenmenizi rica ederim.', branch: 'Karaköy', table: 4, source: 'qr', platform: null, redirected: false, kvkk: true, marketing: false, internal: true, time: '5 saat önce', timeEn: '5h ago', priority: 'high' },
  { id: 'fb3', name: 'Hakan M.', email: null, phone: null, rating: 5, comment: 'Mükemmel akşam yemeği deneyimi. Şefe selamlar.', branch: 'Beşiktaş', table: 8, source: 'qr', platform: 'google', redirected: true, kvkk: true, marketing: false, time: '8 saat önce', timeEn: '8h ago' },
  { id: 'fb4', name: 'Cemre A.', email: 'cemre***@yandex.com', phone: null, rating: 4, comment: 'Genel olarak güzeldi, sadece tatlılar biraz daha çeşitlenebilir.', branch: 'Karaköy', table: 16, source: 'qr', platform: 'google', redirected: true, kvkk: true, marketing: true, time: '1 gün önce', timeEn: '1d ago' },
  { id: 'fb5', name: 'Mert D.', email: null, phone: '+90 53* *** 8123', rating: 1, comment: 'Hijyen koşullarından memnun kalmadım. Bardak temiz değildi.', branch: 'Bostancı', table: 22, source: 'qr', platform: null, redirected: false, kvkk: true, marketing: false, internal: true, time: '1 gün önce', timeEn: '1d ago', priority: 'critical' },
  { id: 'fb6', name: 'Fatma Y.', email: 'fatmaa***@gmail.com', phone: null, rating: 5, comment: 'İçeride çok temizdi, ışıklandırma da çok hoştu. Tekrar geleceğim.', branch: 'Karaköy', table: 6, source: 'qr', platform: 'google', redirected: true, kvkk: true, marketing: true, time: '2 gün önce', timeEn: '2d ago' },
  { id: 'fb7', name: 'Ozan K.', email: null, phone: null, rating: 3, comment: 'Fiyatlar biraz yüksek bence ama yemekler güzeldi.', branch: 'Beşiktaş', table: 9, source: 'qr', platform: null, redirected: false, kvkk: true, marketing: false, internal: true, time: '3 gün önce', timeEn: '3d ago' },
];

/* QR codes */
const QR_CODES = [
  { id: 'qr1', name: 'Karaköy — Genel', branch: 'Karaköy', platform: null, scans: 1240, lastScan: '2 saat önce', lastScanEn: '2h ago', created: '15 Şub 2026', status: 'active' },
  { id: 'qr2', name: 'Karaköy — Google', branch: 'Karaköy', platform: 'google', scans: 624, lastScan: '4 saat önce', lastScanEn: '4h ago', created: '15 Şub 2026', status: 'active' },
  { id: 'qr3', name: 'Karaköy — Yemeksepeti', branch: 'Karaköy', platform: 'yemeksepeti', scans: 187, lastScan: '12 saat önce', lastScanEn: '12h ago', created: '15 Şub 2026', status: 'active' },
  { id: 'qr4', name: 'Beşiktaş — Genel', branch: 'Beşiktaş', platform: null, scans: 412, lastScan: '6 saat önce', lastScanEn: '6h ago', created: '20 Şub 2026', status: 'active' },
  { id: 'qr5', name: 'Bostancı — Genel', branch: 'Bostancı', platform: null, scans: 89, lastScan: '2 gün önce', lastScanEn: '2d ago', created: '5 Mar 2026', status: 'active' },
  { id: 'qr6', name: 'Pop-up — Mart', branch: 'Etkinlik', platform: 'google', scans: 0, lastScan: null, lastScanEn: null, created: '12 Nis 2026', status: 'paused' },
];

/* Review platforms configured */
const REVIEW_PLATFORMS = [
  { id: 'google', enabled: true, isDefault: true, url: 'https://g.page/r/karakoy-lokantasi/review', verified: true, monthlyClicks: 412 },
  { id: 'yemeksepeti', enabled: true, isDefault: false, url: 'https://yemeksepeti.com/restaurant/karakoy-lokantasi/review', verified: true, monthlyClicks: 87 },
  { id: 'tripadvisor', enabled: true, isDefault: false, url: 'https://tripadvisor.com/Restaurant_Review-karakoy', verified: false, monthlyClicks: 23 },
  { id: 'getir', enabled: false, isDefault: false, url: '', verified: false, monthlyClicks: 0 },
  { id: 'trendyol', enabled: false, isDefault: false, url: '', verified: false, monthlyClicks: 0 },
];

/* Menu data */
const MENU_CATEGORIES = [
  { id: 'c1', name: 'Başlangıçlar', items: 8, views: 1240, clicks: 420 },
  { id: 'c2', name: 'Çorbalar', items: 4, views: 612, clicks: 312 },
  { id: 'c3', name: 'Ana Yemekler', items: 12, views: 2480, clicks: 1280 },
  { id: 'c4', name: 'Tatlılar', items: 6, views: 920, clicks: 320 },
  { id: 'c5', name: 'İçecekler', items: 14, views: 1840, clicks: 540 },
];

const MENU_ITEMS = [
  { id: 'm1', cat: 'c3', name: 'Karaköy Köfte', desc: 'El yapımı dana köfte, közlenmiş biber, pilav', price: 285, views: 412, clicks: 187, trend: 'up' },
  { id: 'm2', cat: 'c3', name: 'Levrek Buğulama', desc: 'Taze ege levreği, mevsim sebzeleri', price: 420, views: 312, clicks: 142, trend: 'up' },
  { id: 'm3', cat: 'c2', name: 'Ezogelin Çorbası', desc: 'Klasik ezogelin, tereyağı, nane', price: 95, views: 248, clicks: 98, trend: 'up' },
  { id: 'm4', cat: 'c1', name: 'Mezeler Tabağı', desc: 'Humus, haydari, fava, atom', price: 220, views: 184, clicks: 64, trend: 'flat' },
  { id: 'm5', cat: 'c4', name: 'Künefe', desc: 'Antep fıstıklı künefe, kaymak ile', price: 135, views: 142, clicks: 32, trend: 'down' },
  { id: 'm6', cat: 'c3', name: 'Hünkar Beğendi', desc: 'Süzme yoğurtla, kuzu eti, közlenmiş patlıcan', price: 380, views: 89, clicks: 21, trend: 'down' },
];

/* Admin: businesses */
const BUSINESSES = [
  { id: 'b1', name: 'Karaköy Lokantası', type: 'restaurant', owner: 'Ayşe Demir', email: 'ayse@karakoy-lok.com', plan: 'growth', status: 'active', kvkk: true, locations: 3, reviews: 847, joined: '15 Şub 2026', city: 'İstanbul', avg: 4.6 },
  { id: 'b2', name: 'Vita Estetik Klinik', type: 'clinic', owner: 'Dr. M. Yıldız', email: 'mehmet@vita-estetik.com', plan: 'pro', status: 'active', kvkk: true, locations: 1, reviews: 412, joined: '3 Mar 2026', city: 'İstanbul', avg: 4.9 },
  { id: 'b3', name: 'Lume Beauty', type: 'salon', owner: 'Selin Aksoy', email: 'selin@lumebeauty.com', plan: 'starter', status: 'active', kvkk: true, locations: 2, reviews: 234, joined: '12 Mar 2026', city: 'İstanbul', avg: 4.7 },
  { id: 'b4', name: 'Anadolu Kebap', type: 'restaurant', owner: 'Hasan Çelik', email: 'hasan@anadolukebap.com', plan: 'trial', status: 'active', kvkk: false, locations: 1, reviews: 18, joined: '20 Nis 2026', city: 'Ankara', avg: 4.2 },
  { id: 'b5', name: 'Dr. Smile Diş', type: 'clinic', owner: 'Dr. E. Kaya', email: 'ekaya@drsmile.com', plan: 'growth', status: 'paused', kvkk: true, locations: 2, reviews: 312, joined: '8 Şub 2026', city: 'İzmir', avg: 4.8 },
  { id: 'b6', name: 'Berber Cem', type: 'salon', owner: 'Cem Öztürk', email: 'cem@berbercem.com', plan: 'starter', status: 'active', kvkk: true, locations: 1, reviews: 142, joined: '1 Nis 2026', city: 'Bursa', avg: 4.5 },
  { id: 'b7', name: 'Café Mira', type: 'restaurant', owner: 'Mira Y.', email: 'mira@cafemira.com', plan: 'trial', status: 'active', kvkk: false, locations: 1, reviews: 4, joined: '24 Nis 2026', city: 'İstanbul', avg: 5.0 },
  { id: 'b8', name: 'Vega Spa', type: 'salon', owner: 'B. Aslan', email: 'baslan@vegaspa.com', plan: 'pro', status: 'active', kvkk: true, locations: 4, reviews: 589, joined: '2 Şub 2026', city: 'Antalya', avg: 4.6 },
];

const ADMIN_STATS = {
  businesses: 128,
  activeBusinesses: 119,
  monthlyReviews: 14820,
  totalScans: 89412,
  trialActive: 23,
  paidActive: 96,
  mrr: '₺142,400',
};

const ANNOUNCEMENTS = [
  { id: 'a1', title: 'Buaze Pro: Yapay zeka destekli yorum özetleri', body: 'Pro planda artık AI ile yorumların duygu analizini ve haftalık özetini görebilirsiniz.', published: '20 Nis 2026', audience: 'pro,growth', status: 'active' },
  { id: 'a2', title: 'Yeni: Trendyol GO entegrasyonu', body: 'Trendyol GO\'ya yönlendirme artık doğrulanmış platformlar listesinde.', published: '14 Nis 2026', audience: 'all', status: 'active' },
  { id: 'a3', title: 'Bakım — 28 Nisan 03:00–05:00', body: 'Veritabanı yükseltmesi için kısa bir kesinti yaşanabilir.', published: '24 Nis 2026', audience: 'all', status: 'scheduled' },
];

const BLOG_POSTS = [
  { id: 'p1', title: '5 yıldız almak için işletmenizin yapması gereken 7 şey', author: 'Buaze Editor', published: '18 Nis 2026', status: 'published', views: 2840 },
  { id: 'p2', title: 'Google Maps yorumlarınızı 3 katına çıkarmanın yolu', author: 'Buaze Editor', published: '8 Nis 2026', status: 'published', views: 4120 },
  { id: 'p3', title: 'KVKK uyumlu müşteri geri bildirimi nasıl toplanır?', author: 'Hukuk Ekibi', published: '1 Nis 2026', status: 'published', views: 1620 },
  { id: 'p4', title: 'Restoranlar için QR menü trendleri 2026', author: 'Buaze Editor', published: null, status: 'draft', views: 0 },
];

Object.assign(window, {
  PERSONAS, PLAN_DEFAULT, PLAN_ADMIN,
  STATS_OWNER, TREND_7D, STAR_DIST,
  FEEDBACKS, QR_CODES, REVIEW_PLATFORMS,
  MENU_CATEGORIES, MENU_ITEMS,
  BUSINESSES, ADMIN_STATS, ANNOUNCEMENTS, BLOG_POSTS,
});
