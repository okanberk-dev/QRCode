'use client';

import { Printer } from 'lucide-react';

export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="bz-btn-primary bz-print-hide inline-flex items-center gap-1.5">
      <Printer size={14} aria-hidden="true" />
      {label}
    </button>
  );
}
