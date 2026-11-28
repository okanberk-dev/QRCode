"use client";

import { ReactNode, useState, useCallback } from "react";
import { AlertTriangle, CircleHelp, Loader2 } from "lucide-react";
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
 * Tek-tip onay penceresi. Yerli `confirm()` çağrılarının yerine kullanılır.
 * Görünüm: ikon dairesi (tehlikede kırmızı, diğerlerinde siyah + lime),
 * başlık, tek gri satır, iki hap (telefonda alt alta, ana eylem üstte).
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
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  // Built-in labels follow the page language; callers usually pass their own
  // verb ("İşletmeyi sil") as `confirmLabel`.
  const english =
    typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("en");
  const confirmText = confirmLabel ?? (english ? "Confirm" : "Onayla");
  const cancelText = cancelLabel ?? (english ? "Cancel" : "Vazgeç");
  const danger = variant === "danger";

  return (
    <Modal
      onClose={onCancel}
      size={440}
      hideCloseButton
      ariaLabel={typeof title === "string" ? title : undefined}
    >
      {/* Icon circle · title · one grey line · two pills (stacked on phones,
          the main action on top). */}
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-[#FDECEC] text-[#D92D20]" : "bg-pn-ink text-[#C6F24E]"
            }`}
          >
            {danger ? <AlertTriangle size={19} strokeWidth={2} /> : <CircleHelp size={19} strokeWidth={2} />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="break-words text-[18px] font-medium leading-snug tracking-[-0.01em] text-pn-ink">
              {title}
            </div>
            {body && <div className="mt-1.5 text-[14px] leading-[1.55] text-[#737373]">{body}</div>}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="bz-btn max-sm:w-full"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              void onConfirm();
            }}
            disabled={loading}
            aria-busy={loading || undefined}
            className={
              danger
                ? "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#D92D20] px-5 text-[14px] font-medium text-white transition-[background-color,transform] duration-200 hover:bg-[#B42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D20] focus-visible:ring-offset-2 active:scale-[.97] disabled:opacity-60 max-sm:w-full"
                : "bz-btn-primary max-sm:w-full"
            }
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {confirmText}
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
