"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
} from "lucide-react";
import {
  AlertBanner,
  Avatar,
  Badge,
  Field,
  Modal,
  PulseSelect,
  type BadgeKind,
  useConfirmDialog,
} from "@/components/ui";
import { SettingsCard } from "../SettingsCard";
import { useCurrentRole } from "@/hooks/useCurrentRole";

interface TeamRow {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "manager" | "staff" | "viewer";
  status: "invited" | "active" | "revoked";
  locations: string[] | null;
  lastSeenAt: string | null;
  lastInvitedAt: string | null;
  createdAt: string;
}

interface RestaurantOption {
  id: string;
  name: string;
}

interface BusinessUsersRolesSettingsProps {
  /** Workspace user'ın sahip olduğu restoranlar — locations multi-select için. */
  restaurants: RestaurantOption[];
  /** Owner'ın gösterimi için (read-only ilk satır). */
  ownerEmail: string;
  ownerName: string | null;
}

const VALID_ROLES = ["manager", "staff", "viewer"] as const;
const ROLE_LABELS: Record<TeamRow["role"], string> = {
  owner: "Sahip",
  manager: "Yönetici",
  staff: "Personel",
  viewer: "Görüntüleyici",
};
const ROLE_BADGE_KIND: Record<TeamRow["role"], BadgeKind> = {
  owner: "lime",
  manager: "info",
  staff: "ghost",
  viewer: "off",
};
const STATUS_LABELS: Record<TeamRow["status"], string> = {
  invited: "Davetli",
  active: "Aktif",
  revoked: "İptal edildi",
};
const STATUS_BADGE_KIND: Record<TeamRow["status"], BadgeKind> = {
  invited: "warn",
  active: "ok",
  revoked: "off",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "az önce";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
}

/**
 * §38.51 — Online status heuristic. Tasarım kaynağı:
 * .design-owner-2026/page-account.jsx team item green dot bottom-right.
 * 5-dakika eşik: TeamMember.lastSeenAt >= now - 5min → online.
 */
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
function isOnlineByLastSeen(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < ONLINE_THRESHOLD_MS;
}

/**
 * Section 5 — Kullanıcılar & Roller (Faz 4 — workspace level).
 *
 * TeamMember CRUD UI:
 *  - Tablo: Avatar + email/name + role Badge + status Badge + lastSeenAt
 *    + locations sayısı + Actions (rol değiştir, locations multi-select,
 *    daveti yenile, kaldır)
 *  - "Üye davet et" Modal: email + role + locations multi-select
 *  - lastInvitedAt cooldown: "Daveti yenile" 1 saatte 1 (server enforce)
 */
export function BusinessUsersRolesSettings({
  restaurants,
  ownerEmail,
  ownerName,
}: BusinessUsersRolesSettingsProps) {
  const [members, setMembers] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Yalnız restaurant_owner davet/edit yapabilir (backend `/api/team`
  // POST `actor.role !== 'restaurant_owner'` → 403). team_member workspace'in
  // ekip yönetimi UI'ına direkt URL ile gelirse list görür ama write
  // butonları gizli — defansif UI gate (UX kötü 403 alert'i yerine).
  const currentRole = useCurrentRole();
  const canManageTeam = currentRole.role === "restaurant_owner";

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<typeof VALID_ROLES[number]>("manager");
  const [inviteLocations, setInviteLocations] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState<TeamRow | null>(null);
  const [editRole, setEditRole] = useState<typeof VALID_ROLES[number]>("manager");
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      // §38.210 — Response shape drift fix. Backend `/api/team` GET
      // canonical Buaze API paterniyle `{ data: [...members] }` döndürür
      // (`/api/admin/customers` paralelinde). Eski kod sadece `data.members`
      // arıyordu — undefined → boş array → owner header'da "3 kişi" görüyor
      // (AccountSettingsClient 3-shape defansif paterni §38.37) ama tablo
      // boş kalıyordu. Şimdi AccountSettingsClient ile parity — canonical
      // `data.data` öncelikli + legacy `data.members` + raw array fallback.
      const rawMembers =
        Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.members) ? data.members
        : Array.isArray(data) ? data
        : [];
      const rows: TeamRow[] = rawMembers.map(
        (m: Partial<TeamRow> & { locations?: string[] | null }): TeamRow => ({
          id: String(m.id),
          email: String(m.email),
          name: m.name ?? null,
          role: (m.role as TeamRow["role"]) ?? "manager",
          status: (m.status as TeamRow["status"]) ?? "invited",
          locations: Array.isArray(m.locations) ? m.locations : null,
          lastSeenAt: m.lastSeenAt ?? null,
          lastInvitedAt: m.lastInvitedAt ?? null,
          createdAt: m.createdAt ?? new Date().toISOString(),
        }),
      );
      setMembers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleInvite = async () => {
    if (inviting) return;
    if (!inviteEmail.trim()) {
      setError("E-posta gerekli.");
      return;
    }
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          locations: inviteLocations.length > 0 ? inviteLocations : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Davet gönderilemedi.");
      setSuccess(`Davet ${inviteEmail.trim()} adresine gönderildi.`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("manager");
      setInviteLocations([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setInviting(false);
    }
  };

  const openEdit = (m: TeamRow) => {
    setEditOpen(m);
    setEditRole(VALID_ROLES.includes(m.role as typeof VALID_ROLES[number])
      ? (m.role as typeof VALID_ROLES[number])
      : "manager");
    setEditLocations(m.locations ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editOpen || editSaving) return;
    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${editOpen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          locations: editLocations,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Güncellenemedi");
      }
      setSuccess(`${editOpen.email} güncellendi.`);
      setEditOpen(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setEditSaving(false);
    }
  };

  const handleResend = (m: TeamRow) => {
    askConfirm({
      title: "Daveti yenile?",
      body: `${m.email} adresine yeni bir davet bağlantısı gönderilir. 1 saat içinde yeniden yapılamaz.`,
      confirmLabel: "Yenile",
      onConfirm: async () => {
        setResendingId(m.id);
        try {
          const res = await fetch(`/api/team/${m.id}/resend-invite`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 429 && data.retryAfterSeconds) {
              const min = Math.ceil(data.retryAfterSeconds / 60);
              throw new Error(`Çok erken — ${min} dk sonra tekrar dene.`);
            }
            throw new Error(data.error || "Yenilenemedi");
          }
          setSuccess(`${m.email} adresine yeni davet gönderildi.`);
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Hata");
        } finally {
          setResendingId(null);
        }
      },
    });
  };

  const handleRemove = (m: TeamRow) => {
    askConfirm({
      title: "Üyeyi kaldır?",
      body: `${m.email} bu workspace'e artık erişemeyecek.`,
      confirmLabel: "Kaldır",
      variant: "danger",
      onConfirm: async () => {
        setBusyId(m.id);
        try {
          const res = await fetch(`/api/team/${m.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Kaldırılamadı");
          setMembers((prev) => prev.filter((x) => x.id !== m.id));
          setSuccess(`${m.email} kaldırıldı.`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Hata");
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      {confirmEl}
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>
          {success}
        </AlertBanner>
      )}

      <SettingsCard
        icon={<Users size={18} />}
        title="Ekip üyeleri"
        description="Workspace'ne kullanıcı davet et, rol ve konum erişimini yönet."
        actions={
          canManageTeam ? (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
              style={{ height: 28, padding: "0 12px", borderRadius: 999 }}
            >
              <Plus size={12} />
              Üye davet et
            </button>
          ) : null
        }
      >
        {/* Owner row (kendisi) */}
        <div
          className="flex items-center gap-3 p-3 mb-3"
          style={{ background: "#EAF9B8", border: "1px solid #A8D62E", borderRadius: 10 }}
        >
          {/* §38.51 — Owner her zaman online (mevcut session sahibi). */}
          <div className="relative">
            <Avatar size={36} name={ownerName || ownerEmail} />
            <span
              aria-label="online"
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 border-white"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bz-h-tight text-[13px] truncate">
                {ownerName || ownerEmail}
              </span>
              <Badge kind="lime" dot={false}>Sahip</Badge>
            </div>
            <div className="text-[11.5px] text-[#525252] truncate">{ownerEmail}</div>
          </div>
          <Badge kind="ok">Aktif</Badge>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#737373] py-4">
            <Loader2 size={14} className="animate-spin" />
            Yükleniyor…
          </div>
        ) : members.length === 0 ? (
          <p className="text-[13px] text-[#737373] py-2">
            Henüz ek üye yok. &quot;Üye davet et&quot; ile başla.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const locCount = m.locations?.length ?? 0;
              const totalLoc = restaurants.length;
              const locLabel =
                locCount === 0
                  ? "Tüm konumlar"
                  : `${locCount} / ${totalLoc} konum`;
              const online = isOnlineByLastSeen(m.lastSeenAt);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    background: "#FAFAFA",
                    border: "1px solid #EDEDED",
                    borderRadius: 10,
                  }}
                >
                  {/* §38.51 — Online dot indicator (lastSeenAt < 5min) tasarım birebir. */}
                  <div className="relative">
                    <Avatar size={36} name={m.name || m.email} />
                    {online && (
                      <span
                        aria-label="online"
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 border-white"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bz-h-tight text-[13px] truncate">
                        {m.name || m.email}
                      </span>
                      <Badge kind={ROLE_BADGE_KIND[m.role]} dot={false}>
                        {ROLE_LABELS[m.role]}
                      </Badge>
                      <Badge kind={STATUS_BADGE_KIND[m.status]}>
                        {STATUS_LABELS[m.status]}
                      </Badge>
                    </div>
                    <div className="text-[11.5px] text-[#737373] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="bz-mono">{m.email}</span>
                      <span>·</span>
                      <span>{locLabel}</span>
                      {m.lastSeenAt && (
                        <>
                          <span>·</span>
                          <span>Son: {formatRelative(m.lastSeenAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {canManageTeam && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="bz-btn-ghost text-[12px]"
                        style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                      >
                        Düzenle
                      </button>
                      {m.status !== "active" && (
                        <button
                          type="button"
                          onClick={() => handleResend(m)}
                          disabled={resendingId === m.id}
                          className="bz-btn-icon"
                          aria-label="Daveti yenile"
                          title="Daveti yenile"
                        >
                          {resendingId === m.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RefreshCcw size={12} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(m)}
                        disabled={busyId === m.id}
                        className="bz-btn-icon"
                        aria-label="Kaldır"
                        title="Kaldır"
                      >
                        {busyId === m.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SettingsCard>

      {/* Invite modal */}
      {inviteOpen && (
        <Modal
          title="Yeni üye davet et"
          onClose={() => setInviteOpen(false)}
          size={520}
        >
          <div className="space-y-4">
            <Field label="E-posta" required>
              <input
                className="bz-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="uye@isletmem.com"
                autoComplete="email"
                inputMode="email"
                enterKeyHint="send"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Rol">
              <PulseSelect
                value={inviteRole}
                onChange={(value) => setInviteRole(value as typeof VALID_ROLES[number])}
                options={VALID_ROLES.map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r as TeamRow["role"]],
                }))}
                ariaLabel="Davet edilecek üye rolü"
              />
            </Field>
            <div>
              <label className="block text-[12px] text-[#525252] mb-2">
                Konum erişimi
              </label>
              <p className="text-[11.5px] text-[#737373] mb-2">
                Boş bırakırsan tüm konumlara erişir. Belirli konumlar seç:
              </p>
              {restaurants.length === 0 ? (
                <p className="text-[12px] text-[#737373]">Henüz işletme yok.</p>
              ) : (
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {restaurants.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={inviteLocations.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteLocations((prev) => [...new Set([...prev, r.id])]);
                          } else {
                            setInviteLocations((prev) => prev.filter((x) => x !== r.id));
                          }
                        }}
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="bz-btn-ghost"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Daveti gönder
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editOpen && (
        <Modal title="Üyeyi düzenle" onClose={() => setEditOpen(null)} size={520}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar size={36} name={editOpen.name || editOpen.email} />
              <div className="min-w-0">
                <div className="bz-h-tight text-[14px] truncate">
                  {editOpen.name || editOpen.email}
                </div>
                <div className="bz-mono text-[12px] text-[#737373] truncate">
                  {editOpen.email}
                </div>
              </div>
            </div>
            <Field label="Rol">
              <PulseSelect
                value={editRole}
                onChange={(value) => setEditRole(value as typeof VALID_ROLES[number])}
                options={VALID_ROLES.map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r as TeamRow["role"]],
                }))}
                ariaLabel="Üye rolü"
              />
            </Field>
            <div>
              <label className="block text-[12px] text-[#525252] mb-2">
                Konum erişimi
              </label>
              {restaurants.length === 0 ? (
                <p className="text-[12px] text-[#737373]">Henüz işletme yok.</p>
              ) : (
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {restaurants.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={editLocations.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditLocations((prev) => [...new Set([...prev, r.id])]);
                          } else {
                            setEditLocations((prev) => prev.filter((x) => x !== r.id));
                          }
                        }}
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(null)}
                className="bz-btn-ghost"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {editSaving && <Loader2 size={14} className="animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BusinessUsersRolesSettings;
