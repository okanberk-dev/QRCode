import { Loader2 } from 'lucide-react';

export default function MenuBuilderLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
    </div>
  );
}
