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
}

interface FeedbackTableProps {
  feedbacks: FeedbackItem[];
  locale: string;
}

export default function FeedbackTable({ feedbacks, locale }: FeedbackTableProps) {
  if (feedbacks.length === 0) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
        Henüz değerlendirme bulunmuyor.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#4a4742]">
          <thead className="bg-[#1f1e1d] text-white text-[11px] uppercase tracking-[0.1em]">
            <tr>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-black">{locale === 'tr' ? 'TARİH' : 'DATE'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-black">{locale === 'tr' ? 'PUAN' : 'RATING'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-black w-1/2">{locale === 'tr' ? 'YORUM' : 'COMMENT'}</th>
              <th className="px-4 py-4 sm:px-8 sm:py-5 font-black">{locale === 'tr' ? 'KONUM' : 'LOCATION'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e4de]">
            {feedbacks.map((f) => (
              <tr key={f.id} className="hover:bg-[#FCFBF7] transition-colors group">
                <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap font-bold text-[#1f1e1d] text-[13px]">
                  {format(new Date(f.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
                </td>
                <td className="px-4 py-4 sm:px-8 sm:py-6">
                  <span className={`inline-flex items-center gap-1 font-black px-3.5 py-1.5 rounded-full text-[11px] border-2 border-[#1f1e1d] shadow-[2px_2px_0_0_#1f1e1d]
                    ${f.rating >= 4 ? 'bg-[#10b981] text-white' : f.rating === 3 ? 'bg-[#FDBF1D] text-[#1f1e1d]' : 'bg-[#ef4444] text-white'}`}
                  >
                    {f.rating} {locale === 'tr' ? 'Yıldız' : 'Stars'}
                  </span>
                </td>
                <td className="px-4 py-4 sm:px-8 sm:py-6 max-w-[200px] sm:max-w-sm" title={f.comment || ''}>
                  <div className="font-bold text-[#1f1e1d] line-clamp-2 leading-relaxed">{f.comment || '-'}</div>
                </td>
                <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                  <div className="font-bold text-[#1f1e1d] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ea580c]"></span>
                    {f.branch || '-'}
                  </div>
                  <div className="text-[11px] text-[#ada89f] font-black uppercase tracking-wider mt-1">Masa: {f.tableNumber || '-'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
