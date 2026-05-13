/**
 * CLAUDE.md §42 — Denetim Merkezi seed runner (shared helper).
 *
 * Hem `scripts/seed-audit-templates.ts` (CLI) hem `/api/admin/audits/seed`
 * (admin trigger) bu helper'ı çağırır. Self-fetch antipattern YASAK
 * (CLAUDE.md §21.13) — admin endpoint'i fetch(${appUrl}/api/cron/...)
 * yerine `runAuditSeed()` doğrudan invoke eder.
 *
 * Idempotency:
 *   • Kategoriler: `upsert by slug` — labelTr/labelEn/sector/iconKey/order
 *     her seed çağrısında güncellenir.
 *   • Şablonlar: `findFirst(restaurantId=null, title, createdBy='seed') +
 *     update or create`. Title değişirse seed YENİ satır oluşturur
 *     (eski admin-edited satır intact kalır — CLAUDE.md §21.26 mail seed
 *     paterni: "code default'larına dön").
 *   • Sorular: full replace — `deleteMany({ templateId }) + recreate`.
 *     Operatör template title'ı korumuşsa seed sorularını günceller;
 *     title değiştirmişse seed yeni template + yeni soru seti açar.
 *
 * Kapsam (Stage 100): 18 kategori (6 sektör × 3) + 25 global şablon +
 * ~120 soru. Mevcut PR #644 öncesi 5 kategori + 8 şablon içeriği korunur,
 * üzerine 13 kategori + 17 şablon eklenir.
 */

import { prisma } from '@/lib/prisma';

type AuditSectorLiteral = 'food' | 'hotel' | 'retail' | 'health' | 'beauty' | 'other';

type SeedCategory = {
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: AuditSectorLiteral;
  iconKey: string;
  order: number;
};

type SeedQuestion = {
  type: 'single' | 'multi' | 'scale' | 'text' | 'yes_no';
  prompt: string;
  helpText?: string;
  options?: string[];
  correctAnswer?: string | string[] | number;
  weight?: number;
  isRequired?: boolean;
};

type SeedTemplate = {
  // Internal mark — DB column değil; closure log + debug için.
  slug: string;
  categorySlug: string;
  title: string;
  description: string;
  sector: AuditSectorLiteral;
  scoringMode: 'percentage' | 'weighted' | 'pass_fail';
  passingScore?: number;
  locale: 'tr';
  questions: SeedQuestion[];
};

const CATEGORIES: SeedCategory[] = [
  // Food (mevcut, korunur)
  { slug: 'hiring-quiz', labelTr: 'İşe Alım Quiz', labelEn: 'Hiring Quiz', sector: 'food', iconKey: 'UserPlus', order: 10 },
  { slug: 'operations-daily', labelTr: 'Günlük Operasyon', labelEn: 'Daily Operations', sector: 'food', iconKey: 'ClipboardCheck', order: 20 },
  { slug: 'safety-hygiene', labelTr: 'Güvenlik & Hijyen', labelEn: 'Safety & Hygiene', sector: 'food', iconKey: 'HandPlatter', order: 30 },

  // Hotel (mevcut 1 + yeni 2)
  { slug: 'service-training', labelTr: 'Hizmet Eğitimi', labelEn: 'Service Training', sector: 'hotel', iconKey: 'GraduationCap', order: 110 },
  { slug: 'housekeeping-daily', labelTr: 'Günlük Kat Hizmeti', labelEn: 'Daily Housekeeping', sector: 'hotel', iconKey: 'Bed', order: 120 },
  { slug: 'reception-flow', labelTr: 'Resepsiyon Akışı', labelEn: 'Reception Flow', sector: 'hotel', iconKey: 'Bell', order: 130 },

  // Retail (yeni 3)
  { slug: 'cashier-quiz', labelTr: 'Kasiyer Quiz', labelEn: 'Cashier Quiz', sector: 'retail', iconKey: 'ScanLine', order: 210 },
  { slug: 'store-walkthrough', labelTr: 'Mağaza Turu', labelEn: 'Store Walkthrough', sector: 'retail', iconKey: 'Store', order: 220 },
  { slug: 'stock-merchandising', labelTr: 'Stok & Sergileme', labelEn: 'Stock & Merchandising', sector: 'retail', iconKey: 'Package', order: 230 },

  // Health (yeni 3)
  { slug: 'patient-experience', labelTr: 'Hasta Deneyimi', labelEn: 'Patient Experience', sector: 'health', iconKey: 'HeartPulse', order: 310 },
  { slug: 'clinic-hygiene', labelTr: 'Klinik Hijyeni', labelEn: 'Clinic Hygiene', sector: 'health', iconKey: 'Stethoscope', order: 320 },
  { slug: 'kvkk-medical', labelTr: 'KVKK Sağlık', labelEn: 'KVKK Medical', sector: 'health', iconKey: 'ShieldCheck', order: 330 },

  // Beauty (yeni 3)
  { slug: 'salon-hygiene', labelTr: 'Salon Hijyeni', labelEn: 'Salon Hygiene', sector: 'beauty', iconKey: 'Scissors', order: 410 },
  { slug: 'staff-skill', labelTr: 'Personel Beceri', labelEn: 'Staff Skill', sector: 'beauty', iconKey: 'Sparkles', order: 420 },
  { slug: 'appointment-flow', labelTr: 'Randevu Akışı', labelEn: 'Appointment Flow', sector: 'beauty', iconKey: 'CalendarClock', order: 430 },

  // Other (mevcut 1 + yeni 2)
  { slug: 'compliance-kvkk', labelTr: 'KVKK & Uyum', labelEn: 'KVKK & Compliance', sector: 'other', iconKey: 'Shield', order: 510 },
  { slug: 'customer-experience', labelTr: 'Müşteri Deneyimi', labelEn: 'Customer Experience', sector: 'other', iconKey: 'Smile', order: 520 },
  { slug: 'staff-onboarding', labelTr: 'Personel Oryantasyon', labelEn: 'Staff Onboarding', sector: 'other', iconKey: 'Users', order: 530 },
];

const TEMPLATES: SeedTemplate[] = [
  // ============================================================
  // FOOD (mevcut 4 + yeni 1)
  // ============================================================
  {
    slug: 'fb-hiring-basics',
    categorySlug: 'hiring-quiz',
    title: 'F&B yeni eleman temel quiz',
    description:
      'Restoran/kafe başvuru sahipleri için temel hijyen, müşteri ilişkisi ve servis bilgisi değerlendirmesi.',
    sector: 'food',
    scoringMode: 'pass_fail',
    passingScore: 70,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Çiğ ve pişmiş gıdaları aynı tezgâhta hazırlamak güvenli midir?',
        options: ['Evet, sorun yok', 'Hayır, asla', 'Sadece eldiven varsa', 'Yıkanırsa olur'],
        correctAnswer: 'Hayır, asla',
        weight: 2,
      },
      {
        type: 'single',
        prompt: 'Bir müşteri yemeğin soğuk geldiğini söylerse ilk yapman gereken nedir?',
        options: [
          'Mutfağı hemen suçla',
          'Özür dile ve sıcak alternatif teklif et',
          'İndirim öner',
          'Başka masaya işaretle',
        ],
        correctAnswer: 'Özür dile ve sıcak alternatif teklif et',
      },
      {
        type: 'multi',
        prompt: 'Servise başlamadan önce kontrol etmen gerekenler hangileri? (Birden fazla seçilebilir)',
        options: ['Üniforma temizliği', 'Tırnak ve saç hijyeni', 'Sosyal medya hesabı', 'Masa düzeni'],
        correctAnswer: ['Üniforma temizliği', 'Tırnak ve saç hijyeni', 'Masa düzeni'],
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Müşteriye ürünün içeriği sorulursa "bilmiyorum" demek kabul edilebilir mi?',
        correctAnswer: 'Hayır',
      },
      {
        type: 'text',
        prompt: 'Acil durumda (yangın, müşteri rahatsızlığı) ilk yapacağın 1 cümlede yaz.',
        isRequired: true,
      },
    ],
  },
  {
    slug: 'fb-hiring-advanced',
    categorySlug: 'hiring-quiz',
    title: 'Şef / kıdemli garson değerlendirme',
    description:
      'Kıdemli pozisyon adayları için menü bilgisi, alerji yönetimi ve müşteri itirazı senaryosu.',
    sector: 'food',
    scoringMode: 'weighted',
    passingScore: 75,
    locale: 'tr',
    questions: [
      {
        type: 'multi',
        prompt: 'Yasal alerjen listesinde olan ana 8 madde hangileri?',
        options: ['Süt', 'Yumurta', 'Domates', 'Yer fıstığı', 'Soya', 'Buğday/gluten', 'Balık', 'Kabuklu deniz ürünleri', 'Soğan'],
        correctAnswer: ['Süt', 'Yumurta', 'Yer fıstığı', 'Soya', 'Buğday/gluten', 'Balık', 'Kabuklu deniz ürünleri'],
        weight: 3,
      },
      {
        type: 'scale',
        prompt: 'Menüdeki en pahalı 3 yemeği hangi gramaj/içerikle açıklayabileceğin güveni (1=zayıf, 5=mükemmel)',
        correctAnswer: 4,
        weight: 2,
      },
      {
        type: 'single',
        prompt: 'Müşteri "bu yemekte fındık var mı?" diye sorduğunda kesinlikle hangisini yaparsın?',
        options: [
          'Tahmin et, çoğunda yok',
          'Şefe danış, sonra cevap ver',
          'Kart üzerinde alerjen ikonuna bak',
          'Şefe danış VE alerjen ikonunu kontrol et',
        ],
        correctAnswer: 'Şefe danış VE alerjen ikonunu kontrol et',
        weight: 3,
      },
      {
        type: 'text',
        prompt: 'Düşük puanlı bir Google yorumu gördüğünde takım olarak ilk 3 aksiyonunuz?',
        isRequired: true,
      },
      {
        type: 'yes_no',
        prompt: 'Stok bittiğinde menüden silmek müşteriye söylemek için yeterli midir?',
        correctAnswer: 'Hayır',
      },
    ],
  },
  {
    slug: 'daily-kitchen-checklist',
    categorySlug: 'operations-daily',
    title: 'Günlük mutfak açılış kontrol listesi',
    description:
      'Servis öncesi mutfak ekibi için temizlik, ekipman ve gıda hazırlığı kontrolü. Her gün doldurulması önerilir.',
    sector: 'food',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Buzdolabı sıcaklıkları 0-4°C aralığında kayıtlı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Tezgâh ve kesme tahtaları dezenfekte edildi mi?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'El yıkama lavabosunda sabun + kâğıt havlu mevcut mu?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Stok rotasyonu (FIFO) takip ediliyor mu?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Yangın söndürücü ve acil çıkış görünür ve erişilebilir mi?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Bugün dikkat edilmesi gereken özel bir durum varsa not düş.', isRequired: false },
    ],
  },
  {
    slug: 'weekly-cleanliness',
    categorySlug: 'operations-daily',
    title: 'Haftalık derin temizlik denetimi',
    description:
      'Yönetici/şube müdürü tarafından haftada bir doldurulur. Skor 80 altında düşerse aksiyon planı tetiklenir.',
    sector: 'food',
    scoringMode: 'percentage',
    passingScore: 80,
    locale: 'tr',
    questions: [
      { type: 'scale', prompt: 'Mutfak zemini ve sifon temizliği', correctAnswer: 4 },
      { type: 'scale', prompt: 'Davlumbaz filtreleri', correctAnswer: 4 },
      { type: 'scale', prompt: 'Tuvaletler (müşteri + personel)', correctAnswer: 5 },
      { type: 'scale', prompt: 'Salon ve oturma alanı', correctAnswer: 4 },
      { type: 'scale', prompt: 'Depo + soğuk hava düzeni (FIFO etiket)', correctAnswer: 4 },
      { type: 'text', prompt: 'Bu hafta için iyileştirme önerin?', isRequired: false },
    ],
  },
  {
    slug: 'fb-service-scenario',
    categorySlug: 'safety-hygiene',
    title: 'Servis personeli senaryo testi',
    description:
      'Aktif servis personeli için pratik müşteri senaryoları — itiraz, alerji, hız ve hijyen anlık değerlendirmesi.',
    sector: 'food',
    scoringMode: 'percentage',
    passingScore: 70,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Yoğun saatte 4 kişilik bir masa "siparişimiz 30 dk geçti" derse ilk söylediğin?',
        options: [
          'Mutfak yoğun, biraz daha bekleyin',
          'Özür dile, somut bir süre ver ve geri dön',
          'Siparişiniz hazırlanıyor olmalı',
          'Yöneticiyi çağırırım',
        ],
        correctAnswer: 'Özür dile, somut bir süre ver ve geri dön',
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Müşteri "glutensiz var mı?" sorarsa şefi onaylamadan kendi kararınla cevap verebilir misin?',
        correctAnswer: 'Hayır',
        weight: 2,
      },
      {
        type: 'multi',
        prompt: 'Yemek üzerine yabancı bir madde (saç, böcek vb.) gelirse hangi adımları takip edersin?',
        options: [
          'Yemeği hemen geri al',
          'Özür dile ve yenisini ücretsiz hazırlatacağını söyle',
          'Yöneticiyi bilgilendir',
          'Mutfağı suçla',
          'Olayı kayıt al (saat + masa + tarif)',
        ],
        correctAnswer: [
          'Yemeği hemen geri al',
          'Özür dile ve yenisini ücretsiz hazırlatacağını söyle',
          'Yöneticiyi bilgilendir',
          'Olayı kayıt al (saat + masa + tarif)',
        ],
        weight: 2,
      },
      {
        type: 'scale',
        prompt: 'Vardiya başı kendi hijyen kontrolün — eldiven, üniforma, takı (1=eksik, 5=tam) kaç?',
        correctAnswer: 5,
      },
      {
        type: 'text',
        prompt: 'Bu hafta yaşadığın bir müşteri itirazını + verdiğin yanıtı 2 cümlede yaz.',
        isRequired: true,
      },
    ],
  },

  // ============================================================
  // HOTEL (mevcut 1 + yeni 3)
  // ============================================================
  {
    slug: 'hotel-reception-training',
    categorySlug: 'service-training',
    title: 'Otel resepsiyon — temel eğitim quiz',
    description:
      'Yeni resepsiyon görevlileri için check-in, müşteri itirazı ve KVKK uyumu içeren ön değerlendirme.',
    sector: 'hotel',
    scoringMode: 'pass_fail',
    passingScore: 70,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Check-in sırasında kimlik fotokopisi alınabilir mi?',
        options: [
          'Evet, her zaman',
          'Hayır, sadece gözle kontrol',
          'Sadece kayıt kanununun gerektirdiği bilgileri ve KVKK aydınlatması ile',
          'Konaklayan istemediği sürece alınır',
        ],
        correctAnswer: 'Sadece kayıt kanununun gerektirdiği bilgileri ve KVKK aydınlatması ile',
        weight: 2,
      },
      {
        type: 'single',
        prompt: 'Misafir odasında bir şikâyet bildirdiğinde ideal cevap?',
        options: [
          'Hata bizde değil',
          'Hemen geliyorum, çözüm için seçenekleri sıralıyorum',
          'Yarın çözeriz',
          'Yöneticiye yönlendir, ben halledemem',
        ],
        correctAnswer: 'Hemen geliyorum, çözüm için seçenekleri sıralıyorum',
      },
      {
        type: 'multi',
        prompt: 'Erken check-in talebinde dikkat edilmesi gerekenler? (Birden fazla)',
        options: [
          'Odanın hazır olup olmadığı',
          "Misafirin sadakat tier'ı",
          'Müsait alternatif oda',
          'Üst yöneticiye sormadan asla onaylamamak',
          'Tahsil edilecek ek ücret bilgisi',
        ],
        correctAnswer: ['Odanın hazır olup olmadığı', 'Müsait alternatif oda', 'Tahsil edilecek ek ücret bilgisi'],
      },
      {
        type: 'yes_no',
        prompt: 'Misafir Wi-Fi şifresini telefonla başka bir misafire iletmek uygun mu?',
        correctAnswer: 'Hayır',
      },
      {
        type: 'text',
        prompt: 'VIP misafir geldiğinde ön hazırlık olarak yapacağın 3 şeyi yaz.',
        isRequired: true,
      },
    ],
  },
  {
    slug: 'hotel-housekeeping-daily',
    categorySlug: 'housekeeping-daily',
    title: 'Kat hizmetleri günlük açılış kontrolü',
    description:
      'Vardiya başında ekip lideri tarafından doldurulur. Her oda toplam puanı ortalamasından sapma çıkarsa müdahale.',
    sector: 'hotel',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Tüm temizlik arabaları stoklu (havlu, set, deterjan)?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Personel KVKK uyumlu üniforma + kimlik kartı taşıyor mu?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Koridorların genel temizlik ve kokusu (1=zayıf, 5=mükemmel)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Kullanılmış çarşaf/havlu ayrı arabalarda mı toplanıyor?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Yangın kaçış kapıları kapalı ve önü engelsiz mi?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Bugün özel olarak rapor etmen gereken bir oda/koridor var mı?', isRequired: false },
    ],
  },
  {
    slug: 'hotel-breakfast-service',
    categorySlug: 'service-training',
    title: 'Açık büfe kahvaltı servisi açılış quiz',
    description:
      'Restoran sorumlusu için açık büfe açılış öncesi gıda güvenliği ve sunum kontrol noktaları.',
    sector: 'hotel',
    scoringMode: 'pass_fail',
    passingScore: 75,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Sıcak yemekler için minimum sunum sıcaklığı nedir?',
        options: ['45°C', '55°C', '63°C', '75°C'],
        correctAnswer: '63°C',
        weight: 2,
      },
      {
        type: 'single',
        prompt: 'Buz ile sunulan ürünlerin (yoğurt, peynir) maksimum yüzey sıcaklığı?',
        options: ['4°C', '8°C', '10°C', '12°C'],
        correctAnswer: '4°C',
        weight: 2,
      },
      {
        type: 'multi',
        prompt: 'Açık büfede alerjen tanıtımı için kabul edilen yöntemler? (Birden fazla)',
        options: [
          'Ürün önüne küçük alerjen ikonu yerleştirmek',
          'Aşçıdan sözlü teyit etmek',
          'Ürün listesini kasiyere yazılı vermek',
          'Tahmin etmek',
        ],
        correctAnswer: ['Ürün önüne küçük alerjen ikonu yerleştirmek', 'Ürün listesini kasiyere yazılı vermek'],
      },
      {
        type: 'yes_no',
        prompt: 'Aynı maşa hem domuz hem helal et için kullanılabilir mi?',
        correctAnswer: 'Hayır',
      },
      {
        type: 'text',
        prompt: 'Açılış yarım saat öncesinde kontrol ettiğin 3 ana noktayı yaz.',
        isRequired: true,
      },
    ],
  },
  {
    slug: 'hotel-checkout-flow',
    categorySlug: 'reception-flow',
    title: 'Check-out süreç değerlendirme',
    description:
      'Misafir ayrılırken yaşanan deneyimi resepsiyon temsilcisi gözünden değerlendir — son izlenim, online yorum tetikleyicisidir.',
    sector: 'hotel',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Misafirden ekstra hizmetler (mini-bar, spa) sözlü teyit alındı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Fatura misafire gönderilmeden önce kontrol edildi mi?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Misafirin ayrılış anındaki memnuniyet hissi (1=mutsuz, 5=memnun)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Misafire Google/TripAdvisor yorum davetiyesi (QR/kart) sunuldu mu?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Misafir ayrılırken yaptığı sözlü yorumdan akılda kalan bir cümle?', isRequired: false },
    ],
  },

  // ============================================================
  // RETAIL (mevcut 1 + yeni 3)
  // ============================================================
  {
    slug: 'retail-cashier-quiz',
    categorySlug: 'cashier-quiz',
    title: 'Perakende kasiyer adayı quiz',
    description:
      'Perakende mağazaları için kasiyer adaylarına yönelik müşteri ilişkisi, iade politikası ve dolandırıcılık farkındalığı.',
    sector: 'retail',
    scoringMode: 'pass_fail',
    passingScore: 70,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: '14 günlük yasal cayma hakkı her ürün için geçerli midir?',
        options: [
          'Evet, her ürün',
          'Hayır, sadece online satışlarda',
          'Hayır, hijyenik ürünler ve özel sipariş için istisnalar var',
          'Sadece kredi kartıyla ödenenler',
        ],
        correctAnswer: 'Hayır, hijyenik ürünler ve özel sipariş için istisnalar var',
      },
      {
        type: 'single',
        prompt: 'Bir müşteri yüksek tutarda nakit ödeme yaparken hangi durumda kuşkulanırsın?',
        options: [
          'Her zaman temiz',
          'Banknotlar yıpranmışsa',
          'Banknotların seri numarası ardışıksa veya sahte güvenlik özellikleri varsa',
          'Sadece çok yaşlı görünen kişiler getirirse',
        ],
        correctAnswer: 'Banknotların seri numarası ardışıksa veya sahte güvenlik özellikleri varsa',
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'POS makinesinin şifresini başka bir personele sözlü olarak iletmek uygun mudur?',
        correctAnswer: 'Hayır',
      },
      {
        type: 'multi',
        prompt: 'Vardiya kapanışında sayım sırasında kontrol etmen gerekenler?',
        options: ['Z raporu', 'Nakit + kart toplamı', 'Sosyal medya postları', 'İade fişleri', 'Ürün stok eksiği'],
        correctAnswer: ['Z raporu', 'Nakit + kart toplamı', 'İade fişleri', 'Ürün stok eksiği'],
      },
      {
        type: 'text',
        prompt: 'Bir müşteri öfkeyle "yöneticini istiyorum" derse ilk verdiğin 1 cümlelik yanıt?',
        isRequired: true,
      },
    ],
  },
  {
    slug: 'retail-store-opening',
    categorySlug: 'store-walkthrough',
    title: 'Mağaza açılış öncesi tur kontrolü',
    description:
      'Mağaza müdürü/vardiya sorumlusu için açılıştan 30 dk önce yapılır — mağaza müşteriye hazır mı?',
    sector: 'retail',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Vitrin aydınlatması ve manken sunumu güncel kampanya ile uyumlu mu?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Kasalardaki bozuk para + poşet stok yeterli mi?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Genel mağaza zemini ve raf düzeni (1=dağınık, 5=kusursuz)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Müzik sistemi marka playlist ile çalışıyor mu?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Acil çıkış + yangın söndürücü erişilebilir mi?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Bugün için özel olarak hazırladığın bir kampanya/promo varsa kısaca yaz.', isRequired: false },
    ],
  },
  {
    slug: 'retail-stock-weekly',
    categorySlug: 'stock-merchandising',
    title: 'Haftalık stok sayım kontrol listesi',
    description:
      'Mağaza müdürü için haftada bir doldurulur. Kayıp oranı (shrinkage) trendini takip eder.',
    sector: 'retail',
    scoringMode: 'percentage',
    passingScore: 80,
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Tüm yüksek değerli ürünler (elektronik, parfüm) güvenli alan/etiketle sayıldı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Sayım sırasında 2 kişi (sayım + onay) sistemi uygulandı mı?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Gerçekleşen sayımla sistem stoğu arasındaki uyum (1=büyük fark, 5=tam uyum)', correctAnswer: 5 },
      { type: 'yes_no', prompt: 'Eksik bulunan ürünler için kamera kaydı / fiş incelemesi yapıldı mı?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'En büyük fark çıkan kategoriyi ve yaklaşık değerini yaz.', isRequired: true },
    ],
  },
  {
    slug: 'retail-customer-complaint',
    categorySlug: 'cashier-quiz',
    title: 'Müşteri itirazı senaryo değerlendirme',
    description:
      'Saha personeli için pratik müşteri itirazı senaryoları — iade, garanti, ürün kusuru.',
    sector: 'retail',
    scoringMode: 'pass_fail',
    passingScore: 70,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Müşteri "ürün açıldı ama bozuk çıktı" derse ilk adımın?',
        options: [
          'Hemen para iadesi yap',
          'Ürünü inceleyip, açıklama isteyip yöneticiye sorumlu olduğum sınırı sor',
          'İade alınmaz de',
          'Sosyal medyada paylaşırsa yap',
        ],
        correctAnswer: 'Ürünü inceleyip, açıklama isteyip yöneticiye sorumlu olduğum sınırı sor',
        weight: 2,
      },
      {
        type: 'multi',
        prompt: 'Bir müşteri fiyat itirazı yaparsa hangi seçenekleri sunabilirsin? (Birden fazla)',
        options: [
          'Aktif kampanya/kupon kontrolü',
          'Sadakat tier indirimi',
          'Rakip fiyat eşleştirme (varsa politika)',
          'Otomatik %50 indirim',
        ],
        correctAnswer: [
          'Aktif kampanya/kupon kontrolü',
          'Sadakat tier indirimi',
          'Rakip fiyat eşleştirme (varsa politika)',
        ],
      },
      {
        type: 'yes_no',
        prompt: '14 günden sonraki iadelerde her durumda "imkansız" demek doğru mu?',
        correctAnswer: 'Hayır',
      },
      {
        type: 'text',
        prompt: 'Geçen ay yaşadığın bir itirazı + çözümünü 2 cümlede yaz.',
        isRequired: true,
      },
    ],
  },

  // ============================================================
  // HEALTH (yeni 4)
  // ============================================================
  {
    slug: 'health-welcome-experience',
    categorySlug: 'patient-experience',
    title: 'Klinik karşılama deneyimi değerlendirme',
    description:
      'Hasta klinikten ayrılmadan önce ön büro / sekreter doldurur. Düşük puan operasyonel iyileştirme tetikler.',
    sector: 'health',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'scale', prompt: 'Hastanın bekleme süresi memnuniyeti (1=uzun, 5=hızlı)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Resepsiyon hekim/hizmet bilgisini net olarak hastaya açıkladı mı?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Klinik bekleme alanı temizlik + konforu', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Hastaya randevu sonrası takip kanalı (telefon/WhatsApp) bilgisi verildi mi?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Hasta ayrılırken sözlü olarak söylediği bir geri bildirim varsa yaz.', isRequired: false },
    ],
  },
  {
    slug: 'health-sterilization-daily',
    categorySlug: 'clinic-hygiene',
    title: 'Sterilizasyon & hijyen günlük kontrolü',
    description:
      'Klinik açılışı / vardiya değişimi öncesi sterilizasyon sorumlusu doldurur. Yetkin kişi imzası ile arşivlenir.',
    sector: 'health',
    scoringMode: 'percentage',
    passingScore: 90,
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Otoklav günlük çalışma kaydı (Bowie-Dick veya benzer) yapıldı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Tek kullanımlık eldiven + maske stoku yeterli mi?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Tıbbi atık konteynerleri ayrıştırılmış ve etiketli mi?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Muayene odası genel hijyeni (yüzey + zemin)', correctAnswer: 5 },
      { type: 'yes_no', prompt: 'El antiseptiği her muayene odasında erişilebilir mi?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Bugün özel ihtiyaç (sterilize edilmesi gereken ek ekipman) yaz.', isRequired: false },
    ],
  },
  {
    slug: 'health-kvkk-self-check',
    categorySlug: 'kvkk-medical',
    title: 'KVKK hasta verisi öz-denetim',
    description:
      'Klinik yöneticisi / veri sorumlusu için aylık doldurulur. Sağlık verisi özel nitelikli, ihlal cezası ağır.',
    sector: 'health',
    scoringMode: 'pass_fail',
    passingScore: 85,
    locale: 'tr',
    questions: [
      {
        type: 'yes_no',
        prompt: 'Hasta dosyaları (fiziksel) kilitli dolapta + sadece yetkili erişimi mi var?',
        correctAnswer: 'Evet',
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Dijital sistem (HBYS/CRM) için kişiye özel kullanıcı + log var mı?',
        correctAnswer: 'Evet',
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Hasta için ayrı KVKK aydınlatma metni (sağlık verisi vurgulu) imzalanıyor mu?',
        correctAnswer: 'Evet',
        weight: 2,
      },
      {
        type: 'single',
        prompt: 'Bir hasta WhatsApp ile rapor istediğinde yapılacak doğru aksiyon?',
        options: [
          'Hızlıca gönder',
          'Şifreli kanal (e-Devlet, sağlam mail) öneririz',
          'Tüm raporu fotoğrafla',
          'Akrabasına da gönder',
        ],
        correctAnswer: 'Şifreli kanal (e-Devlet, sağlam mail) öneririz',
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Veri ihlali (sızıntı, kayıp dosya) durumunda 72 saatte KVKK\'ya bildirim planınız belgeli mi?',
        correctAnswer: 'Evet',
      },
      {
        type: 'text',
        prompt: 'Son 30 günde aydınlatma metnini güncellediğin alanı / tarihi yaz.',
        isRequired: true,
      },
    ],
  },
  {
    slug: 'health-staff-behavior',
    categorySlug: 'patient-experience',
    title: 'Hemşire / asistan davranış quiz',
    description:
      'Yeni hemşire / asistan adayları için iletişim, hasta mahremiyeti ve acil durum protokol değerlendirmesi.',
    sector: 'health',
    scoringMode: 'pass_fail',
    passingScore: 75,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Hasta yanında başka bir hasta hakkında konuşabilir misin?',
        options: ['Evet, normal sohbet', 'Hayır, asla', 'Sadece ad belirtmezsen', 'İlgili hastanın izniyle'],
        correctAnswer: 'Hayır, asla',
        weight: 2,
      },
      {
        type: 'multi',
        prompt: 'Hasta odasında dikkat etmen gerekenler? (Birden fazla)',
        options: [
          'Kapıyı vurmadan girmemek',
          'Hastaya kendini tanıtmak',
          'Cep telefonuyla fotoğraf çekmemek',
          'Yapacağın işlemi açıklamak',
          'Akşam neye gideceğinden bahsetmek',
        ],
        correctAnswer: [
          'Kapıyı vurmadan girmemek',
          'Hastaya kendini tanıtmak',
          'Cep telefonuyla fotoğraf çekmemek',
          'Yapacağın işlemi açıklamak',
        ],
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Hasta acil durum yaşadığında ilk olarak doktoru çağırmadan hareket başlatabilir misin?',
        correctAnswer: 'Evet',
      },
      {
        type: 'text',
        prompt: 'Bir hastanın "bekleme uzun" şikayetine 1 cümlelik empatik yanıtın?',
        isRequired: true,
      },
    ],
  },

  // ============================================================
  // BEAUTY (mevcut 1 + yeni 3)
  // ============================================================
  {
    slug: 'beauty-salon-hygiene',
    categorySlug: 'salon-hygiene',
    title: 'Güzellik salonu hijyen kontrolü',
    description:
      'Saç, cilt, kuaför ve manikür işlemleri için günlük/seans-arası hijyen ve sterilizasyon kontrolü.',
    sector: 'beauty',
    scoringMode: 'percentage',
    passingScore: 85,
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Tek kullanımlık aletler (ataç, törpü) her müşteri için ayrı mı kullanılıyor?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Metal aletler otoklav/UV ile sterilize ediliyor mu?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Personel her seansta eldiven değiştiriyor mu?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Çalışma alanı temizliği (yıkama lavabosu, koltuk)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Kimyasal ürünler (boya, sökücü) etiketli ve havalandırmalı alanda mı saklanıyor?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Müşteri alerjik reaksiyon yaşarsa adım adım ne yaparsın?', isRequired: true },
    ],
  },
  {
    slug: 'beauty-appointment-weekly',
    categorySlug: 'appointment-flow',
    title: 'Haftalık randevu doğruluğu denetimi',
    description:
      'Resepsiyon sorumlusu için haftada bir doldurulur. Randevu gecikme ortalaması müşteri puanını doğrudan etkiler.',
    sector: 'beauty',
    scoringMode: 'percentage',
    passingScore: 80,
    locale: 'tr',
    questions: [
      { type: 'scale', prompt: 'Randevu saatine uyum oranı (1=sık gecikme, 5=tam dakika)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Randevu hatırlatma SMS/WhatsApp 24 saat önceden gönderildi mi?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'No-show veya geç gelen müşteri için politika personele net mi?', correctAnswer: 'Evet' },
      { type: 'multi', prompt: 'Bu hafta gecikme sebepleri arasında hangileri vardı?', options: ['Önceki seansın uzaması', 'Personel rotasyonu', 'Sistem hatası', 'Müşteri kaynaklı', 'Yok'], correctAnswer: ['Yok'] },
      { type: 'text', prompt: 'Müşteri itirazına yol açan en sık şikayeti yaz.', isRequired: false },
    ],
  },
  {
    slug: 'beauty-master-self-assessment',
    categorySlug: 'staff-skill',
    title: 'Usta beceri öz-değerlendirme',
    description:
      'Kuaför / cilt uzmanı / kalıcı makyaj ustası kendisini değerlendirir. Yöneticiyle birlikte gelişim planı için.',
    sector: 'beauty',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'scale', prompt: 'Müşteri brifini (istek + saç tipi + alerji) tam alabilme güvenin', correctAnswer: 4 },
      { type: 'scale', prompt: 'Yeni trend ve teknikleri takip etme sıklığın', correctAnswer: 4 },
      { type: 'scale', prompt: 'Beklenmedik müşteri itirazına anında çözüm üretebilme', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Son 6 ayda sertifikalı bir eğitim aldın mı?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'Önümüzdeki ay öğrenmek istediğin 1 teknik ya da ürün?', isRequired: true },
    ],
  },
  {
    slug: 'beauty-consultation-flow',
    categorySlug: 'appointment-flow',
    title: 'Müşteri konsültasyon akışı quiz',
    description:
      'Yeni cilt/kalıcı uygulama operatörleri için konsültasyon süreci, alerji testi ve sonuç beklentisi senaryoları.',
    sector: 'beauty',
    scoringMode: 'pass_fail',
    passingScore: 75,
    locale: 'tr',
    questions: [
      {
        type: 'single',
        prompt: 'Yeni bir kalıcı makyaj randevusunda konsültasyon hangi adımla başlamalı?',
        options: [
          'Hemen uygulamaya geç',
          'Müşterinin son 30 günde aldığı ilaç + alerji geçmişini sor',
          'Sadece fiyat anlat',
          'Önce fotoğraf çek',
        ],
        correctAnswer: 'Müşterinin son 30 günde aldığı ilaç + alerji geçmişini sor',
        weight: 2,
      },
      {
        type: 'yes_no',
        prompt: 'Yama testi (patch test) zorunlu mu? Müşteri istemese de uygulamak doğru mu?',
        correctAnswer: 'Evet',
        weight: 2,
      },
      {
        type: 'multi',
        prompt: 'Müşterinin "fotoğraftaki gibi olsun" talebine cevap olarak hangi seçenekler doğru? (Birden fazla)',
        options: [
          'Müşterinin saç/cilt tipiyle uyumlu olup olmadığı netleştir',
          'Olası riskleri yaz',
          'Direkt "elbette" de',
          'Beklenti yönetimi için olası farkları görsel ile paylaş',
        ],
        correctAnswer: [
          'Müşterinin saç/cilt tipiyle uyumlu olup olmadığı netleştir',
          'Olası riskleri yaz',
          'Beklenti yönetimi için olası farkları görsel ile paylaş',
        ],
      },
      {
        type: 'text',
        prompt: 'Müşteri sonucu beğenmezse ilk 24 saatte yapacağın 1 aksiyonu yaz.',
        isRequired: true,
      },
    ],
  },

  // ============================================================
  // OTHER (mevcut 1 + yeni 2)
  // ============================================================
  {
    slug: 'kvkk-self-check',
    categorySlug: 'compliance-kvkk',
    title: 'KVKK öz-denetim (işletme)',
    description:
      'İşletmenin KVKK uyum durumunu kendi başına değerlendirmesi için kısa kontrol listesi. Hukukçu yerine geçmez — durum tespiti aracıdır.',
    sector: 'other',
    scoringMode: 'percentage',
    passingScore: 75,
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'KVKK aydınlatma metniniz görünür bir yerde (web sitesi + QR menü) yayında mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Müşteri verilerini topladığınızda açık rıza alıyor musunuz?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Personel KVKK eğitimi belgeli olarak yapıldı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: "VERBİS'e kayıtlı veya muafiyet kapsamında olduğunuzu biliyor musunuz?", correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Sızıntı durumunda 72 saat içinde KVKK kuruluna bildirme planınız var mı?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'En son güncel KVKK aydınlatma metni tarihini yazın.', isRequired: false },
    ],
  },
  {
    slug: 'cx-weekly-summary',
    categorySlug: 'customer-experience',
    title: 'Müşteri deneyimi haftalık özet',
    description:
      'İşletme sahibi / şube yöneticisi için Pazartesi sabahı doldurulur — geçen haftanın yorumlarına bakarak operasyonel resmi çıkar.',
    sector: 'other',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'scale', prompt: 'Bu haftaki Google/Yemeksepeti ortalama puanı (1=2.0 altı, 5=4.5 üzeri)', correctAnswer: 4 },
      { type: 'yes_no', prompt: 'Düşük puanlı yorumlara 48 saat içinde yanıt verildi mi?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Müşteri itirazı / iade isteği sayısının haftalık trendi (1=arttı, 5=azaldı)', correctAnswer: 4 },
      { type: 'multi', prompt: 'Bu hafta en çok bahsedilen 2 olumlu tema?', options: ['Hız', 'Personel ilgisi', 'Lezzet / kalite', 'Temizlik', 'Fiyat-değer', 'Atmosfer'], correctAnswer: ['Personel ilgisi', 'Lezzet / kalite'] },
      { type: 'text', prompt: 'Önümüzdeki hafta için ekibe 1 cümlelik aksiyon yazın.', isRequired: true },
    ],
  },
  {
    slug: 'staff-day-one-onboarding',
    categorySlug: 'staff-onboarding',
    title: 'Yeni personel 1. gün oryantasyon kontrolü',
    description:
      'Yeni başlayan personelle yapılır — onboarding listesi tamamlandı mı, sorular giderildi mi.',
    sector: 'other',
    scoringMode: 'percentage',
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'Yangın çıkışı + acil durum protokolü anlatıldı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'KVKK + müşteri gizliliği eğitimi (kısa) yapıldı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Üniforma + kişisel ekipman teslim edildi mi?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Vardiya programı + iletişim kanalı (WhatsApp grup vb.) paylaşıldı mı?', correctAnswer: 'Evet' },
      { type: 'scale', prompt: 'Yeni personelin ilk gün öğrenme hızı (1=zorlu, 5=hızlı uyum)', correctAnswer: 4 },
      { type: 'text', prompt: 'İlk gün sonunda yeni personele sorduğun 1 açık soru ve yanıtını yaz.', isRequired: false },
    ],
  },
];

export interface AuditSeedResult {
  categories: number;
  templates: number;
  questions: number;
  durationMs: number;
}

export async function runAuditSeed(): Promise<AuditSeedResult> {
  const started = Date.now();
  let categoriesUpserted = 0;
  let templatesUpserted = 0;
  let questionsUpserted = 0;

  // 1) Kategoriler — upsert by unique slug.
  const slugToCategoryId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.auditCategory.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        labelTr: c.labelTr,
        labelEn: c.labelEn,
        sector: c.sector,
        iconKey: c.iconKey,
        order: c.order,
      },
      update: {
        labelTr: c.labelTr,
        labelEn: c.labelEn,
        sector: c.sector,
        iconKey: c.iconKey,
        order: c.order,
      },
    });
    slugToCategoryId.set(c.slug, row.id);
    categoriesUpserted += 1;
  }

  // 2) Şablonlar — idempotency anahtarı: (restaurantId=null, title, createdBy='seed').
  for (const t of TEMPLATES) {
    const categoryId = slugToCategoryId.get(t.categorySlug);
    if (!categoryId) {
      console.warn(`[audit seed] skip template ${t.slug}: category ${t.categorySlug} missing`);
      continue;
    }

    const existing = await prisma.auditTemplate.findFirst({
      where: {
        restaurantId: null,
        title: t.title,
        createdBy: 'seed',
      },
      select: { id: true },
    });

    let templateId: string;
    if (existing) {
      const updated = await prisma.auditTemplate.update({
        where: { id: existing.id },
        data: {
          categoryId,
          description: t.description,
          sector: t.sector,
          scoringMode: t.scoringMode,
          passingScore: t.passingScore ?? null,
          locale: t.locale,
          isPublished: true,
        },
        select: { id: true },
      });
      templateId = updated.id;
      await prisma.auditQuestion.deleteMany({ where: { templateId } });
    } else {
      const created = await prisma.auditTemplate.create({
        data: {
          restaurantId: null,
          categoryId,
          title: t.title,
          description: t.description,
          sector: t.sector,
          scoringMode: t.scoringMode,
          passingScore: t.passingScore ?? null,
          locale: t.locale,
          isPublished: true,
          publishedAt: new Date(),
          createdBy: 'seed',
        },
        select: { id: true },
      });
      templateId = created.id;
    }
    templatesUpserted += 1;

    for (let i = 0; i < t.questions.length; i += 1) {
      const q = t.questions[i];
      await prisma.auditQuestion.create({
        data: {
          templateId,
          type: q.type,
          prompt: q.prompt,
          helpText: q.helpText ?? null,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : undefined,
          weight: q.weight ?? 1,
          isRequired: q.isRequired ?? true,
          sortOrder: (i + 1) * 10,
        },
      });
      questionsUpserted += 1;
    }
  }

  return {
    categories: categoriesUpserted,
    templates: templatesUpserted,
    questions: questionsUpserted,
    durationMs: Date.now() - started,
  };
}
