'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, Plus, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'manager' | 'staff';
  status: 'invited' | 'active' | 'revoked';
  lastSeenAt?: string | null;
}

const DEMO_TEAM: TeamMember[] = [
  { id: 'me', email: 'owner@buaze.com', name: 'Çalışma Alanı Sahibi', role: 'owner', status: 'active', lastSeenAt: new Date().toISOString() },
];

const ROLE_STYLE: Record<TeamMember['role'], { tr: string; en: string; cls: string }> = {
  owner: { tr: 'SAHİP', en: 'OWNER', cls: 'bg-[#0A0A0A] text-white' },
  manager: { tr: 'YÖNETİCİ', en: 'MANAGER', cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  staff: { tr: 'PERSONEL', en: 'STAFF', cls: 'bg-[#F5F5F5] text-[#525252]' },
};

const STATUS_STYLE: Record<TeamMember['status'], { tr: string; en: string; cls: string }> = {
  active: { tr: 'AKTİF', en: 'ACTIVE', cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  invited: { tr: 'DAVET EDİLDİ', en: 'INVITED', cls: 'bg-[#F5F5F5] text-[#737373]' },
  revoked: { tr: 'İPTAL', en: 'REVOKED', cls: 'bg-red-50 text-red-700' },
};

export default function AdminTeamPage() {
  return (
    <SuperadminBlock>
      <AdminTeamBody />
    </SuperadminBlock>
  );
}

function AdminTeamBody() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('manager');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/team');
        if (res.ok) {
          const data = await res.json();
          setMembers((data.data as TeamMember[]) ?? DEMO_TEAM);
        } else {
          setMembers(DEMO_TEAM);
        }
      } catch {
        setMembers(DEMO_TEAM);
      }
      setLoading(false);
    })();
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 2500);
  };

  const onInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.status === 501) flash(isTr ? 'Davet bekliyor — backend yakında' : 'Invite queued — backend coming');
      else if (res.ok) {
        flash(isTr ? 'Davet gönderildi' : 'Invite sent');
        setInviteEmail('');
        setShowInvite(false);
      } else flash(isTr ? 'Hata' : 'Error');
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pulse-eyebrow text-[#737373]">{isTr ? 'PANEL / EKİP' : 'PANEL / TEAM'}</p>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
            {isTr ? 'Ekip & roller' : 'Team & roles'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {notice && <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">{notice}</span>}
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
          >
            <Plus size={12} /> {isTr ? 'Üye davet et' : 'Invite member'}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-12 text-center">
          <UsersIcon size={22} strokeWidth={1.5} className="text-[#737373]" />
          <p className="text-[13px] text-[#525252]">
            {isTr ? 'Henüz ekip üyesi yok. İlk daveti gönder.' : 'No team members yet. Send the first invite.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white">
          <table className="w-full text-left text-[13px]">
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
      )}

      {showInvite && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[#EDEDED] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-[#0A0A0A]" />
              <h3 className="text-[18px] font-medium text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
                {isTr ? 'Yeni üye davet et' : 'Invite new member'}
              </h3>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="pulse-eyebrow text-[#737373]">{isTr ? 'E-POSTA' : 'EMAIL'}</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]"
                />
              </label>
              <label className="block">
                <span className="pulse-eyebrow text-[#737373]">{isTr ? 'ROL' : 'ROLE'}</span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
                  className="mt-1 w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]"
                >
                  <option value="manager">{isTr ? 'Yönetici' : 'Manager'}</option>
                  <option value="staff">{isTr ? 'Personel' : 'Staff'}</option>
                  <option value="owner">{isTr ? 'Sahip' : 'Owner'}</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#F5F5F5]"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={onInvite}
                disabled={sending || !inviteEmail.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-40"
              >
                {sending ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                {isTr ? 'Davet gönder' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
