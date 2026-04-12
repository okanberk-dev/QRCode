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
}

export default function FeedbackTable({ feedbacks }: FeedbackTableProps) {
  if (feedbacks.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
        Henüz değerlendirme bulunmuyor.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium">Tarih</th>
              <th className="px-6 py-4 font-medium">Puan</th>
              <th className="px-6 py-4 font-medium">Müşteri</th>
              <th className="px-6 py-4 font-medium">Yorum</th>
              <th className="px-6 py-4 font-medium">Konum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feedbacks.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(f.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full text-xs
                    ${f.rating >= 4 ? 'bg-green-100 text-green-700' : f.rating === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {f.rating} Yıldız
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{f.name || '-'}</div>
                  <div className="text-xs text-gray-500">{f.phone || f.email || '-'}</div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate" title={f.comment || ''}>
                  {f.comment || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>{f.branch || '-'}</div>
                  <div className="text-xs text-gray-500">Masa: {f.tableNumber || '-'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
