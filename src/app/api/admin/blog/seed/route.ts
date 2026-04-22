import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BLOG_POSTS_TR = [
  {
    slug: 'digital-reputation-strategies',
    locale: 'tr',
    title: "İşletmeniz İçin Profesyonel Dijital İtibar Stratejileri",
    description: "Müşterilerinizin %90'ından fazlası kapıdan içeri girmeden önce dijital itibarınızı kontrol ediyor. Marka değerinizi zirveye taşımanın kanıtlanmış yolları.",
    date: '15 Mart 2026',
    readTime: '4 dk okuma',
    author: 'Buaze İçerik Ekibi',
    coverImage: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>Neden Google Haritalar Puanları Bu Kadar Önemli?</h2>
        <p>Araştırmalar, potansiyel müşterilerin şaşırtıcı bir <strong>%93'ünün</strong> Google Haritalar'ı açıp işletme yorumlarına baktığını ortaya koyuyor. Puanınız 4.0'ın altındaysa müşteriler daha yüksek puanlı rakiplerinize kayıyor.
        </p>
        <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800&h=400" alt="Müşteri başarı analitiği" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Organik Yorum Almanın Yolları</h2>
        <h3>1. Doğru "Tepe" Noktasında Sorun</h3>
        <p>Geri bildirim istemenin en iyi zamanı, müşterinin hizmetten en memnun olduğu andır. Restoranlar için hesap ödenirken; oteller için check-out sırasında; klinikler için tedavi sonunda.</p>
        <h3>2. Profesyonel QR Çözümlerinden Yararlanın</h3>
        <p>Sözlü sormak artık yeterince dönüşüm sağlamıyor. Markalı QR kod standları kullanarak geri bildirim operasyonlarınızı profesyonelleştirin.</p>
        <img src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800&h=400" alt="Müşteri başarı masası" style="border-radius: 12px; margin: 2rem 0;" />
        <h3>3. Geri Bildirim Operasyonlarını Yönetin</h3>
        <p>Her müşteri mükemmel bir deneyim yaşamayabilir. Buaze gibi profesyonel sistemler, geri bildirimleri anlık olarak yapılandırılmış veriye dönüştürerek krizleri büyümeden çözmenizi sağlar.</p>
        <h2>Sonuç</h2>
        <p>Dijital dünyada güçlü bir itibar tesadüf değildir; doğru bir operasyonel sistemin sonucudur.</p>
      `,
  },
  {
    slug: 'how-to-increase-restaurant-reviews',
    locale: 'tr',
    title: 'Restoranlar İçin Google Yorumlarını Artırma ve Satış Stratejileri',
    description: 'Yemek platformlarına %30 komisyon ödemek zorunda değilsiniz. Google üzerinde güçlü bir profil oluşturarak organik "paket servis" ve "gel-al" kitlenizi büyütün.',
    date: '2 Şubat 2026',
    readTime: '5 dk okuma',
    author: 'Buaze İçerik Ekibi',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>Platform Bağımlılığından Kurtulun</h2>
        <p>Yemeksepeti, Getir Yemek gibi platformlar size müşteri getiriyor ama <strong>her sipariş başına %25-35 komisyon</strong> alıyor. Bu sürdürülebilir bir model değil. Çözüm: Google Haritalar'daki güveninizi inşa ederek kendi organik kitlenizi oluşturmak.</p>
        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800&h=400" alt="Restoran deneyimi" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Google Benim İşletmem Profilini Güçlendirin</h2>
        <h3>Fotoğraflar Her Şeydir</h3>
        <p>Yüksek kaliteli, iştah açıcı yemek fotoğrafları Google profilinizin tıklanma oranını %35'e kadar artırır. Haftada en az 2-3 yeni fotoğraf yükleyin.</p>
        <h3>Yorumlara Yanıt Verin</h3>
        <p>Her yoruma (olumlu veya olumsuz) nazikçe yanıt vermek, Google algoritmasına "aktif bir işletme" sinyali gönderir ve sıralamanızı iyileştirir.</p>
        <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800&h=400" alt="Şef mutfakta" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Buaze Geri Bildirim Operasyon Sistemi</h2>
        <p>Masa hesabı ödendikten sonra garsonun kasa yakınındaki Buaze QR standına yönlendirmesiyle müşteriler deneyimlerini anında paylaşabilir. Geri bildirimler yapılandırılmış bir veri akışına dönüşerek operasyonel süreçlerinize dahil edilir, böylece marka itibarınız profesyonelce korunur.</p>
      `,
  },
  {
    slug: 'handling-negative-customer-reviews',
    locale: 'tr',
    title: 'Kötü ve Olumsuz Yorumlarla Nasıl Başa Çıkılır?',
    description: 'Zayıf 1 yıldızlı bir Google yorumu tüm itibarınızı lekeleyebilir. İşletmenize zarar veren yorumları profesyonel bir nezaket ve sistem araçlarıyla ortadan kaldırın.',
    date: '18 Ocak 2026',
    readTime: '3 dk okuma',
    author: 'Buaze İçerik Ekibi',
    coverImage: 'https://images.unsplash.com/photo-1573164574572-cb89e39749b4?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>1 Yıldızlı Yorumun Gerçek Maliyeti</h2>
        <p>Harvard Business School araştırmasına göre, Yelp puanındaki her 1 yıldızlık artış geliri <strong>%5-9 oranında artırıyor</strong>. Tersi de geçerli: tek bir 1 yıldızlı yorum onlarca potansiyel müşteriyi korkutabilir.</p>
        <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800&h=400" alt="İş değerlendirmesi" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Olumsuz Yoruma Profesyonel Yanıt Şeması</h2>
        <ul>
            <li><strong>Derin Bir Nefes Alın:</strong> Kişisel algılamayın. Onlar size değil, aksayan hizmete veya kendi ruh hallerine kızgınlar.</li>
            <li><strong>Derhal Özür Dileyin:</strong> Şeffaf olun. "Bugün yaşadığınız gecikme için özür dileriz." gibi yumuşatıcı bir giriş her şeyi soğutur.</li>
            <li><strong>Durumu Çevrim Dışına Taşıyın:</strong> "Sizinle bu konuyu çözmek istiyoruz. Lütfen [mail/telefon] üzerinden iletişime geçin." diyerek topu Google gibi herkese açık bir arenadan çıkartın.</li>
        </ul>
        <h2>Peki Ya Baştan Yönetmek Mümkünse?</h2>
        <p>Deneyimi anlık takip etmek krizleri önlemenin en etkili yoludur. <strong>Buaze Geri Bildirim Yönetimi teknolojisi</strong> tam da bu durumlarda operasyonel mükemmellik sağlar. Düşük puanlı geri bildirimler Buaze üzerinden anlık bildirimlere dönüşerek yönetime iletilir, böylece sorunlar büyümeden çözülebilir.</p>
      `,
  },
  {
    slug: 'the-power-of-google-reviews-for-hotels',
    locale: 'tr',
    title: 'Oteller İçin Dijital İtibar: Rezervasyonları Yorumlarla Uçurun',
    description: 'Düşük yorum puanı kâbusundan kurtulun. Google Haritalar varlığınızı güçlendirerek Booking ve Expedia komisyonlarından arının, doğrudan doluluk sağlayın.',
    date: '5 Ocak 2026',
    readTime: '6 dk okuma',
    author: 'Buaze İçerik Ekibi',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>Otel Doluluk Oranları Dijital İtibarınızla Eş Değerdir</h2>
        <p>Geleneksel otelcilikte "konum" her şeyken, modern turizmde <strong>"Google Haritalar (Maps) puanı" her şeydir</strong>. Bir otel müşterisi için tatil hayali, aylarca çalışılarak kazanılmış paranın tek haftalık konforudur.</p>
        <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800&h=400" alt="Lüks otel odası deneyimi" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>OTA (Booking, Expedia) Komisyonlarına Son Verin</h2>
        <p>Burada sahip olacağınız <strong>4.7 ve üzeri tescilli bir puan</strong>, müşterilere doğrudan sizin web sitenizden komisyonsuz rezervasyon yapma güvenini aşılar.</p>
        <h2>Oteller İçin Geri Bildirim Toplama Taktikleri</h2>
        <h3>1. Check-out Stratejisi</h3>
        <p>Misafirleriniz otelden ayrılırken mutlu görünüyorlarsa, resepsiyonistin nazik yönlendirmesiyle masadaki <strong>QR kodlu akıllı standa</strong> telefonlarını okutmalarını sağlayın.</p>
        <img src="https://images.unsplash.com/photo-1551882547-ff40c0d120fb?auto=format&fit=crop&q=80&w=800&h=400" alt="Otel lobi ve resepsiyon alanı" style="border-radius: 12px; margin: 2rem 0;" />
        <h3>2. Buaze ile Profesyonel Geri Bildirim Yönetimi</h3>
        <p>Düşük puanlı geri bildirimler Buaze sistemi üzerinden anlık olarak otel yönetimine özel bir akışla iletilir. Bu sayede her türlü misafir deneyimi operasyonel bir gelişim fırsatına dönüşür.</p>
      `,
  },
];

const BLOG_POSTS_EN = [
  {
    slug: 'professional-digital-reputation-strategies',
    locale: 'en',
    title: 'Professional Digital Reputation Strategies for Your Business',
    description: "Over 90% of your customers check your digital reputation before visiting. Discover proven ways to elevate your brand value.",
    date: 'March 15, 2026',
    readTime: '4 min read',
    author: 'Buaze Content Team',
    coverImage: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>Why Do Google Maps Ratings Matter?</h2>
        <p>Research indicates that a staggering <strong>93%</strong> of potential customers first open Google Maps and look at the business reviews. If your rating is below 4.0, you are bleeding customers to competitors with higher stars.</p>
        <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800&h=400" alt="Customer success analytics" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Ways to Organically Increase Reviews</h2>
        <h3>1. Ask at the Right Time</h3>
        <p>The best time to ask for feedback is the exact moment the customer is most satisfied. For restaurants, this is while paying the bill; for hotels, during check-out.</p>
        <h3>2. Leverage Smart QR Assets</h3>
        <p>Asking verbally simply doesn't convert well. Provide a frictionless experience using branded QR code stands.</p>
        <img src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800&h=400" alt="Customer success desk" style="border-radius: 12px; margin: 2rem 0;" />
        <h3>3. Manage Feedback Operations</h3>
        <p>Professional systems like Buaze solve crises before they grow by converting feedback into structured data, allowing you to manage experience in real-time.</p>
        <h2>Conclusion</h2>
        <p>A strong digital reputation is not luck; it's the result of a proper operational system.</p>
      `,
  },
  {
    slug: 'how-to-increase-restaurant-reviews',
    locale: 'en',
    title: 'Growth Hacks: Strategies for Restaurants to Increase Reviews',
    description: 'Stop paying heavy 30% delivery margins! Build your own organic local audience through Google Maps supremacy and local SEO dominance.',
    date: 'February 2, 2026',
    readTime: '5 min read',
    author: 'Buaze Content Team',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>Break Free from Platform Dependency</h2>
        <p>Platforms like DoorDash bring you customers but take <strong>25-35% commission</strong> per order. That's not sustainable. The solution: build your organic audience through Google Maps presence.</p>
        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800&h=400" alt="Restaurant experience" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Strengthen Your Google Business Profile</h2>
        <h3>Photos Are Everything</h3>
        <p>High-quality, appetizing food photos increase your Google profile click-through rate by up to 35%. Upload at least 2-3 new photos per week.</p>
        <h3>Respond to All Reviews</h3>
        <p>Responding to every review (positive or negative) signals to Google's algorithm that you are an active business, improving your ranking.</p>
        <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800&h=400" alt="Chef in kitchen" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Buaze Feedback Operations System</h2>
        <p>After the bill is paid, the waiter directs customers to the Buaze QR stand. Feedback is converted into a structured data stream and integrated into your operational processes, ensuring your brand reputation is protected professionally.</p>
      `,
  },
  {
    slug: 'handling-negative-customer-reviews',
    locale: 'en',
    title: 'Damage Control: How to Professionally Defeat 1-Star Reviews',
    description: 'A 1-star Google review is significant. If you manage the process correctly, you can resolve the issue or even turn it into a positive experience.',
    date: 'January 18, 2026',
    readTime: '3 min read',
    author: 'Buaze Content Team',
    coverImage: 'https://images.unsplash.com/photo-1573164574572-cb89e39749b4?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>The Real Cost of a 1-Star Review</h2>
        <p>According to Harvard Business School research, every 1-star increase in Yelp rating increases revenue by <strong>5-9%</strong>. The reverse is also true: a single 1-star review can scare away dozens of potential customers.</p>
        <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800&h=400" alt="Business review" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Professional Response Framework</h2>
        <ul>
            <li><strong>Take a Deep Breath:</strong> Don't take it personally. They are angry at the failing service, not at you personally.</li>
            <li><strong>Apologize Immediately:</strong> Be transparent. A softening opener like "We apologize for the delay you experienced today" cools everything down.</li>
            <li><strong>Take It Offline:</strong> "We'd like to resolve this with you. Please contact us via [email/phone]." Remove the conversation from the public arena.</li>
        </ul>
        <h2>Management is Better Than Cure</h2>
        <p>Buaze's Feedback Management technology monitors experiences in real-time. Low-rated feedback is converted into instant alerts for management, allowing issues to be resolved before they escalate.</p>
      `,
  },
  {
    slug: 'the-power-of-google-reviews-for-hotels',
    locale: 'en',
    title: 'Digital Reputation for Hotels: Skyrocket Direct Bookings',
    description: 'Escape the nightmare of low review scoring. By maximizing your Google Maps presence, you gain direct visibility and stop paying massive OTA commissions.',
    date: 'January 5, 2026',
    readTime: '6 min read',
    author: 'Buaze Content Team',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <h2>Occupancy Means Reputation</h2>
        <p>While location used to be the only metric in hospitality, today <strong>Google Maps rating is the new prime real estate</strong>. A vacation is a significant financial and emotional investment for your guests.</p>
        <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800&h=400" alt="Luxury Hotel Room Experience" style="border-radius: 12px; margin: 2rem 0;" />
        <h2>Bypass OTA Commissions (Booking, Expedia)</h2>
        <p>Having a stellar <strong>4.7+ rating</strong> gives guests the localized trust to click directly to your website and finalize their booking, saving you 15-20% in OTA commissions.</p>
        <h2>Strategic Reputation Collection</h2>
        <h3>1. Lobby and Check-out Checkpoint</h3>
        <p>Implement a sleek, branded <strong>QR code stand</strong> at the reception desk. When guests look satisfied while checking out, prompt them to scan and review.</p>
        <img src="https://images.unsplash.com/photo-1551882547-ff40c0d120fb?auto=format&fit=crop&q=80&w=800&h=400" alt="Hotel reception desk" style="border-radius: 12px; margin: 2rem 0;" />
        <h3>2. Defeat the Reputational Risk Automatically</h3>
        <p>When a low rating is submitted via Buaze, it is <strong>NOT directed to public Google</strong>. Instead, it enters a private, structured feedback flow for hotel management to address operationally.</p>
      `,
  },
];

export async function GET() {
  try {
    let seeded = 0;
    for (const post of [...BLOG_POSTS_TR, ...BLOG_POSTS_EN]) {
      await prisma.blogPost.upsert({
        where: { slug_locale: { slug: post.slug, locale: post.locale } },
        update: { ...post },
        create: { ...post },
      });
      seeded++;
    }
    return NextResponse.json({ success: true, seeded });
  } catch (error) {
    console.error('[Seed Error]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
