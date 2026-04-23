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
  const isTr = locale === 'tr';

  if (feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-[#EDEDED] text-[#737373]">
          <Inbox size={20} strokeWidth={2} />
        </div>
        <p
          className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? 'Eşleşen yorum yok' : 'No matching reviews'}
        </p>
        <p className="text-[13px] text-[#525252] max-w-xs">
          {isTr ? 'Filtreleri sıfırlayıp tekrar deneyebilirsiniz.' : 'Try clearing the filters and retry.'}
        </p>
      </div>
    );
  }

  const getPlatformBadge = (platform: string | null) => {
    const p = platform || 'unspecified';
    return PLATFORM_CONFIG[p] || null;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] text-[#0A0A0A]">
          <thead className="bg-[#FAFAFA] border-b border-[#EDEDED]">
            <tr>
              <th className="pulse-eyebrow text-[#737373] px-4 py-3 font-medium sm:px-6">{isTr ? 'TARİH' : 'DATE'}</th>
              <th className="pulse-eyebrow text-[#737373] px-4 py-3 font-medium sm:px-6">{isTr ? 'PUAN' : 'RATING'}</th>
              <th className="pulse-eyebrow text-[#737373] px-4 py-3 font-medium sm:px-6">{isTr ? 'MÜŞTERİ' : 'CUSTOMER'}</th>
              <th className="pulse-eyebrow text-[#737373] px-4 py-3 font-medium sm:px-6">{isTr ? 'İZİN' : 'CONSENT'}</th>
              <th className="pulse-eyebrow text-[#737373] px-4 py-3 font-medium w-[36%] sm:px-6">{isTr ? 'YORUM' : 'COMMENT'}</th>
              <th className="pulse-eyebrow text-[#737373] px-4 py-3 font-medium sm:px-6">{isTr ? 'KONUM' : 'LOCATION'}</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((f) => {
              const platformBadge = getPlatformBadge(f.platform);
              return (
                <tr
                  key={f.id}
                  className={`border-t border-[#F5F5F5] transition-colors ${
                    f.rating <= 2 ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-[#FAFAFA]'
                  }`}
                >
                  <td className="px-4 py-4 sm:px-6 whitespace-nowrap text-[12px] font-mono text-[#525252]">
                    {format(new Date(f.createdAt), 'dd MMM yyyy · HH:mm', {
                      locale: isTr ? tr : undefined,
                    })}
                  </td>
                  <td className="px-4 py-4 sm:px-6 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 pulse-eyebrow ${
                        f.rating >= 4
                          ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                          : f.rating === 3
                            ? 'bg-[#F5F5F5] text-[#525252]'
                            : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {'★'.repeat(f.rating)}
                      <span className="text-[10px] ml-0.5">{f.rating}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    {f.name ? (
                      <div className="flex flex-col">
                        <span
                          className="text-[13px] font-semibold text-[#0A0A0A] tracking-[-0.01em] truncate max-w-[200px]"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {f.name}
                        </span>
                        {f.phone && <span className="pulse-eyebrow text-[#737373] mt-0.5">{f.phone}</span>}
                        {f.email && <span className="pulse-eyebrow text-[#737373] truncate max-w-[200px]">{f.email}</span>}
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#737373] italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-6 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {f.hasKvkkConsent ? (
                        <span className="inline-flex items-center rounded pulse-eyebrow bg-[#EAF9B8] text-[#0A0A0A] px-1.5 py-0.5">
                          KVKK ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded pulse-eyebrow bg-[#F5F5F5] text-[#737373] px-1.5 py-0.5">
                          KVKK —
                        </span>
                      )}
                      {f.hasMarketingConsent && (
                        <span className="inline-flex items-center rounded pulse-eyebrow bg-blue-50 text-blue-600 px-1.5 py-0.5">
                          {isTr ? 'İLETİŞİM' : 'CONTACT'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-1.5">
                      {platformBadge && (
                        <span
                          className={`inline-flex self-start items-center rounded pulse-eyebrow ${platformBadge.bg} ${platformBadge.color} px-1.5 py-0.5`}
                        >
                          {platformBadge.label}
                        </span>
                      )}
                      <p className="text-[13px] text-[#0A0A0A] leading-[1.5] line-clamp-3">
                        {f.comment && f.comment !== SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT
                          ? `"${f.comment}"`
                          : '—'}
                      </p>
                      {(f.foodRating || f.serviceRating || f.atmosphereRating) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {f.foodRating && (
                            <span className="inline-flex items-center gap-1 pulse-eyebrow text-[#737373]">
                              {isTr ? 'YEMEK' : 'FOOD'}
                              <span className="font-mono text-[11px] text-[#0A0A0A] normal-case tracking-normal">
                                {f.foodRating}/5
                              </span>
                            </span>
                          )}
                          {f.serviceRating && (
                            <span className="inline-flex items-center gap-1 pulse-eyebrow text-[#737373]">
                              {isTr ? 'SERVİS' : 'SERVICE'}
                              <span className="font-mono text-[11px] text-[#0A0A0A] normal-case tracking-normal">
                                {f.serviceRating}/5
                              </span>
                            </span>
                          )}
                          {f.atmosphereRating && (
                            <span className="inline-flex items-center gap-1 pulse-eyebrow text-[#737373]">
                              {isTr ? 'ATMOSFER' : 'ATMOS'}
                              <span className="font-mono text-[11px] text-[#0A0A0A] normal-case tracking-normal">
                                {f.atmosphereRating}/5
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-[13px] text-[#0A0A0A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C6F24E]" />
                      <span
                        className="font-medium"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {f.branch || '—'}
                      </span>
                    </div>
                    <div className="pulse-eyebrow text-[#737373] mt-1">
                      {isTr ? 'MASA' : 'TABLE'} {f.tableNumber || '—'}
                    </div>
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
