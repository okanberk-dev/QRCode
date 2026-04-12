'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Store, User, ShieldCheck } from 'lucide-react';

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
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.role === 'manager') {
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

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Kullanıcı oluşturulamadı');
      } else {
        setShowModal(false);
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
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">Hesap Yönetimi</h1>
          <p className="text-gray-500 text-sm font-medium">Sistem yöneticilerini ve restoran sahiplerini yönetin.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#111827] hover:bg-[#1f2937] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Yeni Hesap Aç
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4">Kullanıcı Adı</th>
              <th className="px-6 py-4">Sistem Rolü</th>
              <th className="px-6 py-4">Bağlı Olduğu İşletme</th>
              <th className="px-6 py-4 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-[#111827] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <User size={14} />
                  </div>
                  {user.username}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 w-max ${
                    user.role === 'superadmin' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-[#FDBF1D]/20 text-[#9c7100]'
                  }`}>
                    {user.role === 'superadmin' ? <ShieldCheck size={14}/> : <Store size={14}/>}
                    {user.role === 'superadmin' ? 'Super Admin' : 'Restoran Yöneticisi'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 font-medium">
                  {user.restaurant ? user.restaurant.name : <span className="text-gray-400 italic">Sistem Geneli</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[24px]">
              <div>
                <h2 className="text-xl font-black text-[#111827]">Yeni Yetkili Ekle</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Giriş şifresi ve şirket tanımlaması yapın.</p>
              </div>
            </div>
            
            {error && (
              <div className="mx-6 mt-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Kullanıcı Adı / Email</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 outline-none text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Şifre</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 outline-none text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Kullanıcı Rolü</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value, restaurantId: ''})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 outline-none text-sm font-medium transition-all bg-white"
                >
                  <option value="manager">Restoran Yöneticisi / Sahibi</option>
                  <option value="superadmin">Super Admin (Tüm Sistem Yetkisi)</option>
                </select>
              </div>

              {formData.role === 'manager' && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mt-4 space-y-4">
                  <div className="flex gap-2 p-1 bg-gray-200/50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setIsNewRestaurant(false)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isNewRestaurant ? 'bg-white shadow-sm text-[#111827]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Mevcut Restoran
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewRestaurant(true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isNewRestaurant ? 'bg-white shadow-sm text-[#111827]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Sıfırdan Yarat
                    </button>
                  </div>

                  {!isNewRestaurant ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Bağlı Olduğu İşletme</label>
                      <select
                        required={!isNewRestaurant}
                        value={formData.restaurantId}
                        onChange={(e) => setFormData({...formData, restaurantId: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] outline-none text-sm font-medium bg-white"
                      >
                        <option value="">İşletme Seçin...</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Yeni Mekan Adı *</label>
                        <input
                          type="text"
                          required={isNewRestaurant}
                          value={restaurantData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Örn: Mamma's Burger Ankara"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] outline-none text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Sistem URL'i *</label>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-400 mr-1">/r/</span>
                          <input
                            type="text"
                            required={isNewRestaurant}
                            value={restaurantData.slug}
                            onChange={(e) => setRestaurantData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            placeholder="mammas-burger"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] outline-none text-sm font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Telefon Numarası</label>
                          <input
                            type="text"
                            value={restaurantData.phone}
                            onChange={(e) => setRestaurantData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="0555..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] outline-none text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Mekan Adresi / Yeri</label>
                          <input
                            type="text"
                            value={restaurantData.address}
                            onChange={(e) => setRestaurantData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Mahall Ankara..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#111827] outline-none text-sm font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#111827] hover:bg-black text-[#FDBF1D] px-8 py-3 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
