// Phase 8c+ §38.32 — Owner dashboard "BUGÜN BEKLEYEN" task list helper.
// Tasarım kaynağı: .design-owner-2026/project/page-dashboard.jsx line 250-280.
//
// Kullanıcı kararı (CLAUDE.md §38.32): tasarımdaki 4 task tipinden 3'ü
// implement edildi:
//   - reply       (yorum yanıtsız)        → Acil
//   - platform    (Google sync hatası)    → Orta — sadece Google
//                                             (Yemeksepeti/Getir/Trendyol
//                                             public API yok, anlamlı sync
//                                             check imkansız)
//   - reminder    (kayıp müşteri churn)   → Düşük
// `campaign` task tipi schema'da Campaign tablosu yok ve kullanıcı kararı
// "scope dışı, sil" → eklenmedi.
//
// Saf fonksiyon — DB çağrısı yok, caller helper'a hazır row'ları geçirir.
// Test edilebilir, sort/severity ranking deterministik.

export type TaskType = 'reply' | 'platform' | 'reminder';
export type TaskSeverity = 'high' | 'medium' | 'low';

/** Stable severity ranking — UI sort key. */
const SEVERITY_RANK: Record<TaskSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface DashboardTask {
  /** Stable React key; type-prefixed (örn. "reply:abc123" / "platform:google"). */
  id: string;
  type: TaskType;
  severity: TaskSeverity;
  /** "12 yorum yanıtsız" | "Google bağlantı sorunu" | "8 müşteri 30 gündür geri gelmedi". */
  title: string;
  /** Sağda mute renk inline meta (örn. "en eski 2 saat önce"); opsiyonel. */
  meta?: string;
  /** Tıklanabilir deep link. */
  href: string;
}

// ---- Input shapes ----

export interface UnrepliedFeedbackInput {
  /** Yanıt bekleyen feedback toplam sayısı (sadece rating ≤3 + replies.none). */
  count: number;
  /** En eski yanıtlanmamış yorumun tarihi (relative time için). */
  oldestUnrepliedAt: Date | null;
}

export interface GooglePlatformCheckInput {
  /** Son 24 saat içinde Google PlatformLinkCheck.ok=false varsa true. */
  failing: boolean;
  /** Son fail check tarihi (UI relative time için). */
  lastCheckedAt: Date | null;
}

export interface ChurnedCustomerInput {
  /** Son 30 gün içinde yorum bırakmamış ama daha önce ≥2 visit yapmış müşteri sayısı. */
  count: number;
}

export interface BuildPendingTasksInput {
  unrepliedFeedbacks: UnrepliedFeedbackInput;
  googlePlatformCheck: GooglePlatformCheckInput;
  churnedCustomers: ChurnedCustomerInput;
  /** Default 4 — UI render limit (tasarım line 257 "4 görev"). */
  limit?: number;
  isTr?: boolean;
}

// ---- Locale strings ----

const COPY = {
  tr: {
    // Urgency is shown by the badge next to each task, so the meta line
    // does not repeat "Acil / Orta / Düşük".
    replyTitle: (n: number) => `${n} geri bildirim yanıtsız`,
    replyMeta: (when: string) => `en eski ${when}`,
    replyMetaNoTime: 'Yanıt bekliyor',
    platformTitle: 'Google bağlantı sorunu',
    platformMeta: (when: string) => when,
    platformMetaNow: 'az önce',
    reminderTitle: (n: number) => `${n} müşteri 30 gündür geri gelmedi`,
    reminderMeta: 'Geri kazanma fırsatı',
  },
  en: {
    replyTitle: (n: number) => `${n} reviews awaiting reply`,
    replyMeta: (when: string) => `oldest ${when}`,
    replyMetaNoTime: 'Reply pending',
    platformTitle: 'Google connection problem',
    platformMeta: (when: string) => when,
    platformMetaNow: 'just now',
    reminderTitle: (n: number) => `${n} customers haven't returned in 30 days`,
    reminderMeta: 'Win-back opportunity',
  },
} as const;

// ---- Relative time (lightweight; full date-fns import çok ağır) ----
// Helper saf kalır — formatDistanceToNowStrict çağrısı caller-side yapılabilir,
// ama test'te deterministik olsun diye burada inline. Locale-aware kısa format.

function formatRelative(date: Date | null, now: Date, isTr: boolean): string {
  if (!date) return isTr ? 'bilinmiyor' : 'unknown';
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return isTr ? 'az önce' : 'just now';
  if (diffMin < 60) return isTr ? `${diffMin} dk önce` : `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return isTr ? `${diffH} sa önce` : `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return isTr ? `${diffD} gün önce` : `${diffD}d ago`;
}

// ---- Public helper ----

export function buildPendingTasks({
  unrepliedFeedbacks,
  googlePlatformCheck,
  churnedCustomers,
  limit = 4,
  isTr = true,
}: BuildPendingTasksInput): DashboardTask[] {
  const c = COPY[isTr ? 'tr' : 'en'];
  const now = new Date();
  const tasks: DashboardTask[] = [];
  // §38.64 — Locale prefix href fix: dashboard `[locale]` segment route'ı
  // gerektirdiğinden link'lerde TR/EN prefix zorunlu (önceden eksikti, root
  // `/dashboard/...` 404 riski). ActivityFeed (§38.31) viewAllHref aynı
  // paterni kullanır.
  const lp = isTr ? '/tr' : '/en';

  // 1. reply task — yanıtlanmamış low-rating yorumlar (Acil)
  if (unrepliedFeedbacks.count > 0) {
    const oldestRel = unrepliedFeedbacks.oldestUnrepliedAt
      ? formatRelative(unrepliedFeedbacks.oldestUnrepliedAt, now, isTr)
      : null;
    tasks.push({
      id: 'reply:unreplied',
      type: 'reply',
      severity: 'high',
      title: c.replyTitle(unrepliedFeedbacks.count),
      meta: oldestRel ? c.replyMeta(oldestRel) : c.replyMetaNoTime,
      // Low ratings, unreplied only — the inbox's real URL filters (the old
      // `tab=unreplied` was a legacy client tab that matched no toolbar tab).
      href: `${lp}/dashboard/feedbacks?tab=low&hasReply=pending`,
    });
  }

  // 2. platform task — Google sync error (sadece Google API entegrasyonu var;
  // Yemeksepeti/Getir/Trendyol public API yok, anlamlı sync check imkansız)
  if (googlePlatformCheck.failing) {
    const checkedRel = googlePlatformCheck.lastCheckedAt
      ? formatRelative(googlePlatformCheck.lastCheckedAt, now, isTr)
      : null;
    tasks.push({
      id: 'platform:google',
      type: 'platform',
      severity: 'medium',
      title: c.platformTitle,
      meta: checkedRel ? c.platformMeta(checkedRel) : c.platformMetaNow,
      href: `${lp}/dashboard/google-reviews`,
    });
  }

  // 3. reminder task — kayıp müşteri (Düşük)
  if (churnedCustomers.count > 0) {
    tasks.push({
      id: 'reminder:churned',
      type: 'reminder',
      severity: 'low',
      title: c.reminderTitle(churnedCustomers.count),
      meta: c.reminderMeta,
      href: `${lp}/dashboard/customers?segment=loyal`,
    });
  }

  // Severity desc → high → medium → low; aynı severity'de stable order
  // (insertion order korunur).
  tasks.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return tasks.slice(0, limit);
}
