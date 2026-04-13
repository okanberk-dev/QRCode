'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, User, Crown, BadgeCheck, AlertCircle, Search } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

interface Customer {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  isActive: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  restaurants: { id: string; name: string }[];
}

export default function CustomersPage() {
  const { t } = useAdminTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'trial',
    isActive: true,
    trialEndsAt: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers');
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name || '',
      email: customer.email,
      password: '', // Boş bırakıldığında şifre değişmez
      plan: customer.plan,
      isActive: customer.isActive,
      trialEndsAt: customer.trialEndsAt ? new Date(customer.trialEndsAt).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email) {
      setError('Ad Soyad ve E-posta zorunludur.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (!payload.trialEndsAt) {
        payload.trialEndsAt = null;
      }
      
      const url = `/api/admin/customers/${editingId}`;
      const method = 'PUT'; // Currently only editing is allowed since users register themselves

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || `Müşteri güncellenemedi`);
      } else {
        setShowModal(false);
        setEditingId(null);
        fetchData();
      }
    } catch (e) {
      setError('Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu müşteriyi tamamen silmek istediğinize emin misiniz? DİKKAT: Bu işleme bağlı olan tüm restoran ve geri bildirim kayıtları cascade edilecek (etkilenip silinecek) olabilir.')) return;
    
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Silme işlemi başarısız');
      } else {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[24px] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">{t('customers')}</h1>
          <p className="text-[#6b6760] text-[13px] sm:text-[15px] font-bold">Tüm kayıtlı restoran sahiplerini, aboneliklerini ve ayarlarını yönetin.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#ada89f] group-focus-within:text-[#111827] transition-colors" size={20} strokeWidth={3} />
        <input 
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-[20px] pl-16 pr-8 py-5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[#FDBF1D] transition-all"
        />
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111827] text-[11px] font-bold uppercase tracking-[0.2em] text-[#ada89f]">
                <th className="px-4 py-6 sm:px-10">{t('customers')}</th>
                <th className="px-4 py-6 sm:px-10">ÜYELİK DURUMU</th>
                <th className="px-4 py-6 sm:px-10">{t('restaurants')}</th>
                <th className="px-4 py-6 sm:px-10">{t('status')}</th>
                <th className="px-4 py-6 sm:px-10 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#F7F4F0] text-sm">
              {customers.filter(c => 
                (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(customer => (
                <tr key={customer.id} className="hover:bg-[#FDBF1D]/5 transition-all group border-b border-[#F7F4F0]">
                  <td className="px-4 py-6 sm:px-10">
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-[#111827] text-[#FDBF1D] items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <User size={24} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-[#111827] text-[16px] tracking-tight">{customer.name || 'İsimsiz Müşteri'}</span>
                        <span className="text-xs font-bold text-[#ada89f] tracking-wide uppercase">{customer.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 sm:px-10">
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 w-max shadow-sm transition-all group-hover:translate-x-1 ${
                      customer.plan === 'yearly' 
                        ? 'bg-[#111827] text-[#FDBF1D] border-[#FDBF1D]/30 shadow-[0_4px_12px_rgba(253,191,29,0.2)]' 
                        : customer.plan === 'monthly'
                        ? 'bg-[#FDBF1D] text-[#111827] border-transparent'
                        : 'bg-white text-[#ada89f] border-[#F7F4F0]'
                    }`}>
                      {customer.plan === 'yearly' ? <Crown size={16} strokeWidth={3} /> : customer.plan === 'monthly' ? <BadgeCheck size={16} strokeWidth={3} /> : <AlertCircle size={16} strokeWidth={3} />}
                      {customer.plan === 'yearly' ? 'PLATINUM' : customer.plan === 'monthly' ? 'PRO PLAN' : 'DENEME'}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex flex-col gap-1 font-bold text-[#6b6760] text-[12px]">
                      {customer.restaurants && customer.restaurants.length > 0 ? (
                        customer.restaurants.map(r => (
                           <span key={r.id} className="text-[#111827] font-black line-clamp-1">{r.name.toUpperCase()}</span>
                        ))
                      ) : (
                        <span className="text-[#ada89f] italic">YOK</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    {customer.isActive ? (
                      <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">{t('active')}</span>
                    ) : (
                      <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">{t('passive')}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 text-right">
                    <div className="flex items-center justify-end gap-3 hover:opacity-100">
                      <button 
                        onClick={() => handleEdit(customer)}
                        className="w-10 h-10 flex items-center justify-center text-[#1f1e1d] bg-white border border-gray-200 shadow-sm rounded-xl hover:bg-[#FDBF1D] active:translate-y-1 transition-all"
                        title={t('edit')}
                      >
                        <Plus className="rotate-45" size={18} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id)}
                        className="w-10 h-10 flex items-center justify-center text-white bg-[#ef4444] border hover:border-[#1f1e1d] shadow-sm rounded-xl hover:bg-red-600 active:translate-y-1 transition-all"
                        title={t('delete')}
                      >
                        <Trash2 size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#6b6760] font-bold">Hiç müşteri bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 sm:p-10 border-b border-gray-100 bg-[#FCFBF7]">
              <h2 className="text-xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">
                Müşteriyi Düzenle
              </h2>
              <p className="text-[#6b6760] text-[13px] sm:text-sm font-bold mt-2">
                Şifre sıfırlama, plan değiştirme ve hesap durumları.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar">
              {error && (
                <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-200 text-center uppercase tracking-widest">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Kişi Adı</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">E-posta</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold shadow-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Yeni Şifre Belirle</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Değişmeyecekse boş bırakın"
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold shadow-sm transition-all placeholder:text-[13px] placeholder:font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Kayıt Planı</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({...formData, plan: e.target.value})}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="trial">Trial (Deneme)</option>
                    <option value="monthly">Monthly (Aylık)</option>
                    <option value="yearly">Yearly (Yıllık)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Hesap Erişimi</label>
                  <select
                    value={formData.isActive ? '1' : '0'}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === '1'})}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Askıya Alındı</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Deneme Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.trialEndsAt}
                    onChange={(e) => setFormData({...formData, trialEndsAt: e.target.value})}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold shadow-sm transition-all text-[#6b6760]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 bg-[#FCFBF7] text-[#111827] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#111827] text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#111827]/90 transition-colors disabled:opacity-50"
                  style={{ boxShadow: '0 4px 0 0 #000' }}
                >
                  {isSubmitting ? '...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
