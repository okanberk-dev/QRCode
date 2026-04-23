'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Store, User, ShieldCheck, Search, X } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

interface User {
  id: string;
  username: string;
  role: string;
  restaurantId: string | null;
  restaurant: { name: string } | null;
}

interface Restaurant {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { t } = useAdminTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'manager',
    restaurantId: ''
  });

  const [isNewRestaurant, setIsNewRestaurant] = useState(false);
  const [restaurantData, setRestaurantData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: ''
  });
  const [isManualSlug, setIsManualSlug] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        // /api/admin/users returns { data, meta } — never assign the raw
        // response or .filter() downstream will crash.
        const usersData = await usersRes.json();
        const list = Array.isArray(usersData)
          ? usersData
          : Array.isArray(usersData?.data)
          ? usersData.data
          : [];
        setUsers(list);
      }

      const restRes = await fetch('/api/restaurants');
      if (restRes.ok) {
        const restData = await restRes.json();
        setRestaurants(
          Array.isArray(restData)
            ? restData
            : Array.isArray(restData?.data)
            ? restData.data
            : [],
        );
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '', // Şifreyi boş bırak, sadece değişmek istiyorsa doldursun
      role: user.role,
      restaurantId: user.restaurantId || ''
    });
    setIsNewRestaurant(false);
    setShowModal(true);
  };

  const handleNameChange = (name: string) => {
    if (isManualSlug) {
      setRestaurantData(prev => ({ ...prev, name }));
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[şŞ]/g, 's')
      .replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setRestaurantData(prev => ({ ...prev, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.role === 'manager' && !editingId) {
      if (!isNewRestaurant && !formData.restaurantId) {
        setError('Lütfen mevcut bir restoran seçin veya yeni oluşturun.');
        return;
      }
      if (isNewRestaurant && (!restaurantData.name || !restaurantData.slug)) {
        setError('Yeni restoran için mekan adı ve URL zorunludur.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        isNewRestaurant,
        restaurantData: isNewRestaurant ? restaurantData : undefined
      };

      const url = editingId ? `/api/admin/users/${editingId}` : '/api/admin/users';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || `Kullanıcı ${editingId ? 'güncellenemedi' : 'oluşturulamadı'}`);
      } else {
        setShowModal(false);
        setEditingId(null);
        setFormData({ username: '', password: '', role: 'manager', restaurantId: '' });
        setIsNewRestaurant(false);
        setRestaurantData({ name: '', slug: '', address: '', phone: '' });
        setIsManualSlug(false);
        fetchData();
      }
    } catch (e) {
      setError('Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı/yöneticiyi silmek istediğinize emin misiniz?')) return;
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
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

  if (loading && users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#0A0A0A] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
        <div className="space-y-1">
          <p className="pulse-eyebrow text-[#737373]">PANEL / KULLANICILAR</p>
          <h1
            className="text-[26px] sm:text-[32px] font-medium text-[#0A0A0A] tracking-[-0.025em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Hesap Yönetimi
          </h1>
          <p className="text-[#525252] text-[13px] sm:text-[14px] max-w-[520px]">
            Sistem yöneticilerini ve işletme yetkililerini tanımlayın.
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ username: '', password: '', role: 'manager', restaurantId: '' }); setShowModal(true); }}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-[#C6F24E] text-[#0A0A0A] px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-[#C6F24E] active:scale-95 transition-all group"
        >
          <Plus size={20} strokeWidth={2} className="group-hover:rotate-90 transition-transform" />
          YENİ HESAP AÇ
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#0A0A0A] transition-colors" size={20} strokeWidth={2} />
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-[#EDEDED] rounded-xl pl-12 sm:pl-16 pr-4 sm:pr-8 py-4 sm:py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E] transition-all"
        />
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EDEDED] overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse sm:min-w-[600px]">
            <thead>
              <tr className="bg-[#1f2937] pulse-eyebrow text-[#9ca3af]">
                <th className="px-3 py-4 sm:px-6">{t('users').toUpperCase()}</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6">ROL / YETKİ</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6">RESTORAN / ŞUBE</th>
                <th className="px-3 py-4 sm:px-6 text-right">EYLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#FFFFFF] text-sm">
              {users.filter(u =>
                u.username.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(user => (
                <tr key={user.id} className="hover:bg-blue-50/50 transition-all border-b border-[#EDEDED] group">
                  <td className="px-3 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#FFFFFF] border border-[#EDEDED] flex items-center justify-center text-[#6B7280] group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                        <User size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#0A0A0A] text-[14px] truncate block">{user.username}</span>
                        {/* Mobile-only badges */}
                        <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${
                            user.role === 'superadmin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {user.role === 'superadmin' ? 'SUPER' : 'YÖNETİCİ'}
                          </span>
                          {user.restaurant && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-[#EDEDED] text-[#1A1A1A] truncate max-w-[140px]">
                              {user.restaurant.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-4 sm:px-6">
                    <span className={`px-3 py-1 rounded-lg pulse-eyebrow border flex items-center gap-2 w-max ${
                      user.role === 'superadmin'
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {user.role === 'superadmin' ? <ShieldCheck size={14} strokeWidth={2} /> : <Store size={14} strokeWidth={2} />}
                      {user.role === 'superadmin' ? 'SUPER ADMIN' : 'YÖNETİCİ'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex items-center gap-2 font-bold text-[#1A1A1A] text-[13px] sm:text-sm">
                      {user.restaurant ? (
                        <span className="text-[#0A0A0A] font-semibold line-clamp-1">{user.restaurant.name.toUpperCase()}</span>
                      ) : (
                        <span className="text-[#6B7280] italic">SİSTEM GENELİ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-4 sm:px-8 sm:py-6 text-right">
                    <div className="flex items-center justify-end gap-2 sm:gap-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#0A0A0A] bg-white border border-[#EDEDED] rounded-xl hover:bg-[#C6F24E] active:translate-y-1 active:shadow-none transition-all"
                        title="Düzenle"
                      >
                        <Plus className="rotate-45" size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white bg-[#ef4444] border border-[#EDEDED] rounded-xl hover:bg-red-600 active:translate-y-1 active:shadow-none transition-all"
                        title="Sil"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-[#EDEDED] w-full max-w-xl max-h-[92dvh] overflow-hidden flex flex-col">
            <div className="p-5 sm:p-8 md:p-10 border-b border-[#EDEDED] bg-[#FFFFFF] relative">
              <h2 className="text-xl sm:text-3xl font-semibold text-[#0A0A0A] tracking-tight uppercase pr-10">
                {editingId ? 'Hesabı Düzenle' : 'Yeni Yetkili Ekle'}
              </h2>
              <p className="text-[#1A1A1A] text-[13px] sm:text-sm font-bold mt-2">
                {editingId ? 'Kullanıcı yetkilerini ve bilgilerini güncelleyin.' : 'Sisteme yeni bir yönetici veya işletme sahibi tanımlayın.'}
              </p>

              <button
                onClick={() => { setShowModal(false); setEditingId(null); setError(''); }}
                className="absolute right-4 top-5 sm:right-8 sm:top-10 p-2 text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#EDEDED] rounded-xl transition-all"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-8 md:p-10 space-y-5 sm:space-y-6 md:space-y-8 overflow-y-auto no-scrollbar">
              {error && (
                <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-200 text-center ">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Kullanıcı Adı / Email</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId} // Kullanıcı adı değiştirilemez (Prisma unique constrain)
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                    className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-[15px] font-bold transition-all ${editingId ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">
                    {editingId ? 'Şifre (Değiştirmek için)' : 'Yeni Şifre'}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingId ? 'Değişmeyecekse boş bırakın' : '••••••••'}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-[15px] font-bold transition-all placeholder:text-[13px] placeholder:font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Sistem Yetki Seviyesi</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value, restaurantId: ''})}
                  className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-sm font-semibold appearance-none cursor-pointer shadow-sm"
                >
                  <option value="manager">İŞLETME YÖNETİCİSİ / SAHİBİ</option>
                  <option value="superadmin">SUPER ADMIN (SİSTEM GENELİ)</option>
                </select>
              </div>

              {formData.role === 'manager' && (
                <div className="bg-[#FFFFFF] rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-[#EDEDED] space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="flex gap-4 p-2 bg-white border border-[#EDEDED] rounded-xl">
                    <button
                      type="button"
                      disabled={!!editingId}
                      onClick={() => setIsNewRestaurant(false)}
                      className={`flex-1 py-3 pulse-eyebrow rounded-xl transition-all ${!isNewRestaurant ? 'bg-[#0A0A0A] text-white' : 'text-[#6B7280] hover:text-[#0A0A0A] disabled:opacity-50'}`}
                    >
                      MEVCUT İŞLETME
                    </button>
                    {!editingId && (
                      <button
                        type="button"
                        onClick={() => setIsNewRestaurant(true)}
                        className={`flex-1 py-3 pulse-eyebrow rounded-xl transition-all ${isNewRestaurant ? 'bg-[#0A0A0A] text-white' : 'text-[#6B7280] hover:text-[#0A0A0A]'}`}
                      >
                        YENİ OLUŞTUR
                      </button>
                    )}
                  </div>

                  {!isNewRestaurant ? (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Bağlı Olduğu İşletme</label>
                      <select
                        required={!isNewRestaurant}
                        value={formData.restaurantId}
                        onChange={(e) => setFormData({...formData, restaurantId: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl border border-[#EDEDED] focus:ring-2 focus:ring-[#C6F24E] bg-white text-sm font-semibold appearance-none cursor-pointer outline-none"
                      >
                        <option value="">İŞLETME SEÇİN...</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Yeni İşletme Adı *</label>
                        <input
                          type="text"
                          required={isNewRestaurant}
                          value={restaurantData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Örn: Gourmet Eats Ankara"
                          className="w-full px-5 py-4 rounded-xl border border-[#EDEDED] focus:ring-2 focus:ring-[#C6F24E] bg-white outline-none text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Sistem URL'i (Otomatik) *</label>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-[#6B7280]">buaze.com/r/</span>
                          <input
                            type="text"
                            required={isNewRestaurant}
                            value={restaurantData.slug}
                            onChange={(e) => {
                              setRestaurantData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                              setIsManualSlug(true);
                            }}
                            placeholder="gourmet-eats"
                            className="flex-1 px-5 py-4 rounded-xl border border-[#EDEDED] focus:ring-2 focus:ring-[#C6F24E] bg-white outline-none text-sm font-bold tracking-tight"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-5 pt-6 sm:pt-10 border-t-2 border-[#FFFFFF]">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-6 sm:px-8 py-3 sm:py-4 text-xs font-semibold text-[#1A1A1A] hover:text-[#0A0A0A]  transition-colors"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 sm:gap-3 bg-[#0A0A0A] text-white px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-xs font-semibold hover:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} strokeWidth={2} /> : <Plus size={20} className={editingId ? 'rotate-45' : ''} strokeWidth={2} />}
                  {editingId ? 'GÜNCELLEMEYİ KAYDET' : 'HESABI OLUŞTUR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
