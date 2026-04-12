export default function TicariIletiText() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white">
      <h1 className="text-2xl font-bold text-[#202124] mb-8 border-b pb-4">Ticari Elektronik İleti Onay Metni</h1>
      
      <div className="space-y-8 text-[15px] leading-relaxed text-[#3c4043]">
        <section>
          <p>
            Mamma's Burger (“Şirket”) tarafından sunulan ürün, hizmet, menü güncellemeleri, özel teklifler, fırsat ve 
            kampanyalar hakkında bilgilendirilmem, tanıtım ve pazarlama faaliyetlerinin yürütülmesi amaçlarıyla;
          </p>
        </section>

        <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
          <p className="mb-4 text-[#202124]">
            Tarafımla e-posta ve/veya SMS (Kısa Mesaj) kanalları üzerinden iletişime geçilmesine, elektronik ticari ileti 
            gönderilmesine ve bu amaçla iletişim verilerimin (telefon numarası, e-posta adresi) işlenerek, 
            6563 Sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca İleti Yönetim Sistemi (İYS) üzerinden kayıt altına alınmasına;
          </p>
          <p className="font-bold text-[#1a73e8]">Açık rızamla onay veriyorum.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202124] mb-3">Ret Hakkı ve İptal Prosedürü</h2>
          <p className="mb-4">
            Dilediğiniz zaman, hiçbir gerekçe göstermeksizin ticari elektronik ileti almayı reddetme hakkına sahipsiniz. 
            Ret talebinizi tarafınıza gönderilen iletilerdeki reddetme bağlantısını (ret linki) kullanarak veya 
            <strong> info@mammasburger.com</strong> adresine e-posta göndererek ücretsiz olarak iletebilirsiniz. 
          </p>
          <p>
            Talebiniz Şirkete ulaştığı tarihten itibaren en geç 3 (üç) iş günü içerisinde ticari elektronik ileti 
            gönderimi durdurulacaktır.
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
