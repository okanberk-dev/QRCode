'use client';

import { Sparkles, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui';

interface Props {
  isTr: boolean;
  disabled: boolean;
  onCreate: () => void;
}

export function CampaignsEmptyState({ isTr, disabled, onCreate }: Props) {
  return (
    <EmptyState
      icon={<Sparkles size={32} className="text-[#A8D62E]" strokeWidth={2} />}
      title={isTr ? 'Henüz kampanya yok' : 'No campaigns yet'}
      body={
        isTr
          ? 'Pazarlama onayı veren müşterilerinle e-posta ile iletişime geçmek için yeni kampanya oluştur.'
          : 'Create a new campaign to reach out to your marketing-consented customers.'
      }
      action={
        !disabled ? (
          <button
            type="button"
            onClick={onCreate}
            className="bz-btn-primary inline-flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px]"
          >
            <Plus size={14} strokeWidth={2.4} />
            {isTr ? 'İlk kampanyayı oluştur' : 'Create first campaign'}
          </button>
        ) : undefined
      }
    />
  );
}
