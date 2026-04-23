import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Inbox } from 'lucide-react';
import { SYSTEM_FEEDBACK } from '@/lib/constants';

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
  foodRating: number | null;
  serviceRating: number | null;
  atmosphereRating: number | null;
  platform: string | null;
  hasKvkkConsent?: boolean | null;
  hasMarketingConsent?: boolean | null;
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
  unspecified: { label: 'Genel', color: 'text-[#1A1A1A]', bg: 'bg-[#EDEDED]', border: 'border-[#EDEDED]' },
};

export default function FeedbackTable({ feedbacks, locale = 'tr' }: FeedbackTableProps) {
  if (feedbacks.length === 0) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-[#EDEDED] text-center flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#FFFFFF] text-[#6B7280] flex items-center justify-center">
          <Inbox size={26} strokeWidth={2} />
        </div>
        <p className="text-sm font-bold text-[#1A1A1A]">
          {locale === 'tr' ? 'Bu filtrelerle eşleşen değerlendirme bulunamadı.' : 'No feedback matches these filters.'}
        </p>
        <p className="text-xs text-[#6B7280] font-medium max-w-xs">
          {locale === 'tr' ? 'Filtreleri sıfırlayıp tekrar deneyebilirsiniz.' : 'Try clearing the filters and retry.'}
        </p>
      </div>
    );
  }

  const getPlatformBadge = (platform: string | null) => {
    const p = platform || 'unspecified';
    const config = PLATFORM_CONFIG[p];
    return config || null;
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#EDEDED] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#1A1A1A]">
          <thead className="bg-[#FFFFFF] text-[#6B7280] text-[11px] uppercase tracking-[0.1em] border-b border-[#EDEDED]">
            <tr>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'TARİH' : 'DATE'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'PUAN' : 'RATING'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'MÜŞTERİ' : 'CUSTOMER'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'İZİNLER' : 'CONSENTS'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold w-1/3">{locale === 'tr' ? 'YORUM' : 'COMMENT'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-bold">{locale === 'tr' ? 'KONUM' : 'LOCATION'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEDED]">
            {feedbacks.map((f) => {
              const platformBadge = getPlatformBadge(f.platform);
              return (
                <tr
                  key={f.id}
                  className={`transition-colors group ${f.rating <= 3 ? 'bg-red-50/60 hover:bg-red-100/60' : 'hover:bg-[#FFFFFF]'}`}
                >
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap font-medium text-[#0A0A0A] text-[13px]">
                    {format(new Date(f.createdAt), 'dd MMM yyyy, HH:mm', { locale: locale === 'tr' ? tr : undefined })}
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-[11px] shadow-sm
                      ${f.rating >= 4 ? 'bg-green-100 text-green-700' : f.rating === 3 ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'bg-red-100 text-red-700'}`}
                    >
                      {f.rating} {locale === 'tr' ? 'Yıldız' : 'Stars'}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    {f.name ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-[#0A0A0A] font-black uppercase text-[12px]">{f.name}</div>
                        {f.phone && <div className="text-[11px] font-bold text-[#6B7280]">{f.phone}</div>}
                        {f.email && <div className="text-[11px] font-bold text-[#6B7280]">{f.email}</div>}
                      </div>
                    ) : (
                      <span className="text-[#6B7280] italic text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      {f.hasKvkkConsent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] bg-green-50 text-green-600 border border-green-100 font-black uppercase tracking-wider">
                          KVKK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] bg-[#FFFFFF] text-[#6B7280] border border-[#EDEDED] font-black uppercase tracking-wider">
                          KVKK YOK
                        </span>
                      )}
                      {f.hasMarketingConsent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] bg-blue-50 text-blue-600 border border-blue-100 font-black uppercase tracking-wider">
                          İLETİŞİM İZNİ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        {platformBadge && (
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider shadow-sm ${platformBadge.bg} ${platformBadge.color}`}>
                            {platformBadge.label}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[#0A0A0A] font-medium line-clamp-3 leading-relaxed italic text-[13px]">
                        {f.comment && f.comment !== SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT ? `"${f.comment}"` : '-'}
                      </div>
                      
                      {/* Aspect Ratings Row */}
                      {(f.foodRating || f.serviceRating || f.atmosphereRating) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {f.foodRating && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">{locale === 'tr' ? 'Yemek' : 'Food'}:</span>
                              <span className="text-[11px] font-black text-[#1A1A1A]">{f.foodRating}/5</span>
                            </div>
                          )}
                          {f.serviceRating && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">{locale === 'tr' ? 'Servis' : 'Service'}:</span>
                              <span className="text-[11px] font-black text-[#1A1A1A]">{f.serviceRating}/5</span>
                            </div>
                          )}
                          {f.atmosphereRating && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">{locale === 'tr' ? 'Atmosfer' : 'Atmosphere'}:</span>
                              <span className="text-[11px] font-black text-[#1A1A1A]">{f.atmosphereRating}/5</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                    <div className="font-medium text-[#0A0A0A] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C6F24E]"></span>
                      {f.branch || '-'}
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-bold uppercase tracking-wider mt-1">Masa: {f.tableNumber || '-'}</div>
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
