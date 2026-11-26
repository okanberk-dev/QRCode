/**
 * Pillar TR blog content seed (SEO §35, 2026-06-03).
 *
 * Buaze blog'u TR pazarda görünürlük için 3 derin (≈1.300+ kelime) pillar
 * yazı ile genişletildi. Her yazı ayrı bir anahtar kelime kümesini hedefler
 * (cannibalization yok):
 *   1. QR geri bildirim toplama          → "QR kod geri bildirim"
 *   2. Online itibar yönetimi (rehber)   → "online itibar yönetimi"
 *   3. Çok platformlu yorum yönetimi      → "Yemeksepeti / Google / Trendyol yorum"
 *
 * Uyumluluk (CLAUDE.md §19.1.1 + §35.8 + §35.9):
 *   - Review-gating wording YOK ("filtreleme / sızdırmadan / X kat garanti")
 *   - Uydurma metrik YOK (kohort + pencere attribution gerektiğinde)
 *   - Müşteri agency framing ("her müşteri istediği yere yorum yazma hakkını korur")
 *
 * Çalıştırma (idempotent — slug+locale upsert):
 *   DATABASE_URL=... npx tsx scripts/seed-blog-pillar-posts.ts
 *
 * İçerik HTML olarak saklanır; public render `sanitizeBlogContent`
 * (src/lib/blog-content.ts) izinli etiketlerle (p/h2/h3/ul/ol/li/strong/
 * em/a/blockquote) süzer, h2/h3'lere otomatik anchor + TOC üretir.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COVER = '/images/open-graph-tr.png';
const AUTHOR = 'Buaze Ekibi';
const AUTHOR_ROLE = 'İtibar yönetimi ekibi';
const DATE = '3 Haziran 2026';

interface PillarPost {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  tags: string[];
  content: string;
}

const POSTS: PillarPost[] = [
  {
    slug: 'qr-kod-ile-musteri-geri-bildirimi-toplama-rehberi',
    title: 'QR Kod ile Müşteri Geri Bildirimi Toplama: Adım Adım Rehber',
    description:
      'QR kod ile müşteri geri bildirimi nasıl toplanır? Masadan, kasadan veya kargodan QR akışı kurmanın, yanıt oranını artırmanın ve geri bildirimi operasyona çevirmenin pratik rehberi.',
    readTime: '9 dk okuma',
    tags: ['QR geri bildirim', 'müşteri deneyimi', 'rehber'],
    content: `
<p>Müşterileriniz işletmeniz hakkında her gün bir fikir oluşturuyor; ama bu fikrin büyük kısmı size hiç ulaşmıyor. <strong>QR kod ile müşteri geri bildirimi toplama</strong>, bu sessiz çoğunluğu duyulabilir hale getirmenin hızlı ve düşük maliyetli bir yoludur. Bir kâğıt anket bastırmaya, ayrı bir uygulama indirtmeye veya e-posta listesi kurmaya gerek kalmadan; müşteri telefonuyla bir kareyi okutur ve saniyeler içinde size ulaşır.</p>

<p>Bu rehberde QR tabanlı bir geri bildirim akışını sıfırdan nasıl kuracağınızı, yanıt oranını neyin yükselttiğini ve toplanan geri bildirimi nasıl gerçek operasyonel iyileştirmeye dönüştüreceğinizi adım adım anlatıyoruz.</p>

<h2>QR ile geri bildirim neden işe yarar?</h2>

<p>Geleneksel anketlerin en büyük sorunu sürtünmedir: müşteri bir bağlantıyı elle yazmak, bir uygulama indirmek veya uzun bir formu doldurmak zorunda kaldığında çoğu kişi vazgeçer. QR kod bu sürtünmeyi neredeyse sıfıra indirir. Müşteri zaten elinde olan telefonu kullanır, kamera karekodu okur ve tek dokunuşla geri bildirim ekranına ulaşır.</p>

<p>İkinci avantaj <strong>bağlam</strong>tır. QR kodu doğru anda ve doğru yerde sunduğunuzda (masada yemekten hemen sonra, kasada ödeme sırasında, kargo kutusunun içinde) müşteri deneyimi hâlâ tazedir. Taze deneyim, daha dürüst ve daha ayrıntılı geri bildirim demektir.</p>

<blockquote>QR akışının amacı müşteriyi belirli bir puana yönlendirmek değil, ona kolay bir kanal açmaktır. Her müşteri istediği yere, istediği puanı yazma hakkını korur.</blockquote>

<h2>Adım 1: Hedefinizi netleştirin</h2>

<p>QR koddan ne öğrenmek istediğinizi bilmeden akış kurmayın. Tipik hedefler şunlardır:</p>

<ul>
<li><strong>Genel memnuniyet ölçümü:</strong> Müşteriler genel olarak ne hissediyor? Tek soruluk bir puan yeterlidir.</li>
<li><strong>Operasyonel sinyal yakalama:</strong> Hangi masa, şube veya saatte sorun yaşanıyor? Geri bildirime şube/masa bilgisi eklemelisiniz.</li>
<li><strong>Kamuya açık yorum büyütme:</strong> Her müşteriye Google İşletme Profili gibi platformlardaki herkese açık yorum bağlantısını sunmak.</li>
</ul>

<p>Çoğu işletme için doğru başlangıç, tek bir net hedefe odaklanmaktır. Önce memnuniyeti ölçün, sonra detaylandırın.</p>

<h2>Adım 2: Akışı tasarlayın</h2>

<p>İyi bir QR geri bildirim akışı kısa ve nettir. Önerilen yapı:</p>

<ul>
<li><strong>1. Puan ekranı:</strong> Müşteri 1–5 yıldız veya benzeri basit bir ölçekle başlar. Tek dokunuş yeterli olmalı.</li>
<li><strong>2. Açıklama (opsiyonel):</strong> İsteyen müşteri birkaç cümle ekleyebilir. Zorunlu tutmayın; zorunlu alanlar tamamlanma oranını düşürür.</li>
<li><strong>3. Seçenekler:</strong> Her müşteriye kamuya açık platformda yorum yazma bağlantısı gösterilir; müşteri dilerse işletmeyle özel geri bildirim de paylaşabilir. Burada kritik nokta şudur: bu bir tercih akışıdır, bir engelleme değil.</li>
</ul>

<p>Buaze'de belirlediğiniz eşik ve üzerindeki puanlarda müşteri seçtiğiniz platformun yorum sayfasına geçer; eşiğin altında önce size özel geri bildirim yazabilir ve herkese açık yorum bağlantısı aynı ekranda durur. Her müşteri herkese açık yorum bağlantısını görür; Buaze yorum silmez, gizlemez ve yorum karşılığında ödül sunmaz. Ayrıntıyı <a href="/tr/google-compliance">Google yorum kuralları sayfamızda</a> bulabilirsiniz.</p>

<h2>Adım 3: QR kodu doğru yere koyun</h2>

<p>En iyi akış bile yanlış yere konursa okunmaz. Sektöre göre yüksek performanslı yerleşimler:</p>

<ul>
<li><strong>Restoran & kafe:</strong> Masa kartı, hesap fişi, menünün son sayfası, kapıdaki "bizi değerlendirin" standı.</li>
<li><strong>Otel:</strong> Oda kartı, check-out masası, asansör içi, oda telefonunun yanı.</li>
<li><strong>Klinik & güzellik:</strong> Resepsiyon, bekleme alanı, randevu hatırlatma SMS'i.</li>
<li><strong>E-ticaret & kargo:</strong> Kutu içi teşekkür kartı, fatura, ürün etiketi.</li>
</ul>

<p>Her QR koda bir çağrı metni ekleyin: "Deneyiminizi 10 saniyede paylaşın" gibi net bir cümle, çıplak bir karekodun okunma oranını belirgin biçimde artırır.</p>

<h2>Adım 4: Yanıt oranını artırın</h2>

<p>QR kodu astınız ama kimse okutmuyorsa akış değer üretmez. Yanıt oranını artırmaya yardımcı taktikler:</p>

<ul>
<li><strong>Zamanlama:</strong> Müşteriye deneyim biter bitmez sunun. Bir hafta sonra gelen anket unutulmuş bir deneyimi ölçer.</li>
<li><strong>Kısalık:</strong> İlk ekran tek soru olmalı. Her ek zorunlu adım tamamlanma oranını düşürür.</li>
<li><strong>Görünürlük:</strong> Karekodu göz hizasında ve yeterince büyük basın. Buruşmuş, küçük bir kod taranmaz.</li>
<li><strong>İnsan teması:</strong> Personelin "deneyiminizi bizimle paylaşır mısınız?" demesi, sessiz bir standa göre belirgin şekilde daha etkilidir.</li>
</ul>

<h2>Adım 5: Geri bildirimi operasyona çevirin</h2>

<p>Toplanan geri bildirim bir klasörde beklerse hiçbir işe yaramaz. Değer, döngüyü kapatmaktan gelir:</p>

<ul>
<li><strong>Tek gelen kutusunda toplayın:</strong> QR'dan gelen tüm geri bildirimleri tek yerde görün; şube, QR etiketi ve tarihe göre filtreleyin.</li>
<li><strong>Hızlı yanıt verin:</strong> Özellikle düşük puanlı geri bildirimlere saatler içinde dönmek, kızgın bir müşteriyi sadık bir müşteriye çevirebilir.</li>
<li><strong>Tekrarlayan temaları yakalayın:</strong> "Servis yavaş" beş kez tekrar ediyorsa bu bir tesadüf değil, bir süreç sorunudur.</li>
</ul>

<p>Buaze'de QR'dan gelen geri bildirim anında gelen kutusuna düşer, düşük puanlarda e-posta uyarısı gider ve Pulse AI yanıt için bir taslak hazırlar; siz metni görüp onaylamadan hiçbir şey gönderilmez. Bu akışı <a href="/tr/features">özellikler sayfamızda</a> ayrıntılı inceleyebilirsiniz.</p>

<h2>Sık yapılan hatalar</h2>

<ul>
<li><strong>Çok uzun form:</strong> 10 soruluk anket, 1 soruluk akışa göre çok daha az tamamlanır.</li>
<li><strong>Geri bildirime yanıt vermemek:</strong> Cevapsız kalan müşteri bir daha yazmaz.</li>
<li><strong>Şube/masa bilgisini atlamak:</strong> Bağlam olmayan geri bildirim sorunu lokalize etmenizi engeller.</li>
<li><strong>Tek seferlik kampanya gibi davranmak:</strong> Geri bildirim sürekli bir nabızdır, bir defalık iş değil.</li>
</ul>

<h2>Özet</h2>

<p>QR kod ile müşteri geri bildirimi toplamak; düşük maliyetli, hızlı kurulan ve doğru tasarlandığında operasyonunuzu sürekli iyileştiren bir sistemdir. Net bir hedef belirleyin, akışı kısa tutun, kodu doğru yere koyun, yanıt oranını insan temasıyla destekleyin ve en önemlisi: gelen her sinyale gerçek bir aksiyonla karşılık verin.</p>

<p>Daha fazla pratik için <a href="/tr/blog/restoran-yorumlari-nasil-artirilir">restoran yorumlarını artırma rehberimize</a> veya <a href="/tr/solutions/restaurants">restoranlar için çözüm sayfamıza</a> göz atabilirsiniz.</p>
`,
  },
  {
    slug: 'online-itibar-yonetimi-nedir',
    title: 'Online İtibar Yönetimi Nedir? İşletmeler için Kapsamlı Rehber',
    description:
      'Online itibar yönetimi nedir, neden önemlidir ve nasıl yapılır? Google yorumlarından sosyal medyaya, yerel işletmeler için itibar yönetiminin tüm bileşenlerini açıklayan kapsamlı rehber.',
    readTime: '10 dk okuma',
    tags: ['itibar yönetimi', 'Google yorumları', 'rehber'],
    content: `
<p>Bir müşteri sizi ziyaret etmeden önce büyük olasılıkla adınızı Google'da aratıyor. Gördüğü yıldız puanı, son yorumlar ve işletmenizin bu yorumlara nasıl yanıt verdiği; o müşterinin içeri girip girmeyeceğini saniyeler içinde belirliyor. İşte <strong>online itibar yönetimi</strong> tam olarak bu algıyı bilinçli biçimde yönetme disiplinidir.</p>

<p>Bu rehberde online itibar yönetiminin ne olduğunu, hangi bileşenlerden oluştuğunu ve küçük bir yerel işletmenin bile bunu nasıl sistematik biçimde uygulayabileceğini açıklıyoruz.</p>

<h2>Online itibar yönetimi nedir?</h2>

<p>Online itibar yönetimi (ORM — Online Reputation Management), bir işletmenin internetteki algısını izleme, etkileme ve iyileştirme sürecidir. Bu süreç tek bir kanalı değil, müşterinin sizinle ilgili karşılaştığı tüm dijital temas noktalarını kapsar:</p>

<ul>
<li>Google İşletme Profili yorumları ve yıldız puanı</li>
<li>Yemeksepeti, Getir, Trendyol gibi platform değerlendirmeleri</li>
<li>Sosyal medya yorumları ve etiketlemeler</li>
<li>Sektörel platformlar (Tripadvisor, Booking, Yelp vb.)</li>
<li>Web sitenizdeki ve doğrudan size ulaşan müşteri geri bildirimleri</li>
</ul>

<p>İtibar yönetimi; yorumları silmek, gizlemek veya manipüle etmek değildir. Tam tersine, gerçek müşteri deneyimini görünür kılmak, sorunları hızla çözmek ve memnun müşterilerin sesini duyurmaktır.</p>

<h2>Neden bu kadar önemli?</h2>

<p>Tüketici davranışı net bir gerçeği gösteriyor: insanlar bir işletmeyi denemeden önce başkalarının deneyimine bakıyor. Yıldız puanı düşük veya yorumları yanıtsız bir işletme, daha kapısından içeri girilmeden eleniyor. Online itibarınız bugün artık bir vitrindir; üstelik 7/24 açık olan ve hiç kapanmayan bir vitrin.</p>

<blockquote>İyi yönetilen bir itibar, reklamdan daha güçlüdür: çünkü potansiyel müşteriniz sizin sözünüze değil, başka müşterilerin tanıklığına güvenir.</blockquote>

<p>Bunun ötesinde Google, yorum sayısının ve puanının yerel arama sıralamasında etkili olduğunu kendi yardım sayfalarında belirtir ve işletmelere yorumlara yanıt vermelerini önerir. Yani itibar yönetimi aynı zamanda <strong>yerel SEO</strong>'nun da bir parçasıdır.</p>

<h2>Online itibar yönetiminin 5 bileşeni</h2>

<h3>1. İzleme (Monitoring)</h3>

<p>Yönetemediğiniz şeyi ölçemezsiniz. İlk adım, işletmeniz hakkında nerede ne söylendiğini düzenli olarak takip etmektir. Yorum aldığınız platformları listeleyin ve her birini düzenli aralıklarla kontrol edin; Google İşletme Profili ve teslimat platformlarının yeni yorum bildirimlerini açık tutun.</p>

<h3>2. Yanıt verme (Responding)</h3>

<p>Yorumlara verdiğiniz yanıt, çoğu zaman yorumun kendisinden daha çok izleyiciye hitap eder. Olumlu yorumlara teşekkür etmek bağlılığı pekiştirir; olumsuz yorumlara sakin, çözüm odaklı yanıt vermek ise potansiyel müşterilere "bu işletme sorunları ciddiye alıyor" mesajını verir. Olumsuz yorumlara nasıl yaklaşılacağını <a href="/tr/blog/olumsuz-musteri-yorumlarini-yonetme">olumsuz müşteri yorumlarını yönetme yazımızda</a> ayrıntılı ele alıyoruz.</p>

<h3>3. Geri bildirim toplama (Soliciting)</h3>

<p>İyi deneyimler genellikle sessiz kalır; mutsuz müşteriler ise daha sesli olur. Bu dengesizliği düzeltmenin tek yolu, memnun müşterilerden de aktif olarak geri bildirim istemektir. QR akışları bunu kolaylaştırır — ayrıntı için <a href="/tr/blog/qr-kod-ile-musteri-geri-bildirimi-toplama-rehberi">QR ile geri bildirim toplama rehberimize</a> bakın.</p>

<h3>4. Analiz (Analyzing)</h3>

<p>Tek tek yorumlar bir ağaçtır; asıl değer ormanı görmektedir. Tekrar eden temaları (servis hızı, fiyat, temizlik, personel tutumu) tespit ettiğinizde, geri bildirim bir şikâyet listesinden bir iyileştirme yol haritasına dönüşür.</p>

<h3>5. İyileştirme (Acting)</h3>

<p>İtibar yönetiminin en çok atlanan ama en kritik adımı budur: gelen sinyale göre operasyonu gerçekten değiştirmek. "Servis yavaş" diyen on yorumdan sonra mutfak akışını yeniden tasarlamak, yüz yeni olumlu yorumdan daha değerlidir.</p>

<h2>Küçük işletmeler için pratik bir başlangıç planı</h2>

<ul>
<li><strong>Hafta 1:</strong> Google İşletme Profilinizi eksiksiz doldurun, tüm yorum kanallarınızı tek yerde toplayın.</li>
<li><strong>Hafta 2:</strong> Geçmiş yanıtsız yorumlara dönün; her birine kişisel, çözüm odaklı yanıt yazın.</li>
<li><strong>Hafta 3:</strong> Bir QR geri bildirim akışı kurun ve fiziksel temas noktalarına yerleştirin.</li>
<li><strong>Hafta 4:</strong> İlk ayın temalarını analiz edin, en sık tekrar eden sorunu çözmek için somut bir adım atın.</li>
</ul>

<h2>İtibar yönetiminde yapılmaması gerekenler</h2>

<ul>
<li><strong>Sahte yorum üretmek:</strong> Platform politikalarına aykırıdır, tespit edildiğinde işletmeniz cezalandırılır ve güveni kalıcı olarak yıkar.</li>
<li><strong>Olumsuz yorumları yok saymak:</strong> Yanıtsız bir şikâyet, izleyen herkese "umursamıyoruz" der.</li>
<li><strong>Yalnızca yüksek puanlıları yorum yazmaya teşvik etmek:</strong> Müşteri tercihini gizleyen seçici yönlendirme etik değildir; her müşteri kendi deneyimini paylaşma hakkına sahiptir.</li>
</ul>

<h2>Özet</h2>

<p>Online itibar yönetimi; izleme, yanıt verme, geri bildirim toplama, analiz ve iyileştirme adımlarından oluşan sürekli bir döngüdür. Doğru kurulduğunda yalnızca daha iyi yorumlar değil, daha iyi bir işletme üretir. Buaze bu döngünün QR ile geri bildirim toplama, düşük puan uyarısı, yanıt taslağı ve analiz adımlarına yardımcı olur; <a href="/tr/pricing">planları inceleyebilir</a> veya <a href="/tr/how-it-works">nasıl çalıştığını</a> görebilirsiniz.</p>
`,
  },
  {
    slug: 'cok-platformlu-yorum-yonetimi',
    title: 'Çok Platformlu Yorum Yönetimi: Google, Yemeksepeti, Trendyol',
    description:
      'Google, Yemeksepeti, Getir ve Trendyol yorumlarını takip etmek için pratik bir plan: platform listesi, yanıt standardı, haftalık analiz ve doğru yorum bağlantıları.',
    readTime: '8 dk okuma',
    tags: ['yorum yönetimi', 'çok platform', 'Google yorumları'],
    content: `
<p>Bugün bir restoran, kafe veya yerel işletme aynı anda birçok platformda değerlendiriliyor: Google İşletme Profili, Yemeksepeti, Getir, Trendyol Yemek ve sektöre göre Tripadvisor veya Booking. Her platform ayrı bir panel, ayrı bir bildirim, ayrı bir giriş ekranı demek. Bu dağınıklık, yorumların kaçırılmasına ve yanıt sürelerinin uzamasına yol açar. <strong>Çok platformlu yorum yönetimi</strong>, bu kanalları düzenli ve aynı standartla takip etme disiplinidir.</p>

<h2>Dağınık yorum yönetiminin maliyeti</h2>

<p>Yorumlar farklı platformlara dağıldığında üç somut sorun ortaya çıkar:</p>

<ul>
<li><strong>Kaçırılan yorumlar:</strong> Günde beş platformu tek tek kontrol etmek zordur; kontrol edilmeyen platformdaki olumsuz yorum günlerce yanıtsız kalır.</li>
<li><strong>Yavaş yanıt:</strong> Müşteriler hızlı yanıt bekler. Platform değiştirip giriş yapma zorunluluğu, yanıt süresini saatlerden günlere çıkarır.</li>
<li><strong>Bütünsel görüş kaybı:</strong> Her platforma ayrı bakınca "genel olarak nasıl gidiyoruz?" sorusuna cevap veremezsiniz.</li>
</ul>

<blockquote>İtibarınız tek bir platformda değil, müşterinin sizi bulduğu her yerde oluşur. Her kanala aynı özenle bakmak gerekir.</blockquote>

<h2>Düzenli takibin faydaları</h2>

<h3>1. Hiçbir yorumu kaçırmama</h3>

<p>Her platformun yeni yorum bildirimlerini açık tutmak ve gün içinde belirli saatlerde kontrol etmek, hiçbir yorumun haftalarca yanıtsız kalmamasını sağlar. Özellikle düşük puanlı yorumları erken görmek, sorunu müşteriyle konuşarak çözmeniz için zaman kazandırır.</p>

<h3>2. Yanıt süresini kısaltma</h3>

<p>Hangi platformu kimin, ne sıklıkla yanıtlayacağını belirlemek ve sık gelen konular için hazır yanıt şablonları yazmak, yanıt sürenizi kısaltır. Buaze, kendi QR akışınızdan gelen geri bildirimler için Pulse AI ile yanıt taslağı hazırlar; siz onaylamadan hiçbir şey gönderilmez. Buaze diğer platformlardaki yorumları içeri aktarmaz. Ayrıntılar <a href="/tr/features/pulse-ai">Pulse AI sayfamızda</a>.</p>

<h3>3. Bütünsel itibar görünümü</h3>

<p>Platformları haftalık olarak yan yana değerlendirmek; ortalama puanınızı, en sık tekrar eden temaları ve hangi platformda hangi sorunun yoğunlaştığını ortaya çıkarır. Örneğin Google'da puanınız yüksekken bir teslimat platformunda düşükse, bu çoğu zaman bir paketleme veya teslimat sorununa işaret eder.</p>

<h2>Türkiye'de hangi platformları izlemelisiniz?</h2>

<ul>
<li><strong>Google İşletme Profili:</strong> Yerel aramanın merkezi; en yüksek görünürlük ve en kritik kanal.</li>
<li><strong>Yemeksepeti & Getir:</strong> Yemek siparişi veren müşterilerin değerlendirme yaptığı ana platformlar.</li>
<li><strong>Trendyol Yemek:</strong> Hızla büyüyen sipariş ekosisteminde ayrı bir değerlendirme havuzu.</li>
<li><strong>Tripadvisor / Booking:</strong> Otel ve turistik işletmeler için belirleyici.</li>
<li><strong>Yandex & sosyal medya:</strong> Bölgeye ve hedef kitleye göre ek sinyaller.</li>
</ul>

<p>Her işletmenin platform karması farklıdır. Bir kafe için Google + teslimat platformları yeterliyken, bir otel için Tripadvisor ve Booking öne çıkar. Sektörünüze uygun çözümü <a href="/tr/solutions/restaurants">restoranlar</a> veya <a href="/tr/solutions/hotels">oteller</a> çözüm sayfalarımızda inceleyebilirsiniz.</p>

<h2>QR akışı ile platformları beslemek</h2>

<p>Çok platformlu yönetim yalnızca gelen yorumları okumak değildir; aynı zamanda müşterilere doğru platformların yorum bağlantısını sunmaktır. Bir QR geri bildirim akışı, masadaki her müşteriye uygun platformun yorum bağlantısını sunabilir. Burada da ilke aynıdır: yönlendirme bir tercihtir, bir zorlama değil. Her müşteri istediği yere yorum yazma hakkını korur.</p>

<h2>Pratik bir uygulama planı</h2>

<ul>
<li><strong>1. Platformları listeleyin:</strong> İşletmenizin gerçekten değerlendirildiği tüm kanalları yazın.</li>
<li><strong>2. Takip düzeni kurun:</strong> Her platformun bildirimlerini açın ve kimin hangi kanala bakacağını belirleyin.</li>
<li><strong>3. Yanıt standardı belirleyin:</strong> Olumlu, nötr ve olumsuz yorumlar için ton ve süre hedefleri koyun.</li>
<li><strong>4. Haftalık analiz yapın:</strong> Platformlar arası ortalamayı ve tekrar eden temaları gözden geçirin.</li>
<li><strong>5. QR ile besleyin:</strong> Fiziksel temas noktalarına geri bildirim akışı yerleştirin.</li>
</ul>

<h2>Özet</h2>

<p>Yorumlarınız dağınık olduğunda itibarınız da dağınık olur. Çok platformlu yorum yönetimi; Google, Yemeksepeti, Getir, Trendyol ve diğer kanalları düzenli takip ederek hiçbir yorumu kaçırmamanızı, daha hızlı yanıt vermenizi ve işletmenizin genel itibarını bütünsel görmenizi sağlar. Buaze diğer platformlardaki yorumları içeri aktarmaz; QR akışınızdan gelen geri bildirimleri tek gelen kutusunda toplar ve 10 platformdaki yorum bağlantılarınızı yönetir. <a href="/tr/how-it-works">Nasıl çalıştığını</a> görün veya <a href="/tr/pricing">planları inceleyin</a>.</p>
`,
  },
];

async function main() {
  let upserted = 0;
  for (const post of POSTS) {
    await prisma.blogPost.upsert({
      where: { slug_locale: { slug: post.slug, locale: 'tr' } },
      update: {
        title: post.title,
        description: post.description,
        content: post.content.trim(),
        readTime: post.readTime,
        tags: post.tags,
        coverImage: COVER,
        author: AUTHOR,
        authorRole: AUTHOR_ROLE,
        date: DATE,
        isActive: true,
      },
      create: {
        slug: post.slug,
        locale: 'tr',
        title: post.title,
        description: post.description,
        content: post.content.trim(),
        date: DATE,
        readTime: post.readTime,
        author: AUTHOR,
        authorRole: AUTHOR_ROLE,
        coverImage: COVER,
        tags: post.tags,
        isActive: true,
      },
    });
    upserted += 1;
    console.log(`upserted: /tr/blog/${post.slug}`);
  }
  console.log(`Done. ${upserted} pillar posts upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
