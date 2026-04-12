'use client';

export default function KvkkNotice() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white font-sans text-[#334155]">
      <h1 className="text-3xl font-black text-[#0f172a] mb-10 border-b pb-6">KVKK Aydınlatma Metni</h1>
      
      <div className="space-y-10 leading-relaxed font-medium">
        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">1. Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, kişisel verileriniz; veri sorumlusu olarak 
            <strong> ReviewsFlow</strong> tarafından aşağıda açıklanan kapsamda işlenebilecektir.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">2. Kişisel Verilerin İşlenme Amacı</h2>
          <p>Toplanan kişisel verileriniz (Ad, Soyad, Telefon, E-posta, Geri Bildirim İçeriği);</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Müşteri memnuniyetine yönelik süreçlerin yürütülmesi,</li>
            <li>Hizmet kalitesinin artırılması ve iyileştirilmesi,</li>
            <li>Talep ve şikayetlerin takibi,</li>
            <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
          </ul>
          <p className="mt-3">amaçlarıyla KVKK’nın 5. ve 6. maddeleri uyarınca işlenmektedir.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">3. Veri Aktarımı</h2>
          <p>
            Verileriniz; sadece hizmetin sunulabilmesi için gerekli olan teknik altyapı sağlayıcılarımıza ve yasal zorunluluk halinde yetkili kamu kurumlarına aktarılabilir.
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
