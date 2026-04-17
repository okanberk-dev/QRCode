export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  readTime: string;
  author: string;
}

export const blogPosts: Record<'tr' | 'en', BlogPost[]> = {
  tr: [
    {
      slug: 'googleda-5-yildiz-nasil-alinir',
      title: 'Google\'da İşletmeniz İçin Daha Fazla 5 Yıldız Nasıl Alınır?',
      description: 'Müşterilerinizin %90\'ından fazlası gelmeden önce Google Haritalar yorumlarınızı okuyor. İşletmenizin Google puanını organik ve hızlı bir şekilde artırmanın kanıtlanmış yolları.',
      date: '15 Nisan 2024',
      readTime: '4 dk okuma',
      author: 'Buaze İçerik Ekibi',
      content: `
        <h2>Google Haritalar Puanı Neden Önemlidir?</h2>
        <p>Bugün bir yemeğe çıkmadan, bir otel rezervasyonu yapmadan veya bir kliniğe gitmeden önce insanların %93'ü ilk olarak Google Haritalar'ı açıp işletmenin yorumlarına bakıyor. Puanınız 4.0'ın altındaysa, potansiyel müşterilerinizin yarısını daha kapıdan girmeden kaybediyorsunuz demektir.</p>
        
        <h2>5 Yıldızlı Yorumları Artırmanın Yolları</h2>
        <h3>1. Doğru Zamanda İsteyin</h3>
        <p>Geri bildirim istemenin en doğru zamanı, müşterinin hizmetten en çok memnun olduğu andır. Restoranlar için hesabı öderken, oteller için check-out sırasında, klinikler için ise tedavi bitimindedir.</p>

        <h3>2. İşlemi Kolaylaştırın</h3>
        <p>Kimse yorum bırakmak için Google'ı açıp sizin işletmenizi aratmakla uğraşmaz. Masalarınızda veya bankolarda bulunan QR kodlu yönlendirmeler sayesinde müşteriler tek saniyede yorum yapma ekranına ulaşmalıdır.</p>
        
        <h3>3. Olumsuzlukları İnternete Düşmeden Çözün</h3>
        <p>Her müşteri mükemmel deneyim yaşayamayabilir. Önemli olan, memnuniyetsiz müşterinin şikayetini Google'a yazmadan önce size iletebilmesidir. Buaze gibi akıllı sistemler, 1-3 yıldız veren müşterileri gizli bir form sayfasına yönlendirerek krizleri büyümeden çözer.</p>

        <h2>Sonuç</h2>
        <p>Google'da 5 yıldız almak şans değil, stratejidir. Müşterilerinize mükemmel hizmet vermenin yanında, bu memnuniyeti dijital ortama aktaracak doğru araçları kullandığınızdan emin olun.</p>
      `
    },
    {
      slug: 'restoran-yorumlari-nasil-artirilir',
      title: 'Restoranlar İçin Google Haritalar Yorumlarını Artırma Stratejileri',
      description: 'Restoranınızın kapısındaki kuyruğu uzatmak ister misiniz? Yemek platformlarına yüksek komisyonlar ödemek yerine kendi organik kitlenizi oluşturun.',
      date: '12 Nisan 2024',
      readTime: '5 dk okuma',
      author: 'Buaze İçerik Ekibi',
      content: `
        <h2>Yemek Platformlarına Karşı Kendi İtibarınız</h2>
        <p>Birçok restoran, yeni müşteri bulmak için Yemeksepeti veya Getir gibi platformlara güveniyor ve her siparişte %30'a varan komisyonlar ödüyor. Oysa kendi lokasyonunuz (Google Maps) etrafında güçlü bir profil çizerseniz, doğrudan paket servis ve gel-al müşterilerinizi organik olarak artırabilirsiniz.</p>

        <h2>Nasıl Yorum Toplayacaksınız?</h2>
        <h3>Masa Üstü QR Menüler / Standlar</h3>
        <p>Yemek beklerken insanların en çok yaptığı şey telefonlarıyla oynamaktır. Masanın köşesinde duran şık bir QR kod standı ("Yemeğimizi nasıl buldunuz?") harika bir tetikleyicidir.</p>

        <h3>Hesap Sümenleri</h3>
        <p>Müşteri hesabı ödemek için sümene baktığında bir teşekkür mesajı ve yorum QR kodu görmek geri dönüşüm oranını muazzam derecede yükseltir.</p>
        
        <h3>Ödüllendirme Stratejisi</h3>
        <p>Personelinizi teşvik edin. Garsonlarınız mutlu ayrılan bir masaya "Yemeklerimizi beğendiyseniz bize Google üzerinden destek olabilirsiniz" dediğinde ve kodu gösterdiğinde dönüşüm oranı en yüksek seviyeye ulaşır.</p>
      `
    },
    {
      slug: 'olumsuz-musteri-yorumlariyla-basa-cikmak',
      title: 'Olumsuz Online Yorumlarla Nasıl Profesyonelce Başa Çıkılır?',
      description: '1 yıldızlı bir Google yorumu işletmenizin sonu değildir. Eğer süreci doğru yönetirseniz, krizi fırsata çevirebilir, müşterinin o yorumu silmesini hatta 5 yıldıza çevirmesini sağlayabilirsiniz.',
      date: '10 Nisan 2024',
      readTime: '3 dk okuma',
      author: 'Buaze İçerik Ekibi',
      content: `
        <h2>Şikayeti Göz Ardı Etmeyin</h2>
        <p>En büyük hata olumsuz yoruma cevap vermemektir. Potansiyel müşteriler, sadece şikayeti değil, sizin işletme olarak o şikayete nasıl yaklaştığınızı da değerlendirir. Agresif veya umursamaz cevaplar işletmenize yazarın yorumundan daha fazla zarar verir.</p>
        
        <h2>Nasıl Cevap Verilmeli?</h2>
        <p>1. <strong>Özür dileyin ve empati yapın:</strong> Haklı olsun ya da olmasın, kişinin kötü bir deneyim yaşadığını kabul edin.</p>
        <p>2. <strong>Çevrimdışına alın:</strong> Konuyu Google üzerinden tartışmayın. "Konuyu detaylı inceleyebilmemiz için bize [iletişim adresi] üzerinden ulaşabilir misiniz?" diyerek iletişim kanalını değiştirin.</p>
        <p>3. <strong>Sistemsel çözümler bulun:</strong> Şikayetteki sorunu içeride çözün ve bunu yaparken süreci iyileştirin.</p>

        <h2>Buaze ile Kriz Önleme (Filtreleme)</h2>
        <p>Buaze'nin akıllı yönlendirme sistemi sayesinde, size düşük puan vermek isteyen müşteriler Google'a değil, direkt işletme yöneticisinin paneline yönlendirilir. Böylece müşteri dert yanar ve deşarj olur, siz hatayı telafi edersiniz, ve en önemlisi bu durum herkese açık olan internet alemine düşmez.</p>
      `
    }
  ],
  en: [
    {
      slug: 'how-to-get-5-stars-on-google',
      title: 'How to Get More 5-Star Reviews for Your Business on Google?',
      description: 'Over 90% of your customers read your Google Maps reviews before visiting. Discover proven ways to boost your business\'s Google rating organically and quickly.',
      date: 'April 15, 2024',
      readTime: '4 min read',
      author: 'Buaze Content Team',
      content: `
        <h2>Why Do Google Maps Ratings Matter?</h2>
        <p>Before dining out, booking a hotel, or visiting a clinic today, 93% of people first open Google Maps and look at the business reviews. If your rating is below 4.0, you are losing half of your potential customers before they even walk through the door.</p>
        
        <h2>Ways to Increase 5-Star Reviews</h2>
        <h3>1. Ask at the Right Time</h3>
        <p>The best time to ask for feedback is the exact moment the customer is most satisfied with the service. For restaurants, this is while paying the bill; for hotels, during check-out; and for clinics, at the end of the treatment.</p>

        <h3>2. Make the Process Easy</h3>
        <p>Nobody wants to bother opening Google and searching for your business just to leave a review. With QR code prompts on your tables or counters, customers should be able to reach the review screen in a single second.</p>
        
        <h3>3. Resolve Issues Before They Hit the Internet</h3>
        <p>Not every customer will have a perfect experience. The crucial part is allowing dissatisfied customers to communicate their complaints to you before writing them on Google. Smart systems like Buaze solve crises before they grow by directing customers who give 1-3 stars to a private form page.</p>

        <h2>Conclusion</h2>
        <p>Getting 5 stars on Google is not luck; it's strategy. Besides providing excellent service, make sure you use the right tools to transfer this satisfaction into the digital space.</p>
      `
    },
    {
      slug: 'how-to-increase-restaurant-reviews',
      title: 'Strategies for Restaurants to Increase Google Maps Reviews',
      description: 'Do you want to lengthen the queue outside your restaurant? Build your own organic audience instead of paying high commissions to food delivery platforms.',
      date: 'April 12, 2024',
      readTime: '5 min read',
      author: 'Buaze Content Team',
      content: `
        <h2>Your Own Reputation vs. Food Delivery Platforms</h2>
        <p>Many restaurants rely on food delivery platforms to find new customers, paying commissions up to 30% per order. However, if you build a strong profile around your own location (Google Maps), you can organically increase your direct delivery and takeaway customers.</p>

        <h2>How Will You Collect Reviews?</h2>
        <h3>Tabletop QR Menus / Stands</h3>
        <p>The number one thing people do while waiting for food is play with their phones. A stylish QR code stand on the corner of the table ("How was your meal?") is a great trigger.</p>

        <h3>Check Holders</h3>
        <p>When the customer looks at the folder to pay the bill, seeing a thank you message and a review QR code significantly increases the conversion rate.</p>
        
        <h3>Rewarding Strategy</h3>
        <p>Incentivize your staff. When your waiters say to a happily departing table, "If you liked our food, you can support us on Google," and show the code, the conversion rate reaches its peak.</p>
      `
    },
    {
      slug: 'handling-negative-customer-reviews',
      title: 'How to Professionally Handle Negative Online Reviews?',
      description: 'A 1-star Google review is not the end of your business. If you manage the process correctly, you can turn the crisis into an opportunity, making the customer delete that review or even turn it into 5 stars.',
      date: 'April 10, 2024',
      readTime: '3 min read',
      author: 'Buaze Content Team',
      content: `
        <h2>Don't Ignore the Complaint</h2>
        <p>The biggest mistake is not responding to a negative review. Potential customers evaluate not only the complaint itself but also how you, as a business, approach that complaint. Aggressive or dismissive responses damage your business more than the author's review.</p>
        
        <h2>How Should You Respond?</h2>
        <p>1. <strong>Apologize and empathize:</strong> Whether they are right or wrong, acknowledge that the person had a bad experience.</p>
        <p>2. <strong>Take it offline:</strong> Don't argue the matter on Google. Change the communication channel by saying, "Could you please contact us at [contact address] so we can investigate the issue in detail?"</p>
        <p>3. <strong>Find systemic solutions:</strong> Solve the problem mentioned in the complaint internally, and improve your process while doing so.</p>

        <h2>Crisis Prevention (Filtering) with Buaze</h2>
        <p>Thanks to Buaze's smart routing system, customers who want to give you a low rating are directed to the business manager's panel directly, not to Google. This way, the customer vents and unburdens themselves, you make up for the mistake, and most importantly, this situation doesn't fall into the public internet domain.</p>
      `
    }
  ]
};
