'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, Plus, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { PageHeader, Modal } from '@/components/ui';
import { SkTable } from '@/components/ui/skeletons/PageSkeleton';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'manager' | 'staff';
  status: 'invited' | 'active' | 'revoked';
  lastSeenAt?: string | null;
}

const ROLE_STYLE: Record<TeamMember['role'], { tr: string; en: string; cls: string }> = {
  owner: { tr: 'SAHİP', en: 'OWNER', cls: 'bg-[#0A0A0A] text-white' },
  manager: { tr: 'YÖNETİCİ', en: 'MANAGER', cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  staff: { tr: 'PERSONEL', en: 'STAFF', cls: 'bg-[#F5F5F5] text-[#525252]' },
};

const STATUS_STYLE: Record<TeamMember['status'], { tr: string; en: string; cls: string }> = {
  active: { tr: 'AKTİF', en: 'ACTIVE', cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  invited: { tr: 'DAVET EDİLDİ', en: 'INVITED', cls: 'bg-[#F5F5F5] text-[#737373]' },
  revoked: { tr: 'İPTAL', en: 'REVOKED', cls: 'bg-[#FEF2F2] text-[#991B1B]' },
};

interface OwnerRestaurant {
  id: string;
  name: string;
}

export default function TeamClient() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('manager');
  // §22 — owner davet ederken zorunlu restoran ataması (TeamMember.locations
  // [restaurantId] olarak gönderilir; panel-access bu listeden scope eder).
  const [restaurants, setRestaurants] = useState<OwnerRestaurant[]>([]);
  const [inviteRestaurant, setInviteRestaurant] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [teamRes, restaurantsRes] = await Promise.all([
          fetch('/api/team'),
          // Default /api/restaurants is 20 active rows — ask for a full page.
          fetch('/api/restaurants?status=active&limit=100'),
        ]);
        if (teamRes.ok) {
          const data = await teamRes.json();
          setMembers((data.data as TeamMember[]) ?? []);
        }
        if (restaurantsRes.ok) {
          const data = await restaurantsRes.json();
          // /api/restaurants response shape: array veya { data: [...] }.
          const list: OwnerRestaurant[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];
          setRestaurants(list.map((r) => ({ id: r.id, name: r.name })));
          if (list.length === 1) setInviteRestaurant(list[0].id);
        }
      } catch {
        /* empty state will show */
      }
      setLoading(false);
    })();
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 2500);
  };

  const onInvite = async () => {
    if (!inviteEmail.trim() || !inviteRestaurant) return;
    setSending(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          locations: [inviteRestaurant],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.member) {
          setMembers((list) => {
            const existing = list.find((m) => m.id === data.member.id);
            return existing
              ? list.map((m) => (m.id === data.member.id ? data.member : m))
              : [data.member, ...list];
          });
        }
        flash(isTr ? 'Davet gönderildi' : 'Invite sent');
        setInviteEmail('');
        setInviteRestaurant(restaurants.length === 1 ? restaurants[0].id : '');
        setShowInvite(false);
      } else if (res.status === 403) {
        flash(isTr ? 'Yetkisiz — sadece işletme sahibi davet edebilir' : 'Only the workspace owner can invite');
      } else {
        const body = await res.json().catch(() => ({}));
        flash(isTr ? `Hata: ${body.error ?? res.status}` : `Error: ${body.error ?? res.status}`);
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setSending(false);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'EKİP' : 'TEAM'}
        title={isTr ? 'Ekip & roller' : 'Team & roles'}
        description={
          isTr
            ? 'İşletmen için ekip üyelerini davet et, rollerini ata ve erişimi yönet.'
            : 'Invite team members for your business, assign roles, and manage access.'
        }
        actions={
          <>
            {notice && (
              <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">
                {notice}
              </span>
            )}
            <button onClick={() => setShowInvite(true)} className="bz-btn-lime">
              <Plus size={14} strokeWidth={2} /> {isTr ? 'Üye davet et' : 'Invite member'}
            </button>
          </>
        }
      />

      {loading ? (
        // Same table skeleton as loading.tsx (§40.10) — no spinner hand-off.
        <SkTable rows={6} cols={4} />
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-12 text-center">
          <UsersIcon size={22} strokeWidth={1.5} className="text-[#737373]" />
          <p className="text-[13px] text-[#525252]">
            {isTr ? 'Henüz ekip üyesi yok. İlk daveti gönder.' : 'No team members yet. Send the first invite.'}
          </p>
        </div>
      ) : (
        <>
        {/* Mobile card list */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {members.map((m) => {
            const role = ROLE_STYLE[m.role];
            const st = STATUS_STYLE[m.status];
            return (
              <div key={m.id} className="bz-card p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[11px] font-semibold text-white">
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#0A0A0A]">{m.name || m.email}</p>
                    {m.name && (
                      <p className="truncate text-[11px] text-[#737373]">{m.email}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-[#737373]">
                  <span className={`pulse-eyebrow rounded px-2 py-1 ${role.cls}`}>
                    {role[isTr ? 'tr' : 'en']}
                  </span>
                  <span className={`pulse-eyebrow rounded px-2 py-1 ${st.cls}`}>
                    {st[isTr ? 'tr' : 'en']}
                  </span>
                  <span className="text-[#A3A3A3]">·</span>
                  <span>
                    {m.lastSeenAt
                      ? new Date(m.lastSeenAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')
                      : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="overflow-x-auto rounded-2xl border border-[#EDEDED] bg-white hidden lg:block">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="pulse-eyebrow border-b border-[#EDEDED] bg-[#FAFAFA] text-[#737373]">
                <th className="px-5 py-3 font-medium">{isTr ? 'ÜYE' : 'MEMBER'}</th>
                <th className="px-5 py-3 font-medium">{isTr ? 'ROL' : 'ROLE'}</th>
                <th className="px-5 py-3 font-medium">{isTr ? 'DURUM' : 'STATUS'}</th>
                <th className="px-5 py-3 font-medium">{isTr ? 'SON GÖRÜLME' : 'LAST SEEN'}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const role = ROLE_STYLE[m.role];
                const st = STATUS_STYLE[m.status];
                return (
                  <tr key={m.id} className="border-b border-[#EDEDED] last:border-0 hover:bg-[#FAFAFA]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[11px] font-semibold text-white">
                          {(m.name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0A0A0A]">{m.name || m.email}</p>
                          {m.name && <p className="text-[11px] text-[#737373]">{m.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`pulse-eyebrow rounded px-2 py-1 ${role.cls}`}>{role[isTr ? 'tr' : 'en']}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`pulse-eyebrow rounded px-2 py-1 ${st.cls}`}>{st[isTr ? 'tr' : 'en']}</span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#737373]">
                      {m.lastSeenAt ? new Date(m.lastSeenAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {showInvite && (
        <Modal
          size={440}
          onClose={() => setShowInvite(false)}
          title={
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-[#0A0A0A]" />
              <span>{isTr ? 'Yeni üye davet et' : 'Invite new member'}</span>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="pulse-eyebrow text-[#737373]">{isTr ? 'E-POSTA' : 'EMAIL'}</span>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@company.com"
                className="bz-input mt-1 w-full rounded-lg py-2 text-[16px] sm:text-[13px]"
              />
            </label>
            <label className="block">
              <span className="pulse-eyebrow text-[#737373]">{isTr ? 'ROL' : 'ROLE'}</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
                className="bz-input mt-1 w-full rounded-lg py-2 text-[13px]"
              >
                <option value="manager">{isTr ? 'Yönetici' : 'Manager'}</option>
                <option value="staff">{isTr ? 'Personel' : 'Staff'}</option>
                <option value="owner">{isTr ? 'Sahip' : 'Owner'}</option>
              </select>
            </label>
            <label className="block">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'RESTORAN' : 'RESTAURANT'}
              </span>
              <select
                value={inviteRestaurant}
                onChange={(e) => setInviteRestaurant(e.target.value)}
                className="bz-input mt-1 w-full rounded-lg py-2 text-[13px]"
              >
                <option value="">
                  {isTr ? '— Seç —' : '— Select —'}
                </option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-[#737373]">
                {isTr
                  ? 'Davet edilen kullanıcı sadece bu restorana erişir, panele girince oradan başlar.'
                  : 'The invited user only sees this restaurant and starts there on sign-in.'}
              </p>
              {restaurants.length === 0 && (
                <p className="mt-1 text-[11px] text-[#991B1B]">
                  {isTr
                    ? 'Önce bir restoran oluştur — davet ederken erişimi kapsamlı kılmak için zorunlu.'
                    : 'Create a restaurant first — required to scope invite access.'}
                </p>
              )}
            </label>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowInvite(false)}
              className="bz-btn"
            >
              {isTr ? 'İptal' : 'Cancel'}
            </button>
            <button
              onClick={onInvite}
              disabled={sending || !inviteEmail.trim() || !inviteRestaurant}
              className="bz-btn-lime disabled:opacity-40"
            >
              {sending ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              {isTr ? 'Davet gönder' : 'Send invite'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
