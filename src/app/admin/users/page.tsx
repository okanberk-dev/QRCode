'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Store, User, ShieldCheck, Search } from 'lucide-react';
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
      
      const restRes = await fetch('/api/restaurants');
      if (restRes.ok) {
        setRestaurants(await restRes.json());
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
    setRestaurantData(prev => ({ ...prev, name, slug: prev.slug === '' ? slug : prev.slug }));
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
        <Loader2 className="animate-spin text-[#111827] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[24px] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">Hesap Yönetimi</h1>
          <p className="text-[#6b6760] text-[13px] sm:text-[15px] font-bold">Sistem yöneticilerini ve işletme yetkililerini tanımlayın.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ username: '', password: '', role: 'manager', restaurantId: '' }); setShowModal(true); }}
          className="flex items-center gap-3 bg-[#FDBF1D] text-[#111827] px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#EAB308] active:scale-95 transition-all group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          YENİ HESAP AÇ
        </button>
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
              <tr className="bg-[#FCFBF7] border-b border-gray-200 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ada89f]">
                <th className="px-4 py-4 sm:px-8 sm:py-6">YETKİLİ KULLANICI</th>
                <th className="px-4 py-4 sm:px-8 sm:py-6">ROL SİSTEMİ</th>
                <th className="px-4 py-4 sm:px-8 sm:py-6">RESTORAN / ŞUBE</th>
                <th className="px-4 py-4 sm:px-8 sm:py-6 text-right">EYLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#F7F4F0] text-sm">
              {users.filter(u => 
                u.username.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(user => (
                <tr key={user.id} className="hover:bg-[#FCFBF7]/50 transition-colors group">
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="hidden sm:flex w-12 h-12 rounded-[14px] bg-white border border-gray-200 shadow-sm items-center justify-center text-[#111827] group-hover:bg-[#FDBF1D] transition-colors">
                        <User size={20} strokeWidth={2.5} />
                      </div>
                      <span className="font-black text-[#111827] text-[13px] sm:text-[15px] tracking-tight">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    <span className={`px-3 py-1.5 sm:px-4 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1 sm:gap-2 w-max shadow-sm ${
                      user.role === 'superadmin' 
                        ? 'bg-[#111827] text-white border-transparent' 
                        : 'bg-[#FDBF1D] text-[#111827] border-transparent'
                    }`}>
                      {user.role === 'superadmin' ? <ShieldCheck size={14} className="scale-90 sm:scale-100" strokeWidth={3} /> : <Store size={14} className="scale-90 sm:scale-100" strokeWidth={3} />}
                      {user.role === 'superadmin' ? 'SUPER ADMIN' : 'YÖNETİCİ'}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex items-center gap-2 font-bold text-[#6b6760] text-[13px] sm:text-sm">
                      {user.restaurant ? (
                        <span className="text-[#111827] font-black line-clamp-1">{user.restaurant.name.toUpperCase()}</span>
                      ) : (
                        <span className="text-[#ada89f] italic">SİSTEM GENELİ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-8 sm:py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="w-10 h-10 flex items-center justify-center text-[#1f1e1d] bg-white border-2 border-[#1f1e1d] shadow-[3px_3px_0_0_#1f1e1d] rounded-xl hover:bg-[#FDBF1D] active:translate-y-1 active:shadow-none transition-all"
                        title="Düzenle"
                      >
                        <Plus className="rotate-45" size={18} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="w-10 h-10 flex items-center justify-center text-white bg-[#ef4444] border-2 border-[#1f1e1d] shadow-[3px_3px_0_0_#1f1e1d] rounded-xl hover:bg-red-600 active:translate-y-1 active:shadow-none transition-all"
                        title="Sil"
                      >
                        <Trash2 size={18} strokeWidth={3} />
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
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 sm:p-10 border-b border-gray-100 bg-[#FCFBF7]">
              <h2 className="text-xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">
                {editingId ? 'Hesabı Düzenle' : 'Yeni Yetkili Ekle'}
              </h2>
              <p className="text-[#6b6760] text-[13px] sm:text-sm font-bold mt-2">
                {editingId ? 'Kullanıcı yetkilerini ve bilgilerini güncelleyin.' : 'Sisteme yeni bir yönetici veya işletme sahibi tanımlayın.'}
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
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Kullanıcı Adı / Email</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId} // Kullanıcı adı değiştirilemez (Prisma unique constrain)
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                    className={`w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold transition-all shadow-sm ${editingId ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">
                    {editingId ? 'Şifre (Değiştirmek için)' : 'Yeni Şifre'}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingId ? 'Değişmeyecekse boş bırakın' : '••••••••'}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold shadow-sm transition-all placeholder:text-[13px] placeholder:font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Sistem Yetki Seviyesi</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value, restaurantId: ''})}
                  className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
                >
                  <option value="manager">İŞLETME YÖNETİCİSİ / SAHİBİ</option>
                  <option value="superadmin">SUPER ADMIN (SİSTEM GENELİ)</option>
                </select>
              </div>

              {formData.role === 'manager' && (
                <div className="bg-gray-50 rounded-[24px] p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6 sm:space-y-8">
                  <div className="flex gap-4 p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
                    <button
                      type="button"
                      disabled={!!editingId}
                      onClick={() => setIsNewRestaurant(false)}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${!isNewRestaurant ? 'bg-[#111827] text-white' : 'text-[#ada89f] hover:text-[#111827] disabled:opacity-50'}`}
                    >
                      MEVCUT İŞLETME
                    </button>
                    {!editingId && (
                      <button
                        type="button"
                        onClick={() => setIsNewRestaurant(true)}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${isNewRestaurant ? 'bg-[#111827] text-white' : 'text-[#ada89f] hover:text-[#111827]'}`}
                      >
                        YENİ OLUŞTUR
                      </button>
                    )}
                  </div>

                  {!isNewRestaurant ? (
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Bağlı Olduğu İşletme</label>
                      <select
                        required={!isNewRestaurant}
                        value={formData.restaurantId}
                        onChange={(e) => setFormData({...formData, restaurantId: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#FDBF1D] bg-white text-sm font-bold shadow-sm uppercase tracking-widest appearance-none cursor-pointer outline-none"
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
                        <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Yeni İşletme Adı *</label>
                        <input
                          type="text"
                          required={isNewRestaurant}
                          value={restaurantData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Örn: Mamma's Burger Ankara"
                          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#FDBF1D] shadow-sm bg-white outline-none text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Sistem URL'i (Otomatik) *</label>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-[#ada89f]">buaze.com/r/</span>
                          <input
                            type="text"
                            required={isNewRestaurant}
                            value={restaurantData.slug}
                            onChange={(e) => setRestaurantData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            placeholder="mammas-burger"
                            className="flex-1 px-5 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#FDBF1D] shadow-sm bg-white outline-none text-sm font-bold tracking-tight"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-5 pt-10 border-t-2 border-[#F7F4F0]">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-8 py-4 text-xs font-black text-[#6b6760] hover:text-[#111827] uppercase tracking-widest transition-colors"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-3 bg-[#111827] text-white px-10 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-sm hover:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <Plus size={20} className={editingId ? 'rotate-45' : ''} strokeWidth={3} />}
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
