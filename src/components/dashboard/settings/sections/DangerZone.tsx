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

interface RestaurantData {
  id: string;
  name: string;
  isActive: boolean;
}

interface DangerZoneProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
  onDeactivated?: (next: { isActive: boolean }) => void;
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
        throw new Error(data?.error || "Devre dışı bırakılamadı.");
      }
      onDeactivated?.({ isActive: false });
      setSuccess("İşletme devre dışı bırakıldı. Müşteri sayfası kapalı görünüyor.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
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
      setError("İşletme adı eşleşmiyor.");
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
        throw new Error(data?.error || "Silinemedi.");
      }
      // Liste sayfasına yönlendir.
      router.push(`/${locale}/dashboard/restaurants`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
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
            <h3 className="bz-h-tight text-[16px] text-[#0A0A0A]">
              İşletmeyi devre dışı bırak
            </h3>
            <p className="text-[12.5px] text-[#525252] mt-1">
              Müşteri sayfası "aktif değil" uyarısı gösterir, yorum kabul edilmez.
              İstediğin zaman tekrar aktifleştirebilirsin.
            </p>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivateBusy || !restaurant.isActive}
              className="mt-3 inline-flex items-center gap-1.5"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                background: "#fff",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: 13,
                cursor: !restaurant.isActive ? "not-allowed" : "pointer",
                opacity: !restaurant.isActive ? 0.5 : 1,
              }}
            >
              {deactivateBusy && <Loader2 size={14} className="animate-spin" />}
              {restaurant.isActive
                ? "İşletmeyi devre dışı bırak"
                : "Zaten devre dışı"}
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
            <h3 className="bz-h-tight text-[16px] text-[#0A0A0A]">
              İşletmeyi kalıcı olarak sil
            </h3>
            <p className="text-[12.5px] text-[#525252] mt-1">
              Tüm yorumlar, menü, QR kodlar ve ayarlar kalıcı olarak silinir.
              Bu işlem geri alınamaz.
            </p>
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
              İşletmeyi sil
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteOpen && (
        <Modal
          title="İşletmeyi kalıcı olarak sil"
          onClose={() => {
            setDeleteOpen(false);
            setDeleteConfirmName("");
          }}
          size={520}
        >
          <div className="space-y-4">
            <AlertBanner kind="danger">
              Bu işlem geri alınamaz. Tüm yorumlar, menü kategorileri, ürünler,
              QR geçmişi ve ayarlar silinir.
            </AlertBanner>
            <p className="text-[13px] text-[#525252]">
              Onaylamak için işletme adını yazın:
              <span className="bz-mono ml-1">{restaurant.name}</span>
            </p>
            <Field label="İşletme adı">
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
                İptal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy || deleteConfirmName.trim() !== restaurant.name}
                className="inline-flex items-center gap-1.5"
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 999,
                  background: "#991B1B",
                  color: "#fff",
                  fontSize: 13,
                  cursor:
                    deleteBusy || deleteConfirmName.trim() !== restaurant.name
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    deleteBusy || deleteConfirmName.trim() !== restaurant.name ? 0.5 : 1,
                }}
              >
                {deleteBusy && <Loader2 size={14} className="animate-spin" />}
                <AlertOctagon size={14} />
                Kalıcı olarak sil
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DangerZone;
