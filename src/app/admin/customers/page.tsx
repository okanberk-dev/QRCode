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

interface RestaurantOption {
  id: string;
  name: string;
}

export default function CustomersPage() {
  const { t } = useAdminTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
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
    trialEndsAt: '',
    restaurantIds: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersRes, restaurantsRes] = await Promise.all([
        fetch('/api/admin/customers'),
        fetch('/api/restaurants'),
      ]);

      if (customersRes.ok) {
        setCustomers(await customersRes.json());
      }

      if (restaurantsRes.ok) {
        const restaurantData = await restaurantsRes.json();
        setRestaurants(Array.isArray(restaurantData) ? restaurantData : (restaurantData?.data || []));
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
      trialEndsAt: customer.trialEndsAt ? new Date(customer.trialEndsAt).toISOString().split('T')[0] : '',
      restaurantIds: customer.restaurants.map((restaurant) => restaurant.id),
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
        <Loader2 className="animate-spin text-[#1A2332] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A2332] tracking-tight uppercase">{t('customers')}</h1>
          <p className="text-[#2A3444] text-[13px] sm:text-[15px] font-bold">Tüm kayıtlı restoran sahiplerini, aboneliklerini ve ayarlarını yönetin.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#1A2332] transition-colors" size={20} strokeWidth={2} />
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-[20px] pl-12 sm:pl-16 pr-4 sm:pr-8 py-4 sm:py-5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[#F4B400] transition-all"
        />
      </div>

      <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse sm:min-w-[720px]">
            <thead>
              <tr className="bg-[#1A2332] text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">
                <th className="px-3 py-4 sm:px-6 md:px-10">{t('customers')}</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6 md:px-10">ÜYELİK DURUMU</th>
                <th className="hidden lg:table-cell px-3 py-4 sm:px-6 md:px-10">{t('restaurants')}</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6 md:px-10">{t('status')}</th>
                <th className="px-3 py-4 sm:px-6 md:px-10 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#F8F6F1] text-sm">
              {customers.filter(c =>
                (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(customer => (
                <tr key={customer.id} className="hover:bg-[#F4B400]/5 transition-all group border-b border-[#F8F6F1]">
                  <td className="px-3 py-4 sm:px-6 md:px-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-[#1A2332] text-[#F4B400] items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <User size={24} strokeWidth={2} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-black text-[#1A2332] text-[15px] sm:text-[16px] tracking-tight truncate">{customer.name || 'İsimsiz Müşteri'}</span>
                        <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] tracking-wide uppercase truncate">{customer.email}</span>
                        {/* Mobile-only inline badges for plan + status */}
                        <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            customer.plan === 'yearly' ? 'bg-[#1A2332] text-[#F4B400]'
                            : customer.plan === 'monthly' ? 'bg-[#F4B400] text-[#1A2332]'
                            : customer.plan === 'external' ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                            {customer.plan === 'yearly' ? 'PLATINUM' : customer.plan === 'monthly' ? 'PRO' : customer.plan === 'external' ? 'MANUEL' : 'DENEME'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {customer.isActive ? t('active') : t('passive')}
                          </span>
                          {customer.restaurants && customer.restaurants.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 lg:hidden">
                              {customer.restaurants.length} İşletme
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-4 sm:px-6 md:px-10">
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 w-max shadow-sm transition-all group-hover:translate-x-1 ${
                      customer.plan === 'yearly'
                        ? 'bg-[#1A2332] text-[#F4B400] border-[#F4B400]/30 shadow-[0_4px_12px_rgba(244, 180, 0,0.2)]'
                        : customer.plan === 'monthly'
                        ? 'bg-[#F4B400] text-[#1A2332] border-transparent'
                        : customer.plan === 'external'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-[#6B7280] border-[#F8F6F1]'
                    }`}>
                      {customer.plan === 'yearly' ? <Crown size={16} strokeWidth={2} /> : customer.plan === 'monthly' ? <BadgeCheck size={16} strokeWidth={2} /> : customer.plan === 'external' ? <BadgeCheck size={16} strokeWidth={2} /> : <AlertCircle size={16} strokeWidth={2} />}
                      {customer.plan === 'yearly' ? 'PLATINUM' : customer.plan === 'monthly' ? 'PRO PLAN' : customer.plan === 'external' ? 'MANUEL' : 'DENEME'}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex flex-col gap-1 font-bold text-[#2A3444] text-[12px]">
                      {customer.restaurants && customer.restaurants.length > 0 ? (
                        customer.restaurants.map(r => (
                           <span key={r.id} className="text-[#1A2332] font-black line-clamp-1">{r.name.toUpperCase()}</span>
                        ))
                      ) : (
                        <span className="text-[#6B7280] italic">YOK</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 sm:px-8 sm:py-6">
                    {customer.isActive ? (
                      <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">{t('active')}</span>
                    ) : (
                      <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">{t('passive')}</span>
                    )}
                  </td>
                  <td className="px-2 py-4 sm:px-8 sm:py-6 text-right">
                    <div className="flex items-center justify-end gap-2 sm:gap-3 hover:opacity-100">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#1A2332] bg-white border border-gray-200 shadow-sm rounded-xl hover:bg-[#F4B400] active:translate-y-1 transition-all"
                        title={t('edit')}
                      >
                        <Plus className="rotate-45" size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white bg-[#ef4444] border hover:border-[#1A2332] shadow-sm rounded-xl hover:bg-red-600 active:translate-y-1 transition-all"
                        title={t('delete')}
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#2A3444] font-bold">Hiç müşteri bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-xl max-h-[92dvh] overflow-hidden flex flex-col">
            <div className="p-5 sm:p-8 md:p-10 border-b border-gray-100 bg-[#F8F6F1]">
              <h2 className="text-xl sm:text-3xl font-black text-[#1A2332] tracking-tight uppercase">
                Müşteriyi Düzenle
              </h2>
              <p className="text-[#2A3444] text-[13px] sm:text-sm font-bold mt-2">
                Şifre sıfırlama, plan değiştirme ve hesap durumları.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-8 md:p-10 space-y-5 sm:space-y-6 md:space-y-8 overflow-y-auto no-scrollbar">
              {error && (
                <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-200 text-center uppercase tracking-widest">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Kişi Adı</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-[#F8F6F1] focus:ring-2 focus:ring-[#F4B400] outline-none text-[15px] font-bold transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">E-posta</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-[#F8F6F1] focus:ring-2 focus:ring-[#F4B400] outline-none text-[15px] font-bold shadow-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Yeni Şifre Belirle</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Değişmeyecekse boş bırakın"
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-[#F8F6F1] focus:ring-2 focus:ring-[#F4B400] outline-none text-[15px] font-bold shadow-sm transition-all placeholder:text-[13px] placeholder:font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Kayıt Planı</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({...formData, plan: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-[#F8F6F1] focus:ring-2 focus:ring-[#F4B400] outline-none text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="trial">Trial (Deneme)</option>
                    <option value="monthly">Monthly (Aylık)</option>
                    <option value="yearly">Yearly (Yıllık)</option>
                    <option value="external">External (Manuel)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Hesap Erişimi</label>
                  <select
                    value={formData.isActive ? '1' : '0'}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === '1'})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-[#F8F6F1] focus:ring-2 focus:ring-[#F4B400] outline-none text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Askıya Alındı</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Deneme Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.trialEndsAt}
                    onChange={(e) => setFormData({...formData, trialEndsAt: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-[#F8F6F1] focus:ring-2 focus:ring-[#F4B400] outline-none text-[15px] font-bold shadow-sm transition-all text-[#2A3444]"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Bağlı İşletmeler / Mağazalar</label>
                  <p className="text-xs text-[#2A3444] font-bold">Bu kullanıcıya ait işletmeleri seçin. Seçilmemiş mevcut bağlantılar kaldırılır.</p>
                </div>

                <div className="max-h-64 sm:max-h-80 overflow-y-auto rounded-2xl border border-gray-200 bg-[#F8F6F1] p-2 sm:p-3 space-y-2 sm:space-y-3">
                  {restaurants.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-[#2A3444] font-bold">Bağlanabilir işletme bulunamadı.</div>
                  ) : (
                    restaurants.map((restaurant) => {
                      const checked = formData.restaurantIds.includes(restaurant.id);
                      return (
                        <label
                          key={restaurant.id}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                            checked
                              ? 'border-[#1A2332] bg-white shadow-sm'
                              : 'border-transparent bg-white/70 hover:border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                restaurantIds: e.target.checked
                                  ? [...prev.restaurantIds, restaurant.id]
                                  : prev.restaurantIds.filter((id) => id !== restaurant.id),
                              }));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#1A2332] focus:ring-[#F4B400]"
                          />
                          <span className="text-sm font-bold text-[#1A2332]">{restaurant.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 bg-[#F8F6F1] text-[#1A2332] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#1A2332] text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#1A2332]/90 transition-colors disabled:opacity-50"
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
