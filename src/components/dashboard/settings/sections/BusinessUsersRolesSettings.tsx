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
import { SkBox } from "@/components/ui/skeletons/PageSkeleton";
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
  locale?: "tr" | "en";
}

const VALID_ROLES = ["manager", "staff", "viewer"] as const;
const ROLE_LABELS: Record<"tr" | "en", Record<TeamRow["role"], string>> = {
  tr: { owner: "Sahip", manager: "Yönetici", staff: "Personel", viewer: "Görüntüleyici" },
  en: { owner: "Owner", manager: "Manager", staff: "Staff", viewer: "Viewer" },
};
const ROLE_BADGE_KIND: Record<TeamRow["role"], BadgeKind> = {
  owner: "lime",
  manager: "info",
  staff: "ghost",
  viewer: "off",
};
const STATUS_LABELS: Record<"tr" | "en", Record<TeamRow["status"], string>> = {
  tr: { invited: "Davetli", active: "Aktif", revoked: "İptal edildi" },
  en: { invited: "Invited", active: "Active", revoked: "Revoked" },
};
const STATUS_BADGE_KIND: Record<TeamRow["status"], BadgeKind> = {
  invited: "warn",
  active: "ok",
  revoked: "off",
};

function formatRelative(iso: string | null, locale: "tr" | "en"): string {
  if (!iso) return "—";
  const isTr = locale !== "en";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return isTr ? "az önce" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return isTr ? `${min} dk önce` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isTr ? `${hr} sa önce` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return isTr ? `${day} gün önce` : `${day}d ago`;
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
 * /api/team* answer with machine codes ("validation_error", "forbidden",
 * "invalid_locations"…) and a few Turkish-only sentences. Showing `data.error`
 * verbatim put raw codes in the banner and Turkish text on the English page.
 */
function describeTeamError(data: unknown, copy: TeamCopy, fallback: string): string {
  const body = (data && typeof data === "object" ? data : {}) as { error?: unknown; code?: unknown };
  const raw = typeof body.error === "string" ? body.error : null;
  const code =
    typeof body.code === "string" ? body.code : raw && /^[a-z_]+$/.test(raw) ? raw : null;
  if (code && copy.errors[code]) return copy.errors[code];
  if (raw && !/^[a-z_]+$/.test(raw) && copy === COPY.tr) return raw;
  return fallback;
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
  locale = "tr",
}: BusinessUsersRolesSettingsProps) {
  const t = locale === "en" ? COPY.en : COPY.tr;
  const roleLabels = ROLE_LABELS[locale];
  const statusLabels = STATUS_LABELS[locale];
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
      // "load_failed" is an internal marker — never show it raw.
      setError(err instanceof Error && err.message !== "load_failed" ? err.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Mount-only fetch; `load` closes over `t` just for error copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async () => {
    if (inviting) return;
    if (!inviteEmail.trim()) {
      setError(t.emailRequired);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(describeTeamError(data, t, t.inviteFailed));
      setSuccess(t.inviteSent(inviteEmail.trim()));
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("manager");
      setInviteLocations([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
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
        throw new Error(describeTeamError(data, t, t.updateFailed));
      }
      setSuccess(t.updated(editOpen.email));
      setEditOpen(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setEditSaving(false);
    }
  };

  const handleResend = (m: TeamRow) => {
    askConfirm({
      title: t.resendTitle,
      body: t.resendBody(m.email),
      confirmLabel: t.resendConfirm,
      onConfirm: async () => {
        setResendingId(m.id);
        try {
          const res = await fetch(`/api/team/${m.id}/resend-invite`, { method: "POST" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (res.status === 429 && data.retryAfterSeconds) {
              const min = Math.ceil(data.retryAfterSeconds / 60);
              throw new Error(t.tooSoon(min));
            }
            throw new Error(describeTeamError(data, t, t.resendFailed));
          }
          setSuccess(t.resent(m.email));
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : t.genericError);
        } finally {
          setResendingId(null);
        }
      },
    });
  };

  const handleRemove = (m: TeamRow) => {
    askConfirm({
      title: t.removeTitle,
      body: t.removeBody(m.email),
      confirmLabel: t.removeConfirm,
      variant: "danger",
      onConfirm: async () => {
        setBusyId(m.id);
        try {
          const res = await fetch(`/api/team/${m.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(t.removeFailed);
          setMembers((prev) => prev.filter((x) => x.id !== m.id));
          setSuccess(t.removed(m.email));
        } catch (err) {
          setError(err instanceof Error ? err.message : t.genericError);
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
        title={t.cardTitle}
        description={t.cardDesc}
        actions={
          canManageTeam ? (
            // Phones get a full-width button in the body instead: in this
            // header slot it squeezed the description to 2–3 words a line.
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="bz-btn-primary hidden h-8 items-center gap-1.5 rounded-full px-3 text-[12px] sm:inline-flex"
            >
              <Plus size={12} />
              {t.invite}
            </button>
          ) : null
        }
      >
        {canManageTeam && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="bz-btn-primary mb-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[13px] sm:hidden"
          >
            <Plus size={14} />
            {t.invite}
          </button>
        )}
        {/* Owner row (kendisi) */}
        <div
          className="flex items-center gap-3 p-3 mb-3"
          style={{ background: "#F3FDC4", border: "1px solid #A8D62E", borderRadius: 10 }}
        >
          {/* §38.51 — Owner her zaman online (mevcut session sahibi). */}
          <div className="relative">
            <Avatar size={36} name={ownerName || ownerEmail} />
            <span
              aria-label={t.online}
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 border-white"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bz-h-tight text-[13px] truncate">
                {ownerName || ownerEmail}
              </span>
              <Badge kind="lime" dot={false}>{roleLabels.owner}</Badge>
            </div>
            <div className="text-[12px] text-[#525252] truncate">{ownerEmail}</div>
          </div>
          <Badge kind="ok">{statusLabels.active}</Badge>
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t.loading}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3"
                style={{ border: "1px solid #EDEDED", borderRadius: 10 }}
              >
                <SkBox className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkBox className="h-3.5 w-36" />
                  <SkBox className="h-3 w-48 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-[13px] text-[#737373] py-2">{t.empty}</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const locCount = m.locations?.length ?? 0;
              const totalLoc = restaurants.length;
              const locLabel =
                locCount === 0 ? t.allLocations : t.someLocations(locCount, totalLoc);
              const online = isOnlineByLastSeen(m.lastSeenAt);
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
                  style={{
                    background: "#F5F5F8",
                    border: "1px solid #EDEDED",
                    borderRadius: 10,
                  }}
                >
                  {/* §38.51 — Online dot indicator (lastSeenAt < 5min) tasarım birebir. */}
                  <div className="relative">
                    <Avatar size={36} name={m.name || m.email} />
                    {online && (
                      <span
                        aria-label={t.online}
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
                        {roleLabels[m.role]}
                      </Badge>
                      <Badge kind={STATUS_BADGE_KIND[m.status]}>
                        {statusLabels[m.status]}
                      </Badge>
                    </div>
                    <div className="text-[12px] text-[#737373] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="bz-mono break-all">{m.email}</span>
                      <span>·</span>
                      <span>{locLabel}</span>
                      {m.lastSeenAt && (
                        <>
                          <span>·</span>
                          <span>{t.lastSeen(formatRelative(m.lastSeenAt, locale))}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {canManageTeam && (
                    <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="bz-btn-ghost h-10 rounded-full px-3 text-[12px] sm:h-7 sm:px-2.5"
                      >
                        {t.edit}
                      </button>
                      {m.status !== "active" && (
                        <button
                          type="button"
                          onClick={() => handleResend(m)}
                          disabled={resendingId === m.id}
                          className="bz-btn-icon h-10 w-10 sm:h-8 sm:w-8"
                          aria-label={t.resendAria}
                          title={t.resendAria}
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
                        className="bz-btn-icon h-10 w-10 sm:h-8 sm:w-8"
                        aria-label={t.removeConfirm}
                        title={t.removeConfirm}
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
          title={t.inviteTitle}
          onClose={() => setInviteOpen(false)}
          size={520}
        >
          <div className="space-y-4">
            <Field label={t.email} required>
              <input
                className="bz-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                inputMode="email"
                enterKeyHint="send"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>
            <Field label={t.role}>
              <PulseSelect
                value={inviteRole}
                onChange={(value) => setInviteRole(value as typeof VALID_ROLES[number])}
                options={VALID_ROLES.map((r) => ({
                  value: r,
                  label: roleLabels[r as TeamRow["role"]],
                }))}
                ariaLabel={t.inviteRoleAria}
              />
            </Field>
            <fieldset>
              <legend className="block text-[12px] font-medium text-pn-ink mb-1.5">{t.locationAccess}</legend>
              <p className="text-[12px] text-[#737373] mb-2">{t.locationHint}</p>
              {restaurants.length === 0 ? (
                <p className="text-[12px] text-[#737373]">{t.noBusiness}</p>
              ) : (
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {restaurants.map((r) => (
                    <label key={r.id} className="flex min-h-[36px] items-center gap-2 text-[13px]">
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
            </fieldset>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="bz-btn-ghost"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {t.sendInvite}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editOpen && (
        <Modal title={t.editTitle} onClose={() => setEditOpen(null)} size={520}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar size={36} name={editOpen.name || editOpen.email} />
              <div className="min-w-0">
                <div className="bz-h-tight text-[14px] truncate">
                  {editOpen.name || editOpen.email}
                </div>
                <div className="tabular-nums text-[12px] text-[#737373] truncate">
                  {editOpen.email}
                </div>
              </div>
            </div>
            <Field label={t.role}>
              <PulseSelect
                value={editRole}
                onChange={(value) => setEditRole(value as typeof VALID_ROLES[number])}
                options={VALID_ROLES.map((r) => ({
                  value: r,
                  label: roleLabels[r as TeamRow["role"]],
                }))}
                ariaLabel={t.memberRoleAria}
              />
            </Field>
            <fieldset>
              <legend className="block text-[12px] font-medium text-pn-ink mb-1.5">{t.locationAccess}</legend>
              <p className="text-[12px] text-[#737373] mb-2">{t.locationHint}</p>
              {restaurants.length === 0 ? (
                <p className="text-[12px] text-[#737373]">{t.noBusiness}</p>
              ) : (
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {restaurants.map((r) => (
                    <label key={r.id} className="flex min-h-[36px] items-center gap-2 text-[13px]">
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
            </fieldset>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(null)}
                className="bz-btn-ghost"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {editSaving && <Loader2 size={14} className="animate-spin" />}
                {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const COPY = {
  tr: {
    loadFailed: "Ekip listesi yüklenemedi.",
    emailRequired: "E-posta gerekli.",
    inviteFailed: "Davet gönderilemedi.",
    inviteSent: (email: string) => `Davet ${email} adresine gönderildi.`,
    genericError: "Bir hata oluştu.",
    updateFailed: "Güncellenemedi.",
    updated: (email: string) => `${email} güncellendi.`,
    resendTitle: "Daveti yenile?",
    resendBody: (email: string) =>
      `${email} adresine yeni bir davet bağlantısı gönderilir. 1 saat içinde yeniden yapılamaz.`,
    resendConfirm: "Yenile",
    resendAria: "Daveti yenile",
    tooSoon: (min: number) => `Çok erken — ${min} dk sonra tekrar dene.`,
    resendFailed: "Davet yenilenemedi.",
    resent: (email: string) => `${email} adresine yeni davet gönderildi.`,
    removeTitle: "Üyeyi kaldır?",
    removeBody: (email: string) => `${email} bu çalışma alanına artık erişemeyecek.`,
    removeConfirm: "Kaldır",
    removeFailed: "Üye kaldırılamadı.",
    removed: (email: string) => `${email} kaldırıldı.`,
    cardTitle: "Ekip üyeleri",
    cardDesc: "Çalışma alanına kullanıcı davet et, rol ve konum erişimini yönet.",
    invite: "Üye davet et",
    online: "çevrimiçi",
    loading: "Yükleniyor…",
    empty: "Henüz ek üye yok. \"Üye davet et\" ile başla.",
    allLocations: "Tüm konumlar",
    someLocations: (n: number, total: number) => `${n} / ${total} konum`,
    lastSeen: (rel: string) => `Son: ${rel}`,
    edit: "Düzenle",
    inviteTitle: "Yeni üye davet et",
    email: "E-posta",
    emailPlaceholder: "uye@isletmem.com",
    role: "Rol",
    inviteRoleAria: "Davet edilecek üye rolü",
    memberRoleAria: "Üye rolü",
    locationAccess: "Konum erişimi",
    locationHint: "Boş bırakırsan tüm konumlara erişir. Belirli konumlar seç:",
    noBusiness: "Henüz işletme yok.",
    cancel: "İptal",
    sendInvite: "Daveti gönder",
    editTitle: "Üyeyi düzenle",
    save: "Kaydet",
    errors: {
      validation_error: "Geçerli bir e-posta adresi gir.",
      invalid_json: "İstek okunamadı. Lütfen tekrar dene.",
      invalid_role: "Geçersiz rol seçimi.",
      invalid_locations: "Seçilen işletmeler bulunamadı.",
      invalid_status: "Bu üyenin durumu değiştirilemez.",
      already_active: "Bu kişi zaten ekibinde aktif.",
      cooldown: "Bu adrese son 1 saat içinde davet gönderildi.",
      rate_limited: "Çok fazla davet gönderildi. Lütfen daha sonra tekrar dene.",
      forbidden: "Bu işlem için yetkin yok. Ekibi yalnızca hesap sahibi yönetebilir.",
      unauthorized: "Oturumun sona ermiş. Lütfen tekrar giriş yap.",
      not_found: "Üye bulunamadı.",
    } as Record<string, string>,
  },
  en: {
    loadFailed: "Could not load the team list.",
    emailRequired: "Email is required.",
    inviteFailed: "Could not send the invite.",
    inviteSent: (email: string) => `Invite sent to ${email}.`,
    genericError: "Something went wrong.",
    updateFailed: "Could not update.",
    updated: (email: string) => `${email} updated.`,
    resendTitle: "Resend invite?",
    resendBody: (email: string) =>
      `A new invite link is sent to ${email}. You can't resend again within 1 hour.`,
    resendConfirm: "Resend",
    resendAria: "Resend invite",
    tooSoon: (min: number) => `Too soon — try again in ${min} min.`,
    resendFailed: "Could not resend the invite.",
    resent: (email: string) => `New invite sent to ${email}.`,
    removeTitle: "Remove member?",
    removeBody: (email: string) => `${email} will no longer have access to this workspace.`,
    removeConfirm: "Remove",
    removeFailed: "Could not remove the member.",
    removed: (email: string) => `${email} removed.`,
    cardTitle: "Team members",
    cardDesc: "Invite people to your workspace and manage their role and location access.",
    invite: "Invite member",
    online: "online",
    loading: "Loading…",
    empty: "No other members yet. Start with \"Invite member\".",
    allLocations: "All locations",
    someLocations: (n: number, total: number) => `${n} / ${total} locations`,
    lastSeen: (rel: string) => `Last seen: ${rel}`,
    edit: "Edit",
    inviteTitle: "Invite a new member",
    email: "Email",
    emailPlaceholder: "member@mybusiness.com",
    role: "Role",
    inviteRoleAria: "Role for the invited member",
    memberRoleAria: "Member role",
    locationAccess: "Location access",
    locationHint: "Leave empty to grant access to all locations, or pick specific ones:",
    noBusiness: "No businesses yet.",
    cancel: "Cancel",
    sendInvite: "Send invite",
    editTitle: "Edit member",
    save: "Save",
    errors: {
      validation_error: "Enter a valid email address.",
      invalid_json: "The request could not be read. Please try again.",
      invalid_role: "Invalid role.",
      invalid_locations: "The selected businesses could not be found.",
      invalid_status: "This member's status can't be changed.",
      already_active: "This person is already an active member of your team.",
      cooldown: "An invite was sent to this address within the last hour.",
      rate_limited: "Too many invites sent. Please try again later.",
      forbidden: "You don't have permission for this. Only the account owner can manage the team.",
      unauthorized: "Your session has expired. Please sign in again.",
      not_found: "Member not found.",
    } as Record<string, string>,
  },
};

type TeamCopy = (typeof COPY)["tr"] | (typeof COPY)["en"];

export default BusinessUsersRolesSettings;
