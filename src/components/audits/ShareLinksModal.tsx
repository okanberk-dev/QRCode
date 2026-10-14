'use client';

// Denetim Merkezi — listeden "Linki paylaş" (spec §3.1/§3.3). Detay sayfasındaki
// kartla AYNI panel + denetleyici; yalnız `Modal` içinde (mobilde alttan açılır).
// Üst bileşen yalnız açıkken mount eder → linkler o anda çekilir.

import { Modal } from '@/components/ui';
import type { AuditKind } from '@/lib/audits/kind';
import ShareLinksPanel from './ShareLinksPanel';
import { useShareLinks } from './useShareLinks';
import type { UiLocale } from './audit-ui';

export interface ShareLinksModalProps {
  locale: UiLocale;
  restaurantId: string;
  templateId: string;
  title: string;
  kind: AuditKind;
  isPublished: boolean;
  questionCount: number;
  appUrl: string;
  onClose: () => void;
  /** Modal içinden yayınlanınca (liste satırının durumunu tazelemek için). */
  onPublished?: () => void;
}

export default function ShareLinksModal({
  locale,
  restaurantId,
  templateId,
  title,
  kind,
  isPublished,
  questionCount,
  appUrl,
  onClose,
  onPublished,
}: ShareLinksModalProps) {
  const controller = useShareLinks({
    restaurantId,
    templateId,
    kind,
    locale,
    isPublished,
    onPublished,
  });

  return (
    <Modal title={locale === 'tr' ? 'Linki paylaş' : 'Share link'} onClose={onClose} size={560}>
      <p className="mb-4 break-words text-[13px] font-medium text-[#0A0A0A]">{title}</p>
      <ShareLinksPanel
        controller={controller}
        title={title}
        appUrl={appUrl}
        kind={kind}
        locale={locale}
        questionCount={questionCount}
        variant="plain"
        autoFocusCopy
      />
    </Modal>
  );
}
