'use client';

// The optional "reply on Google" region of the Google Reviews page (Google
// Business Profile sign-in → locations → reviews → AI draft → public reply).
//
// Moved out of page.tsx unchanged in behaviour: it is mounted with
// `key={restaurantId}`, so switching business remounts it and every piece of
// state below starts fresh (no manual resets). It tells the page two things
// through `onReplyState` — whether its first status request has settled and
// whether the reply feature is fully set up — because the Places profile card
// above it must not flip between its full and one-line forms while the reply
// region reloads (see PlacesProfileSection).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Unplug,
} from 'lucide-react';
import { AlertBanner, Badge, WizardSteps, useConfirmDialog } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { Locale } from '@/lib/translations';
import { GoogleReviewsInbox } from '@/components/dashboard/google/inbox/GoogleReviewsInbox';
import type { InboxPage } from '@/components/dashboard/google/inbox/inbox-client';
import {
  BANNER_TOUCH_CLS,
  ownerBodyMessage,
  ownerBodyMessageOr,
} from '@/components/dashboard/google/places-client';
import type { GoogleReplyAvailability } from '@/lib/google-places';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';

interface GoogleLocation {
  accountName: string;
  accountId: string;
  locationName: string;
  locationId: string;
  title: string;
  address: string | null;
  placeId: string | null;
  mapsUri: string | null;
  newReviewUri: string | null;
}

interface GoogleBusinessAccountLite {
  name: string;
  accountName: string | null;
  type: string | null;
  role: string | null;
}

interface GoogleStatus {
  googleReviewManagementEnabled: boolean;
  googleAiEnabled: boolean;
  placesConfigured: boolean;
  oauthConfigured: boolean;
  connected: boolean;
  selectedLocation: GoogleLocation | null;
  syncedAt: string | null;
  /**
   * Platform-level state of the optional reply feature. Missing (older
   * server) is treated as `available`.
   */
  replyAvailability?: GoogleReplyAvailability;
  /** §53 — connection health (client changed / grant revoked). */
  connectionState?: 'not_connected' | 'connected' | 'reconnect_required' | 'broken';
}

/**
 * The optional "reply on Google" region (Google Business Profile sign-in).
 *
 * It always sits UNDER the Places profile and never gates it: while its own
 * status loads it is one flat row, and every platform-level state (not open
 * yet, plan off, sign-in unavailable) is one compact row inside the card.
 * When the full reviews experience is on screen (`full`) the header drops the
 * card chrome, because what follows is made of cards itself.
 */
/**
 * What the section's one-line description says:
 *  - `full`: the reviews experience is on screen;
 *  - `connect`: the "Google hesabını bağla" button is below, so invite it;
 *  - `info`: anything else (loading, plan off, not open yet, signed in but no
 *    location) — a neutral line, never an invitation the body contradicts.
 */
type ReplyIntro = 'full' | 'connect' | 'info';

const REPLY_INTRO: Record<ReplyIntro, { tr: string; en: string }> = {
  full: {
    tr: 'Tüm Google yorumlarını burada oku ve Pulse AI taslağıyla yanıtla.',
    en: 'Read all your Google reviews here and reply with a Pulse AI draft.',
  },
  connect: {
    tr: 'Google İşletme Profili hesabını bağlarsan tüm yorumlarını burada okuyup Pulse AI taslağıyla yanıtlayabilirsin.',
    en: 'Connect your Google Business Profile account to read all your reviews here and reply with a Pulse AI draft.',
  },
  info: {
    tr: 'Google yorumlarını burada okuyup Pulse AI taslağıyla yanıtlamanı sağlar.',
    en: 'Lets you read your Google reviews here and reply with a Pulse AI draft.',
  },
};

function ReplySection({
  isTr,
  full,
  intro,
  actions,
  children,
}: {
  isTr: boolean;
  full: boolean;
  intro: ReplyIntro;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="google-reply-title" className="bz-h-tight text-[17px] text-pn-ink">
            {isTr ? "Yorumlara Google'dan yanıt ver" : 'Reply to reviews on Google'}
          </h2>
          <Badge kind="ghost" dot={false}>
            {isTr ? 'İsteğe bağlı' : 'Optional'}
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-[13px] leading-[1.6] text-[#525252]">
          {REPLY_INTRO[intro][isTr ? 'tr' : 'en']}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );

  return (
    <section
      id="google-reply"
      aria-labelledby="google-reply-title"
      tabIndex={-1}
      className={
        full
          ? 'scroll-mt-24 space-y-5 focus:outline-none'
          : 'bz-card scroll-mt-24 space-y-4 p-5 focus:outline-none sm:p-6'
      }
    >
      {/* The inbox (full) carries its own summary line; no section header. */}
      {full ? null : header}
      {children}
    </section>
  );
}

export interface GoogleReplySectionProps {
  restaurantId: string;
  /** Name of the business, for the quick-reply templates and review cards. */
  restaurantName: string;
  locale: Locale;
  /** Reports the status of the reply feature to the page (see file header). */
  onReplyState: (restaurantId: string, state: { settled: boolean; active: boolean; offered: boolean }) => void;
  /** Server-known: false for a read-only team member. */
  canWrite?: boolean;
  /** Google Maps profile, shown inside the inbox's "Analiz" (§54). */
  profileSlot?: ReactNode;
  /**
   * Status and first inbox page prepared on the server for this business
   * (§56). With it the section shows the inbox without any request.
   */
  initialData?: { status: unknown; inbox: InboxPage | null } | null;
}

export function GoogleReplySection({
  restaurantId,
  restaurantName,
  locale,
  onReplyState,
  canWrite,
  profileSlot,
  initialData,
}: GoogleReplySectionProps) {
  const isTr = locale === 'tr';
  const activeRestaurantId: string = restaurantId;

  const serverStatus = (initialData?.status as GoogleStatus | undefined) ?? null;
  const [status, setStatus] = useState<GoogleStatus | null>(serverStatus);
  const [statusLoading, setStatusLoading] = useState(false);
  const [checkedRestaurantId, setCheckedRestaurantId] = useState<string | null>(serverStatus ? restaurantId : null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  // The Places section (rating, checklist, sample reviews) is independent of
  // the reply region below it. It only needs to know two things about the
  // reply feature, and both must stay stable while the region reloads (a
  // "refresh reviews" must not flip the profile card between its full and
  // one-line forms):
  //   - `statusSettledFor`: the business whose FIRST status request finished
  //     (success or failure);
  //   - `replyActive`: the reply feature is fully set up (plan on, signed in,
  //     location chosen).
  const [statusSettledFor, setStatusSettledFor] = useState<string | null>(serverStatus ? restaurantId : null);
  const [replyActive, setReplyActive] = useState(
    Boolean(serverStatus?.googleReviewManagementEnabled && serverStatus?.connected && serverStatus?.selectedLocation),
  );
  // Newest status request wins: a slow response for the business the owner
  // just left must never overwrite the one now on screen.
  const statusSeqRef = useRef(0);
  // Inline OAuth + location selection — Platform Bağlantıları sayfasına
  // yönlendirmek yerine kullanıcı bu sayfadan direkt bağlanır + konum seçer.
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Google Business Profile hesabı (account) listesi — kullanıcının "Business
  // Profile" sahibi olup olmadığını UI'da ayırt etmek için. Boş array =
  // Google ile login oldu ama henüz işletme profili açmamış demektir.
  const [inlineAccounts, setInlineAccounts] = useState<GoogleBusinessAccountLite[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [inlineLocations, setInlineLocations] = useState<GoogleLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationRetryAfter, setLocationRetryAfter] = useState<number | null>(null);
  // Backend `source: 'cache' | 'google' | 'empty'` döner — UI rozet
  // (Önbellek) ve "Son senkron" zamanı için kullanılır (CLAUDE.md §5.1).
  const [inlineLocationsSource, setInlineLocationsSource] = useState<'cache' | 'google' | 'empty' | null>(null);
  const [inlineLocationsSyncedAt, setInlineLocationsSyncedAt] = useState<string | null>(null);
  // §38.231 — Google projesinde Business Profile API quota=0 (henüz
  // provision edilmemiş) ise backend `warning: 'GOOGLE_API_NOT_PROVISIONED'`
  // döner. Bu KALICI durum: owner farklı hesap denese de çözülmez (quota
  // proje-geneli). UI "farklı hesapla bağlan" yanıltıcı CTA'sını gizler,
  // owner'a doğru bağlı olduğunu + ek işlem gerekmediğini söyler.
  const [apiNotProvisioned, setApiNotProvisioned] = useState(false);
  // §38.211 — Auto-retry tamamen kaldırıldı (shared API quota
  // anti-pattern). Eski state'ler (autoRetryFiredRef, autoRetryAttemptRef,
  // MAX_AUTO_RETRY_ATTEMPTS, hasAutoRetried) silindi — quota fail
  // durumunda owner sandwich card (§38.208) ile direkt manuel
  // intervention seçenekleri görüyor. Countdown UI sadece "Yenile" buton
  // disable amaçlı (locationRetryAfter state korunur, tick decrement
  // yapar ama retry tetiği yok).
  // §38.206 — Smart "Bu hesapla devam et" akışı. Kullanıcı empty state'te
  // "Bu Google hesabıyla devam et" tıkladıysa flag set edilir; loadInlineLocations
  // force=true ile fresh accounts fetch atılır. Hâlâ accounts boş dönerse
  // "Bu hesapta gerçekten Business Profile yok" mesajı + buton disabled olur
  // ve user "Farklı hesapla bağlan" akışına yönlendirilir. State sayfa
  // unmount / restoran değişikliğinde sıfırlanır (sonraki restoran için
  // fresh state).
  const [hasAttemptedSameAccount, setHasAttemptedSameAccount] = useState(false);
  const [savingLocation, setSavingLocation] = useState<string | null>(null);
  // Refresh token revoke / expired durumlarda "Yeniden Bağla" CTA flag'i.
  // setLocationError ile birlikte set edilir; AlertBanner altında buton görünür.
  const [needsReconnect, setNeedsReconnect] = useState(false);
  // §54 — a send / sync in the inbox said the Google connection must be renewed.
  const [connectionProblem, setConnectionProblem] = useState(false);

  const loadStatusAndReviews = async (restaurantId: string) => {
    const seq = ++statusSeqRef.current;
    const current = () => seq === statusSeqRef.current;
    setStatusLoading(true);
    setStatus(null);
    setCheckedRestaurantId(null);
    setReviewsError(null);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/google/business/status`);
      const data = await res.json().catch(() => null);
      if (!current()) return;
      if (!res.ok || !data) {
        setReviewsError(ownerBodyMessage(data, locale));
        setStatusSettledFor(restaurantId);
        return;
      }
      setStatus(data);
      setCheckedRestaurantId(restaurantId);
      const replyReady = Boolean(
        data.googleReviewManagementEnabled && data.connected && data.selectedLocation,
      );
      setReplyActive(replyReady);
      setStatusSettledFor(restaurantId);

    } catch {
      if (!current()) return;
      setReviewsError(ownerGoogleMessage('GOOGLE_NETWORK_ERROR', locale));
      setStatusSettledFor(restaurantId);
    } finally {
      if (current()) setStatusLoading(false);
    }
  };

  // The page mounts this component once per business (`key`), so every piece
  // of state above already starts fresh — just load the status. The ref keeps
  // the React StrictMode double effect (next dev) from sending it twice.
  // A status prepared on the server (§56) needs no request.
  const loadStartedRef = useRef(Boolean(serverStatus));
  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    void loadStatusAndReviews(restaurantId);
    // Mount-only (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OAuth start — Google'a yönlendirir, callback sonrası bu sayfaya geri
  // döner (Platform Bağlantıları'na atmıyor). returnTo URL'inde aktif
  // restaurant ID korunur — kullanıcı bağlandıktan sonra aynı işletme
  // scope'unda kalır.
  const connectGoogleInline = async () => {
    if (!activeRestaurantId || connecting) return;
    setConnecting(true);
    setConnectError(null);
    // Reauth flow'unda eski location error/notice/needsReconnect state'lerini
    // de temizle — OAuth redirect başarılı olunca callback geri dönecek,
    // taze state ile başlasın.
    setLocationError(null);
    setLocationNotice(null);
    setNeedsReconnect(false);
    setLocationRetryAfter(null);
    try {
      const returnTo = `/${locale}/dashboard/google-reviews?restaurantId=${activeRestaurantId}`;
      const res = await fetch('/api/integrations/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        // Backend `message` is operator wording (it used to name the missing
        // configuration) — never show it to the owner. Map by machine code.
        if (data?.configured === false || data?.error === 'missing_google_client_id') {
          setConnectError(ownerGoogleMessage('missing_google_client_id', locale));
        } else if (res.status === 401) {
          setConnectError(ownerGoogleMessage('UNAUTHORIZED', locale));
        } else {
          setConnectError(ownerGoogleMessage('token-error', locale));
        }
        return;
      }
      window.location.href = data.url;
    } catch {
      setConnectError(ownerGoogleMessage('GOOGLE_NETWORK_ERROR', locale));
    } finally {
      setConnecting(false);
    }
  };

  // Google Business Profile location'larını çek. 429 stale cache fallback'i
  // mevcut backend tarafında (CLAUDE.md §40.1 graceful degrade) — UI sarı
  // banner + retry-after countdown gösterir. `force=true` sadece kullanıcı
  // bilinçli "Konumları yenile" butonuna basınca gönderilir; otomatik
  // mount fetch'i cache'i kullanır (CLAUDE.md §5.1 quota strategy).
  const loadInlineLocations = async (force = false, _opts: { resetAutoRetry?: boolean } = {}) => {
    if (!activeRestaurantId) return;
    setLoadingLocations(true);
    setLocationError(null);
    setLocationNotice(null);
    setLocationRetryAfter(null);
    setNeedsReconnect(false);
    setApiNotProvisioned(false);
    // §38.211 — Auto-retry KALDIRILDI (shared API quota anti-pattern,
    // §40.4). resetAutoRetry opt is no-op (signature korunuyor backwards-
    // compat için, ileride state geri eklenirse caller'lar değişmesin).
    // `force` parametresi yine manuel button click vs otomatik
    // remount ayırt eder — backend cache TTL strategy buna güveniyor.
    try {
      const url = `/api/restaurants/${activeRestaurantId}/google/business/locations${
        force ? '?force=true' : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (
        res.ok &&
        (data?.warning === 'GOOGLE_RATE_LIMITED' ||
          data?.warning === 'GOOGLE_API_NOT_PROVISIONED' ||
          data?.warning === 'CLIENT_THROTTLED')
      ) {
        // §38.231 — quota=0 (provision edilmemiş) KALICI durum. "Farklı
        // hesap" yanıltıcı + "60s sonra dene" countdown yanlış sinyal
        // (kalıcı, bekleyince düzelmez). Geçici quota/throttle'dan ayır.
        const notProvisioned = data.warning === 'GOOGLE_API_NOT_PROVISIONED';
        setApiNotProvisioned(notProvisioned);
        setInlineLocations(data.locations ?? []);
        setInlineAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setAccountsLoaded(true);
        setInlineLocationsSource(data.source ?? null);
        setInlineLocationsSyncedAt(typeof data.syncedAt === 'string' ? data.syncedAt : null);
        // Mapped by the machine `warning`: the route's own `message` is never
        // shown. A busy Google gets the "try Refresh in a few minutes" wording
        // because this page has that button.
        setLocationNotice(
          ownerGoogleMessage(data.warning === 'GOOGLE_RATE_LIMITED' ? 'reply_busy' : data.warning, locale),
        );
        // §38.211 — UI-side cooldown only (auto-retry kaldırıldı).
        // Backend artık `retryAfterSeconds` göndermiyor (§38.211 backend
        // fix). Frontend manuel "Yenile" mash önleyici için 60s countdown
        // başlatır — bu sadece buton disable + display amaçlı, hiçbir
        // retry tetiği YOK. Sandwich card (§38.208) owner'a "Farklı
        // hesapla bağlan" alternatifini hemen sunuyor.
        // §38.231 — not-provisioned ise countdown YOK (kalıcı durum).
        if (!notProvisioned) setLocationRetryAfter(60);
        return;
      }
      if (!res.ok) {
        if (res.status === 429) {
          // §38.211 — Hard 429 sadece rate-limit (CLIENT_THROTTLED) için
          // tetiklenir; Google quota fail (§38.211 backend fix) artık
          // 200 + warning paterniyle dönüyor (yukarıdaki branch).
          // Backend rate-limit retry-after header gönderir ama auto-retry
          // YOK — owner manuel "Yenile" cooldown'unu bekler. setLocationRetryAfter
          // çağrılmaz → countdown UI tetiklenmez.
          setLocationError(ownerBodyMessage(data, locale, 'CLIENT_THROTTLED'));
          return;
        }
        if (res.status === 401 || data?.code === 'GOOGLE_REAUTH_REQUIRED' || data?.requiresReauth) {
          // Refresh token süresi doldu / Google revoke etti. Owner için
          // net mesaj + Yeniden Bağla CTA.
          setLocationError(ownerGoogleMessage('GOOGLE_REAUTH_REQUIRED', locale));
          setNeedsReconnect(true);
          return;
        }
        if (data?.code === 'GOOGLE_NOT_CONNECTED') {
          // İlk OAuth henüz yapılmamış / disconnect olmuş.
          setLocationError(ownerGoogleMessage('GOOGLE_NOT_CONNECTED', locale));
          return;
        }
        setLocationError(ownerBodyMessage(data, locale));
        return;
      }
      setInlineLocations(data.locations ?? []);
      setInlineAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setAccountsLoaded(true);
      setInlineLocationsSource(data.source ?? null);
      setInlineLocationsSyncedAt(typeof data.syncedAt === 'string' ? data.syncedAt : null);
    } catch {
      setLocationError(ownerGoogleMessage('GOOGLE_NETWORK_ERROR', locale));
    } finally {
      setLoadingLocations(false);
    }
  };

  // Location seç → backend `googlePlaceId` + `googleReviewUrl` kaydeder,
  // status reload eder, otomatik review listesi gelir.
  const selectInlineLocation = async (location: GoogleLocation) => {
    if (!activeRestaurantId || savingLocation) return;
    setSavingLocation(`${location.accountName}:${location.locationName}`);
    setLocationError(null);
    try {
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/google/business/locations/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: location.accountName,
          locationName: location.locationName,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLocationError(
          ownerBodyMessageOr(
            data,
            locale,
            isTr ? 'Konum kaydedilemedi. Biraz sonra tekrar dene.' : "Couldn't save the location. Please try again shortly.",
          ),
        );
        return;
      }
      // Status + reviews otomatik yüklensin
      void loadStatusAndReviews(activeRestaurantId);
    } catch {
      setLocationError(ownerGoogleMessage('GOOGLE_NETWORK_ERROR', locale));
    } finally {
      setSavingLocation(null);
    }
  };

  // Connected ama location seçilmedi → otomatik locations çek.
  useEffect(() => {
    if (
      status?.connected &&
      // Admin switch off → the locations endpoint only returns
      // GOOGLE_REVIEW_MANAGEMENT_DISABLED (and the page shows the
      // "not enabled" state instead), so do not fire it.
      status.googleReviewManagementEnabled &&
      !status.selectedLocation &&
      activeRestaurantId &&
      inlineLocations.length === 0 &&
      !loadingLocations
    ) {
      // §38.207 — Restaurant change / status update = fresh context,
      // auto-retry flag'i resetlenebilir (yeni quota window olabilir).
      void loadInlineLocations(false, { resetAutoRetry: true });
    }
    // Deliberately not depending on loadInlineLocations / loadingLocations
    // to avoid re-run loop after fetch completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.googleReviewManagementEnabled, status?.selectedLocation, activeRestaurantId]);

  // §38.211 — Auto-retry KALDIRILDI (anti-pattern for shared API quota).
  // Google quota proje-geneli (1 req/min/proje, §5.1.1): TÜM Buaze
  // kullanıcıları aynı kotayı paylaşır. Eski auto-retry her client'ın
  // retry'ı quota'yı tekrar tüketiyordu → hep birlikte 429 alırlardı →
  // sonsuz döngü. §38.207 auto-retry self-loop fix + §38.209 exponential
  // backoff yumuşatıcıydı ama temel sorunu çözmüyordu çünkü farklı
  // client'lar aynı window içinde retry tetikliyordu.
  //
  // Yeni paterni — manuel intervention only:
  //   - Countdown UI sadece "Yenile" buton disable + display amaçlı
  //   - Tick'ler decrement yapar; 0'a ulaştığında HİÇBİR retry tetiği yok
  //   - Owner sandwich card (§38.208) ile "Farklı hesapla bağlan"
  //     alternatifini direkt görür, veya 60s cooldown sonrası manuel
  //     "Yenile" tıklayabilir
  //
  // Eski auto-retry state'leri (autoRetryFiredRef, autoRetryAttemptRef,
  // MAX_AUTO_RETRY_ATTEMPTS, hasAutoRetried) tamamen silindi — drift
  // kaynağıydı.
  useEffect(() => {
    if (locationRetryAfter === null || locationRetryAfter <= 0) return;
    const interval = setInterval(() => {
      setLocationRetryAfter((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locationRetryAfter]);

  const statusIsReady = Boolean(
    activeRestaurantId && checkedRestaurantId === activeRestaurantId && status,
  );
  // Guards ONLY the reply region (one flat row). The Places section above it
  // never waits for the Google sign-in status or the review waterfall.
  const shouldShowStatusLoading =
    statusLoading || Boolean(activeRestaurantId && !statusIsReady && !reviewsError);

  // Platform-level state of the optional reply sign-in. Missing (older
  // server) counts as available.
  const replyAvailability: GoogleReplyAvailability = status?.replyAvailability ?? 'available';
  // The reviews experience (not a compact row) is on screen: its section
  // header drops the card chrome because the content below is made of cards.
  const replyFull =
    !shouldShowStatusLoading &&
    !(reviewsError && !statusIsReady) &&
    Boolean(status?.googleReviewManagementEnabled && status?.connected && status?.selectedLocation);

  // The connect button is in the body (not connected, reply access open,
  // plan on, sign-in configured): only then does the description invite it.
  const replyIntro: ReplyIntro = replyFull
    ? 'full'
    : !shouldShowStatusLoading &&
        !(reviewsError && !statusIsReady) &&
        status &&
        !status.connected &&
        replyAvailability === 'available' &&
        status.googleReviewManagementEnabled &&
        status.oauthConfigured
      ? 'connect'
      : 'info';

  // Disconnect asks first (the reviews list disappears until the owner signs
  // in again). Accessible dialog instead of the native `confirm()`.
  const [disconnectDialog, askConfirm] = useConfirmDialog();
  const disconnectGoogle = () =>
    askConfirm({
      title: isTr ? 'Google bağlantısı kesilsin mi?' : 'Disconnect Google?',
      body: isTr
        ? 'Google hesap bağlantısı kesilecek. Yorumları burada görmek için yeniden bağlaman gerekir.'
        : 'Your Google account will be disconnected. Connect again to see your reviews here.',
      confirmLabel: isTr ? 'Bağlantıyı kes' : 'Disconnect',
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' });
          if (res.ok) {
            if (activeRestaurantId) void loadStatusAndReviews(activeRestaurantId);
            return;
          }
        } catch {
          /* falls through to the message below */
        }
        setReviewsError(isTr ? 'Bağlantı kesilemedi. Tekrar dene.' : "Couldn't disconnect. Please try again.");
      },
    });

  // Refresh / disconnect live in the inbox's own menu (§54).
  const replyActions: ReactNode = null;

  // §54 — setup wizard: shown while the reply feature is offered but not
  // fully set up (connect → location → reply inbox).
  const setupStep: number | null =
    !shouldShowStatusLoading &&
    status &&
    !replyFull &&
    status.googleReviewManagementEnabled &&
    (status.replyAvailability ?? 'available') === 'available' &&
    (status.connected || status.oauthConfigured)
      ? status.connected
        ? 1
        : 0
      : null;

  // The reply feature can actually be used for this business (plan on, not
  // closed for the workspace, sign-in configured or already connected). The
  // Places card hides its "reply on Google" link otherwise.
  const replyOffered = Boolean(
    status &&
      status.googleReviewManagementEnabled &&
      (status.replyAvailability ?? 'available') === 'available' &&
      (status.connected || status.oauthConfigured),
  );

  // Tell the page what is going on here (stable across re-renders).
  const onReplyStateRef = useRef(onReplyState);
  useEffect(() => {
    onReplyStateRef.current = onReplyState;
  }, [onReplyState]);
  useEffect(() => {
    onReplyStateRef.current(restaurantId, {
      settled: statusSettledFor === restaurantId,
      active: replyActive,
      offered: replyOffered,
    });
  }, [restaurantId, statusSettledFor, replyActive, replyOffered]);

  return (
    <>
          <ReplySection isTr={isTr} full={replyFull} intro={replyIntro} actions={replyActions}>
            {!shouldShowStatusLoading &&
              status?.connected &&
              replyAvailability !== 'coming_soon' &&
              (connectionProblem || status.connectionState === 'reconnect_required' || status.connectionState === 'broken') && (
                // §53 — the stored token belongs to another Google Cloud
                // project, or Google revoked it. Last fetched reviews stay
                // visible on the widget; one reconnect fixes both cases.
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <AlertBanner kind="warn">
                    {ownerGoogleMessage(
                      status.connectionState === 'reconnect_required'
                        ? 'reply_reconnect_client_changed'
                        : 'reply_connection_broken',
                      locale,
                    )}
                  </AlertBanner>
                  <button
                    type="button"
                    className="bz-btn-primary min-h-11 w-full shrink-0 sm:w-auto"
                    disabled={connecting}
                    onClick={() => void connectGoogleInline()}
                  >
                    {isTr ? 'Yeniden bağla' : 'Reconnect'}
                  </button>
                </div>
              )}
            {setupStep !== null && (
              <WizardSteps
                className="mb-1"
                ariaLabel={isTr ? 'Google yanıt kurulumu' : 'Google reply setup'}
                current={setupStep}
                steps={[
                  { label: isTr ? 'Google hesabını bağla' : 'Connect Google', short: isTr ? 'Bağla' : 'Connect' },
                  { label: isTr ? 'İşletme konumunu seç' : 'Pick the location', short: isTr ? 'Konum' : 'Location' },
                  { label: isTr ? 'Yorumları yanıtla' : 'Reply to reviews', short: isTr ? 'Yanıtla' : 'Reply' },
                ]}
              />
            )}
            {shouldShowStatusLoading ? (
              <div className="space-y-3" aria-busy="true">
                <SkBox className="h-4 w-full max-w-xl" />
                <SkBox className="h-11 w-48" />
              </div>
            ) : reviewsError && !statusIsReady ? (
              <div className="space-y-3">
                <AlertBanner kind="danger">{reviewsError}</AlertBanner>
                <button
                  type="button"
                  className="bz-btn-ghost min-h-11"
                  onClick={() => activeRestaurantId && loadStatusAndReviews(activeRestaurantId)}
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  {isTr ? 'Tekrar dene' : 'Try again'}
                </button>
              </div>
            ) : status && !status.connected && replyAvailability !== 'available' ? (
              // Platform level (Google has not opened reply access for Buaze, or
              // the operator switched sign-in off): NO connect button. It would
              // only send the owner through a full Google sign-in into a dead end.
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Badge kind="warn" dot={false}>
                  {ownerGoogleMessage(
                    replyAvailability === 'coming_soon' ? 'reply_badge_coming_soon' : 'reply_badge_unavailable',
                    locale,
                  )}
                </Badge>
                <p className="text-[13px] leading-[1.6] text-[#525252]">
                  {ownerGoogleMessage(
                    replyAvailability === 'coming_soon' ? 'reply_coming_soon' : 'reply_unavailable',
                    locale,
                  )}
                </p>
              </div>
            ) : status && !status.googleReviewManagementEnabled ? (
              // Admin master switch off (Restaurant.googleReviewManagementEnabled,
              // CLAUDE.md §5.1 / §5.2). The Google review link used by QR
              // redirects and the Places profile above are independent of it.
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] leading-[1.6] text-[#525252]">
                  {ownerGoogleMessage('reply_plan_off', locale)}
                </p>
                <a
                  href="mailto:support@buaze.com"
                  className="bz-btn-ghost min-h-11 w-full sm:w-auto"
                >
                  {ownerGoogleMessage('reply_plan_off_cta', locale)}
                </a>
              </div>
            ) : status && !status.connected && !status.oauthConfigured ? (
              // Google sign-in is not configured on this deployment.
              <p className="text-[13px] leading-[1.6] text-[#525252]">
                {ownerGoogleMessage('reply_feature_off', locale)}
              </p>
            ) : !status?.connected ? (
              // Not connected, reply access available: the one sign-in button.
              <div className="space-y-3">
                {connectError && (
                  <AlertBanner kind="danger" onDismiss={() => setConnectError(null)} className={BANNER_TOUCH_CLS}>
                    {connectError}
                  </AlertBanner>
                )}
                <div className="grid gap-4 rounded-[24px] border border-pn-line bg-pn-canvas p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="space-y-3">
                    <p className="text-[14px] leading-[1.6] text-[#262626]">
                      {ownerGoogleMessage('reply_connect_hint', locale)}
                    </p>
                    <ul className="grid gap-2 text-[13px] text-[#525252] sm:grid-cols-3">
                      {(isTr
                        ? ['Tüm Google yorumların tek listede', 'Yorumun dilinde AI taslağı', '4-5★ yorumlara onaylı toplu yanıt']
                        : ['Every Google review in one list', 'AI drafts in the review language', 'Approved bulk replies for 4–5★']
                      ).map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <CheckCircle2 size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-[#65A30D]" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={connectGoogleInline}
                    disabled={connecting}
                    className="bz-btn-primary min-h-11 w-full shrink-0 md:w-auto"
                  >
                    {connecting ? (
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <ExternalLink size={16} aria-hidden="true" />
                    )}
                    {isTr ? 'Google hesabını bağla' : 'Connect Google account'}
                  </button>
                </div>
              </div>
            ) : !status?.selectedLocation ? (
        // STEP 2 — Google bağlı ama location seçilmedi. Inline location list.
        <div className="space-y-4">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] bg-pn-accent-soft">
              <MapPin size={20} strokeWidth={2} className="text-pn-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-medium text-pn-ink">
                {isTr ? 'Konumunuzu seçin' : 'Select your location'}
              </h3>
              <p className="text-[13px] text-[#525252] mt-1 leading-relaxed">
                {isTr
                  ? 'Google hesabınız bağlandı. Yorumları çekmek istediğiniz İşletme Profili konumunu seçin.'
                  : 'Your Google account is connected. Pick the Business Profile location to load reviews from.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadInlineLocations(true, { resetAutoRetry: true })}
              disabled={loadingLocations || (locationRetryAfter !== null && locationRetryAfter > 0)}
              className="bz-btn-ghost min-h-11 shrink-0 inline-flex items-center gap-1.5 rounded-full text-[13px]"
              aria-label={isTr ? 'Konumları yenile' : 'Refresh locations'}
              title={
                inlineLocationsSyncedAt
                  ? `${isTr ? 'Son senkron' : 'Last sync'}: ${(() => {
                      const ts = Date.parse(inlineLocationsSyncedAt);
                      if (!Number.isFinite(ts)) return inlineLocationsSyncedAt;
                      const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
                      if (diffSec < 60) return isTr ? 'az önce' : 'just now';
                      const min = Math.floor(diffSec / 60);
                      if (min < 60) return isTr ? `${min} dk önce` : `${min} min ago`;
                      const hr = Math.floor(min / 60);
                      if (hr < 24) return isTr ? `${hr} sa önce` : `${hr} h ago`;
                      return isTr ? `${Math.floor(hr / 24)} gün önce` : `${Math.floor(hr / 24)}d ago`;
                    })()}`
                  : undefined
              }
            >
              {loadingLocations ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {locationRetryAfter !== null && locationRetryAfter > 0
                ? `${locationRetryAfter}s`
                : isTr
                  ? 'Yenile'
                  : 'Refresh'}
            </button>
          </div>

          {locationError && (
            <div className="space-y-2">
              <AlertBanner kind="danger" onDismiss={() => setLocationError(null)} className={BANNER_TOUCH_CLS}>
                {locationError}
              </AlertBanner>
              {needsReconnect && (
                <button
                  type="button"
                  onClick={connectGoogleInline}
                  disabled={connecting}
                  className="bz-btn-primary min-h-11 inline-flex items-center gap-2 rounded-full text-[13px]"
                >
                  {connecting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  {isTr ? 'Yeniden bağla' : 'Reconnect'}
                </button>
              )}
            </div>
          )}
          {locationNotice && !locationError && (
            <div className="space-y-2">
              {/* Google has not opened reply access for Buaze yet: a neutral,
                  permanent state the owner cannot fix, so `info`. A busy Google
                  stays a `warn`. */}
              <AlertBanner
                kind={apiNotProvisioned ? 'info' : 'warn'}
                onDismiss={() => setLocationNotice(null)}
                className={BANNER_TOUCH_CLS}
              >
                {locationNotice}
              </AlertBanner>
              {/* §38.208 — Sarı banner görünüyor + accounts boş ise direkt
                  sandwich hint kart. Eski koşul `hasAutoRetried` kullanıcıyı
                  60 sn countdown beklemeye zorluyordu — sayfa yeni açıldı
                  ve sarı banner var ise henüz auto-retry tetiklenmedi →
                  sandwich kart görünmüyordu. Şimdi: sarı banner görünür
                  görmez "Farklı hesapla bağlan" alternatif aksiyon kartı
                  beraberinde görünür. Owner countdown'u beklemek zorunda
                  değil. (CLAUDE.md §5.1.1 quota proje-geneli, 1 req/dk,
                  tüm Buaze kullanıcıları paylaşır — bekleme bazen yetmez,
                  alternative hesap önerisi her durumda anlamlı.)

                  §38.231 — quota=0 (provision edilmemiş) KALICI durumda
                  bu "farklı hesapla bağlan" kartı GİZLENİR: quota
                  proje-geneli olduğu için hesap değiştirmek çözmez,
                  owner'ı boşuna uğraştırır. Backend'in net sarı banner
                  mesajı (apiNotProvisioned) yeterli. */}
              {inlineAccounts.length === 0 && !apiNotProvisioned && (
                <div className="rounded-[20px] bg-white border border-[#FDE68A] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Sparkles size={14} className="shrink-0 text-[#92400E] mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-pn-ink leading-relaxed">
                        {isTr
                          ? 'İşletme Profili genelde Buaze\'ye kayıt olduğunuz Google hesabından farklı bir hesapta olur. Hesaplarınızı göremiyorsanız farklı bir Google hesabıyla bağlanmayı deneyebilirsiniz.'
                          : 'Your Google Business Profile is often under a different Google account than the one you signed up with. If you do not see your accounts, you can connect with a different Google account.'}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetch('/api/integrations/google/disconnect', { method: 'POST' });
                          } catch {
                            // best-effort
                          }
                          // §38.211 — Auto-retry state'leri kaldırıldı.
                          setHasAttemptedSameAccount(false);
                          await connectGoogleInline();
                        }}
                        disabled={connecting}
                        className="bz-btn-primary min-h-11 inline-flex items-center gap-1.5 text-[13px] rounded-full mt-2"
                      >
                        {connecting ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
                        {isTr ? 'Farklı Google hesabıyla bağlan' : 'Switch Google account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingLocations && inlineLocations.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 size={24} className="animate-spin text-[#A3A3A3] mx-auto" />
              <p className="text-[13px] text-[#737373] mt-2">
                {isTr ? 'Konumlar yükleniyor…' : 'Loading locations…'}
              </p>
            </div>
          ) : !loadingLocations && !locationError && accountsLoaded && inlineAccounts.length === 0 && inlineLocationsSource !== 'empty' && (locationRetryAfter === null || locationRetryAfter === 0) ? (
            // No-account state — Google ile login oldu ama Business Profile yok.
            //
            // §38.205 — `inlineLocationsSource !== 'empty'` + countdown=0 guard
            // false-positive'ı önler (quota dolu + cache empty → mesaj gösterme).
            //
            // §38.206 — Gerçek dünya gözlemi (CLAUDE.md §38.206 closure log):
            // kullanıcılar Buaze'ye kişisel Google ile kayıt oluyor ama
            // Google Business Profile **farklı** Google hesabında. CTA
            // hierarchy bu gözleme göre kurgulandı:
            //
            //   1. PRIMARY (lime, default vurgu): "Farklı Google hesabıyla
            //      bağlan" — owner gerçek niyeti (Business Profile başka
            //      hesapta).
            //   2. SECONDARY (ghost, smart fallback): "Bu hesapla devam et"
            //      — owner emin ise force refresh dener; hâlâ boş ise
            //      `hasAttemptedSameAccount` flag set + buton disabled
            //      + warning text + Primary CTA'ya yönlendirir.
            //   3. TERTIARY (ghost, son çare): "Yeni profil oluştur" —
            //      gerçekten Business Profile yoksa Google'a yönlendirir.
            <div className="py-6 px-4 rounded-[24px] bg-pn-accent-soft/40 border border-pn-accent/50">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-pn-accent ">
                  <Building2 size={20} strokeWidth={2} className="text-pn-ink" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="bz-h-tight text-[15px] text-pn-ink">
                    {isTr
                      ? 'İşletme Profili muhtemelen farklı bir Google hesabında'
                      : 'Your Business Profile is likely under a different Google account'}
                  </p>
                  <p className="text-[13px] text-[#525252] mt-1.5 leading-relaxed">
                    {isTr
                      ? 'Genelde Buaze\'ye kayıt olduğunuz Google hesabı (kişisel e-postanız) ile Google İşletme Profili\'nin bağlı olduğu Google hesabı farklı olur. İşletmenizin Google yorumlarını yanıtlamak için doğru hesabı seçin.'
                      : 'Most people sign up to Buaze with their personal Google account, but their Google Business Profile is linked to a different Google account (often a business email). To manage your Google reviews, please pick the right account.'}
                  </p>
                  {hasAttemptedSameAccount && (
                    <div className="mt-3 flex items-start gap-2 rounded-[20px] bg-white border border-[#FDE68A] px-3 py-2.5">
                      <Sparkles size={13} className="shrink-0 text-[#92400E] mt-0.5" />
                      <p className="text-[12px] text-[#92400E] leading-relaxed">
                        {isTr
                          ? 'Bu Google hesabında İşletme Profili görünmüyor. "Farklı Google hesabıyla bağlan" diyerek doğru hesabı seçin veya yeni bir profil oluşturun.'
                          : 'This Google account has no Business Profile. Use "Connect with a different Google account" to pick the right one, or create a new profile.'}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        // PRIMARY — Disconnect mevcut Google integration + fresh OAuth.
                        // `prompt=consent select_account` (§38.205 + connect/route.ts)
                        // Google account picker'ını her seferinde tetikler →
                        // owner Business Profile sahibi olduğu hesabı seçer.
                        try {
                          await fetch('/api/integrations/google/disconnect', { method: 'POST' });
                        } catch {
                          // best-effort — connect yine yapılır
                        }
                        setHasAttemptedSameAccount(false);
                        await connectGoogleInline();
                      }}
                      disabled={connecting}
                      className="bz-btn-primary min-h-11 inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      {connecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                      {isTr ? 'Farklı Google hesabıyla bağlan' : 'Connect with a different Google account'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // SECONDARY — Owner "Hayır, kayıt olduğum hesap doğru"
                        // diyorsa force refresh ile Google API'den fresh
                        // accounts fetch dener. Cache bypass. Manuel trigger
                        // → auto-retry flag'i resetlenir (§38.207).
                        setHasAttemptedSameAccount(true);
                        await loadInlineLocations(true, { resetAutoRetry: true });
                      }}
                      disabled={
                        loadingLocations ||
                        (locationRetryAfter !== null && locationRetryAfter > 0) ||
                        hasAttemptedSameAccount
                      }
                      className="bz-btn-ghost min-h-11 inline-flex items-center gap-1.5 text-[13px] rounded-full"
                      title={
                        hasAttemptedSameAccount
                          ? isTr
                            ? 'Bu hesap denendi, İşletme Profili bulunamadı'
                            : 'This account was tried, no Business Profile found'
                          : undefined
                      }
                    >
                      {loadingLocations && hasAttemptedSameAccount ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {hasAttemptedSameAccount
                        ? (isTr ? 'Denendi — İşletme Profili yok' : 'Tried — no Business Profile')
                        : (isTr ? 'Bu hesapla devam et' : 'Continue with this account')}
                    </button>
                    <a
                      href="https://business.google.com/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bz-btn-ghost min-h-11 inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      <ExternalLink size={13} />
                      {isTr ? 'Yeni profil oluştur' : 'Create new profile'}
                    </a>
                  </div>
                  <div className="mt-4 pt-3 border-t border-pn-accent/30 flex items-start gap-2">
                    <Sparkles size={12} className="shrink-0 text-[#525252] mt-0.5" />
                    <p className="text-[12px] text-[#525252] leading-relaxed">
                      {isTr
                        ? 'İpucu: Google İşletme Profili sahibiyseniz "Farklı Google hesabıyla bağlan"a tıklayın ve işletmenizin kayıtlı olduğu Google hesabını seçin. Hiç profil açmadıysanız "Yeni profil oluştur" ile başlayın; Google posta, telefon veya video doğrulaması isteyebilir.'
                        : 'Tip: If you own a Google Business Profile, click "Connect with a different Google account" and pick the Google account it\'s registered under. If you haven\'t created one yet, start with "Create new profile"; Google may require verification (postcard, phone, or video).'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !loadingLocations && !locationError && accountsLoaded && inlineLocations.length === 0 && inlineLocationsSource !== 'empty' ? (
            // Account exists but no location — owner Business Profile açtı ama
            // henüz konum eklemedi. Distinct mesaj. Pulse lime UX.
            <div className="py-6 px-4 rounded-[24px] bg-pn-accent-soft/40 border border-pn-accent/50">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-pn-accent ">
                  <MapPin size={20} strokeWidth={2} className="text-pn-ink" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="bz-h-tight text-[15px] text-pn-ink">
                    {isTr
                      ? 'Profilinizde henüz konum yok'
                      : 'No location in your profile yet'}
                  </p>
                  <p className="text-[13px] text-[#525252] mt-1.5 leading-relaxed">
                    {isTr
                      ? `${inlineAccounts.length} İşletme Profili hesabınız bağlı, fakat henüz hiç konum (lokasyon) eklenmemiş. Google'da işletme konumu açıp doğruladıktan sonra burada görünecek.`
                      : `${inlineAccounts.length} Business Profile account connected, but no location has been added yet. Add and verify a location on Google to see it here.`}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a
                      href="https://business.google.com/locations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bz-btn-primary min-h-11 inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      <ExternalLink size={13} />
                      {isTr ? 'Google\'da konum ekle' : 'Add location on Google'}
                    </a>
                    <button
                      type="button"
                      onClick={() => loadInlineLocations(true, { resetAutoRetry: true })}
                      disabled={loadingLocations || (locationRetryAfter !== null && locationRetryAfter > 0)}
                      className="bz-btn-ghost min-h-11 inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      <RefreshCw size={13} />
                      {isTr ? 'Yenile' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {inlineLocationsSyncedAt && (
                <div className="mt-4 text-[12px] text-[#737373]">
                  {isTr ? 'Son senkron' : 'Last sync'}: {(() => {
                    const ts = Date.parse(inlineLocationsSyncedAt);
                    if (!Number.isFinite(ts)) return inlineLocationsSyncedAt;
                    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
                    if (diffSec < 60) return isTr ? 'az önce' : 'just now';
                    const min = Math.floor(diffSec / 60);
                    if (min < 60) return isTr ? `${min} dk önce` : `${min} min ago`;
                    const hr = Math.floor(min / 60);
                    if (hr < 24) return isTr ? `${hr} sa önce` : `${hr} h ago`;
                    return isTr ? `${Math.floor(hr / 24)} gün önce` : `${Math.floor(hr / 24)}d ago`;
                  })()}
                  {inlineLocationsSource === 'cache' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-pn-canvas px-2 py-0.5 text-[12px] text-[#525252]">
                      {isTr ? 'Önbellek' : 'Cached'}
                    </span>
                  )}
                </div>
              )}
              <div className="grid gap-2 mt-2">
                {inlineLocations.map((location) => {
                  const key = `${location.accountName}:${location.locationName}`;
                  const saving = savingLocation === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => selectInlineLocation(location)}
                      disabled={Boolean(savingLocation)}
                      className="group rounded-[20px] border border-pn-line bg-pn-canvas p-3.5 text-left transition hover:border-pn-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-3"
                    >
                      <MapPin size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-[#737373] group-hover:text-pn-ink" />
                      <div className="flex-1 min-w-0">
                        <div className="bz-h-tight text-[14px] truncate">{location.title}</div>
                        {location.address && (
                          <div className="text-[12px] text-[#737373] mt-0.5 truncate">
                            {location.address}
                          </div>
                        )}
                      </div>
                      {saving && <Loader2 size={14} className="animate-spin text-pn-ink shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <GoogleReviewsInbox
            locationLabel={status.selectedLocation.title}
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            locale={isTr ? 'tr' : 'en'}
            canWrite={canWrite !== false}
            aiEnabled={Boolean(status.googleAiEnabled)}
            profileSlot={profileSlot}
            onDisconnect={disconnectGoogle}
            onConnectionProblem={() => setConnectionProblem(true)}
            initialPage={initialData?.inbox ?? null}
          />
        </div>
            )}
          </ReplySection>
      {disconnectDialog}
    </>
  );
}
