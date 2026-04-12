export default function AcikRizaText() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-6">Açık Rıza Metni</h1>
      <div className="prose prose-red text-[var(--color-text-muted)] space-y-4">
        
        <p>
          Mamma's Burger ("Şirket") tarafından sunulan ürün ve hizmetlere ilişkin değerlendirmelerimin
          alınması, müşteri memnuniyetinin ölçülmesi ve taleplerimin/şikayetlerimin çözüme kavuşturulması 
          amaçlarıyla;
        </p>

        <p>
          Ad, soyad, iletişim (e-posta adresi, telefon numarası) ve müşteri işlemi (yorum/değerlendirme) 
          verilerimin 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında işlenmesine,
        </p>

        <p>
          Ayrıca, web sitesinin barındırıldığı sunucuların (ör. Vercel, Supabase) yurt dışında bulunması
          sebebiyle, söz konusu kişisel verilerimin KVKK'nın 9. maddesi uyarınca <strong>yurt dışına aktarılmasına</strong>,
        </p>

        <p>Aydınlatma Metni'ni okuyup anladığımı beyan ederek kendi özgür irademle açık rıza veriyorum.</p>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/" className="text-[var(--color-primary-600)] hover:underline">&larr; Ana sayfaya dön</a>
        </div>
      </div>
    </div>
  );
}
