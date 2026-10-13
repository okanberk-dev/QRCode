"use client";

import { ReactNode, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Variant: 'danger' shows red CTA, 'default' shows graphite. */
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Tek-tip onay modali. Yerli `confirm()` çağrılarının yerine kullanılır —
 * tasarım sistemi ile tutarlı (Modal primitive + bz-btn-primary/danger).
 *
 * Kullanım:
 *   const [confirm, setConfirm] = useState(false);
 *   ...
 *   <ConfirmDialog
 *     open={confirm}
 *     title="Bu işlemi onaylıyor musun?"
 *     body="Bu eylem geri alınamaz."
 *     variant="danger"
 *     onConfirm={async () => { await doDelete(); setConfirm(false); }}
 *     onCancel={() => setConfirm(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <Modal
      onClose={onCancel}
      size={420}
      ariaLabel={typeof title === "string" ? title : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "#FEE2E2", color: "#991B1B" }}
            >
              <AlertTriangle size={18} strokeWidth={2} />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="bz-h-tight" style={{ fontSize: 16 }}>
              {title}
            </div>
            {body && (
              <p className="mt-2 text-[13px] text-[#525252] leading-[1.5]">
                {body}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="bz-btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              void onConfirm();
            }}
            disabled={loading}
            className={
              variant === "danger"
                ? "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-white transition-colors disabled:opacity-50"
                : "bz-btn-primary"
            }
            style={
              variant === "danger"
                ? { background: "#DC2626" }
                : undefined
            }
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Imperatif kullanım — useState boilerplate'inden kaçınmak için. Bir sayfada
 * birden fazla farklı onay diyaloğu varsa state ayrımı için kullanılır.
 *
 *   const [confirm, askConfirm] = useConfirmDialog();
 *   ...
 *   askConfirm({ title: '...', onConfirm: async () => ... });
 *   ...
 *   {confirm}
 */
export function useConfirmDialog() {
  const [state, setState] = useState<
    | (Omit<ConfirmDialogProps, "open" | "onCancel"> & { onCancel?: () => void })
    | null
  >(null);

  const askConfirm = useCallback(
    (opts: Omit<ConfirmDialogProps, "open" | "onCancel"> & { onCancel?: () => void }) => {
      setState(opts);
    },
    [],
  );

  const close = useCallback(() => setState(null), []);

  const dialog = state ? (
    <ConfirmDialog
      open
      {...state}
      onConfirm={async () => {
        await state.onConfirm();
        setState(null);
      }}
      onCancel={() => {
        state.onCancel?.();
        setState(null);
      }}
    />
  ) : null;

  return [dialog, askConfirm, close] as const;
}

export default ConfirmDialog;
