export default function AcikRizaText() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white">
      <h1 className="text-2xl font-bold text-[#202124] mb-8 border-b pb-4">Kişisel Verilerin İşlenmesine İlişkin Açık Rıza Metni</h1>
      
      <div className="space-y-8 text-[15px] leading-relaxed text-[#3c4043]">
        <section>
          <p>
            Mamma's Burger (“Şirket”) tarafından sunulan Aydınlatma Metni’ni okudum ve anladım. Şirket’in hizmet kalitesini 
            artırmak, müşteri deneyimini ölçümlemek ve şikayet/talep süreçlerini yönetmek amacıyla hazırladığı dijital form aracılığıyla;
          </p>
        </section>

        <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <p className="font-medium text-[#202124] mb-3">Aşağıda belirtilen durumlara özgür irademle açık rıza veriyorum:</p>
          <ul className="list-disc pl-5 space-y-3">
            <li>
              Kimlik (Ad, Soyad) ve İletişim (Telefon, E-posta) verilerimin, Şirket tarafından sadece 
              bildirilen amaçlarla sınırlı olmak kaydıyla işlenmesine,
            </li>
            <li>
              Web sitesinin barındırıldığı teknolojik altyapının sunucularının yurt dışında bulunması nedeniyle, 
              verilerimin güvenli bir şekilde <strong>yurt dışına aktarılmasına</strong>,
            </li>
            <li>
              Verilerimin, hizmetin sunulabilmesi için gerekli olan teknik iş ortaklarına aktarılmasına.
            </li>
          </ul>
        </section>

        <p>
          İşbu açık rıza beyanımı dilediğim zaman geri alma hakkına sahip olduğumu, bu durumda talebimi 
          <strong> info@mammasburger.com</strong> adresine iletebileceğimi biliyorum.
        </p>

        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
          <a href="/" className="px-8 py-3 bg-[#1a73e8] text-white rounded-full font-medium text-sm hover:shadow-lg transition-all">
            Okudum, Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}
