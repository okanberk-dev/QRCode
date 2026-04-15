'use client';

import { useState, useEffect } from 'react';
import { Loader2, Users, X, Check, AlertTriangle, Crown, RefreshCw, Store, ToggleLeft, ToggleRight } from 'lucide-react';

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

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  trial:   { label: 'DENEME',  color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  monthly: { label: 'AYLIK',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  yearly:  { label: 'YILLIK',  color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  free:    { label: 'ÜCRETSİZ', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
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
        setSuccess('Kullanıcı güncellendi.');
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
        <Loader2 className="animate-spin text-[#111827] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">Üye Yönetimi</h1>
          <p className="text-[#6b6760] text-[13px] sm:text-[15px] font-bold">Kayıtlı işletme sahiplerinin planlarını ve erişimlerini yönetin.</p>
        </div>
        <button
          onClick={fetchMembers}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FCFBF7] border border-gray-200 text-sm font-black text-[#111827] hover:bg-gray-100 transition-all active:scale-95"
        >
          <RefreshCw size={16} strokeWidth={2.5} />
          YENİLE
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-black">
          <Check size={18} strokeWidth={3} /> {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#1f2937] text-[11px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">
                <th className="px-5 py-4">KULLANICI</th>
                <th className="px-5 py-4">PLAN</th>
                <th className="px-5 py-4">DENEME / BİTİŞ</th>
                <th className="px-5 py-4">İŞLETME</th>
                <th className="px-5 py-4">DURUM</th>
                <th className="px-5 py-4 text-right">EYLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-[#ada89f]">
                    Henüz kayıtlı üye yok.
                  </td>
                </tr>
              ) : members.map((m) => {
                const dl = daysLeft(m.trialEndsAt);
                const trialExpired = m.plan === 'trial' && dl !== null && dl <= 0;
                const trialSoon = m.plan === 'trial' && dl !== null && dl > 0 && dl <= 3;
                const planMeta = PLAN_LABELS[m.plan] || { label: m.plan.toUpperCase(), color: 'bg-gray-100 text-gray-600 border-gray-200' };

                return (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FCFBF7] border border-gray-200 flex items-center justify-center text-sm font-black text-[#111827] flex-shrink-0">
                          {(m.name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[#111827] text-sm truncate">{m.name || '—'}</p>
                          <p className="text-xs text-[#6b6760] font-bold truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${planMeta.color}`}>
                        <Crown size={10} />
                        {planMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {m.plan === 'trial' && m.trialEndsAt ? (
                        <span className={`text-xs font-black flex items-center gap-1.5 ${trialExpired ? 'text-red-500' : trialSoon ? 'text-orange-500' : 'text-[#6b6760]'}`}>
                          {trialExpired ? <AlertTriangle size={14} strokeWidth={3} /> : null}
                          {trialExpired
                            ? `Süresi doldu (${Math.abs(dl!)} gün önce)`
                            : `${dl} gün kaldı`}
                        </span>
                      ) : (
                        <span className="text-xs text-[#ada89f] font-bold">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#6b6760]">
                        <Store size={14} strokeWidth={2.5} />
                        {m._count.restaurants}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-600 border border-green-200 text-[10px] font-black uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />AKTİF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-200 text-[10px] font-black uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />PASİF
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openEdit(m)}
                        className="px-4 py-2 rounded-xl bg-[#111827] text-white text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-all"
                      >
                        DÜZENLE
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-md max-h-[92dvh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#111827] uppercase tracking-tight">Üye Düzenle</h2>
                <p className="text-xs text-[#6b6760] font-bold mt-1">{editingMember.email}</p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-2 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-black uppercase tracking-widest text-center">
                  {error}
                </div>
              )}

              {/* Plan */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['trial', 'monthly', 'yearly', 'free'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPlan(p)}
                      className={`py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                        editPlan === p
                          ? 'bg-[#111827] text-white border-[#111827]'
                          : 'bg-white text-[#6b6760] border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {PLAN_LABELS[p]?.label || p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trial End Date */}
              {editPlan === 'trial' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Deneme Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={editTrialEndsAt}
                    onChange={(e) => setEditTrialEndsAt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold"
                  />
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-2xl border border-gray-200">
                <div>
                  <p className="text-sm font-black text-[#111827]">Hesap Durumu</p>
                  <p className="text-xs font-bold text-[#6b6760] mt-0.5">{editIsActive ? 'Kullanıcı sisteme girebilir.' : 'Kullanıcı erişimi engellendi.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive((v) => !v)}
                  className={`transition-colors ${editIsActive ? 'text-green-500' : 'text-gray-400'}`}
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
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-black text-[#6b6760] hover:text-[#111827] transition-colors"
                >
                  İPTAL
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#111827] text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
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
