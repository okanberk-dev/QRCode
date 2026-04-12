export default function GizlilikPolicy() {
  const lastUpdate = new Date().toLocaleDateString('tr-TR');
  
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white">
      <h1 className="text-2xl font-bold text-[#202124] mb-8 border-b pb-4">Gizlilik Politikası</h1>
      
      <div className="space-y-8 text-[15px] leading-relaxed text-[#3c4043]">
        <p className="text-sm text-[#70757a]">Son Güncelleme: {lastUpdate}</p>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">1. Veri Güvenliği Taahhüdü</h2>
          <p>
            Mamma's Burger (“Şirket”) olarak, gizliliğinize saygı duyuyor ve bizimle paylaştığınız kişisel verilerin korunmasını 
            en üst düzeyde sağlıyoruz. Bu politika, QR kod üzerinden eriştiğiniz değerlendirme formunda toplanan verilerin 
            kapsamını ve kullanım şeklini açıklar.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">2. Hangi Veriler Toplanır?</h2>
          <p>
            Değerlendirme formunu doldurduğunuzda; adınız, soyadınız (varsa), telefon numaranız, e-posta adresiniz, 
            verdiğiniz puan ve yazdığınız yorumlar sistemimize kaydedilir. Ayrıca, sistem güvenliği ve mükerrer kayıtları 
            önlemek amacıyla IP adresiniz ve cihaz bilgileriniz (User Agent) sınırlı süreyle işlenecektir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">3. Verilerin Kullanım Amacı</h2>
          <p>
            Toplanan veriler sadece restoran hizmet kalitemizin ölçülmesi, müşteri memnuniyetinin artırılması ve 
            olası taleplerinizde size ulaşılabilmesi amacıyla kullanılır. Verileriniz, yasal zorunluluklar hariç 
            üçüncü şahıslara satılmaz veya devredilmez.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">4. Verilerin Saklanması</h2>
          <p>
            Verileriniz, işleme amacının gerektirdiği süre boyunca veya yasal zaman aşımı süreleri uyarınca güvenli sunucularda 
            saklanır. Amacın ortadan kalkması halinde verileriniz KVKK mevzuatına uygun olarak imha edilir veya anonim hale getirilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">5. İletişim</h2>
          <p>
            Gizlilik politikamız hakkındaki tüm soru ve talepleriniz için bize her zaman <strong>info@mammasburger.com</strong> 
            üzerinden ulaşabilirsiniz.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
          <a href="/" className="px-8 py-3 bg-[#1a73e8] text-white rounded-full font-medium text-sm hover:shadow-lg transition-all">
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}
