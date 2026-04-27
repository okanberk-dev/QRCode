'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Store, User, ShieldCheck, Search } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { AlertBanner, Badge, Modal, PageHeader, TableSkeleton, useConfirmDialog } from '@/components/ui';

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
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [confirmDialog, askConfirm] = useConfirmDialog();
  
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
        setError(data.error || `Yönetici ${editingId ? 'güncellenemedi' : 'oluşturulamadı'}`);
      } else {
        setShowModal(false);
        setEditingId(null);
        setFormData({ username: '', password: '', role: 'manager', restaurantId: '' });
        setIsNewRestaurant(false);
        setRestaurantData({ name: '', slug: '', address: '', phone: '' });
        setIsManualSlug(false);
        fetchData();
      }
    } catch {
      setError('Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    }
    setIsSubmitting(false);
  };

  const doDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setPageNotice(data.error || 'Silme işlemi başarısız');
      } else {
        fetchData();
      }
    } catch (e) {
      console.error(e);
      setPageNotice('Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    }
  };

  const handleDelete = (id: string) => {
    askConfirm({
      title: 'Yöneticiyi sil?',
      body: 'Bu yöneticinin erişimi geri alınamaz şekilde kapatılacak.',
      confirmLabel: 'Sil',
      cancelLabel: 'İptal',
      variant: 'danger',
      onConfirm: () => doDelete(id),
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="YÖNETİCİLER" title="Yükleniyor…" />
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow="YÖNETİCİLER"
        title="Yöneticiler"
        description="Buaze sistem yöneticilerini ve restoran yöneticisi hesaplarını tanımla."
        actions={
          <button
            onClick={() => { setEditingId(null); setFormData({ username: '', password: '', role: 'manager', restaurantId: '' }); setShowModal(true); }}
            className="bz-btn-primary"
          >
            <Plus size={14} strokeWidth={2} />
            Yeni yönetici
          </button>
        }
      />

      {pageNotice && (
        <AlertBanner kind="danger" onDismiss={() => setPageNotice(null)}>
          {pageNotice}
        </AlertBanner>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={14} strokeWidth={2} />
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bz-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EDEDED] overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse sm:min-w-[600px]">
            <thead>
              <tr className="bg-[#1f2937] pulse-eyebrow text-[#9ca3af]">
                <th className="px-3 py-4 sm:px-6">YÖNETİCİ</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6">ROL / YETKİ</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6">RESTORAN / ŞUBE</th>
                <th className="px-3 py-4 sm:px-6 text-right">EYLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#FFFFFF] text-sm">
              {users.filter(u =>
                u.username.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(user => (
                <tr key={user.id} className="hover:bg-[#EAF9B8]/30 transition-all border-b border-[#EDEDED] group">
                  <td className="px-3 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#FFFFFF] border border-[#EDEDED] flex items-center justify-center text-[#525252] group-hover:text-[#0A0A0A] group-hover:bg-[#EAF9B8] transition-colors">
                        <User size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#0A0A0A] text-[14px] truncate block">{user.username}</span>
                        {/* Mobile-only badges */}
                        <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1.5">
                          <Badge kind={user.role === 'superadmin' ? 'info' : 'ok'}>
                            {user.role === 'superadmin' ? 'Superadmin' : 'Yönetici'}
                          </Badge>
                          {user.restaurant && (
                            <Badge kind="ghost">{user.restaurant.name}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-4 sm:px-6">
                    <Badge kind={user.role === 'superadmin' ? 'info' : 'ok'}>
                      {user.role === 'superadmin' ? <ShieldCheck size={11} strokeWidth={2} /> : <Store size={11} strokeWidth={2} />}
                      {user.role === 'superadmin' ? 'Superadmin' : 'Yönetici'}
                    </Badge>
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
                        className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-[#0A0A0A] bg-white border border-[#EDEDED] rounded-xl hover:bg-[#C6F24E] active:translate-y-1 active:shadow-none transition-all"
                        title="Düzenle"
                      >
                        <Plus className="rotate-45" size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-white bg-[#ef4444] border border-[#EDEDED] rounded-xl hover:bg-red-600 active:translate-y-1 active:shadow-none transition-all"
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
        <Modal
          size={640}
          onClose={() => { setShowModal(false); setEditingId(null); setError(''); }}
          title={
            <div>
              <p className="pulse-eyebrow text-[#737373]">{editingId ? 'Düzenle' : 'Yeni kayıt'}</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
                {editingId ? 'Yöneticiyi düzenle' : 'Yeni yönetici ekle'}
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#525252]">
                {editingId
                  ? 'Yönetici yetkilerini ve bilgilerini güncelleyin.'
                  : 'Sisteme yeni bir Buaze yöneticisi veya restoran yöneticisi tanımlayın.'}
              </p>
            </div>
          }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <AlertBanner kind="danger">{error}</AlertBanner>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Kullanıcı Adı</label>
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
                  <option value="manager">RESTORAN YÖNETİCİSİ</option>
                  <option value="superadmin">BUAZE YÖNETİCİSİ (SİSTEM GENELİ)</option>
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
                        <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Sistem URL&apos;i (Otomatik) *</label>
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

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 mt-2 border-t border-[#EDEDED]">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); setError(''); }}
                  className="bz-btn-ghost"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bz-btn-primary disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} strokeWidth={2} /> : <Plus size={14} className={editingId ? 'rotate-45' : ''} strokeWidth={2} />}
                  {editingId ? 'Güncellemeyi kaydet' : 'Hesabı oluştur'}
                </button>
              </div>
            </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}
