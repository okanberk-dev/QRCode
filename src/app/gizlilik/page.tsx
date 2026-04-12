export default function GizlilikPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-6">Gizlilik Politikası</h1>
      <div className="prose prose-red text-[var(--color-text-muted)] space-y-4">
        <p>Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <h2 className="text-xl font-semibold text-gray-800 mt-6">1. Toplanan Bilgiler</h2>
        <p>Hizmet kalitemizi artırmak amacıyla form aracılığıyla isteğe bağlı olarak ad, soyad, e-posta, telefon ve değerlendirme yorumunuz işlenebilir.</p>
        
        <h2 className="text-xl font-semibold text-gray-800 mt-6">2. Bilgilerin Kullanımı</h2>
        <p>Topladığımız bilgiler sadece restoran hizmet kalitemizin ölçülmesi, müşteri memnuniyetinin sağlanması ve olası şikayetlerde size ulaşılabilmesi amacıyla kullanılır.</p>
        
        <h2 className="text-xl font-semibold text-gray-800 mt-6">3. Bilgi Paylaşımı</h2>
        <p>Kişisel verileriniz, yasal zorunluluklar haricinde hiçbir üçüncü taraf kişi veya kurumla paylaşılmaz.</p>
        
        <h2 className="text-xl font-semibold text-gray-800 mt-6">4. İletişim</h2>
        <p>Gizlilik politikamız ile ilgili sorularınız için bizimle info@mammasburger.com adresi üzerinden iletişime geçebilirsiniz.</p>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/" className="text-[var(--color-primary-600)] hover:underline">&larr; Ana sayfaya dön</a>
        </div>
      </div>
    </div>
  );
}
