'use client';

import { use, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import NewsletterCampaignEditor, { type CampaignFormValue } from '@/components/admin/NewsletterCampaignEditor';

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignFormValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/newsletters/campaigns/${id}`);
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || 'Kampanya bulunamadı');
        const c = body.campaign;
        // Convert ISO datetime to <input type=datetime-local> format
        const scheduledAtLocal = c.scheduledAt
          ? new Date(c.scheduledAt).toISOString().slice(0, 16)
          : null;
        setCampaign({
          id: c.id,
          title: c.title,
          intro: c.intro,
          postIds: c.postIds ?? [],
          locale: c.locale,
          status: c.status,
          scheduledAt: scheduledAtLocal,
          sentAt: c.sentAt,
          sentCount: c.sentCount,
          failedCount: c.failedCount,
        });
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center p-16">
        <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  return <NewsletterCampaignEditor initial={campaign} />;
}
