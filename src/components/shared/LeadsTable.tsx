'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, User, Phone, Mail, Calendar, Store, MapPin, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui';

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
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="MÜŞTERİLER"
        title={title}
        description={subtitle}
        actions={
          <button onClick={exportToCSV} className="bz-btn-primary">
            <Download size={14} strokeWidth={2} />
            CSV indir
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
          size={14}
          strokeWidth={2}
        />
        <input
          type="text"
          placeholder="İsim, e-posta, telefon veya işletme ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bz-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="rounded-2xl border border-[#EDEDED] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#EDEDED]">
                <th className="pulse-eyebrow text-[#737373] px-6 py-3 font-medium">
                  MÜŞTERİ
                </th>
                {isSuperAdmin && (
                  <th className="pulse-eyebrow text-[#737373] px-6 py-3 font-medium">
                    İŞLETME
                  </th>
                )}
                <th className="pulse-eyebrow text-[#737373] px-6 py-3 font-medium">
                  İLETİŞİM
                </th>
                <th className="pulse-eyebrow text-[#737373] px-6 py-3 font-medium">
                  SON ETKİLEŞİM
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 4 : 3} className="py-16 text-center">
                    <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8 mx-auto" />
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 4 : 3}
                    className="py-16 text-center text-[14px] text-[#525252]"
                  >
                    Henüz iletişim bilgisi bırakan müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]"
                        >
                          <User size={14} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.015em] truncate"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {lead.name || 'İsimsiz'}
                          </p>
                          <p className="pulse-eyebrow text-[#737373] mt-0.5">MÜŞTERİ</p>
                        </div>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[13px] text-[#0A0A0A]">
                          <Store size={13} className="text-[#737373] shrink-0" strokeWidth={2} />
                          <span className="truncate">{lead.restaurant?.name || '—'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-[13px] text-[#0A0A0A]">
                            <Phone size={12} className="text-[#2563EB]" strokeWidth={2} />
                            <span className="font-mono">{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-[13px] text-[#0A0A0A]">
                            <Mail size={12} className="text-[#16A34A]" strokeWidth={2} />
                            <span className="font-mono truncate max-w-[220px]">{lead.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[13px] text-[#525252]">
                          <Calendar size={12} className="text-[#737373]" strokeWidth={2} />
                          <span className="font-mono">
                            {new Date(lead.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        {lead.branch && (
                          <div className="flex items-center gap-1.5 pulse-eyebrow text-[#737373]">
                            <MapPin size={10} strokeWidth={2} />
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
