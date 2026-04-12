'use client';

export default function GizlilikPolicy() {
  const lastUpdate = new Date().toLocaleDateString('tr-TR');
  
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 bg-white font-sans text-[#334155]">
      <h1 className="text-3xl font-black text-[#0f172a] mb-10 border-b pb-6">Gizlilik Politikası</h1>
      
      <div className="space-y-10 leading-relaxed font-medium">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Son Güncelleme: {lastUpdate}</p>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">1. Veri Güvenliği</h2>
          <p>
            ReviewsFlow olarak, geri bildirim formları üzerinden toplanan verilerin korunmasını en üst düzeyde sağlıyoruz. 
            Bu politika, verilerinizin kapsamını ve kullanım şeklini açıklar.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">2. Toplanan Veriler</h2>
          <p>
            Formu doldurduğunuzda; adınız, telefon numaranız, e-posta adresiniz, puanınız ve yorumlarınız sistemimize kaydedilir. 
            Güvenlik amacıyla IP adresiniz sınırlı süreyle işlenebilir.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-[#0f172a]">3. Kullanım Amacı</h2>
          <p>
             Verileriniz sadece hizmet kalitesinin ölçülmesi ve müşteri memnuniyetinin artırılması amacıyla kullanılır. 
             Yasal zorunluluklar hariç üçüncü şahıslara satılmaz.
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
