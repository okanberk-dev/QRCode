'use client';

export default function AcikRizaText() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white font-sans text-[#334155]">
      <h1 className="text-3xl font-black text-[#0f172a] mb-10 border-b pb-6">Açık Rıza Metni</h1>
      
      <div className="space-y-10 leading-relaxed">
        <section className="space-y-4">
          <p className="font-medium text-lg">
            ReviewsFlow (“Şirket”) tarafından sunulan Aydınlatma Metni’ni okudum ve anladım. Şirket’in hizmet kalitesini 
            artırmak, müşteri deneyimini ölçümlemek ve geri bildirim süreçlerini yönetmek amacıyla hazırladığı dijital altyapı aracılığıyla;
          </p>
        </section>

        <section className="bg-gray-50 p-10 rounded-[32px] border border-gray-100 space-y-6">
          <p className="font-bold text-[#0f172a] text-xl">Aşağıdaki durumlara özgür irademle onay veriyorum:</p>
          <ul className="space-y-4 font-medium">
            <li className="flex gap-4">
              <span className="text-[#79C5D1] font-black">•</span>
              <span>Kimlik (Ad, Soyad) ve İletişim (Telefon, E-posta) verilerimin, sadece belirtilen amaçlarla sınırlı kalmak kaydıyla işlenmesine,</span>
            </li>
            <li className="flex gap-4">
              <span className="text-[#79C5D1] font-black">•</span>
              <span>Hizmetin teknik altyapısı gereği verilerimin güvenli sunucularda muhafaza edilmesine ve bu amaçla yurt dışına aktarılmasına,</span>
            </li>
            <li className="flex gap-4">
              <span className="text-[#79C5D1] font-black">•</span>
              <span>Verilerimin, hizmetin sunumu için gerekli teknik iş ortakları ile paylaşılmasına.</span>
            </li>
          </ul>
        </section>

        <p className="italic text-sm text-gray-400 font-bold">
          Bu rızayı dilediğim zaman okanberk16@gmail.com adresine ulaşarak geri çekme hakkına sahip olduğumu biliyorum.
        </p>

        <div className="mt-12 pt-10 border-t border-gray-100 flex justify-center">
          <a href="/" className="px-10 py-4 bg-[#111827] text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200">
            Anladım, Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}
