"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertOctagon, Loader2, Trash2 } from "lucide-react";
import { AlertBanner, Field, Modal } from "@/components/ui";

interface RestaurantData {
  id: string;
  name: string;
}

interface DangerZoneProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
}

/**
 * Permanent business deletion (DELETE endpoint, type-the-name confirmation).
 *
 * Rendered under the active/disabled switch in "Durum ve silme". The old
 * one-way "İşletmeyi devre dışı bırak" card here was removed: the switch
 * above does the same and can also turn the business back on.
 */
export function DangerZone({ restaurant, locale = "tr" }: DangerZoneProps) {
  const router = useRouter();
  const t = locale === "en" ? COPY.en : COPY.tr;
  const [error, setError] = useState<string | null>(null);

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
    borderRadius: 12,
  } as const;

  return (
    <div className="space-y-5">
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {/* İşletmeyi sil */}
      <div
        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        style={dangerCardStyle}
      >
        <div className="min-w-0">
          <h3 className="bz-h-tight text-[16px] text-[#0A0A0A]">{t.deleteTitle}</h3>
          <p className="text-[12.5px] text-[#525252] mt-1">{t.deleteBody}</p>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-[#991B1B] px-4 text-[13px] font-medium text-white hover:bg-[#7F1D1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991B1B] focus-visible:ring-offset-2 sm:min-h-[36px] sm:self-center"
        >
          <Trash2 size={14} aria-hidden="true" />
          {t.deleteCta}
        </button>
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
    genericError: "Bir hata oluştu.",
    nameMismatch: "İşletme adı eşleşmiyor.",
    deleteFailed: "Silinemedi.",
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
    genericError: "Something went wrong.",
    nameMismatch: "The business name doesn't match.",
    deleteFailed: "Could not delete.",
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
