'use client';

// CLAUDE.md §38.99 — Owner campaigns list (desktop table + mobile card).
// Pulse design system §11/§23.6 paterni.

import { Badge } from '@/components/ui';
import { campaignStatusBadge, campaignStatusLabel } from '@/lib/customer-campaign-stats';
import type { CampaignListItem } from './CampaignsClient';

interface Props {
  campaigns: CampaignListItem[];
  isTr: boolean;
  onRowClick: (id: string) => void;
}

function formatDate(iso: string, isTr: boolean): string {
  try {
    return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function CampaignsList({ campaigns, isTr, onRowClick }: Props) {
  return (
    <div className="bz-card overflow-hidden p-0">
      {/* Desktop tablo */}
      <div className="hidden lg:block no-scrollbar overflow-x-auto">
        <table className="bz-table w-full text-[12.5px]">
          <thead>
            <tr>
              <th className="text-left">{isTr ? 'Konu' : 'Subject'}</th>
              <th className="text-left">{isTr ? 'Durum' : 'Status'}</th>
              <th className="text-right">{isTr ? 'Alıcı' : 'Recipients'}</th>
              <th className="text-right">{isTr ? 'Gönderildi' : 'Sent'}</th>
              <th className="text-right">{isTr ? 'Teslim' : 'Delivery'}</th>
              <th className="text-left">{isTr ? 'Oluşturuldu' : 'Created'}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button, a, input')) return;
                  onRowClick(c.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(c.id);
                  }
                }}
                className="bz-tr-hover cursor-pointer"
              >
                <td className="text-left">
                  <div className="bz-h-tight text-[13px] truncate max-w-[320px]" title={c.subject}>
                    {c.subject}
                  </div>
                  {c.restaurantName ? (
                    <div className="text-[10.5px] text-[#737373] mt-0.5">{c.restaurantName}</div>
                  ) : null}
                </td>
                <td className="text-left">
                  <Badge kind={campaignStatusBadge(c.status)}>
                    {campaignStatusLabel(c.status, isTr ? 'tr' : 'en')}
                  </Badge>
                </td>
                <td className="text-right bz-mono tabular-nums">
                  {c.recipientCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                </td>
                <td className="text-right bz-mono tabular-nums">
                  {c.sentCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                </td>
                <td className="text-right bz-mono tabular-nums">
                  {c.status === 'sent' && c.deliveryRate > 0 ? `%${c.deliveryRate}` : '—'}
                </td>
                <td className="text-left text-[#525252]">{formatDate(c.createdAt, isTr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="lg:hidden divide-y divide-[#EDEDED]">
        {campaigns.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onRowClick(c.id)}
              className="bz-motion-spring w-full text-left p-4 hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:bg-[#FAFAFA]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="bz-h-tight text-[13.5px] truncate flex-1" title={c.subject}>
                  {c.subject}
                </div>
                <Badge kind={campaignStatusBadge(c.status)}>
                  {campaignStatusLabel(c.status, isTr ? 'tr' : 'en')}
                </Badge>
              </div>
              {c.restaurantName ? (
                <div className="text-[11px] text-[#737373] mb-2">{c.restaurantName}</div>
              ) : null}
              <div className="flex items-center justify-between text-[11.5px] text-[#525252]">
                <span>
                  {isTr ? 'Alıcı' : 'Recipients'}:{' '}
                  <span className="bz-mono tabular-nums text-[#0A0A0A]">{c.recipientCount}</span>
                </span>
                {c.status === 'sent' && c.deliveryRate > 0 ? (
                  <span>
                    {isTr ? 'Teslim' : 'Delivery'}:{' '}
                    <span className="bz-mono tabular-nums text-[#0A0A0A]">%{c.deliveryRate}</span>
                  </span>
                ) : (
                  <span>{formatDate(c.createdAt, isTr)}</span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
