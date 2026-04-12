'use client';

export default function TicariIletiText() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white font-sans text-[#334155]">
      <h1 className="text-3xl font-black text-[#0f172a] mb-10 border-b pb-6">Ticari Elektronik İleti Onay Metni</h1>
      
      <div className="space-y-10 leading-relaxed font-medium">
        <section className="space-y-4">
          <p>
            ReviewsFlow tarafından sunulan ürün, hizmet, özellik güncellemeleri ve kampanyalar hakkında bilgilendirilmem amaçlarıyla;
          </p>
        </section>

        <section className="bg-blue-50 p-10 rounded-[32px] border border-blue-100">
          <p className="mb-4 text-[#0f172a] font-black italic">
            Tarafımla e-posta ve/veya SMS kanalları üzerinden iletişime geçilmesine, elektronik ticari ileti 
            gönderilmesine ve 6563 Sayılı Kanun uyarınca İYS üzerinden kayıt altına alınmasına;
          </p>
          <p className="font-extrabold text-[#79C5D1] text-xl">Özgür irademle onay veriyorum.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">Ret Hakkı</h2>
          <p>
            Dilediğiniz zaman, hiçbir gerekçe göstermeksizin ticari ileti almayı reddedebilirsiniz. 
            Ret talebinizi <strong>okanberk16@gmail.com</strong> adresine iletebilirsiniz. 
          </p>
        </section>

        <div className="mt-12 pt-10 border-t border-gray-100 flex justify-center">
          <a href="/" className="px-10 py-4 bg-[#111827] text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200">
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}
