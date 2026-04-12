import { Star } from 'lucide-react';

const REVIEWS = [
  {
    name: "Nesli imra Nazlı",
    rating: 5,
    text: "Mekan müthiş… Hamburgerin lezzeti efsane… Genel olarak harika bir atmosfer yakalanmış kendinizi doymuş, konforlu ve iyi hissediyorsunuz :) Personeller güler yüzlü hizmet kalitesi, hijyen mükemmel. Fiyatları bu kadar güzel lezzete göre makul şiddetle tavsiye ederim kesinlikle denenmeli…",
    time: "Bir hafta önce",
    avatarColor: "bg-orange-100 text-orange-600"
  },
  {
    name: "Belinay Karabacak",
    rating: 5,
    text: "Çok güzel bir mekan menüleri aşırı doyurucu benim favorim Cheese Burger menü oldu ve sınırsız sos en sevdiğim.",
    time: "2 hafta önce",
    avatarColor: "bg-blue-100 text-blue-600"
  },
  {
    name: "Melek YENİCE",
    rating: 5,
    text: "Nefis burgerleri, patatesleri var. Mekan miss gibi. Eşimle kahve sorduk yemek sonrasi isletme sahibi hemen bize kahve ismarladi. Canim Ankara da boyle mekanlar ve calisanlar olmasi ne guzel.. cok tesekkur ediyoruz",
    time: "3 hafta önce",
    avatarColor: "bg-green-100 text-green-600"
  },
  {
    name: "müge Vela",
    rating: 5,
    text: "Geniş, Ferah ve en önemlisi Çocuklar ile rahat etmek isterseniz burası tam sizlik diyebilirim. Biz combo menu yedik fazlasiyla doyduk ve lezzetliydi. özellikle çocuklu aileler için çok uygun bir mekan!",
    time: "1 ay önce",
    avatarColor: "bg-purple-100 text-purple-600"
  },
  {
    name: "Serhat Halil Silsüpür",
    rating: 5,
    text: "Öğle arası gittik, 10 dk da hazır oldu, lezzetli ve doyurucu. Ücretsiz sos çeşitleri arttırılabilir.",
    time: "1 ay önce",
    avatarColor: "bg-gray-100 text-gray-600"
  }
];

export default function ReviewList() {
  return (
    <div className="w-full max-w-lg mx-auto py-8">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-lg font-medium text-[#202124]">Müşteri Yorumları</h3>
        <span className="text-sm text-[#1a73e8] font-medium cursor-pointer hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors">
          Tümünü Gör
        </span>
      </div>

      <div className="space-y-6">
        {REVIEWS.map((review, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md">
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${review.avatarColor}`}>
              {review.name.charAt(0)}
            </div>
            
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-[#202124]">{review.name}</h4>
                <span className="text-[11px] text-[#70757a]">{review.time}</span>
              </div>
              
              {/* Stars */}
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={12} 
                    className={i < review.rating ? "fill-[#fbbc04] text-[#fbbc04]" : "text-gray-200 fill-transparent"} 
                  />
                ))}
              </div>
              
              <p className="text-sm text-[#3c4043] leading-relaxed line-clamp-3 overflow-hidden">
                {review.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Google Badge Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 opacity-60 grayscale hover:grayscale-0 transition-all cursor-default">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_Maps_icon_%282020%29.svg/1024px-Google_Maps_icon_%282020%29.svg.png" className="w-4 h-4" alt="Google Maps" />
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Google İşletme Verileri</span>
      </div>
    </div>
  );
}
