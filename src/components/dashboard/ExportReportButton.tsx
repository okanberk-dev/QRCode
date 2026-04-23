'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  label: string;
  format?: 'csv' | 'pdf';
  range?: string;
}

export default function ExportReportButton({ label, format = 'csv', range = '90d' }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/analytics/export?format=${format}&range=${range}`);
      if (res.status === 501) {
        setErr('soon');
        setTimeout(() => setErr(null), 3000);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `buaze-analytics-${range}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr('error');
      setTimeout(() => setErr(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors disabled:opacity-50"
    >
      {busy ? (
        <Loader2 size={12} strokeWidth={2} className="animate-spin" />
      ) : (
        <Download size={12} strokeWidth={2} />
      )}
      {err === 'soon' ? 'Yakında' : err === 'error' ? 'Hata' : label}
    </button>
  );
}
