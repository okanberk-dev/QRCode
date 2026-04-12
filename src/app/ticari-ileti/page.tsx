export default function TicariIletiText() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-6">Ticari Elektronik İleti Onay Metni</h1>
      <div className="prose prose-red text-[var(--color-text-muted)] space-y-4">
        
        <p>
          Mamma's Burger ("Şirket") tarafından sunulan ürün, hizmet, menü güncellemeleri, özel teklif, fırsat ve 
          kampanyalar hakkında bilgilendirilmem, reklam ve pazarlama faaliyetlerinin yürütülmesi amaçlarıyla;
        </p>

        <p>
          Tarafımla e-posta, SMS (Kısa Mesaj) ve/veya arama yoluyla iletişime geçilmesine, 
          elektronik ticari ileti gönderilmesine ve bu amaçla iletişim verilerimin (telefon numarası, e-posta adresi) 
          işlenerek Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca İleti Yönetim Sistemi (İYS) ve 
          hizmet alınan üçüncü taraflarla paylaşılmasına,
        </p>

        <p>Herhangi bir etki altında kalmaksızın, açık irademle onay veriyorum.</p>

        <p className="text-sm text-gray-500 mt-4 border-l-4 border-gray-200 pl-4">
          * İstediğiniz zaman, tarafınıza gönderilen iletilerdeki reddetme bağlantısını (ret linki/SMS ret kodu)
          kullanarak veya info@mammasburger.com adresine e-posta göndererek onayınızı geri çekebilir ve ileti almayı durdurabilirsiniz.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/" className="text-[var(--color-primary-600)] hover:underline">&larr; Ana sayfaya dön</a>
        </div>
      </div>
    </div>
  );
}
