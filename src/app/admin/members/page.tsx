'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Check, AlertTriangle, Crown, RefreshCw, Store, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge, type BadgeKind, PageHeader } from '@/components/ui';

interface Member {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { restaurants: number };
}

function daysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const PLAN_BADGE: Record<string, { label: string; kind: BadgeKind }> = {
  trial: { label: 'Deneme', kind: 'lime' },
  monthly: { label: 'Aylık', kind: 'info' },
  yearly: { label: 'Yıllık', kind: 'ok' },
  free: { label: 'Ücretsiz', kind: 'ghost' },
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editPlan, setEditPlan] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editTrialEndsAt, setEditTrialEndsAt] = useState('');

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/members');
      if (res.ok) setMembers(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditPlan(member.plan);
    setEditIsActive(member.isActive);
    setEditTrialEndsAt(
      member.trialEndsAt
        ? new Date(member.trialEndsAt).toISOString().split('T')[0]
        : ''
    );
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!editingMember) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: editPlan,
          isActive: editIsActive,
          trialEndsAt: editTrialEndsAt || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('İşletme sahibi güncellendi.');
        setEditingMember(null);
        fetchMembers();
      } else {
        setError(data.error || 'Güncelleme başarısız.');
      }
    } catch {
      setError('Bağlantı hatası.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#0A0A0A] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="İŞLETME SAHİPLERİ"
        title="İşletme sahipleri"
        description="Buaze'ye kayıtlı işletme sahibi hesaplarının plan, deneme süresi, erişim durumu ve bağlı işletme sayısını yönet."
        actions={
          <button onClick={fetchMembers} className="bz-btn-ghost">
            <RefreshCw size={14} strokeWidth={2} />
            Yenile
          </button>
        }
      />

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold">
          <Check size={18} strokeWidth={2} /> {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EDEDED] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse sm:min-w-[600px]">
            <thead>
              <tr className="bg-[#1f2937] pulse-eyebrow text-[#9ca3af]">
                <th className="px-3 py-4 sm:px-5">İŞLETME SAHİBİ</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-5">PLAN</th>
                <th className="hidden lg:table-cell px-3 py-4 sm:px-5">DENEME / BİTİŞ</th>
                    <th className="hidden lg:table-cell px-3 py-4 sm:px-5">İŞLETME</th>
                <th className="hidden md:table-cell px-3 py-4 sm:px-5">DURUM</th>
                <th className="px-3 py-4 sm:px-5 text-right">EYLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFFFFF]">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-[#6B7280]">
                    Henüz kayıtlı işletme sahibi yok.
                  </td>
                </tr>
              ) : members.map((m) => {
                const dl = daysLeft(m.trialEndsAt);
                const trialExpired = m.plan === 'trial' && dl !== null && dl <= 0;
                const trialSoon = m.plan === 'trial' && dl !== null && dl > 0 && dl <= 3;
                const planMeta = PLAN_BADGE[m.plan] || { label: m.plan, kind: 'ghost' as const };

                return (
                  <tr key={m.id} className="hover:bg-[#FAFAFA] transition-all">
                    <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="bz-avatar" style={{ width: 36, height: 36 }}>
                          {(m.name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">{m.name || '—'}</p>
                          <p className="text-[11px] text-[#737373] truncate">{m.email}</p>
                          <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1.5">
                            <Badge kind={planMeta.kind}>{planMeta.label}</Badge>
                            <Badge kind={m.isActive ? 'ok' : 'danger'}>
                              {m.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                            {m.plan === 'trial' && m.trialEndsAt && (
                              <Badge kind={trialExpired ? 'danger' : trialSoon ? 'warn' : 'ghost'}>
                                {trialExpired ? 'Süresi doldu' : `${dl}g kaldı`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-4 sm:px-5">
                      <Badge kind={planMeta.kind}>
                        <Crown size={10} strokeWidth={2} />
                        {planMeta.label}
                      </Badge>
                    </td>
                    <td className="hidden lg:table-cell px-3 py-4 sm:px-5">
                      {m.plan === 'trial' && m.trialEndsAt ? (
                        <span
                          className="text-xs font-medium flex items-center gap-1.5"
                          style={{ color: trialExpired ? '#DC2626' : trialSoon ? '#D97706' : '#525252' }}
                        >
                          {trialExpired ? <AlertTriangle size={12} strokeWidth={2} /> : null}
                          {trialExpired
                            ? `Süresi doldu (${Math.abs(dl!)} gün önce)`
                            : `${dl} gün kaldı`}
                        </span>
                      ) : (
                        <span className="text-xs text-[#737373]">—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-4 sm:px-5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#0A0A0A]">
                        <Store size={13} strokeWidth={2} />
                        {m._count.restaurants}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-4 sm:px-5">
                      <Badge kind={m.isActive ? 'ok' : 'danger'}>
                        {m.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </td>
                    <td className="px-2 py-4 sm:px-5 text-right">
                      <button
                        onClick={() => openEdit(m)}
                        className="bz-btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#EDEDED] w-full max-w-md max-h-[92dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">
            <div className="p-6 border-b border-[#EDEDED] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0A0A] uppercase tracking-tight">İşletme Sahibini Düzenle</h2>
                <p className="text-xs text-[#1A1A1A] font-bold mt-1">{editingMember.email}</p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-2 text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#EDEDED] rounded-xl transition-all"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold text-center">
                  {error}
                </div>
              )}

              {/* Plan */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['trial', 'monthly', 'yearly', 'free'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPlan(p)}
                      className={`py-3 rounded-xl border-2 pulse-eyebrow transition-all ${
                        editPlan === p
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                          : 'bg-white text-[#1A1A1A] border-[#EDEDED] hover:border-[#6B7280]'
                      }`}
                    >
                      {PLAN_BADGE[p]?.label.toUpperCase() || p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trial End Date */}
              {editPlan === 'trial' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Deneme Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={editTrialEndsAt}
                    onChange={(e) => setEditTrialEndsAt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-sm font-bold"
                  />
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-[#FFFFFF] rounded-2xl border border-[#EDEDED]">
                <div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">Hesap Durumu</p>
                  <p className="text-xs font-bold text-[#1A1A1A] mt-0.5">{editIsActive ? 'Kullanıcı sisteme girebilir.' : 'Kullanıcı erişimi engellendi.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive((v) => !v)}
                  aria-pressed={editIsActive}
                  aria-label={editIsActive ? 'Aktif - tıklayarak devre dışı bırak' : 'Devre dışı - tıklayarak etkinleştir'}
                  className={`transition-all duration-200 active:scale-95 ${editIsActive ? 'text-[#A8D62E] hover:text-[#8CB81E]' : 'text-[#6B7280] hover:text-[#0A0A0A]'}`}
                >
                  {editIsActive
                    ? <ToggleRight size={36} strokeWidth={1.5} />
                    : <ToggleLeft size={36} strokeWidth={1.5} />}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-3 rounded-xl border border-[#EDEDED] text-sm font-semibold text-[#1A1A1A] hover:text-[#0A0A0A] transition-colors"
                >
                  İPTAL
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#0A0A0A] text-white text-sm font-semibold hover:bg-[#1A1A1A] disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
                  KAYDET
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
