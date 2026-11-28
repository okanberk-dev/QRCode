'use client';

// Denetim Merkezi — listeden "Linki paylaş" (spec §3.1/§3.3). Detay sayfasındaki
// kartla AYNI panel + denetleyici; yalnız `Modal` içinde (mobilde alttan açılır).
// Üst bileşen yalnız açıkken mount eder → linkler o anda çekilir.

import { useEffect, useRef } from 'react';
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
  /**
   * Listedeki "Yayınla ve linki al" / "Yeniden başlat" düğmesi içindir: modal
   * açılır açılmaz (tek seferlik) yayınlar ve linki getirir. Tıklayan kişi
   * zaten bunu istemiştir; modal yalnız ilerlemeyi gösterir.
   */
  autoPublish?: boolean;
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
  autoPublish = false,
}: ShareLinksModalProps) {
  const controller = useShareLinks({
    restaurantId,
    templateId,
    kind,
    locale,
    isPublished,
    onPublished,
  });

  const startedRef = useRef(false);
  const { publishAndGetLink } = controller;
  useEffect(() => {
    if (!autoPublish || isPublished || startedRef.current) return;
    startedRef.current = true;
    void publishAndGetLink();
    // yalnız açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      title={locale === 'tr' ? 'Denetim linkini paylaş' : 'Share the audit link'}
      description={
        <>
          {locale === 'tr' ? 'Denetim: ' : 'Audit: '}
          <span className="break-words font-medium text-pn-ink">{title}</span>
        </>
      }
      onClose={onClose}
      size={560}
      footer={
        <button type="button" className="bz-btn-ghost" onClick={onClose}>
          {locale === 'tr' ? 'Kapat' : 'Close'}
        </button>
      }
    >
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
