import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-7">
      <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-8">
        <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-[#737373]">
          <Loader2 size={16} className="animate-spin" />
          Panel hazırlanıyor...
        </div>
      </div>
    </div>
  );
}
