// CLAUDE.md §X — Reputation OS Suite (health score + recommendations).
//
// Pure functions, DB / Google API agnostic. Caller fetches metrics and
// passes the snapshot to these helpers. Test-friendly (no I/O).
//
// Health score (0-100) is a composite of three pillars:
//   - Profile completeness     (0-100) — Google profile + media count
//   - Responsiveness           (0-100) — % feedback + Q&A replied
//   - Reputation               (0-100) — Google rating × review count weight
//
// We deliberately avoid AI sentiment / Vision API analysis — deterministic
// rules are cheaper, predictable, and KVKK-safe (no PII fed to vendors).

import type { Locale } from '../translations';

export interface HealthSnapshotInput {
  // Google Business Profile metrics
  googleRating: number | null; // 0-5
  googleReviewCount: number | null;
  googleMediaCount: number | null;
  googleUnansweredQs: number | null;
  profileComplete: number | null; // 0-100 — title + address + categories
  // Feedback panel metrics (internal Buaze data)
  feedbackTotal: number | null;
  feedbackAvgRating: number | null; // 1-5
  feedbackLowRated: number | null; // 1-3★ count
  feedbackReplied: number | null;
}

export interface HealthScoreBreakdown {
  profile: number; // 0-100
  responsiveness: number; // 0-100
  reputation: number; // 0-100
  overall: number; // 0-100, weighted composite
}

const CLAMP_0_100 = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Composite 0-100 health score from snapshot metrics.
 *
 * Weights chosen so a brand-new restaurant (no reviews, no feedback) lands
 * around 30-40 (room to grow) rather than 0 (depressing) or 100 (misleading).
 * As real data accumulates, weights shift toward actual performance.
 */
export function computeHealthScore(snapshot: HealthSnapshotInput): HealthScoreBreakdown {
  // ─── 1. Profile completeness (40% weight) ──────────────────────────────
  // Google Business Profile dolu mu + medya yeterli mi?
  const profileBase = snapshot.profileComplete ?? 0; // 0-100
  const mediaScore =
    snapshot.googleMediaCount == null
      ? 50 // unknown → orta seviye, kullanıcı görmedi sayma
      : snapshot.googleMediaCount >= 10
        ? 100
        : snapshot.googleMediaCount >= 4
          ? 70
          : snapshot.googleMediaCount >= 1
            ? 40
            : 0;
  const profile = CLAMP_0_100(profileBase * 0.6 + mediaScore * 0.4);

  // ─── 2. Responsiveness (30% weight) ────────────────────────────────────
  // Feedback'lere yanıt verme oranı + Google'da cevapsız soru yok mu?
  const feedbackResponsiveness =
    snapshot.feedbackTotal && snapshot.feedbackTotal > 0
      ? ((snapshot.feedbackReplied ?? 0) / snapshot.feedbackTotal) * 100
      : 50; // henüz feedback yok → neutral
  const questionsScore =
    snapshot.googleUnansweredQs == null
      ? 80 // Q&A API kapalıysa optimistic varsay
      : snapshot.googleUnansweredQs === 0
        ? 100
        : snapshot.googleUnansweredQs <= 2
          ? 70
          : snapshot.googleUnansweredQs <= 5
            ? 40
            : 10;
  const responsiveness = CLAMP_0_100(feedbackResponsiveness * 0.6 + questionsScore * 0.4);

  // ─── 3. Reputation (30% weight) ────────────────────────────────────────
  // Google ratingi + feedback ratingi karışımı. Az review/feedback varsa
  // güveni az → çekingen score.
  const googleConfidence =
    snapshot.googleReviewCount == null
      ? 0
      : snapshot.googleReviewCount >= 50
        ? 1
        : snapshot.googleReviewCount >= 10
          ? 0.7
          : snapshot.googleReviewCount >= 3
            ? 0.4
            : 0.1;
  const googleScore = snapshot.googleRating != null ? (snapshot.googleRating / 5) * 100 : 0;
  const feedbackConfidence =
    snapshot.feedbackTotal == null
      ? 0
      : snapshot.feedbackTotal >= 30
        ? 1
        : snapshot.feedbackTotal >= 10
          ? 0.7
          : snapshot.feedbackTotal >= 3
            ? 0.4
            : 0.1;
  const feedbackScore = snapshot.feedbackAvgRating != null ? (snapshot.feedbackAvgRating / 5) * 100 : 0;
  const totalConfidence = googleConfidence + feedbackConfidence;
  const reputation =
    totalConfidence === 0
      ? 35 // henüz veri yok → "büyümeye açık" neutral
      : CLAMP_0_100(
          (googleScore * googleConfidence + feedbackScore * feedbackConfidence) / totalConfidence,
        );

  // ─── Overall (weighted average) ────────────────────────────────────────
  const overall = CLAMP_0_100(profile * 0.4 + responsiveness * 0.3 + reputation * 0.3);

  return { profile, responsiveness, reputation, overall };
}

// ─── Deterministic profile recommendations ─────────────────────────────────
//
// Deterministik kurallar (KVKK güvenli, Vision API yok). Metinlerde Google'ın
// sıralamasına / güvenine dair doğrulanamaz iddia veya uydurma sayı YOK (§35.8).
// Her öneri "priority" sıralı — UI top 3-5 öner.

export type RecommendationSeverity = 'critical' | 'warn' | 'tip';

export interface ProfileRecommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  body: string;
  // Optional CTA — UI surface'ta link veya buton render eder.
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Deterministik öneri generator. Metric'ler null ise o öneri atlanır
 * (sessiz kalır, "veri yok" mesajıyla rahatsız etmez). Sıralama priority:
 * critical → warn → tip. Caller en fazla 5 öner.
 */
export function getProfileRecommendations(
  snapshot: HealthSnapshotInput,
  locale: Locale = 'tr',
): ProfileRecommendation[] {
  const isTr = locale !== 'en';
  const recs: ProfileRecommendation[] = [];

  // CRITICAL — profil temel eksik
  if ((snapshot.profileComplete ?? 100) < 60) {
    recs.push({
      id: 'profile_incomplete',
      severity: 'critical',
      title: isTr ? 'Profilini tamamla' : 'Complete your profile',
      body: isTr
        ? 'Profilindeki temel bilgiler (ad, adres, kategori, çalışma saatleri, telefon) eksiksiz olduğunda müşteriler sana doğrudan ulaşabilir.'
        : 'Customers can reach you directly when the basics on your profile (name, address, category, hours, phone) are complete.',
      ctaLabel: isTr ? 'Google\'da düzenle' : 'Edit on Google',
      ctaHref: 'https://business.google.com/locations',
    });
  }

  // CRITICAL — sıfır fotoğraf
  if (snapshot.googleMediaCount === 0) {
    recs.push({
      id: 'no_photos',
      severity: 'critical',
      title: isTr ? 'İlk fotoğraflarını yükle' : 'Add your first photos',
      body: isTr
        ? 'Henüz fotoğraf yok. En az 4 fotoğraf ekle: dış cephe, iç mekan, ürün/hizmet, ekip.'
        : 'No photos yet. Add at least 4 photos: exterior, interior, product/service, team.',
      ctaLabel: isTr ? 'Fotoğraf ekle' : 'Add photos',
      ctaHref: 'https://business.google.com/locations',
    });
  }

  // WARN — az fotoğraf
  if (snapshot.googleMediaCount != null && snapshot.googleMediaCount > 0 && snapshot.googleMediaCount < 4) {
    recs.push({
      id: 'few_photos',
      severity: 'warn',
      title: isTr ? `Fotoğraf sayını artır (${snapshot.googleMediaCount}/4+)` : `Add more photos (${snapshot.googleMediaCount}/4+)`,
      body: isTr
        ? 'Müşteriler mekanı fotoğraflardan tanır. En az 4 fotoğraf öneriyoruz: dış mekan, iç mekan, en sevilen 2 ürün/hizmet, bir müşteri anı.'
        : 'Customers get to know a place from its photos. We suggest at least 4: exterior, interior, your 2 favourite products/services, a customer moment.',
      ctaLabel: isTr ? 'Fotoğraf ekle' : 'Add photos',
      ctaHref: 'https://business.google.com/locations',
    });
  }

  // WARN — yanıtsız sorular
  if (snapshot.googleUnansweredQs != null && snapshot.googleUnansweredQs > 0) {
    recs.push({
      id: 'unanswered_questions',
      severity: 'warn',
      title: isTr
        ? `${snapshot.googleUnansweredQs} soru yanıt bekliyor`
        : `${snapshot.googleUnansweredQs} question${snapshot.googleUnansweredQs > 1 ? 's' : ''} awaiting reply`,
      body: isTr
        ? 'Google\'daki soru bölümünde yanıtsız sorular var. Hızlı yanıt, müşterinin merak ettiği şeyi öğrenmesini sağlar.'
        : 'There are unanswered questions in your Google Q&A. A quick answer lets customers find out what they wanted to know.',
      ctaLabel: isTr ? 'Sorulara git' : 'Open Q&A',
      ctaHref: 'https://business.google.com/locations',
    });
  }

  // WARN — yanıt oranı düşük
  if (
    snapshot.feedbackTotal != null &&
    snapshot.feedbackTotal > 0 &&
    snapshot.feedbackReplied != null
  ) {
    const replyRate = (snapshot.feedbackReplied / snapshot.feedbackTotal) * 100;
    if (replyRate < 60) {
      recs.push({
        id: 'low_reply_rate',
        severity: 'warn',
        title: isTr
          ? `Yanıt oranın düşük: %${Math.round(replyRate)}`
          : `Low reply rate: ${Math.round(replyRate)}%`,
        body: isTr
          ? 'Müşteri geri bildirimlerinin %60\'ından fazlasını yanıtlamak sadakati artırır. Pulse AI taslakları bu işi hızlandırır.'
          : 'Replying to more than 60% of customer feedback builds loyalty. Pulse AI drafts speed this up.',
        ctaLabel: isTr ? 'Yorumlara git' : 'Open reviews',
      });
    }
  }

  // WARN — az Google review
  if (snapshot.googleReviewCount != null && snapshot.googleReviewCount < 10) {
    recs.push({
      id: 'few_google_reviews',
      severity: 'warn',
      title: isTr
        ? `Sadece ${snapshot.googleReviewCount} Google yorumu`
        : `Only ${snapshot.googleReviewCount} Google reviews`,
      body: isTr
        ? 'Yorum sayın az. QR kod, müşterilerin yorum bırakmasını kolaylaştırır.'
        : 'You have few reviews. A QR code makes it easy for customers to leave one.',
      ctaLabel: isTr ? 'QR oluştur' : 'Create QR',
      ctaHref: '/dashboard/qr',
    });
  }

  // TIP — pluck-low-rating sayısı yüksek
  if (
    snapshot.feedbackTotal != null &&
    snapshot.feedbackLowRated != null &&
    snapshot.feedbackTotal >= 10
  ) {
    const lowRate = (snapshot.feedbackLowRated / snapshot.feedbackTotal) * 100;
    if (lowRate > 25) {
      recs.push({
        id: 'high_low_rating_rate',
        severity: 'tip',
        title: isTr ? 'Düşük puan oranı yüksek' : 'Elevated low-rating ratio',
        body: isTr
          ? `Son geri bildirimlerin %${Math.round(lowRate)}'u 1-3★. Tema analizi (hangi konu en sık) yapmak ve hedeflenmiş operasyon iyileştirmesi planlamak için Buaze Analytics sayfasına bak.`
          : `${Math.round(lowRate)}% of recent feedback is 1-3★. Use Buaze Analytics to surface the top themes and plan targeted operational fixes.`,
        ctaLabel: isTr ? 'Analitiklere git' : 'Open analytics',
        ctaHref: '/dashboard/analytics',
      });
    }
  }

  // TIP — Pulse AI kapalı (caller bu bilgiyi ayrı sağlar; burada metric'ten
  // türetemiyoruz, snapshot'ta enableAiDraft yok. Caller ister opsiyonel
  // olarak ekleyebilir — şimdilik atla.)

  return recs;
}

// ─── Format helpers (UI side) ──────────────────────────────────────────────

/**
 * Tek skoru "Çok iyi / İyi / Orta / Geliştirilmeli" gibi label'a çevir.
 */
export function scoreLabel(score: number, locale: Locale = 'tr'): string {
  const isTr = locale !== 'en';
  if (score >= 85) return isTr ? 'Çok iyi' : 'Excellent';
  if (score >= 70) return isTr ? 'İyi' : 'Good';
  if (score >= 50) return isTr ? 'Orta' : 'Fair';
  if (score >= 30) return isTr ? 'Geliştirilmeli' : 'Needs work';
  return isTr ? 'Kritik' : 'Critical';
}

/**
 * Skor delta için renkli "yön" işareti.
 */
export function scoreDeltaSign(delta: number): { sign: '+' | '-' | '='; color: 'positive' | 'negative' | 'neutral' } {
  if (delta > 1) return { sign: '+', color: 'positive' };
  if (delta < -1) return { sign: '-', color: 'negative' };
  return { sign: '=', color: 'neutral' };
}
