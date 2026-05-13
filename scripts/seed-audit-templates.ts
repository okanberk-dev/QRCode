/**
 * CLAUDE.md §42 — Denetim Merkezi seed.
 *
 * Idempotent: re-running upserts kategorileri ve global şablonları (kod-
 * default'una "reset"). Slug üzerinden upsert; admin-edited template'leri
 * geçmeden önce DB'den okumaz — operator bu seed'i "code default'larına
 * dön" niyetiyle çalıştırır.
 *
 * Usage:
 *   DATABASE_URL=... DIRECT_URL=... npx tsx scripts/seed-audit-templates.ts
 *
 * Output:
 *   - 5 AuditCategory (food, hotel, retail, health, beauty)
 *   - 8 global AuditTemplate (restaurantId null, isPublished true)
 *   - Her şablon için 4-6 AuditQuestion (toplam ~40 soru)
 */

import { PrismaClient } from '@prisma/client';

type SeedCategory = {
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: 'food' | 'hotel' | 'retail' | 'health' | 'beauty';
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
  slug: string; // internal mark, not DB column — sadece idempotency için createdBy='seed:<slug>'
  categorySlug: string;
  title: string;
  description: string;
  sector: 'food' | 'hotel' | 'retail' | 'health' | 'beauty';
  scoringMode: 'percentage' | 'weighted' | 'pass_fail';
  passingScore?: number;
  locale: 'tr';
  questions: SeedQuestion[];
};

const CATEGORIES: SeedCategory[] = [
  { slug: 'hiring-quiz', labelTr: 'İşe Alım Quiz', labelEn: 'Hiring Quiz', sector: 'food', iconKey: 'UserPlus', order: 10 },
  { slug: 'operations-daily', labelTr: 'Günlük Operasyon', labelEn: 'Daily Operations', sector: 'food', iconKey: 'ClipboardCheck', order: 20 },
  { slug: 'compliance-kvkk', labelTr: 'KVKK & Uyum', labelEn: 'KVKK & Compliance', sector: 'other' as 'food', iconKey: 'Shield', order: 30 },
  { slug: 'service-training', labelTr: 'Hizmet Eğitimi', labelEn: 'Service Training', sector: 'hotel', iconKey: 'GraduationCap', order: 40 },
  { slug: 'safety-hygiene', labelTr: 'Güvenlik & Hijyen', labelEn: 'Safety & Hygiene', sector: 'food', iconKey: 'HandPlatter', order: 50 },
];

const TEMPLATES: SeedTemplate[] = [
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
    slug: 'kvkk-self-check',
    categorySlug: 'compliance-kvkk',
    title: 'KVKK öz-denetim (işletme)',
    description:
      'İşletmenin KVKK uyum durumunu kendi başına değerlendirmesi için kısa kontrol listesi. Hukukçu yerine geçmez — durum tespiti aracıdır.',
    sector: 'other' as 'food',
    scoringMode: 'percentage',
    passingScore: 75,
    locale: 'tr',
    questions: [
      { type: 'yes_no', prompt: 'KVKK aydınlatma metniniz görünür bir yerde (web sitesi + QR menü) yayında mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Müşteri verilerini topladığınızda açık rıza alıyor musunuz?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Personel KVKK eğitimi belgeli olarak yapıldı mı?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'VERBİS\'e kayıtlı veya muafiyet kapsamında olduğunuzu biliyor musunuz?', correctAnswer: 'Evet' },
      { type: 'yes_no', prompt: 'Sızıntı durumunda 72 saat içinde KVKK kuruluna bildirme planınız var mı?', correctAnswer: 'Evet' },
      { type: 'text', prompt: 'En son güncel KVKK aydınlatma metni tarihini yazın.', isRequired: false },
    ],
  },
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
        options: ['Evet, her zaman', 'Hayır, sadece gözle kontrol', 'Sadece kayıt kanununun gerektirdiği bilgileri ve KVKK aydınlatması ile', 'Konaklayan istemediği sürece alınır'],
        correctAnswer: 'Sadece kayıt kanununun gerektirdiği bilgileri ve KVKK aydınlatması ile',
        weight: 2,
      },
      {
        type: 'single',
        prompt: 'Misafir odasında bir şikâyet bildirdiğinde ideal cevap?',
        options: ['Hata bizde değil', 'Hemen geliyorum, çözüm için seçenekleri sıralıyorum', 'Yarın çözeriz', 'Yöneticiye yönlendir, ben halledemem'],
        correctAnswer: 'Hemen geliyorum, çözüm için seçenekleri sıralıyorum',
      },
      {
        type: 'multi',
        prompt: 'Erken check-in talebinde dikkat edilmesi gerekenler? (Birden fazla)',
        options: ['Odanın hazır olup olmadığı', 'Misafirin sadakat tier\'ı', 'Müsait alternatif oda', 'Üst yöneticiye sormadan asla onaylamamak', 'Tahsil edilecek ek ücret bilgisi'],
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
    slug: 'beauty-salon-hygiene',
    categorySlug: 'safety-hygiene',
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
    slug: 'retail-cashier-quiz',
    categorySlug: 'hiring-quiz',
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
        options: ['Evet, her ürün', 'Hayır, sadece online satışlarda', 'Hayır, hijyenik ürünler ve özel sipariş için istisnalar var', 'Sadece kredi kartıyla ödenenler'],
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
];

async function main() {
  const prisma = new PrismaClient();
  try {
    let categoriesUpserted = 0;
    let templatesUpserted = 0;
    let questionsUpserted = 0;

    // 1) Categories — upsert by unique slug.
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

    // 2) Templates — idempotency anahtarı: (restaurantId=null, createdBy='seed', title).
    // Aynı title ile çoklu seed çağrısı duplicate üretmesin.
    for (const t of TEMPLATES) {
      const categoryId = slugToCategoryId.get(t.categorySlug);
      if (!categoryId) {
        console.warn(`Skipping ${t.slug}: category ${t.categorySlug} missing`);
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
            publishedAt: existing ? undefined : new Date(),
          },
          select: { id: true },
        });
        templateId = updated.id;
        // Mevcut question'ları sil, yeni listeyi tekrar ekle (seed = reset).
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

      // Questions
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

    console.log(
      `[audit seed] OK — categories: ${categoriesUpserted}, templates: ${templatesUpserted}, questions: ${questionsUpserted}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[audit seed] FAILED', err);
  process.exit(1);
});
