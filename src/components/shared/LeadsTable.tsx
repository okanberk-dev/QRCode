'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, User, Phone, Mail, Calendar, Store, MapPin, Download } from 'lucide-react';

interface Feedback {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  comment: string;
  rating: number;
  createdAt: string;
  branch: string | null;
  tableNumber: string | null;
  restaurant?: {
    name: string;
    slug: string;
  } | null;
}

interface LeadsTableProps {
  apiPath: string;
  title: string;
  subtitle: string;
  isSuperAdmin?: boolean;
}

export default function LeadsTable({ apiPath, title, subtitle, isSuperAdmin = false }: LeadsTableProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}?limit=1000`);
      if (res.ok) {
        const result = await res.json();
        // Filter only those who provided name, email or phone
        const leads = (result.data || []).filter((f: Feedback) => f.name || f.email || f.phone);
        setFeedbacks(leads);
      }
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [apiPath]);

  const filteredLeads = feedbacks.filter(f => 
    (f.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.phone?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.restaurant?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToCSV = () => {
    const headers = ['İsim', 'E-posta', 'Telefon', 'İşletme', 'Şube', 'Puan', 'Tarih'];
    const rows = filteredLeads.map(f => [
      f.name || '-',
      f.email || '-',
      f.phone || '-',
      f.restaurant?.name || '-',
      f.branch || '-',
      f.rating,
      new Date(f.createdAt).toLocaleDateString('tr-TR')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `musteri_listesi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border-2 border-gray-100 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#1A2332] tracking-tight uppercase">{title}</h1>
          <p className="text-[#2A3444] text-[15px] font-bold">{subtitle}</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-3 bg-[#1A2332] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg active:scale-95"
        >
          <Download size={16} strokeWidth={3} />
          CSV İNDİR
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#1A2332] transition-colors" size={20} strokeWidth={3} />
        <input
          type="text"
          placeholder="İsim, e-posta, telefon veya işletme ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border-2 border-gray-100 rounded-[24px] pl-16 pr-8 py-5 text-sm font-bold shadow-sm outline-none focus:border-[#F4B400] transition-all"
        />
      </div>

      <div className="bg-white rounded-[32px] border-2 border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1A2332] text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7280]">
                <th className="px-10 py-5">MÜŞTERİ BİLGİLERİ</th>
                {isSuperAdmin && <th className="px-10 py-5">İŞLETME</th>}
                <th className="px-10 py-5">İLETİŞİM</th>
                <th className="px-10 py-5">SON ETKİLEŞİM</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 4 : 3} className="py-20 text-center">
                    <Loader2 className="animate-spin text-[#1A2332] w-10 h-10 mx-auto" />
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 4 : 3} className="py-20 text-center text-[#2A3444] font-bold italic">
                    Henüz iletişim bilgisi bırakan müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F4B400] flex items-center justify-center text-[#1A2332] shadow-sm group-hover:scale-105 transition-transform">
                          <User size={20} strokeWidth={3} />
                        </div>
                        <div>
                          <p className="font-black text-[#1A2332] text-base tracking-tight">{lead.name || 'İsimsiz'}</p>
                          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">MÜŞTERİ</p>
                        </div>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 text-[#1A2332] font-black">
                          <Store size={16} className="text-[#6B7280]" />
                          <span>{lead.restaurant?.name || '-'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-10 py-6">
                      <div className="space-y-1.5">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-[13px] font-bold text-[#1A2332]">
                            <Phone size={14} className="text-blue-500" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-[13px] font-bold text-[#1A2332]">
                            <Mail size={14} className="text-emerald-500" />
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[13px] font-bold text-[#1A2332]">
                          <Calendar size={14} className="text-[#6B7280]" />
                          {new Date(lead.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                        {lead.branch && (
                          <div className="flex items-center gap-2 text-[11px] font-black text-[#6B7280] uppercase tracking-widest">
                            <MapPin size={12} />
                            {lead.branch}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
