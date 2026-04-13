import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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
}

interface FeedbackTableProps {
  feedbacks: FeedbackItem[];
  locale?: string;
}

export default function FeedbackTable({ feedbacks, locale = 'tr' }: FeedbackTableProps) {
  if (feedbacks.length === 0) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
        {locale === 'tr' ? 'Henüz değerlendirme bulunmuyor.' : 'No evaluations yet.'}
      </div>
    );
  }

  const getServiceLabel = (type: string | null | undefined) => {
    if (!type) return null;
    const labels: Record<string, any> = {
      dine_in: { tr: 'Yerinde', en: 'Dine-in', color: 'bg-[#111827]/5 text-[#111827] border-[#111827]/10' },
      takeout: { tr: 'Paket', en: 'Takeout', color: 'bg-[#FDBF1D]/15 text-[#111827] border-[#FDBF1D]/50' },
      delivery: { tr: 'Teslimat', en: 'Delivery', color: 'bg-[#111827]/10 text-[#111827] border-[#111827]/15' }
    };
    return labels[type] || { tr: type, en: type, color: 'bg-gray-50 text-gray-600 border-gray-200' };
  };

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-[0.1em] border-b border-gray-100">
            <tr>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'TARİH' : 'DATE'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'PUAN' : 'RATING'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold w-1/2">{locale === 'tr' ? 'YORUM' : 'COMMENT'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'KONUM' : 'LOCATION'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feedbacks.map((f) => {
              const service = getServiceLabel(f.serviceType);
              return (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors group">
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
                  <td className="px-4 py-4 sm:px-8 sm:py-5 max-w-[240px] sm:max-w-md">
                    <div className="flex flex-col gap-1.5 min-h-[72px] justify-center">
                      <div className="flex items-start gap-2 flex-wrap">
                        {service && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${service.color}`}>
                            {locale === 'tr' ? service.tr : service.en}
                          </span>
                        )}
                        <div className="text-gray-900 font-medium line-clamp-2 leading-snug italic">
                          {f.comment ? `"${f.comment}"` : '-'}
                        </div>
                      </div>
                      
                      {/* Aspect Ratings Row */}
                      {(f.foodRating || f.serviceRating || f.atmosphereRating) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                          {f.foodRating && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{locale === 'tr' ? 'Yemek' : 'Food'}</span>
                              <span className="text-[11px] font-black text-[#111827]">{f.foodRating}/5</span>
                            </div>
                          )}
                          {f.serviceRating && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{locale === 'tr' ? 'Servis' : 'Service'}</span>
                              <span className="text-[11px] font-black text-[#111827]">{f.serviceRating}/5</span>
                            </div>
                          )}
                          {f.atmosphereRating && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{locale === 'tr' ? 'Atmosfer' : 'Atmosphere'}</span>
                              <span className="text-[11px] font-black text-[#111827]">{f.atmosphereRating}/5</span>
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
