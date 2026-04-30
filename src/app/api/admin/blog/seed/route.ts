import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { parseBlogDate } from '@/lib/blog-date';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return { ok: false as const, res: ApiErrors.unauthorized() };
  }
  if (admin.role !== 'superadmin') {
    return { ok: false as const, res: ApiErrors.forbidden() };
  }
  return { ok: true as const, admin };
}

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
    title: 'Restoranınızın Google Yorumlarını Artırmanın Sakin Yolu',
    description: 'Yemek platformlarının komisyonu sürdürülebilir değil. Google’da güveni inşa eden restoranlar, kendi organik kitlesini büyütüyor. Komut listesi değil, alışkanlık önerisi.',
    date: '2 Şubat 2026',
    readTime: '5 dk okuma',
    author: 'Buaze İçerik Ekibi',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <p>Bir müşterinin akşam yemeği kararı çoğu zaman elinde telefonla başlar. Önce harita açılır, sonra yorum sayısı taranır, en son fotoğraflara bakılır. Bütün bu süreç ortalama bir buçuk dakika sürüyor ve restoranın menüsünden çok dijital izine bakıyor. Bu yazı yıldız avlamakla ilgili değil; o bir buçuk dakikada görünür olmakla ilgili.</p>

        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800&h=400" alt="Restoran deneyimi" />

        <h2>Platform komisyonunun gerçek maliyeti</h2>
        <p>Yemeksepeti, Getir Yemek ve benzer pazaryerleri size her gün yeni müşteri tanıştırıyor — ama bunun karşılığında <strong>sipariş başına yüzde yirmi beş ile otuz beş arasında bir komisyon</strong> alıyor. Marjı zaten dar olan restoran işletmelerinde bu, masa başına ciddi bir kira ödemek anlamına geliyor. Üstelik o müşteri sizinle değil, platformla bir ilişki kuruyor; uygulamayı silerse sizi de kaybediyor. Google'daki itibarınız ise hiçbir aracıya borçlu olmadığınız bir varlık. Bir kez kazanılınca her gün yeniden çalışıyor.</p>

        <h2>Google İşletme Profili neyi ödüllendiriyor?</h2>
        <p>Google'ın yerel sıralamasını belirleyen üç sessiz değişken var: yorumların ortalama puanı, yorum hacmi ve son yorumun tazeliği. Üçüncüsü çoğu zaman gözden kaçar. Üç ay önce sekiz yıldızlı bir profil ile geçen hafta dört yorum eklenmiş bir profil arasında, ikincisi her zaman daha üst sırada gösterilir. Bu yüzden işin kalbi "iyi yorum toplamak" değil, "düzenli yorum akışı kurmak"tır.</p>

        <p>Bu akışı besleyen iki günlük alışkanlık var. Birincisi, profile haftada birkaç fotoğraf eklemek; iyi çekilmiş bir yemek görseli, profil tıklanma oranını gözle görülür şekilde artırıyor. İkincisi, gelen her yoruma — olumlu ya da olumsuz — kısa ve nazik bir yanıt yazmak. Yanıtlar müşteriye değer verdiğinizi gösterirken Google algoritmasına "bu işletme aktif" sinyalini iletir.</p>

        <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800&h=400" alt="Şef mutfakta" />

        <h2>Yorum istemenin doğru anı</h2>
        <p>Çoğu işletmenin yaptığı hata, yorumu mesai sonunda toplu mesajla istemektir. O an müşterinin enerjisi düşmüştür, deneyim hafızada solmaya başlamıştır. En yüksek dönüşüm <em>tatlı sonrası, hesap masaya geldiğinde</em> alınır; çünkü deneyim hâlâ tazedir, masa hâlâ memnundur. Bunu her servise sığdıracak araç ise minimal bir QR kod standı: müşteri telefonunu açıp tarar, deneyimini birkaç saniyede paylaşır.</p>

        <h2>Buaze nerede devreye giriyor?</h2>
        <p>Buaze QR'ı tarayan müşteriye yıldız sorusu sorulur ve hangi yıldızı verirse versin önce kamuya açık platform yorumu önerilir; sonra dilerse aynı akışta restorana özel bir not da bırakabilir. Yıldıza göre yol ayrımı yapmaz, müşteriyi sansürlemez — Google politikalarıyla uyumlu kalır. Aldığınız her geri bildirim panele yapılandırılmış veri olarak düşer; düşük puanlı bir not geldiğinde yönetici saniyeler içinde haberdar olur ve sorunu büyümeden çözer.</p>

        <p>Sonuç olarak Google yorumlarını artırmak gizemli bir iş değil. Müşteriye doğru anda sormak, gelen sinyali hızlı işlemek ve süreci günlük rutine dönüştürmek yeterli. Yıldızlar bu disiplinin sonucudur, başlangıcı değil.</p>
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
        <p>Tüm misafirleriniz check-out anında <strong>QR kodlu akıllı standa</strong> davet edilmeli; sadece "mutlu görünenleri" seçmek Google politikalarına aykırıdır. Dürüst geri bildirim her zaman doğru tercihtir.</p>
        <img src="https://images.unsplash.com/photo-1551882547-ff40c0d120fb?auto=format&fit=crop&q=80&w=800&h=400" alt="Otel lobi ve resepsiyon alanı" style="border-radius: 12px; margin: 2rem 0;" />
        <h3>2. Buaze ile Profesyonel Geri Bildirim Yönetimi</h3>
        <p>Buaze QR\'ı tarayan her misafire önce Google yorum bağlantısı sunulur. İsteyen misafir aynı akışta otel yönetimine özel geri bildirim de bırakır — yıldıza göre dallandırma yapılmaz. Böylece kamuya açık yorum yolu her zaman açık kalırken operasyonel sinyal de hızlıca yönetime ulaşır.</p>
      `,
  },
  {
    slug: 'yerel-isletmeler-icin-google-yorumlari-neden-onemli',
    locale: 'tr',
    title: 'Yerel İşletmeler İçin Google Yorumları Neden Önemli?',
    description: 'Müşteri "yakınımdaki kafe" yazdığında ilk üç sonuca bakıyor. Yerel sıralamayı belirleyen artık konum değil, yorumun hacmi, ortalaması ve tazeliği. Buaze ekibinden sade bir özet.',
    date: '20 Mart 2026',
    readTime: '5 dk okuma',
    author: 'Buaze İçerik Ekibi',
    coverImage: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <p>Bir kahvaltı mekânına gitmeden önce müşterinin yaptığı en küçük hareket telefonunu açıp Google haritada arama yapmak. Listede ilk çıkan üç işletmenin tıklanma oranı, dördüncü ve sonrasındakilere kıyasla on katı bir fark yaratıyor. O üç sıraya kim girer? Cevap son beş yılda sessizce değişti: artık sadece konum değil, dijital itibar belirliyor.</p>

        <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800&h=400" alt="Yerel kafe ve müşteri akışı" />

        <h2>Yerel sıralamanın üç sessiz parametresi</h2>
        <p>Google'ın yerel pack'i (haritada beliren ilk üç sonuç) üç sinyali kademeli olarak okur. <strong>Yorum hacmi</strong> kategorisindeki diğer işletmelere göre yorum sayınızın nerede durduğunu söyler. <strong>Ortalama puan</strong> 4.4 ile 4.8 bandında olduğunda en yüksek tıklamayı alır; sürpriz olarak 5.0 profiller "fazla iyi olmak şüphelidir" psikolojisiyle daha az tıklanıyor. Üçüncüsü ise en kritiği — <strong>yorum tazeliği</strong>. Son yorumu üç ay öncesine ait bir profil, geçen hafta üç yorum almış bir rakibin önüne çıkamaz.</p>

        <p>Bu üç parametreden yalnızca biri tek seferlik çabayla halledilemez. Ortalama puan ve hacim zamanla birikir. Tazelik ise <em>her gün yeniden kazanılır</em> ve tam olarak burada çoğu işletme dökülür.</p>

        <h2>Tek bir yıldızın matematiksel maliyeti</h2>
        <p>Harvard Business School'un sıkça atıfta bulunulan araştırması Yelp puanındaki her bir yıldızlık artışın ciroyu yüzde beş ile dokuz arasında etkilediğini gösteriyor. Türkiye pazarında yapılan benzer çalışmalar Google özelinde aynı bandı doğruluyor. 4.2'den 4.5'e çıkmak somut bir mesele: pratik karşılığı, ay sonunda hesabınıza yansıyan ek ciro.</p>

        <p>Aynı matematik tersine de işliyor. Tek bir kötü yorum onlarca potansiyel müşteriyi sessizce uzaklaştırır; üstelik bunu fark etmezsiniz çünkü o müşteri zaten kapınızdan içeri girmemiştir. Yorum yönetimi bu yüzden bir lüks değil, bir varlık koruma disiplinidir.</p>

        <img src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800&h=400" alt="Telefonda Google harita araması" />

        <h2>"Yorum almak" değil, "yorum akışı kurmak"</h2>
        <p>Çoğu işletme sahibi yoruma ihtiyacı olduğunu hisseder ama bu ihtiyaç ne zaman aksiyon ister? Genellikle bir kriz olduğunda — kötü bir yorum geldiğinde, sıralama düştüğünde. Bu reaktif yaklaşım sürdürülemez. Sürdürülebilir olan, yorumu günlük operasyonun bir parçası hâline getirmek.</p>

        <p>Bunu yapan işletmelerin ortak özelliği şu: yorum talebini her servise sıkıştırılmış küçük bir adıma indirgemiş olmaları. Hesap geldiği anda masada duran QR'ı taramak, müşteri için on saniyelik bir hareket. Çalışanın ekstra mesai harcamasına gerek yok. Bu rutin bir kez yerleştiğinde, profilinizdeki "tazelik" sinyali kendi kendine beslenir.</p>

        <h2>Operasyonun parçası olunca işin doğası değişir</h2>
        <p>Buaze tam bu noktada devreye giriyor. QR'ı tarayan müşteriye önce platform yorumu sunulur — yıldıza göre yol ayrımı yapılmadan. İsteyen müşteri aynı akışta size özel bir not da bırakabilir. Düşük puanlı geri bildirimler operasyon paneline anlık alarm olarak düşer; yönetici şikâyeti müşteri kapıdan çıkmadan görür ve çoğu zaman aynı saat içinde çözüme kavuşturur.</p>

        <p>Yorum sayınız zamanla artar, ortalama puanınız doğal olarak yükselir, son yorum tarihi her gün yenilenir. Yerel sıralamayı belirleyen üç parametre de aynı sistemden besleniyor olur. Yıldız avlamak yerine, yıldızların gelmesini doğal kılan bir akış kurmuş olursunuz.</p>

        <p>Yerel işletmeler için Google yorumları artık bir pazarlama meselesi değil, bir altyapı meselesi. Müşteriye doğru anda kapı açan, gelen sinyali hızla işleyen ve bunu her gün tekrarlayan işletmeler önümüzdeki üç yılda kapı önündeki rekabeti dijital sıralamada da kazanacak.</p>
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
    title: 'The Calm Way to Earn More Google Reviews for Your Restaurant',
    description: 'Delivery platform commissions are not sustainable. Restaurants that build trust on Google grow their own organic audience. Less of a checklist, more of a habit.',
    date: 'February 2, 2026',
    readTime: '5 min read',
    author: 'Buaze Content Team',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <p>A diner's decision usually starts on a phone. The map opens first, then the review count is scanned, the photos checked last. The whole ritual takes about ninety seconds — and it leans on your digital footprint far more than your menu. This piece is not about chasing stars; it is about being visible during those ninety seconds.</p>

        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800&h=400" alt="Restaurant experience" />

        <h2>The real cost of platform commissions</h2>
        <p>Marketplaces like DoorDash and Uber Eats introduce you to new customers every day, but they charge <strong>twenty-five to thirty-five percent in commission</strong> on each order. For a restaurant with already thin margins, that is essentially a per-table rent. Worse, the customer's relationship is with the platform, not with you; once they delete the app, they forget you. Your Google presence is a different kind of asset — you owe no middleman, and once it is built, it pays back every day.</p>

        <h2>What Google Business Profile actually rewards</h2>
        <p>Three quiet variables determine local ranking: the average rating of your reviews, the volume of reviews, and the recency of the latest one. The third is the one most operators miss. Between a profile with eight glowing reviews from three months ago and one that received four reviews last week, the second always ranks higher. The work is not "collect good reviews" — it is "build a steady review stream."</p>

        <p>Two daily habits feed that stream. First, posting a few photos to the profile each week; a well-shot dish noticeably increases your click-through rate. Second, replying briefly and warmly to every review — positive or negative. Replies show customers you care while signaling to Google's algorithm that the business is active.</p>

        <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800&h=400" alt="Chef in kitchen" />

        <h2>The right moment to ask</h2>
        <p>The most common mistake is asking for reviews via mass message at the end of the day. By then the diner's energy is low and the experience has begun to fade. The highest conversion happens <em>right after dessert, when the bill arrives</em> — the experience is fresh, the table is content. The tool that fits into every service without friction is a minimal QR stand: the customer opens their phone, scans, and shares within seconds.</p>

        <h2>Where Buaze fits in</h2>
        <p>When a diner scans a Buaze QR, they are first offered the public review link regardless of how many stars they would give; if they wish, they can also leave a private note for the restaurant in the same flow. There is no rating-based gating, which keeps the experience aligned with Google's policies. Every piece of feedback lands in your panel as structured data; a low-rated note triggers an immediate alert, so a manager can intervene before the issue grows.</p>

        <p>Earning Google reviews is not a mystery. Ask the diner at the right moment, process incoming signals quickly, and turn the practice into a daily routine. Stars are the result of that discipline, not its starting point.</p>
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
        <p>Implement a sleek, branded <strong>QR code stand</strong> at the reception desk. Invite every guest at check-out to scan and share their honest experience — never solicit only the visibly happy ones.</p>
        <img src="https://images.unsplash.com/photo-1551882547-ff40c0d120fb?auto=format&fit=crop&q=80&w=800&h=400" alt="Hotel reception desk" style="border-radius: 12px; margin: 2rem 0;" />
        <h3>2. Pair the Public Review Link with a Private Recovery Channel</h3>
        <p>Every guest who scans the Buaze QR is offered the public Google review link first — no rating-based gating. Anyone who also wants to share private feedback with the hotel management can do so in the same flow, giving your team a fast operational signal without ever blocking or discouraging a public review.</p>
      `,
  },
  {
    slug: 'why-google-reviews-matter-for-local-businesses',
    locale: 'en',
    title: 'Why Google Reviews Matter for Local Businesses',
    description: 'When a customer types "cafe near me", they only look at the first three results. Local ranking is no longer about location — it is about review volume, average score, and recency.',
    date: 'March 20, 2026',
    readTime: '5 min read',
    author: 'Buaze Content Team',
    coverImage: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=1200&h=600',
    content: `
        <p>Before walking into a brunch spot, the smallest move a customer makes is opening Google Maps. The top three results in that local pack receive roughly ten times the clicks of the rest. Who occupies those three slots? The answer has changed quietly over the past five years: it is no longer just about proximity, it is about digital reputation.</p>

        <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800&h=400" alt="Local cafe foot traffic" />

        <h2>The three quiet variables of local ranking</h2>
        <p>Google's local pack reads three signals in layers. <strong>Review volume</strong> tells it where you stand against competitors in the same category. <strong>Average rating</strong> earns the most clicks in the 4.4 to 4.8 band; surprisingly, perfect 5.0 profiles get fewer clicks because customers find them suspicious. The third — and the most underestimated — is <strong>recency</strong>. A profile whose last review is three months old cannot outrank a competitor that received three new reviews this week.</p>

        <p>Volume and rating accumulate over time. Recency is <em>earned every single day</em>, and that is exactly where most businesses fall behind.</p>

        <h2>The arithmetic of a single star</h2>
        <p>The widely cited Harvard Business School study showed that each one-star increase on Yelp lifts revenue by five to nine percent. Studies in other markets repeat the same range for Google. Moving from 4.2 to 4.5 is not a vanity metric; it is incremental revenue you can measure at month-end.</p>

        <p>The math runs in reverse, too. A single bad review quietly turns away dozens of would-be customers — and you never notice, because they never walked in. That is why review management is not a luxury; it is asset protection.</p>

        <img src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800&h=400" alt="Searching Google Maps on a phone" />

        <h2>Not "collecting reviews" — building a review stream</h2>
        <p>Most operators feel the need for reviews only during a crisis: a bad rating, a ranking dip. That reactive posture is unsustainable. Sustainable looks different — it makes review collection a part of daily operations.</p>

        <p>The businesses that pull this off share one trait: they have shrunk the ask into a tiny step that fits inside every service. The customer scans a QR at the table when the bill arrives and shares their experience in ten seconds. Staff lose no extra minutes. Once the routine takes hold, your "recency" signal sustains itself.</p>

        <h2>When it lives inside operations, the work changes</h2>
        <p>This is where Buaze fits in. A diner who scans the QR is offered the public review link first, with no gating based on the rating they would give; in the same flow, anyone can also leave a private note for the venue. Low-rated feedback drops into the operations panel as a real-time alert, so a manager often resolves the issue before the customer leaves the building.</p>

        <p>Volume rises naturally, average rating drifts upward, and the date of the last review refreshes daily. The three signals that govern local ranking all draw from the same source. Instead of chasing stars, you build a flow that makes stars inevitable.</p>

        <p>Google reviews for local businesses have stopped being a marketing topic; they are infrastructure. Operators who learn to ask at the right moment, process the signal quickly, and repeat that loop every day will win the next three years of foot traffic — at the door and on the search ranking.</p>
      `,
  },
];

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (!auth.ok) return auth.res;

  try {
    let seeded = 0;
    for (const post of [...BLOG_POSTS_TR, ...BLOG_POSTS_EN]) {
      // Spread `createdAt` per post by parsing the human-readable `date`
      // string. Without this every reseed collapses every post into one day,
      // which makes `BlogPosting.dateModified` look identical for the whole
      // archive (audit Section 8.2).
      const parsed = parseBlogDate(post.date);
      const createdAt = parsed ?? undefined;
      await prisma.blogPost.upsert({
        where: { slug_locale: { slug: post.slug, locale: post.locale } },
        update: { ...post },
        create: { ...post, ...(createdAt ? { createdAt } : {}) },
      });
      seeded++;
    }
    return NextResponse.json({ success: true, seeded });
  } catch (error) {
    console.error('[Seed Error]', error);
    return ApiErrors.internalError('Blog yazıları örneklenemedi');
  }
}
