import { Star, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface CustomerTestimonialsProps {
  locale: Locale;
}

export default function CustomerTestimonials({ locale }: CustomerTestimonialsProps) {
  const isTr = locale === 'tr';

  return (
    <section className="py-16 sm:py-24 px-5 sm:px-8 bg-[#FCFBF7]">
      <div className="max-w-[1000px] mx-auto text-center mb-12 sm:mb-16">
                <h2 className="text-[36px] sm:text-[48px] font-extrabold text-[#1f1e1d] tracking-[-0.04em] mb-4">
          {isTr ? 'Müşterilerimizi ' : 'We '}
          <span className="text-[#ea580c]">❤</span>
          {isTr ? ' seviyoruz' : ' our customers'}
        </h2>
        <p className="text-[18px] text-[#6b6760] font-medium">
          {isTr ? 'Ve görünüşe göre bu duygu karşılıklı:' : "And it seems the feeling's mutual:"}
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 relative">
        {/* Review Card 1 */}
        <div className="w-full bg-white p-8 sm:p-10 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] flex flex-col relative z-10 transition-transform duration-300 hover:-translate-y-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 text-[#ea580c]">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={20} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <div className="bg-[#ea580c] rounded-full p-1 border border-[#1f1e1d] shadow-[0_2px_0_0_#1f1e1d]">
              <div className="bg-white rounded-full p-1 text-[#ea580c]">
                <ShieldCheck size={14} />
              </div>
            </div>
          </div>
          <h3 className="text-[18px] font-extrabold text-[#1f1e1d] mb-4 leading-snug">
            {isTr 
              ? 'Tek Bir Ekranda Zahmetsiz İtibar Yönetimi' 
              : 'Effortless Review Management in One Unified Dashboard'}
          </h3>
          <p className="text-[15px] text-[#4a4742] mb-8 leading-relaxed font-medium">
            {isTr
              ? 'Buaze, ekibimiz için inanılmaz derecede değerli oldu çünkü tüm yorum platformlarımızı temiz, gezinmesi kolay tek bir panele entegre etti. Yeni yorumları anında görebiliyor ve Mamma\'s Burger\'in tüm şubelerindeki trendleri sekmeler arasında geçiş yapmadan takip edebiliyoruz. Kesinlikle vazgeçilmezimiz.'
              : "Buaze has been incredibly valuable for our team because it consolidates all our review platforms into one clean, easy-to-navigate dashboard. We can monitor new reviews in real time across all Mamma's Burger locations and track trends without switching tabs. Absolutely essential."}
          </p>
          <div className="mt-auto border-t border-[#e8e4de] pt-5">
            <p className="text-[14px] font-bold text-[#6b6760]">
              — {isTr ? 'İşletme Yöneticisi, Mamma\'s Burger' : "Store Manager at Mamma's Burger"}
            </p>
          </div>
        </div>

        {/* Review Card 2 */}
        <div className="w-full bg-[#fdfaf5] p-8 sm:p-10 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] flex flex-col relative z-10 transition-transform duration-300 hover:-translate-y-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 text-[#ea580c]">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={20} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <div className="bg-[#1f1e1d] rounded-full p-1 border border-[#1f1e1d] shadow-[0_2px_0_0_#1f1e1d]">
              <div className="bg-white rounded-full p-1 text-[#1f1e1d]">
                <ShieldCheck size={14} />
              </div>
            </div>
          </div>
          <h3 className="text-[18px] font-extrabold text-[#1f1e1d] mb-4 leading-snug">
            {isTr 
              ? 'Akıllı Bildirimlerle Mükemmel Uyum' 
              : 'Streamlined Responses with Instant Notifications'}
          </h3>
          <p className="text-[15px] text-[#4a4742] mb-8 leading-relaxed font-medium">
            {isTr
              ? 'Buaze\'deki anlık bildirim sistemi ve olumsuz yorum filtresine bayılıyorum. Ekibimizin tüm geri bildirimleri görmesini kolaylaştırıyor. Bu süreç, farklı operasyon ekiplerimizin sorunları gizli olarak tartışıp çözmesini sağlıyor. Pizza Locale için gerçek bir can kurtaran!'
              : 'I love the instant notification system and the smart negative review filter in Buaze. It makes it incredibly easy for our team to see all feedback instantly. This ensures everyone in our operations team can access and discuss issues privately. A lifesaver for Pizza Locale!'}
          </p>
          <div className="mt-auto border-t border-[#e8e4de] pt-5">
            <p className="text-[14px] font-bold text-[#6b6760]">
              — {isTr ? 'Bölge Sorumlusu, Pizza Locale' : 'Regional Director at Pizza Locale'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
