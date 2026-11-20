'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** A pending payment: ask the server again 3 times, 5 s apart (the reconcile cron is the backstop). */
export default function ResultPoller({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= 3) window.clearInterval(id);
    }, 5000);
    return () => window.clearInterval(id);
  }, [active, router]);
  return null;
}
