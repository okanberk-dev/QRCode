'use client';

// Denetim Merkezi — paylaşım linklerinin denetleyicisi (spec §3.3).
//
// Detay sayfasındaki başlık CTA'sı ("Yayınla ve linki al") ile paylaşım kartı
// AYNI yayınla-ve-link-oluştur akışını kullanır; mantık tek yerde (burada),
// `ShareLinksPanel` yalnız sunar. Liste sayfasındaki `ShareLinksModal` da aynı
// hook'u modal açılınca bağlar.
//
// Kurallar:
//   • Link oluşturma AÇIK tıklamayla olur (panel açılınca otomatik link üretmez);
//     tek istisna "Yayınla ve linki al": yayınlar, ardından çalışan sürekli
//     link yoksa bir tane oluşturur.
//   • UI her zaman `recurrence` gönderir: "Tek seferlik olsun" kapalıyken
//     'daily' (API'nin varsayılanı geriye dönük uyum için 'once' kalır).
//   • Salt-okunur üyeler bu hook'u hiç kullanmaz (token almazlar).
//   • DELETE yumuşak iptal: yanıt geçmişi korunur, link çalışmayı bırakır.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuditAssignmentRow } from '@/lib/audits/queries';
import type { AuditKind } from '@/lib/audits/kind';
import { buildShareLinkBody } from '@/lib/audits/wizard-state';
import { parseAuditErrorResponse, summarizeAuditError } from '@/lib/audits/error-humanizer';
import { activeShareLinks, pickDefaultLink, type UiLocale } from './audit-ui';

export interface UseShareLinksArgs {
  restaurantId: string;
  templateId: string;
  kind: AuditKind;
  locale: UiLocale;
  /** Sunucudan gelen (revoke edilmemiş) linkler; verilmezse hook ilk render'da çeker. */
  initialLinks?: AuditAssignmentRow[] | null;
  /** Denetim şu an yayında mı. */
  isPublished: boolean;
  /** Yayınlama başarılı olunca (üst bileşen durumunu / listeyi tazeler). */
  onPublished?: () => void;
}

export type ShareBusy = null | 'publish' | 'create' | 'revoke';

export interface ShareLinksController {
  /** Yayında mı (yayınla sonrası anında true olur). */
  published: boolean;
  /** `null` = ilk yükleme sürüyor. */
  links: AuditAssignmentRow[] | null;
  /** Çalışan (iptal edilmemiş, token'ı olan) linkler, en eski önce. */
  active: AuditAssignmentRow[];
  /** İlk çalışan sürekli link — "varsayılan link". */
  defaultLink: AuditAssignmentRow | null;
  /** Çalışan diğer linkler. */
  others: AuditAssignmentRow[];
  loading: boolean;
  busy: ShareBusy;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<void>;
  publishAndGetLink: () => Promise<boolean>;
  createLink: (opts: { name?: string; once?: boolean }) => Promise<boolean>;
  revokeLink: (assignmentId: string) => Promise<boolean>;
}

export function useShareLinks({
  restaurantId,
  templateId,
  locale,
  initialLinks,
  isPublished,
  onPublished,
}: UseShareLinksArgs): ShareLinksController {
  const [links, setLinks] = useState<AuditAssignmentRow[] | null>(initialLinks ?? null);
  const [published, setPublished] = useState(isPublished);
  const [loading, setLoading] = useState(initialLinks === undefined || initialLinks === null);
  const [busy, setBusy] = useState<ShareBusy>(null);
  const [error, setError] = useState<string | null>(null);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const onPublishedRef = useRef(onPublished);
  onPublishedRef.current = onPublished;
  // Çifte tıklamaya karşı eşzamanlı kilit (state güncellemesi bir tick geç kalır).
  const busyRef = useRef<ShareBusy>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Üst bileşen yayın durumunu değiştirirse (router.refresh) takip et.
  useEffect(() => {
    setPublished(isPublished);
  }, [isPublished]);

  const base = `/api/restaurants/${restaurantId}/audits`;

  const failWith = useCallback(
    async (res: Response) => {
      const parsed = await parseAuditErrorResponse(res, locale);
      if (mountedRef.current) setError(summarizeAuditError(parsed));
    },
    [locale],
  );

  const networkError = useCallback(() => {
    if (mountedRef.current) setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
  }, [locale]);

  /** Linkleri çeker; başarısızsa `null` döner ve hatayı gösterir. */
  const fetchLinks = useCallback(async (): Promise<AuditAssignmentRow[] | null> => {
    const seq = ++seqRef.current;
    try {
      const res = await fetch(`${base}/assignments?templateId=${encodeURIComponent(templateId)}`, {
        cache: 'no-store',
      });
      if (seq !== seqRef.current || !mountedRef.current) return null;
      if (!res.ok) {
        await failWith(res);
        return null;
      }
      const json = (await res.json()) as { data?: AuditAssignmentRow[] };
      const rows = Array.isArray(json.data) ? json.data : [];
      if (seq === seqRef.current && mountedRef.current) setLinks(rows);
      return rows;
    } catch {
      networkError();
      return null;
    }
  }, [base, templateId, failWith, networkError]);

  const reload = useCallback(async () => {
    setLoading(true);
    await fetchLinks();
    if (mountedRef.current) setLoading(false);
  }, [fetchLinks]);

  // Modal gibi sunucudan veri gelmeyen kullanımlarda ilk çekim.
  useEffect(() => {
    if (initialLinks !== undefined && initialLinks !== null) return;
    void reload();
    // yalnız mount'ta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postLink = useCallback(
    async (opts: { name?: string; once?: boolean }): Promise<boolean> => {
      try {
        const res = await fetch(`${base}/assignments`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(buildShareLinkBody(templateId, opts)),
        });
        if (!res.ok) {
          await failWith(res);
          return false;
        }
        return true;
      } catch {
        networkError();
        return false;
      }
    },
    [base, templateId, failWith, networkError],
  );

  const createLink = useCallback(
    async (opts: { name?: string; once?: boolean }): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = 'create';
      setBusy('create');
      setError(null);
      try {
        const ok = await postLink(opts);
        if (ok) await fetchLinks();
        return ok;
      } finally {
        busyRef.current = null;
        if (mountedRef.current) setBusy(null);
      }
    },
    [postLink, fetchLinks],
  );

  const publishAndGetLink = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = 'publish';
    setBusy('publish');
    setError(null);
    try {
      const res = await fetch(`${base}/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publish: true }),
      });
      if (!res.ok) {
        await failWith(res);
        return false;
      }
      if (mountedRef.current) setPublished(true);
      onPublishedRef.current?.();

      // Yayınlanınca eski (duraklatma öncesi) linkler yeniden çalışır; çalışan
      // sürekli link yoksa bir tane oluştur.
      const rows = await fetchLinks();
      if (rows === null) return true; // yayın başarılı; link listesi okunamadı (hata gösterildi)
      if (!pickDefaultLink(rows)) {
        const ok = await postLink({ once: false });
        if (ok) await fetchLinks();
      }
      return true;
    } catch {
      networkError();
      return false;
    } finally {
      busyRef.current = null;
      if (mountedRef.current) setBusy(null);
    }
  }, [base, templateId, failWith, networkError, fetchLinks, postLink]);

  const revokeLink = useCallback(
    async (assignmentId: string): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = 'revoke';
      setBusy('revoke');
      setError(null);
      try {
        const res = await fetch(`${base}/assignments/${assignmentId}`, { method: 'DELETE' });
        if (!res.ok) {
          await failWith(res);
          return false;
        }
        await fetchLinks();
        return true;
      } catch {
        networkError();
        return false;
      } finally {
        busyRef.current = null;
        if (mountedRef.current) setBusy(null);
      }
    },
    [base, failWith, networkError, fetchLinks],
  );

  const active = useMemo(() => activeShareLinks(links), [links]);
  const defaultLink = useMemo(() => pickDefaultLink(links), [links]);
  const others = useMemo(
    () => active.filter((a) => a.id !== defaultLink?.id),
    [active, defaultLink],
  );

  return {
    published,
    links,
    active,
    defaultLink,
    others,
    loading,
    busy,
    error,
    clearError: () => setError(null),
    reload,
    publishAndGetLink,
    createLink,
    revokeLink,
  };
}
