export default function KvkkNotice() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white">
      <h1 className="text-2xl font-bold text-[#202124] mb-8 border-b pb-4">6698 Sayılı KVKK Uyarınca Aydınlatma Metni</h1>
      
      <div className="space-y-8 text-[15px] leading-relaxed text-[#3c4043]">
        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">1. Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, kişisel verileriniz; veri sorumlusu olarak 
            <strong> Mamma's Burger</strong> (“Şirket”) tarafından aşağıda açıklanan kapsamda işlenebilecektir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">2. Kişisel Verilerin Hangi Amaçla İşleneceği</h2>
          <p className="mb-3">Toplanan kişisel verileriniz (Ad, Soyad, Telefon, E-posta, Değerlendirme İçeriği);</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Müşteri memnuniyetine yönelik aktivitelerin yürütülmesi,</li>
            <li>Ürün ve hizmetlerin geliştirilmesi ve iyileştirilmesi,</li>
            <li>Talep ve şikayetlerin takibi ve sonuçlandırılması,</li>
            <li>Hukuki süreçlerin yürütülmesi ve mevzuattan kaynaklanan yükümlülüklerin yerine getirilmesi</li>
          </ul>
          <p className="mt-3">amaçlarıyla KVKK’nın 5. ve 6. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları dahilinde işlenecektir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h2>
          <p>
            Kişisel verileriniz; yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, iş ortaklarımıza, 
            kanunen yetkili kamu kurumlarına ve özel kişilere KVKK’nın 8. ve 9. maddelerinde belirtilen kişisel veri işleme şartları 
            ve amaçları çerçevesinde aktarılabilecektir. Verileriniz, sunucu altyapısı gereği yurt dışı merkezli güvenli bulut sistemlerinde 
            muhafaza edilebilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
          <p>
            Kişisel verileriniz, QR kod okutulması suretiyle erişilen dijital form kanalıyla elektronik ortamda toplanmaktadır. 
            Bu süreçte verileriniz, “ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için 
            veri işlenmesinin zorunlu olması” ve “açık rızanızın bulunması” hukuki sebeplerine dayalı olarak toplanmaktadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">5. İlgili Kişinin KVKK'nın 11. Maddesinde Sayılan Hakları</h2>
          <p className="mb-3">Kişisel veri sahibi olarak Şirketimize başvurarak;</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
            <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,</li>
            <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>
            <li>KVKK’nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
          </ul>
          <p className="mt-4 italic text-sm">
            Başvurularınızı Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca <strong>info@mammasburger.com</strong> adresine iletebilirsiniz.
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
