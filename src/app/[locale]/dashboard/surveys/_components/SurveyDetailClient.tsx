'use client';

// Survey detail (CLAUDE.md §42): header with the actions an owner needs
// (edit, publish / unpublish, preview, duplicate, delete) and two tabs —
// Share (link + QR) and Results. The preview shows the REAL customer screen in
// a phone frame (no network, no stored session), so a draft can be checked
// without opening a link that 404s.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import {
  AlertBanner,
  Badge,
  Modal,
  PageHeader,
  PulseMenu,
  PulseMenuDivider,
  PulseMenuItem,
  Tabs,
  useConfirmDialog,
} from '@/components/ui';
import type { PublicSurveyData } from '@/app/s/[slug]/PublicSurveyView';
// The customer screen's stylesheet normally ships with /s/[slug] only (route-
// scoped, CLAUDE.md §40.11). The preview modal renders that screen inside the
// dashboard, so it brings the same sheet along.
import '@/app/s/[slug]/survey.css';
import SurveyShareTab from './SurveyShareTab';
import SurveyResultsTab from './SurveyResultsTab';
import {
  connectionErrorMessage,
  readSurveyApiError,
  surveyPublicUrl,
  type DetailRestaurant,
  type DetailSurvey,
} from './survey-owner-ui';

// The customer view is only needed once the preview opens.
const PublicSurveyView = dynamic(() => import('@/app/s/[slug]/PublicSurveyView'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0A0A0A]" />,
});

type TabId = 'share' | 'results';

interface Props {
  locale: Locale;
  survey: DetailSurvey;
  restaurant: DetailRestaurant;
  publicBaseUrl: string;
  /** Viewer (read-only team member) = false. The API is the real gate. */
  canWrite: boolean;
  initialTab: TabId;
  /** Arrived right after creating the survey (`?new=1`). */
  justCreated: boolean;
}

export default function SurveyDetailClient({
  locale,
  survey: initialSurvey,
  restaurant,
  publicBaseUrl,
  canWrite,
  initialTab,
  justCreated,
}: Props) {
  const isTr = locale === 'tr';
  const router = useRouter();
  const [survey, setSurvey] = useState(initialSurvey);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [busy, setBusy] = useState<'publish' | 'duplicate' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdBanner, setCreatedBanner] = useState(justCreated);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();

  // Keep the page and the server data in step after `router.refresh()` / a
  // navigation that re-renders this page with a different survey.
  useEffect(() => {
    setSurvey(initialSurvey);
  }, [initialSurvey]);

  const publicUrl = surveyPublicUrl(publicBaseUrl, survey.slug);
  const moduleOff = !restaurant.surveysEnabled;
  const moduleOffText = isTr
    ? `Anket modülü ${restaurant.name} için Buaze yönetimi tarafından kapatıldı. Mevcut anketlerin korunur; yeni anket yayınlanamaz ve yayındaki linkler yanıt toplamaz.`
    : `The Surveys module is turned off by Buaze for ${restaurant.name}. Your existing surveys are kept, but new surveys can't be published and live links stop collecting answers.`;

  function changeTab(id: string) {
    const next: TabId = id === 'results' ? 'results' : 'share';
    setTab(next);
    // URL only — no server round trip (this page is force-dynamic).
    const params = new URLSearchParams(window.location.search);
    params.set('tab', next);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }

  function dismissCreatedBanner() {
    setCreatedBanner(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('new');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }

  async function setPublished(publish: boolean) {
    if (busy) return;
    setBusy('publish');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      if (!res.ok) {
        setError(await readSurveyApiError(res, locale));
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        survey?: { isPublished?: boolean; publishedAt?: string | null };
      } | null;
      setSurvey((prev) => ({
        ...prev,
        isPublished: json?.survey?.isPublished ?? publish,
        publishedAt:
          json?.survey?.publishedAt ?? (publish ? new Date().toISOString() : null),
      }));
      setNotice(
        publish
          ? isTr
            ? 'Anket yayında. Linki paylaşabilir ya da QR kodunu indirebilirsin.'
            : 'The survey is live. Share the link or download the QR code.'
          : isTr
            ? 'Anket yayından kaldırıldı. Müşteriler linki açınca "şu anda yanıt almıyor" mesajını görür.'
            : 'The survey is no longer live. Customers who open the link will see "not accepting responses right now".',
      );
    } catch {
      setError(connectionErrorMessage(locale));
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    if (busy) return;
    setBusy('duplicate');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await readSurveyApiError(res, locale));
        return;
      }
      const json = (await res.json().catch(() => null)) as { survey?: { id?: string } } | null;
      if (json?.survey?.id) {
        router.push(`/${locale}/dashboard/surveys/${json.survey.id}/edit`);
        return;
      }
      setNotice(isTr ? 'Kopya oluşturuldu. Anketler listesinde.' : 'Copy created. Find it in the survey list.');
    } catch {
      setError(connectionErrorMessage(locale));
    } finally {
      setBusy(null);
    }
  }

  function askDelete() {
    const n = survey._count.responses;
    askConfirm({
      title: isTr ? 'Bu anket silinsin mi?' : 'Delete this survey?',
      body: isTr
        ? `Anket ve ${n} yanıtı kalıcı olarak silinecek. Müşteri linki ve QR kod çalışmayı bırakır.`
        : `The survey and its ${n} ${n === 1 ? 'response' : 'responses'} will be permanently deleted. The customer link and QR code will stop working.`,
      variant: 'danger',
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        setBusy('delete');
        setError(null);
        try {
          const res = await fetch(`/api/surveys/${survey.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) {
            setError(await readSurveyApiError(res, locale));
            setBusy(null);
            return;
          }
          router.push(`/${locale}/dashboard/surveys`);
        } catch {
          setError(connectionErrorMessage(locale));
          setBusy(null);
        }
      },
    });
  }

  // The preview is the same component customers get, fed the saved survey.
  const previewSurvey: PublicSurveyData = {
    id: survey.id,
    slug: survey.slug,
    title: survey.title,
    description: survey.description,
    type: survey.type,
    isPublished: survey.isPublished,
    isActive: survey.isActive,
    accentColor: survey.accentColor,
    thankYouMessage: survey.thankYouMessage,
    collectContact: survey.collectContact,
    couponCode: survey.couponCode,
    couponLabel: survey.couponLabel,
    restaurantId: survey.restaurantId,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      primaryColor: restaurant.primaryColor,
      isActive: restaurant.isActive,
    },
    questions: survey.questions,
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
      <div className="mb-3">
        <Link
          href={`/${locale}/dashboard/surveys`}
          className="inline-flex min-h-[44px] items-center gap-1 text-xs text-[#525252] hover:text-[#0A0A0A]"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          {isTr ? 'Anketler' : 'Surveys'}
        </Link>
      </div>

      <PageHeader
        eyebrow={restaurant.name.toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US')}
        title={survey.title}
        description={survey.description || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {survey.isPublished ? (
              <Badge kind="lime">{isTr ? 'Yayında' : 'Live'}</Badge>
            ) : (
              <Badge kind="ghost">{isTr ? 'Taslak' : 'Draft'}</Badge>
            )}
            {canWrite && (
              <Link
                href={`/${locale}/dashboard/surveys/${survey.id}/edit`}
                className="bz-btn-ghost min-h-[44px] gap-2 text-[13px]"
              >
                <Pencil size={14} aria-hidden="true" />
                {isTr ? 'Düzenle' : 'Edit'}
              </Link>
            )}
            {canWrite &&
              (survey.isPublished ? (
                <button
                  type="button"
                  onClick={() => void setPublished(false)}
                  disabled={busy !== null}
                  className="bz-btn-ghost min-h-[44px] gap-2 text-[13px]"
                >
                  {busy === 'publish' ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <EyeOff size={14} aria-hidden="true" />
                  )}
                  {isTr ? 'Yayından kaldır' : 'Unpublish'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void setPublished(true)}
                  disabled={busy !== null || moduleOff}
                  title={moduleOff ? moduleOffText : undefined}
                  className="bz-btn-primary min-h-[44px] gap-2 text-[13px]"
                >
                  {busy === 'publish' ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Eye size={14} aria-hidden="true" />
                  )}
                  {isTr ? 'Yayınla' : 'Publish'}
                </button>
              ))}
            <PulseMenu
              trigger={
                <button
                  type="button"
                  aria-label={isTr ? 'Diğer işlemler' : 'More actions'}
                  className="bz-btn-icon h-11 w-11 border border-[#EDEDED]"
                >
                  <MoreHorizontal size={18} aria-hidden="true" />
                </button>
              }
              className="min-w-[200px]"
            >
              <PulseMenuItem icon={<Smartphone size={14} />} onSelect={() => setPreviewOpen(true)}>
                {isTr ? 'Önizle' : 'Preview'}
              </PulseMenuItem>
              {canWrite && (
                <>
                  <PulseMenuItem
                    icon={<Copy size={14} />}
                    disabled={moduleOff || busy !== null}
                    onSelect={() => void duplicate()}
                  >
                    {isTr ? 'Kopyasını oluştur' : 'Duplicate'}
                  </PulseMenuItem>
                  <PulseMenuDivider />
                  <PulseMenuItem
                    icon={<Trash2 size={14} />}
                    danger
                    disabled={busy !== null}
                    onSelect={askDelete}
                  >
                    {isTr ? 'Sil' : 'Delete'}
                  </PulseMenuItem>
                </>
              )}
            </PulseMenu>
          </div>
        }
      />

      <div className="space-y-3">
        {moduleOff && <AlertBanner kind="warn">{moduleOffText}</AlertBanner>}
        {createdBanner && (
          <AlertBanner kind="lime" onDismiss={dismissCreatedBanner}>
            {survey.isPublished
              ? isTr
                ? 'Anketin yayında! Linki paylaş ya da QR kodunu indirip bas.'
                : 'Your survey is live! Share the link or download and print the QR code.'
              : isTr
                ? 'Taslak kaydedildi. Yayınlayınca müşteriler linki açabilir.'
                : 'Draft saved. Customers can open the link once you publish.'}
          </AlertBanner>
        )}
        {error && (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}
        {notice && (
          <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
            {notice}
          </AlertBanner>
        )}
      </div>

      <div className="mt-5">
        <Tabs
          ariaLabel={isTr ? 'Anket bölümleri' : 'Survey sections'}
          items={[
            { id: 'share', label: isTr ? 'Paylaş' : 'Share' },
            { id: 'results', label: isTr ? 'Sonuçlar' : 'Results' },
          ]}
          active={tab}
          onChange={changeTab}
        />
      </div>

      <div
        role="tabpanel"
        aria-label={tab === 'share' ? (isTr ? 'Paylaş' : 'Share') : isTr ? 'Sonuçlar' : 'Results'}
        className="mt-6"
      >
        {tab === 'share' ? (
          <SurveyShareTab
            locale={locale}
            survey={survey}
            publicUrl={publicUrl}
            canWrite={canWrite}
            moduleOff={moduleOff}
            publishing={busy === 'publish'}
            onPublish={() => void setPublished(true)}
          />
        ) : (
          <SurveyResultsTab locale={locale} survey={survey} publicUrl={publicUrl} />
        )}
      </div>

      {previewOpen && (
        <Modal
          onClose={() => setPreviewOpen(false)}
          size={420}
          title={isTr ? 'Müşterinin göreceği ekran' : 'What customers will see'}
        >
          <p className="-mt-1 mb-4 text-xs text-[#737373]">
            {isTr
              ? 'Önizleme gerçek anketle aynıdır; hiçbir şey kaydedilmez.'
              : 'The preview is the real survey; nothing is saved.'}
          </p>
          <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[32px] border-8 border-[#0A0A0A] bg-[#0A0A0A]">
            <PublicSurveyView survey={previewSurvey} preview={{}} />
          </div>
        </Modal>
      )}
      {confirmEl}
    </div>
  );
}
