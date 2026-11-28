'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, ExternalLink, Key, Mail, Pencil, Plus, Trash2, Loader2, Store, User, ShieldCheck, UserCog, Search } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { adminRoleLabel } from '@/components/admin/admin-nav';
import { AlertBanner, Badge, Modal, PageHeader, useConfirmDialog } from '@/components/ui';
import { useDebouncedUrlInput, useUrlFilter } from '@/hooks/useUrlFilter';

interface User {
  id: string;
  username: string;
  email: string | null;
  role: string;
  restaurantId: string | null;
  restaurant: { name: string } | null;
}

interface Restaurant {
  id: string;
  name: string;
}

// Centralised role display — `staff` is the new granular tier (CLAUDE.md
// §37.2 RBAC infrastructure). Sidebar already filters by per-resource
// `AdminPermission` grants for staff; here we just surface the label/badge.
type RoleBadgeKind = 'info' | 'ok' | 'lime';
function roleBadgeKind(role: string): RoleBadgeKind {
  if (role === 'superadmin') return 'info';
  if (role === 'staff') return 'lime';
  return 'ok';
}
function roleBadgeIcon(role: string) {
  if (role === 'superadmin') return <ShieldCheck size={11} strokeWidth={2} />;
  if (role === 'staff') return <UserCog size={11} strokeWidth={2} />;
  return <Store size={11} strokeWidth={2} />;
}

interface UsersClientProps {
  initialUsers?: User[];
  initialRestaurants?: Restaurant[];
  /** Total admin count (server prefetch). Drives "Daha fazla yükle". */
  initialTotal?: number;
}

// /api/admin/users and /api/restaurants cap a page at 100 rows.
const PAGE_SIZE = 100;

function listFrom<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  const data = (body as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/**
 * Every business (active + paused) for the manager scope picker. The API
 * defaults to 20 active rows, which hid businesses beyond the first page
 * once the list refetched after a save.
 */
async function fetchRestaurantOptions(): Promise<Restaurant[] | null> {
  const all: Restaurant[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`/api/restaurants?status=all&limit=${PAGE_SIZE}&page=${page}&fields=options`);
    if (!res.ok) return page === 1 ? null : all;
    const body = await res.json();
    all.push(...listFrom<Restaurant>(body).map((r) => ({ id: r.id, name: r.name })));
    const totalPages = (body as { meta?: { totalPages?: number } } | null)?.meta?.totalPages ?? 1;
    if (page >= totalPages) break;
  }
  return all.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

const USER_FIELD_LABEL = 'mb-2 block text-[14px] font-medium leading-[1.3] text-pn-ink';
const USER_FIELD_HINT = 'mt-1.5 text-[12px] leading-[1.45] text-[#737373]';

export default function UsersClient({ initialUsers, initialRestaurants, initialTotal }: UsersClientProps) {
  const { locale } = useAdminTranslation();
  const isTr = locale !== 'en';
  // §40.10 server-hydration — initialUsers undefined ise client'ta fetch yapılır,
  // doluysa çift skeleton flash önlenir.
  const [users, setUsers] = useState<User[]>(initialUsers ?? []);
  const [total, setTotal] = useState<number>(initialTotal ?? initialUsers?.length ?? 0);
  const [loadedPage, setLoadedPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  // PR4 — URL synced search (useUrlFilter §28).
  const filters = useUrlFilter({ search: '' });
  // The field keeps its own value and writes the URL debounced — binding it
  // straight to the URL lost keystrokes during each router round trip.
  const search = useDebouncedUrlInput(filters.values.search, (v) => filters.set('search', v));
  const searchTerm = search.input;
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants ?? []);
  const skipFirstFetchRef = useRef(initialUsers !== undefined);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [confirmDialog, askConfirm] = useConfirmDialog();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
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
    try {
      setFetchError(null);
      const usersRes = await fetch(`/api/admin/users?limit=${PAGE_SIZE}&page=1`);
      if (usersRes.ok) {
        // /api/admin/users returns { data, meta } — never assign the raw
        // response or .filter() downstream will crash.
        const usersData = await usersRes.json();
        const list = listFrom<User>(usersData);
        setUsers(list);
        setTotal(typeof usersData?.meta?.total === 'number' ? usersData.meta.total : list.length);
        setLoadedPage(1);
      } else {
        setFetchError('Yöneticiler getirilemedi. Lütfen sayfayı yenileyin.');
      }

      const options = await fetchRestaurantOptions();
      if (options) setRestaurants(options);
    } catch (e) {
      console.error(e);
      setFetchError('Bağlantı hatası — yöneticiler şu an gelmiyor.');
    }
  };

  const loadMoreUsers = async () => {
    setLoadingMore(true);
    try {
      const nextPage = loadedPage + 1;
      const res = await fetch(`/api/admin/users?limit=${PAGE_SIZE}&page=${nextPage}`);
      if (!res.ok) {
        setFetchError('Yöneticiler getirilemedi. Lütfen sayfayı yenileyin.');
        return;
      }
      const body = await res.json();
      const list = listFrom<User>(body);
      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        return [...prev, ...list.filter((u) => !seen.has(u.id))];
      });
      if (typeof body?.meta?.total === 'number') setTotal(body.meta.total);
      setLoadedPage(nextPage);
    } catch (e) {
      console.error(e);
      setFetchError('Bağlantı hatası — yöneticiler şu an gelmiyor.');
    } finally {
      setLoadingMore(false);
    }
  };

  const term = searchTerm.trim().toLocaleLowerCase('tr');
  const visibleUsers = term
    ? users.filter((u) =>
        [u.username, u.email ?? '', u.restaurant?.name ?? ''].some((v) =>
          v.toLocaleLowerCase('tr').includes(term),
        ),
      )
    : users;

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    fetchData();
  }, []);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      email: user.email || '',
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
        setError('Yöneticinin bağlanacağı işletmeyi seç ya da yeni işletme oluştur.');
        return;
      }
      if (isNewRestaurant && (!restaurantData.name || !restaurantData.slug)) {
        setError('Yeni işletme için ad ve değerlendirme adresi yaz.');
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
        setError(data.error || `Yönetici ${editingId ? 'güncellenemedi' : 'eklenemedi'}. Biraz sonra yeniden dene.`);
      } else {
        setShowModal(false);
        setEditingId(null);
        setFormData({ username: '', email: '', password: '', role: 'manager', restaurantId: '' });
        setIsNewRestaurant(false);
        setRestaurantData({ name: '', slug: '', address: '', phone: '' });
        setIsManualSlug(false);
        fetchData();
      }
    } catch {
      setError('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.');
    }
    setIsSubmitting(false);
  };

  const doDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setPageNotice(data.error || 'Yönetici silinemedi. Biraz sonra yeniden dene.');
      } else {
        fetchData();
      }
    } catch (e) {
      console.error(e);
      setPageNotice('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.');
    }
  };

  const handleDelete = (id: string) => {
    const target = users.find((u) => u.id === id);
    askConfirm({
      title: target?.username ? `"${target.username}" yöneticisi silinsin mi?` : 'Yönetici silinsin mi?',
      body: 'Hesap silinir ve bu kişi panele bir daha giremez. Geri alınamaz; gerekirse yeni hesap açarsın. İşletme ve yorum verileri etkilenmez.',
      confirmLabel: 'Yöneticiyi sil',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: () => doDelete(id),
    });
  };

  // §40.10 clean slate — skeleton return kaldırıldı; data gelene kadar
  // boş zemin (page header + tab/filter chrome görünür kalır).
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow="YÖNETİCİLER"
        title="Yöneticiler"
        description="Buaze sistem yöneticilerini ve restoran yöneticisi hesaplarını tanımla."
        actions={
          <button
            onClick={() => { setEditingId(null); setFormData({ username: '', email: '', password: '', role: 'manager', restaurantId: '' }); setShowModal(true); }}
            className="bz-btn-primary"
          >
            <Plus size={14} strokeWidth={2} />
            Yeni yönetici
          </button>
        }
      />

      {fetchError && (
        <AlertBanner kind="danger" onDismiss={() => setFetchError(null)}>
          {fetchError}
        </AlertBanner>
      )}

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
          inputMode="search"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            isTr ? 'Kullanıcı adı, e-posta veya işletme ara...' : 'Search by username, email or business...'
          }
          aria-label={isTr ? 'Yönetici ara' : 'Search admins'}
          value={searchTerm}
          onChange={(e) => search.setInput(e.target.value)}
          className="bz-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-pn-line overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse sm:min-w-[600px]">
            <thead>
              <tr className="bg-[#000000] text-[13px] font-medium text-white/80">
                <th className="px-3 py-4 sm:px-6">YÖNETİCİ</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6">ROL / YETKİ</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-6">RESTORAN / ŞUBE</th>
                <th className="px-3 py-4 sm:px-6 text-right">EYLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pn-line text-sm">
              {visibleUsers.map(user => (
                <tr key={user.id} className="hover:bg-pn-accent-soft/30 transition-all border-b border-pn-line group">
                  <td className="px-3 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-[20px] bg-[#FFFFFF] border border-pn-line flex items-center justify-center text-[#525252] group-hover:text-pn-ink group-hover:bg-pn-accent-soft transition-colors">
                        <User size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-medium text-pn-ink text-[14px] truncate block hover:underline"
                        >
                          {user.username}
                        </Link>
                        {user.email ? (
                          <span className="text-[12px] text-[#737373] truncate flex items-center gap-1 mt-0.5">
                            <Mail size={10} strokeWidth={2} />
                            {user.email}
                          </span>
                        ) : (
                          <span
                            className="text-[12px] text-[#D97706] truncate flex items-center gap-1 mt-0.5"
                            title="Kurtarma e-postası yoksa şifremi unuttum akışı çalışmaz"
                          >
                            <AlertTriangle size={10} strokeWidth={2} />
                            Kurtarma e-postası yok
                          </span>
                        )}
                        {/* Mobile-only badges */}
                        <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1.5">
                          <Badge kind={roleBadgeKind(user.role)}>
                            {adminRoleLabel(user.role, locale === 'en' ? 'en' : 'tr')}
                          </Badge>
                          {user.restaurant && (
                            <Badge kind="ghost">{user.restaurant.name}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-4 sm:px-6">
                    <Badge kind={roleBadgeKind(user.role)}>
                      {roleBadgeIcon(user.role)}
                      {adminRoleLabel(user.role, locale === 'en' ? 'en' : 'tr')}
                    </Badge>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 sm:px-8 sm:py-6">
                    <div className="flex items-center gap-2 font-medium text-pn-ink-2 text-[13px] sm:text-sm">
                      {user.restaurant ? (
                        <span className="text-pn-ink font-medium line-clamp-1">{user.restaurant.name.toUpperCase()}</span>
                      ) : (
                        <span className="text-[#6B7280] italic">SİSTEM GENELİ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-4 sm:px-8 sm:py-6 text-right">
                    <div className="flex items-center justify-end gap-2 sm:gap-3">
                      {user.role !== 'superadmin' && (
                        <Link
                          href={`/admin/users/${user.id}/permissions`}
                          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-pn-ink bg-white border border-pn-line rounded-[20px] hover:bg-pn-accent-soft active:translate-y-1 active:shadow-none transition-all"
                          title="Yetkileri yönet"
                          aria-label={`${user.username} yetkileri yönet`}
                        >
                          <Key size={16} strokeWidth={2} />
                        </Link>
                      )}
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-pn-ink bg-white border border-pn-line rounded-[20px] hover:bg-pn-canvas active:translate-y-1 active:shadow-none transition-all"
                        title="Detay"
                        aria-label={`${user.username} detayını aç`}
                      >
                        <ExternalLink size={16} strokeWidth={2} />
                      </Link>
                      <button
                        onClick={() => handleEdit(user)}
                        className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-pn-ink bg-white border border-pn-line rounded-[20px] hover:bg-pn-accent hover:text-white active:translate-y-1 active:shadow-none transition-all"
                        title="Düzenle"
                        aria-label={`${user.username} düzenle`}
                      >
                        <Pencil size={16} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-white bg-[#991B1B] border border-pn-line rounded-[20px] hover:bg-[#7F1D1D] active:translate-y-1 active:shadow-none transition-all"
                        title="Sil"
                        aria-label={`${user.username} sil`}
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

      {term && visibleUsers.length === 0 && users.length > 0 && (
        <p className="px-1 text-[13px] text-[#737373]">
          &quot;{searchTerm.trim()}&quot; ile eşleşen yönetici bulunamadı.
          {users.length < total ? ' Arama yalnızca yüklenen yöneticilerde yapılır.' : ''}
        </p>
      )}

      {users.length < total && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[12px] text-[#737373]">
            {users.length} / {total} yönetici yüklendi
          </p>
          <button
            type="button"
            onClick={loadMoreUsers}
            disabled={loadingMore}
            className="bz-btn-ghost disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2} />}
            Daha fazla yükle
          </button>
        </div>
      )}

      {showModal && (
        <Modal
          size={640}
          onClose={() => { setShowModal(false); setEditingId(null); setError(''); }}
          title={editingId ? 'Yöneticiyi düzenle' : 'Yeni yönetici ekle'}
          description={
            editingId
              ? 'Şifreyi, kurtarma e-postasını ve yetki seviyesini değiştirebilirsin. Kullanıcı adı değişmez.'
              : 'Buaze ekibinden biri ya da bir işletmenin yöneticisi için yönetim paneline giriş hesabı açarsın.'
          }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <AlertBanner kind="danger">{error}</AlertBanner>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="admin-user-username" className={USER_FIELD_LABEL}>
                    Kullanıcı adı
                    {!editingId && <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>}
                  </label>
                  <input
                    id="admin-user-username"
                    type="text"
                    required
                    disabled={!!editingId} // Kullanıcı adı değiştirilemez (Prisma unique constrain)
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                    aria-describedby="admin-user-username-hint"
                    className="bz-input"
                  />
                  <p id="admin-user-username-hint" className={USER_FIELD_HINT}>
                    {editingId ? 'Kullanıcı adı değiştirilemez.' : 'Girişte kullanılır. 3-64 karakter; sonradan değiştirilemez.'}
                  </p>
                </div>
                <div>
                  <label htmlFor="admin-user-password" className={USER_FIELD_LABEL}>
                    {editingId ? 'Yeni şifre' : 'Şifre'}
                    {!editingId && <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>}
                  </label>
                  <input
                    id="admin-user-password"
                    type="password"
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    autoComplete="new-password"
                    aria-describedby="admin-user-password-hint"
                    className="bz-input"
                  />
                  <p id="admin-user-password-hint" className={USER_FIELD_HINT}>
                    {editingId
                      ? 'Değiştirmeyeceksen boş bırak. En az 8 karakter; harf ve rakam içersin.'
                      : 'En az 8 karakter; harf ve rakam içersin.'}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="admin-user-email" className={USER_FIELD_LABEL}>
                  Kurtarma e-postası
                </label>
                <input
                  id="admin-user-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value.trim()})}
                  placeholder="ornek@buaze.com"
                  aria-describedby="admin-user-email-hint"
                  className="bz-input"
                />
                <p id="admin-user-email-hint" className={USER_FIELD_HINT}>
                  Şifresini unutursa kurtarma kodu bu adrese gider. Boş bırakırsan kişi şifresini
                  kendi sıfırlayamaz; adresi sonra profilinden ekleyebilir.
                </p>
              </div>

              <div>
                <label htmlFor="admin-user-role" className={USER_FIELD_LABEL}>
                  Yetki seviyesi
                </label>
                <select
                  id="admin-user-role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value, restaurantId: ''})}
                  className="bz-input cursor-pointer"
                >
                  <option value="manager">Yönetici (tek bir işletme)</option>
                  <option value="staff">Görevli (Buaze ekibi, kısıtlı)</option>
                  <option value="superadmin">Superadmin (tüm sistem)</option>
                </select>
                {formData.role === 'staff' && (
                  <p className={USER_FIELD_HINT}>
                    Görevli başlangıçta çok az bölüm görür. Kaydettikten sonra listedeki{' '}
                    <span className="font-medium text-pn-ink">Yetkileri yönet</span> ile görebileceği
                    ve düzenleyebileceği bölümleri seç.
                  </p>
                )}
                {formData.role === 'superadmin' && (
                  <p className={USER_FIELD_HINT}>
                    Superadmin tüm işletmeleri, ödemeleri ve diğer yöneticileri görür ve değiştirebilir.
                  </p>
                )}
              </div>

              {formData.role === 'manager' && (
                <div className="space-y-4 rounded-[20px] bg-pn-canvas p-4 sm:p-5">
                  <div>
                    <p id="admin-user-business-mode" className={USER_FIELD_LABEL}>
                      Hangi işletmeyi yönetecek?
                    </p>
                    <div
                      role="group"
                      aria-labelledby="admin-user-business-mode"
                      className="flex gap-1.5 rounded-[18px] bg-white p-1.5"
                    >
                      <button
                        type="button"
                        disabled={!!editingId}
                        aria-pressed={!isNewRestaurant}
                        onClick={() => setIsNewRestaurant(false)}
                        className={`min-h-11 flex-1 rounded-[14px] px-2 text-[13px] font-medium transition-colors ${!isNewRestaurant ? 'bg-pn-accent text-white' : 'text-[#737373] hover:text-pn-ink disabled:opacity-50'}`}
                      >
                        Var olan işletme
                      </button>
                      {!editingId && (
                        <button
                          type="button"
                          aria-pressed={isNewRestaurant}
                          onClick={() => setIsNewRestaurant(true)}
                          className={`min-h-11 flex-1 rounded-[14px] px-2 text-[13px] font-medium transition-colors ${isNewRestaurant ? 'bg-pn-accent text-white' : 'text-[#737373] hover:text-pn-ink'}`}
                        >
                          Yeni işletme
                        </button>
                      )}
                    </div>
                  </div>

                  {!isNewRestaurant ? (
                    <div>
                      <label htmlFor="admin-user-restaurant" className={USER_FIELD_LABEL}>
                        İşletme
                        <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
                      </label>
                      <select
                        id="admin-user-restaurant"
                        required={!isNewRestaurant}
                        value={formData.restaurantId}
                        onChange={(e) => setFormData({...formData, restaurantId: e.target.value})}
                        className="bz-input cursor-pointer"
                      >
                        <option value="">İşletme seç</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <p className={USER_FIELD_HINT}>Yönetici yalnız bu işletmenin verilerini görür.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="admin-user-new-business" className={USER_FIELD_LABEL}>
                          İşletme adı
                          <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="admin-user-new-business"
                          type="text"
                          required={isNewRestaurant}
                          value={restaurantData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Örn: Gourmet Eats Ankara"
                          className="bz-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-user-new-slug" className={USER_FIELD_LABEL}>
                          Değerlendirme adresi
                          <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-[13px] text-[#737373]">buaze.com/r/</span>
                          <input
                            id="admin-user-new-slug"
                            type="text"
                            required={isNewRestaurant}
                            value={restaurantData.slug}
                            onChange={(e) => {
                              setRestaurantData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                              setIsManualSlug(true);
                            }}
                            placeholder="gourmet-eats"
                            aria-describedby="admin-user-new-slug-hint"
                            className="bz-input min-w-0 flex-1"
                          />
                        </div>
                        <p id="admin-user-new-slug-hint" className={USER_FIELD_HINT}>
                          Ada göre kendiliğinden dolar; istersen değiştir. Küçük harf, rakam ve tire kullan.
                          Müşterilerin QR ile açtığı sayfanın adresidir.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-pn-line pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); setError(''); }}
                  className="bz-btn-ghost"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bz-btn-primary disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={14} strokeWidth={2} />
                  ) : editingId ? (
                    <Check size={14} strokeWidth={2} />
                  ) : (
                    <Plus size={14} strokeWidth={2} />
                  )}
                  {isSubmitting ? 'Kaydediliyor…' : editingId ? 'Değişiklikleri kaydet' : 'Yöneticiyi ekle'}
                </button>
              </div>
            </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}
