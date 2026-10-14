import { Loader2, Save } from 'lucide-react';

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="pulse-eyebrow text-[#737373]">{label}</label>
      {children}
    </div>
  );
}

export function ModalActions({ busy, copy, onClose }: { busy: boolean; copy: Record<string, string>; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[#EDEDED] pt-5">
      <button
        type="button"
        onClick={onClose}
        className="bz-btn-ghost"
      >
        {copy.cancel}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="bz-btn-primary disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
        {copy.save}
      </button>
    </div>
  );
}
