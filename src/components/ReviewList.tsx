'use client';

import { Star, CheckCircle2, MoreVertical, ThumbsUp, Share2 } from 'lucide-react';

const REVIEWS = [
  {
    name: "Nesli imra Nazlı",
    rating: 5,
    text: "Mekan müthiş… Hamburgerin lezzeti efsane… Genel olarak harika bir atmosfer yakalanmış kendinizi doymuş, konforlu ve iyi hissediyorsunuz :) Personeller güler yüzlü hizmet kalitesi, hijyen mükemmel. Fiyatları bu kadar güzel lezzete göre makul şiddetle tavsiye ederim kesinlikle denenmeli…",
    time: "Bir hafta önce",
    avatarColor: "bg-[#E8F0FE] text-[#FF9A14]",
    isLocalGuide: true
  },
  {
    name: "Belinay Karabacak",
    rating: 5,
    text: "Çok güzel bir mekan menüleri aşırı doyurucu benim favorim Cheese Burger menü oldu ve sınırsız sos en sevdiğim.",
    time: "2 hafta önce",
    avatarColor: "bg-[#FCE8E6] text-[#d93025]"
  },
  {
    name: "Melek YENİCE",
    rating: 5,
    text: "Nefis burgerleri, patatesleri var. Mekan miss gibi. Eşimle kahve sorduk yemek sonrasi isletme sahibi hemen bize kahve ismarladi. Canim Ankara da boyle mekanlar ve calisanlar olmasi ne guzel.. cok tesekkur ediyoruz",
    time: "3 hafta önce",
    avatarColor: "bg-[#E6F4EA] text-[#188038]",
    isLocalGuide: true
  },
  {
    name: "müge Vela",
    rating: 5,
    text: "Geniş, Ferah ve en önemlisi Çocuklar ile rahat etmek isterseniz burası tam sizlik diyebilirim. Biz combo menu yedik fazlasiyla doyduk ve lezzetliydi. özellikle çocuklu aileler için çok uygun bir mekan!",
    time: "1 ay önce",
    avatarColor: "bg-[#F3E8FD] text-[#a142f4]"
  }
];

export default function ReviewList() {
  return (
    <div className="w-full bg-white divide-y divide-gray-100">
      <div className="px-5 py-4 flex items-center justify-between">
        <h3 className="text-base font-medium text-[#0F2348]">En Alakalı Yorumlar</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#FF9A14] font-medium">Sırala</span>
          <MoreVertical size={18} className="text-[#6B7B93]" />
        </div>
      </div>

      {REVIEWS.map((review, idx) => (
        <div key={idx} className="px-5 py-6 flex gap-4 transition-colors hover:bg-gray-50/30">
          {/* Avatar Area */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-lg shadow-sm border border-white ${review.avatarColor}`}>
              {review.name.charAt(0)}
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[#0F2348]">{review.name}</span>
                  {review.isLocalGuide && (
                    <span className="text-[11px] text-[#6B7B93]">· Yerel Rehber</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={12} 
                        className={i < review.rating ? "fill-[#FF9A14] text-[#FF9A14]" : "text-gray-200 fill-transparent"} 
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#6B7B93]">{review.time}</span>
                </div>
              </div>
              <MoreVertical size={16} className="text-[#6B7B93] opacity-40" />
            </div>
            
            <p className="mt-3 text-[13px] leading-relaxed text-[#3c4043]">
              {review.text}
            </p>

            {/* Google-specific icons */}
            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer group">
                <ThumbsUp size={14} className="text-[#6B7B93] group-hover:text-[#FF9A14]" />
                <span className="text-[11px] text-[#6B7B93] font-medium">Yararlı</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer group">
                <Share2 size={14} className="text-[#6B7B93] group-hover:text-[#FF9A14]" />
                <span className="text-[11px] text-[#6B7B93] font-medium">Paylaş</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="p-6 flex justify-center">
        <button className="text-sm text-[#FF9A14] font-medium px-6 py-2.5 rounded-full border border-[#dadce0] hover:bg-blue-50 transition-all">
          Tüm yorumları gör
        </button>
      </div>
    </div>
  );
}
