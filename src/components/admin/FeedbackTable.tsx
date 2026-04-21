import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Inbox } from 'lucide-react';

interface FeedbackItem {
  id: string;
  rating: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  comment: string | null;
  branch: string | null;
  tableNumber: string | null;
  createdAt: string;
  serviceType: string | null;
  foodRating: number | null;
  serviceRating: number | null;
  atmosphereRating: number | null;
  platform: string | null;
}

interface FeedbackTableProps {
  feedbacks: FeedbackItem[];
  locale?: string;
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  google: { label: 'Google', color: 'text-white', bg: 'bg-[#4285F4]', border: 'border-[#3367D6]' },
  yemeksepeti: { label: 'Yemeksepeti', color: 'text-white', bg: 'bg-[#FA0050]', border: 'border-[#D10044]' },
  getir: { label: 'Getir', color: 'text-white', bg: 'bg-[#5D3EBC]', border: 'border-[#4A2FA0]' },
  trendyol_go: { label: 'Trendyol GO', color: 'text-white', bg: 'bg-[#F27A1A]', border: 'border-[#D66A15]' },
};

export default function FeedbackTable({ feedbacks, locale = 'tr' }: FeedbackTableProps) {
  if (feedbacks.length === 0) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center">
          <Inbox size={26} strokeWidth={2} />
        </div>
        <p className="text-sm font-bold text-gray-700">
          {locale === 'tr' ? 'Bu filtrelerle eşleşen değerlendirme bulunamadı.' : 'No feedback matches these filters.'}
        </p>
        <p className="text-xs text-gray-400 font-medium max-w-xs">
          {locale === 'tr' ? 'Filtreleri sıfırlayıp tekrar deneyebilirsiniz.' : 'Try clearing the filters and retry.'}
        </p>
      </div>
    );
  }

  const getServiceLabel = (type: string | null | undefined) => {
    if (!type) return null;
    const labels: Record<string, any> = {
      dine_in: { tr: 'Yerinde', en: 'Dine-in', color: 'bg-blue-50 text-blue-600 border-blue-100' },
      takeout: { tr: 'Paket', en: 'Takeout', color: 'bg-orange-50 text-orange-600 border-orange-100' },
      delivery: { tr: 'Teslimat', en: 'Delivery', color: 'bg-purple-50 text-purple-600 border-purple-100' }
    };
    return labels[type] || { tr: type, en: type, color: 'bg-gray-50 text-gray-600 border-gray-100' };
  };

  const getPlatformBadge = (platform: string | null) => {
    if (!platform) return null;
    const config = PLATFORM_CONFIG[platform];
    if (!config) return null;
    return config;
  };

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-[0.1em] border-b border-gray-100">
            <tr>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'TARİH' : 'DATE'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'PUAN' : 'RATING'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'PLATFORM' : 'PLATFORM'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold w-1/2">{locale === 'tr' ? 'YORUM' : 'COMMENT'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'KONUM' : 'LOCATION'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feedbacks.map((f) => {
              const service = getServiceLabel(f.serviceType);
              const platformBadge = getPlatformBadge(f.platform);
              return (
                <tr
                  key={f.id}
                  className={`transition-colors group ${f.rating <= 3 ? 'bg-red-50/60 hover:bg-red-100/60' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap font-medium text-gray-900 text-[13px]">
                    {format(new Date(f.createdAt), 'dd MMM yyyy, HH:mm', { locale: locale === 'tr' ? tr : undefined })}
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-[11px] shadow-sm
                      ${f.rating >= 4 ? 'bg-green-100 text-green-700' : f.rating === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {f.rating} {locale === 'tr' ? 'Yıldız' : 'Stars'}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                    {platformBadge ? (
                      <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider shadow-sm ${platformBadge.bg} ${platformBadge.color}`}>
                        {platformBadge.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-gray-100 text-gray-400 border border-gray-200">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 max-w-[200px] sm:max-w-sm">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {service && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${service.color}`}>
                            {locale === 'tr' ? service.tr : service.en}
                          </span>
                        )}
                        <div className="text-gray-900 font-medium line-clamp-2 leading-relaxed italic">
                          {f.comment ? `"${f.comment}"` : '-'}
                        </div>
                      </div>
                      
                      {/* Aspect Ratings Row */}
                      {(f.foodRating || f.serviceRating || f.atmosphereRating) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {f.foodRating && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{locale === 'tr' ? 'Yemek' : 'Food'}:</span>
                              <span className="text-[11px] font-black text-gray-700">{f.foodRating}/5</span>
                            </div>
                          )}
                          {f.serviceRating && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{locale === 'tr' ? 'Servis' : 'Service'}:</span>
                              <span className="text-[11px] font-black text-gray-700">{f.serviceRating}/5</span>
                            </div>
                          )}
                          {f.atmosphereRating && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{locale === 'tr' ? 'Atmosfer' : 'Atmosphere'}:</span>
                              <span className="text-[11px] font-black text-gray-700">{f.atmosphereRating}/5</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      {f.branch || '-'}
                    </div>
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Masa: {f.tableNumber || '-'}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
