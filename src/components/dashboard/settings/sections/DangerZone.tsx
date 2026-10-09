"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertOctagon,
  Loader2,
  PowerOff,
  Trash2,
} from "lucide-react";
import { AlertBanner, Field, Modal } from "@/components/ui";
import {
  SuspendedByAdminNotice,
  isSuspendedByAdminError,
  restaurantSaveErrorMessage,
} from "../restaurant-status";

interface RestaurantData {
  id: string;
  name: string;
  isActive: boolean;
  /** Admin pause — the owner can no longer change the active status. */
  suspendedByAdmin?: boolean;
}

interface DangerZoneProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
  onDeactivated?: (next: { isActive: boolean; suspendedByAdmin?: boolean }) => void;
}

/**
 * Section 9 — Danger Zone.
 *
 * 2 kırmızı kart:
 *  1. Devre dışı bırak — `isActive: false` (geri alınabilir).
 *  2. İşletmeyi sil — DELETE endpoint, çift onay (işletme adı yaz).
 *
 * Veri dışa aktarımı butonu kullanıcı talebiyle UI'dan kaldırıldı; KVKK
 * Madde 11 erişim/silme talepleri legal@buaze.com üzerinden işletilir.
 * Endpoint (`/api/account/export-data`) ileride yeniden bağlanmak üzere
 * geri uçta korunur.
 */
export function DangerZone({ restaurant, locale = "tr", onDeactivated }: DangerZoneProps) {
  const router = useRouter();
  const t = locale === "en" ? COPY.en : COPY.tr;
  const suspended = restaurant.suspendedByAdmin === true;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Deactivate
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const handleDeactivate = async () => {
    if (deactivateBusy) return;
    setDeactivateBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (isSuspendedByAdminError(data)) {
          onDeactivated?.({ isActive: false, suspendedByAdmin: true });
        }
        throw new Error(restaurantSaveErrorMessage(data, locale, t.deactivateFailed));
      }
      onDeactivated?.({ isActive: false });
      setSuccess(t.deactivated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setDeactivateBusy(false);
    }
  };

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const handleDelete = async () => {
    if (deleteBusy) return;
    if (deleteConfirmName.trim() !== restaurant.name) {
      setError(t.nameMismatch);
      return;
    }
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t.deleteFailed);
      }
      // Liste sayfasına yönlendir.
      router.push(`/${locale}/dashboard/restaurants`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
      setDeleteBusy(false);
    }
  };

  const dangerCardStyle = {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 16,
  } as const;

  return (
    <div className="space-y-5">
      {suspended && <SuspendedByAdminNotice locale={locale} />}
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

      {/* 1. Devre dışı bırak */}
      <div className="p-5 sm:p-6" style={dangerCardStyle}>
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#FEE2E2",
              color: "#991B1B",
            }}
          >
            <PowerOff size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="bz-h-tight text-[16px] text-[#0A0A0A]">{t.deactivateTitle}</h3>
            <p className="text-[12.5px] text-[#525252] mt-1">{t.deactivateBody}</p>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivateBusy || !restaurant.isActive || suspended}
              className="bz-btn-danger mt-3 disabled:opacity-50"
            >
              {deactivateBusy && <Loader2 size={14} className="animate-spin" />}
              {suspended
                ? t.pausedByAdmin
                : restaurant.isActive
                  ? t.deactivateTitle
                  : t.alreadyDisabled}
            </button>
          </div>
        </div>
      </div>

      {/* 2. İşletmeyi sil */}
      <div className="p-5 sm:p-6" style={dangerCardStyle}>
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#991B1B",
              color: "#fff",
            }}
          >
            <Trash2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="bz-h-tight text-[16px] text-[#0A0A0A]">{t.deleteTitle}</h3>
            <p className="text-[12.5px] text-[#525252] mt-1">{t.deleteBody}</p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                background: "#991B1B",
                color: "#fff",
                fontSize: 13,
              }}
            >
              <Trash2 size={14} />
              {t.deleteCta}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteOpen && (
        <Modal
          title={t.deleteTitle}
          onClose={() => {
            setDeleteOpen(false);
            setDeleteConfirmName("");
          }}
          size={520}
        >
          <div className="space-y-4">
            <AlertBanner kind="danger">{t.deleteWarning}</AlertBanner>
            <p className="text-[13px] text-[#525252]">
              {t.deleteConfirmPrompt}
              <span className="bz-mono ml-1 break-all">{restaurant.name}</span>
            </p>
            <Field label={t.nameLabel}>
              <input
                className="bz-input bz-mono"
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={restaurant.name}
                autoComplete="off"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmName("");
                }}
                className="bz-btn-ghost"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy || deleteConfirmName.trim() !== restaurant.name}
                className="bz-btn-danger disabled:opacity-50"
              >
                {deleteBusy && <Loader2 size={14} className="animate-spin" />}
                <AlertOctagon size={14} />
                {t.deleteConfirm}
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
    deactivateFailed: "Devre dışı bırakılamadı.",
    deactivated: "İşletme devre dışı bırakıldı. Müşteri sayfası kapalı görünüyor.",
    genericError: "Bir hata oluştu.",
    nameMismatch: "İşletme adı eşleşmiyor.",
    deleteFailed: "Silinemedi.",
    deactivateTitle: "İşletmeyi devre dışı bırak",
    deactivateBody:
      "Müşteri sayfası \"aktif değil\" uyarısı gösterir, yorum kabul edilmez. İstediğin zaman Güvenlik sekmesinden tekrar aktifleştirebilirsin.",
    alreadyDisabled: "Zaten devre dışı",
    pausedByAdmin: "Buaze tarafından duraklatıldı",
    deleteTitle: "İşletmeyi kalıcı olarak sil",
    deleteBody: "Tüm yorumlar, menü, QR kodlar ve ayarlar kalıcı olarak silinir. Bu işlem geri alınamaz.",
    deleteCta: "İşletmeyi sil",
    deleteWarning:
      "Bu işlem geri alınamaz. Tüm yorumlar, menü kategorileri, ürünler, QR geçmişi ve ayarlar silinir.",
    deleteConfirmPrompt: "Onaylamak için işletme adını yazın:",
    nameLabel: "İşletme adı",
    cancel: "İptal",
    deleteConfirm: "Kalıcı olarak sil",
  },
  en: {
    deactivateFailed: "Could not disable the business.",
    deactivated: "Business disabled. The customer page now shows as closed.",
    genericError: "Something went wrong.",
    nameMismatch: "The business name doesn't match.",
    deleteFailed: "Could not delete.",
    deactivateTitle: "Disable business",
    deactivateBody:
      "The customer page shows a \"not active\" notice and stops accepting reviews. You can reactivate it any time from the Security tab.",
    alreadyDisabled: "Already disabled",
    pausedByAdmin: "Paused by Buaze",
    deleteTitle: "Delete business permanently",
    deleteBody: "All reviews, menu, QR codes and settings are permanently deleted. This cannot be undone.",
    deleteCta: "Delete business",
    deleteWarning:
      "This cannot be undone. All reviews, menu categories, items, QR history and settings will be deleted.",
    deleteConfirmPrompt: "Type the business name to confirm:",
    nameLabel: "Business name",
    cancel: "Cancel",
    deleteConfirm: "Delete permanently",
  },
};

export default DangerZone;
