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
            {feedbacks.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap font-medium text-gray-900 text-[13px]">
                  {format(new Date(f.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
                </td>
                <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-[11px] shadow-sm
                    ${f.rating >= 4 ? 'bg-green-100 text-green-700' : f.rating === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {f.rating} {locale === 'tr' ? 'Yıldız' : 'Stars'}
                  </span>
                </td>
                <td className="px-4 py-4 sm:px-8 sm:py-6 max-w-[200px] sm:max-w-sm" title={f.comment || ''}>
                  <div className="text-gray-600 line-clamp-2 leading-relaxed">{f.comment || '-'}</div>
                </td>
                <td className="px-4 py-4 sm:px-8 sm:py-6 whitespace-nowrap">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    {f.branch || '-'}
                  </div>
                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Masa: {f.tableNumber || '-'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
