'use client';

// CLAUDE.md §38.99 — Owner campaigns KPI grid (4-stat tile).

import { Mail, Send, CheckCircle2, XCircle } from 'lucide-react';
import { StatCard } from '@/components/ui';

interface KpiInput {
  total: number;
  sentThisMonth: number;
  avgDeliveryRate: number;
  skipRate: number;
}

interface Props {
  kpi: KpiInput;
  isTr: boolean;
  loading?: boolean;
}

export function CampaignsKpiGrid({ kpi, isTr, loading }: Props) {
  // §40.10 clean slate — skeleton render kaldırıldı; data gelene kadar null.
  if (loading) return null;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={isTr ? 'TOPLAM KAMPANYA' : 'TOTAL CAMPAIGNS'}
        value={kpi.total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
        icon={<Mail size={16} strokeWidth={2.2} />}
        accent="lime"
      />
      <StatCard
        label={isTr ? 'BU AY GÖNDERİLDİ' : 'SENT THIS MONTH'}
        value={kpi.sentThisMonth.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
        icon={<Send size={16} strokeWidth={2.2} />}
      />
      <StatCard
        label={isTr ? 'ORT. TESLİM ORANI' : 'AVG DELIVERY RATE'}
        value={kpi.avgDeliveryRate > 0 ? `%${kpi.avgDeliveryRate}` : '—'}
        icon={<CheckCircle2 size={16} strokeWidth={2.2} />}
      />
      <StatCard
        label={isTr ? 'PAZARLAMA ONAYSIZ' : 'NO MARKETING CONSENT'}
        value={kpi.skipRate > 0 ? `%${kpi.skipRate}` : '—'}
        icon={<XCircle size={16} strokeWidth={2.2} />}
        delta={isTr ? 'Onayı olmayan atlandı' : 'No consent skipped'}
        deltaKind="neutral"
      />
    </div>
  );
}
