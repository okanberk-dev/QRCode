export default function KvkkNotice() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-6">KVKK Aydınlatma Metni</h1>
      <div className="prose prose-red text-[var(--color-text-muted)] space-y-4">
        
        <p>
          6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, Mamma's Burger ("Veri Sorumlusu") olarak, 
          kişisel verilerinizin güvenliğine ve hukuka uygun şekilde işlenmesine büyük önem veriyoruz.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6">1. İşlenen Kişisel Veriler</h2>
        <p>Değerlendirme formumuz aracılığıyla yalnızca kendi isteğinizle paylaştığınız Ad, Soyad, E-posta adresi ve Telefon numarası verileriniz işlenmektedir.</p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6">2. Kişisel Verilerin İşlenme Amacı</h2>
        <p>Söz konusu kişisel verileriniz;</p>
        <ul className="list-disc pl-5">
          <li>Müşteri memnuniyetine yönelik aktivitelerin yürütülmesi,</li>
          <li>Talep ve şikayetlerin takibi,</li>
          <li>Hizmet kalitesinin artırılması</li>
        </ul>
        <p>amaçlarıyla sınırlı olarak işlenmektedir.</p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6">3. Kişisel Verilerin Aktarımı</h2>
        <p>Kişisel verileriniz, kanunen yetkili kamu kurumları haricinde herhangi bir üçüncü tarafa aktarılmamaktadır.</p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6">4. İlgili Kişinin Hakları</h2>
        <p>KVKK'nın 11. maddesi uyarınca veri sorumlusuna başvurarak kendinizle ilgili bilgi talep etme, verilerinizin silinmesini isteme hakkına sahipsiniz.</p>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/" className="text-[var(--color-primary-600)] hover:underline">&larr; Ana sayfaya dön</a>
        </div>
      </div>
    </div>
  );
}
