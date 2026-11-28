// Client-side types, API calls and messages for the loyalty page (§60).
import type { LoyaltyKind, LoyaltyTier } from '@/lib/loyalty';

import type { LoyaltyPortal } from '@/lib/loyalty-portal';

export interface ProgramDto {
  id: string;
  restaurantId: string;
  slug: string;
  name: string;
  kind: LoyaltyKind;
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  welcomeBonus: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: string | null;
  tiers: LoyaltyTier[];
  accentColor: string | null;
  terms: string | null;
  template: string | null;
  isActive: boolean;
  /** The business's customer panel (§61). */
  portal: LoyaltyPortal;
  /** Win-back e-mail (§61). */
  winbackEnabled: boolean;
  winbackDays: number;
  winbackMessage: string | null;
  winbackConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rewards: Array<{ id: string; title: string; description: string | null; cost: number; isActive: boolean; sortOrder: number }>;
}

export interface StatsDto {
  members: number;
  newMembers30: number;
  activeMembers30: number;
  visits30: number;
  rewards30: number;
  returningMembers: number;
  visitedMembers: number;
  rewardReady: number;
  daily: Array<{ day: string; visits: number }>;
}

export interface AccessDto {
  read: boolean;
  operate: boolean;
  manage: boolean;
}

export interface MemberDto {
  id: string;
  code: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  /** Card is kept in a Buaze customer account (§61). */
  hasAccount: boolean;
  /** Whole phone / e-mail: only for managers (null for staff and viewers). */
  phone: string | null;
  email: string | null;
  /** "+90 532 *** ** 67" — always present. */
  phoneMasked: string;
  hasEmail: boolean;
  birthMonth: number | null;
  birthDay: number | null;
  marketingConsent: boolean;
  balance: number;
  lifetimeEarned: number;
  visits: number;
  rewardsRedeemed: number;
  lastVisitAt: string | null;
  lastBirthdayRewardYear: number | null;
  joinedVia: string;
  createdAt: string;
}

export interface EventDto {
  id: string;
  type: string;
  amount: number;
  visit: boolean;
  spend: number | null;
  rewardTitle: string | null;
  note: string | null;
  createdAt: string;
}

export interface ProgramDraft {
  name: string;
  kind: LoyaltyKind;
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  welcomeBonus: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: string;
  tiers: LoyaltyTier[];
  accentColor: string | null;
  terms: string;
  template: string | null;
  isActive: boolean;
  rewards: Array<{ id?: string; title: string; description: string; cost: number; isActive: boolean }>;
}

export class LoyaltyApiError extends Error {
  code: string;
  status: number;
  body: Record<string, unknown> | null;
  constructor(code: string, status: number, body: Record<string, unknown> | null) {
    super(code);
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

export async function loyaltyFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const code = (typeof body?.code === 'string' && body.code) || (typeof body?.error === 'string' && body.error) || `HTTP_${res.status}`;
    throw new LoyaltyApiError(code, res.status, body);
  }
  return body as T;
}

const MESSAGES: Record<string, { tr: string; en: string }> = {
  COOLDOWN: { tr: 'Bu kart az önce işlem gördü.', en: 'This card was just used.' },
  NOT_ENOUGH_BALANCE: { tr: 'Bakiye bu ödül için yetmiyor.', en: 'The balance does not cover this reward.' },
  MEMBER_NOT_FOUND: { tr: 'Kart bulunamadı.', en: 'Card not found.' },
  REWARD_NOT_FOUND: { tr: 'Ödül bulunamadı ya da kapalı.', en: 'Reward not found or switched off.' },
  BIRTHDAY_NOT_AVAILABLE: { tr: 'Doğum günü hediyesi şu an verilemez.', en: 'The birthday gift is not available now.' },
  PHONE_EXISTS: { tr: 'Bu telefonla kayıtlı bir kart zaten var.', en: 'A card with this phone already exists.' },
  INVALID_PHONE: { tr: 'Telefon numarasını kontrol edin.', en: 'Check the phone number.' },
  NAME_REQUIRED: { tr: 'Müşterinin adını ya da telefonunu yazın.', en: 'Enter the customer’s name or phone.' },
  INVALID_EMAIL: { tr: 'E-posta adresini kontrol edin.', en: 'Check the e-mail address.' },
  INVALID_BIRTHDAY: { tr: 'Doğum gününü kontrol edin.', en: 'Check the birthday.' },
  CONTENT_BLOCKED: {
    tr: 'Metinde uygunsuz ifade, bağlantı ya da yorum karşılığı ödül çağrışımı var. Düzeltip tekrar deneyin.',
    en: 'The text has offensive words, a link or a reward-for-review hint. Fix it and try again.',
  },
  NO_ACTIVE_REWARD: { tr: 'En az bir açık ödül ekleyin.', en: 'Add at least one active reward.' },
  STAMP_COST_TOO_HIGH: { tr: 'Damga kartında ödül en çok 30 damga olabilir.', en: 'A stamp reward can cost at most 30 stamps.' },
  NO_EARN_RULE: { tr: 'Ziyaret başına ya da harcamaya göre puan tanımlayın.', en: 'Set points per visit or per spend.' },
  WELCOME_BONUS_TOO_HIGH: { tr: 'Hoş geldin hediyesi en çok 5 damga olabilir.', en: 'The welcome bonus can be at most 5 stamps.' },
  LOYALTY_DISABLED: { tr: 'Sadakat kartı bu işletmenin paketinde kapalı.', en: 'The loyalty card is off in this business’s plan.' },
  PROGRAM_PAUSED: { tr: 'Program duraklatılmış. Önce yayına alın.', en: 'The programme is paused. Publish it first.' },
  READ_ONLY: { tr: 'Görüntüleme yetkiniz var, işlem yapamazsınız.', en: 'You have view-only access.' },
  MANAGER_ONLY: { tr: 'Bu işlem için yönetici yetkisi gerekir.', en: 'This needs a manager.' },
  RATE_LIMIT: { tr: 'Çok fazla istek. Biraz bekleyip tekrar deneyin.', en: 'Too many requests. Wait a moment and retry.' },
  INVALID_ADJUST: { tr: 'Düzeltme miktarını kontrol edin.', en: 'Check the correction amount.' },
  validation_error: { tr: 'Alanları kontrol edin.', en: 'Check the fields.' },
  INVALID_IMAGE: { tr: 'Görsel geçersiz. Tekrar yükleyin.', en: 'Invalid image. Upload it again.' },
  IMAGE_TOO_LARGE: { tr: 'Görsel çok büyük (en çok 6 MB).', en: 'The image is too large (max 6 MB).' },
  IMAGE_UNPROCESSABLE: { tr: 'Görsel okunamadı. JPG, PNG ya da WebP deneyin.', en: 'Could not read the image. Try JPG, PNG or WebP.' },
  NO_FILE: { tr: 'Bir görsel seçin.', en: 'Choose an image.' },
  NO_PROGRAM: { tr: 'Önce programı kaydedin.', en: 'Save the programme first.' },
  BRANCH_PROGRAM: { tr: 'Bu işletme bir şube: kart ana işletmeden yönetilir.', en: 'This business is a branch: the card is managed at the home business.' },
  WINBACK_CONFIRM_REQUIRED: {
    tr: 'Geri çağırma mailini açmak için onay kutusunu işaretleyin.',
    en: 'Tick the confirmation to turn the win-back e-mail on.',
  },
};

export function loyaltyMessage(err: unknown, locale: 'tr' | 'en'): string {
  const code = err instanceof LoyaltyApiError ? err.code : null;
  if (code && MESSAGES[code]) {
    if (code === 'COOLDOWN' && err instanceof LoyaltyApiError && typeof err.body?.minutesLeft === 'number') {
      const m = err.body.minutesLeft;
      return locale === 'tr'
        ? `Bu kart az önce işlem gördü (${m} dk sonra tekrar). Yine de eklemek için onaylayın.`
        : `This card was just used (again in ${m} min). Confirm to add anyway.`;
    }
    return MESSAGES[code][locale];
  }
  return locale === 'tr' ? 'İşlem tamamlanamadı. Tekrar deneyin.' : 'Could not complete. Try again.';
}

export function relativeDay(iso: string | null, locale: 'tr' | 'en'): string {
  if (!iso) return locale === 'tr' ? 'Henüz yok' : 'Not yet';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return locale === 'tr' ? 'Az önce' : 'Just now';
  if (min < 60) return locale === 'tr' ? `${min} dk önce` : `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return locale === 'tr' ? `${h} sa önce` : `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return locale === 'tr' ? `${d} gün önce` : `${d} days ago`;
  return new Date(iso).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function eventLabel(e: Pick<EventDto, 'type' | 'rewardTitle' | 'note'>, unit: string, locale: 'tr' | 'en'): string {
  const tr = locale === 'tr';
  switch (e.type) {
    case 'join':
      return tr ? 'Karta katıldı' : 'Joined';
    case 'earn':
      return tr ? `Ziyaret · ${unit} eklendi` : `Visit · ${unit} added`;
    case 'redeem':
      return tr ? `Ödül verildi: ${e.rewardTitle ?? ''}` : `Reward given: ${e.rewardTitle ?? ''}`;
    case 'birthday':
      return tr ? `Doğum günü hediyesi: ${e.rewardTitle ?? ''}` : `Birthday gift: ${e.rewardTitle ?? ''}`;
    case 'expire':
      return tr ? 'Süresi dolan bakiye silindi' : 'Lapsed balance removed';
    case 'adjust':
      return tr ? `Düzeltme${e.note ? `: ${e.note}` : ''}` : `Correction${e.note ? `: ${e.note}` : ''}`;
    default:
      return e.type;
  }
}

export function draftFromProgram(p: ProgramDto): ProgramDraft {
  return {
    name: p.name,
    kind: p.kind,
    pointsPerVisit: p.pointsPerVisit,
    pointsPerSpend: p.pointsPerSpend,
    spendStep: p.spendStep,
    welcomeBonus: p.welcomeBonus,
    visitCooldownMinutes: p.visitCooldownMinutes,
    expiryDays: p.expiryDays,
    birthdayReward: p.birthdayReward ?? '',
    tiers: p.tiers,
    accentColor: p.accentColor,
    terms: p.terms ?? '',
    template: p.template,
    isActive: p.isActive,
    rewards: p.rewards.map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', cost: r.cost, isActive: r.isActive })),
  };
}

export function draftToBody(d: ProgramDraft) {
  return {
    name: d.name.trim(),
    kind: d.kind,
    pointsPerVisit: d.kind === 'points' ? d.pointsPerVisit : 0,
    pointsPerSpend: d.kind === 'points' ? d.pointsPerSpend : 0,
    spendStep: d.kind === 'points' ? d.spendStep : 0,
    welcomeBonus: d.welcomeBonus,
    visitCooldownMinutes: d.visitCooldownMinutes,
    expiryDays: d.expiryDays,
    birthdayReward: d.birthdayReward.trim() || null,
    tiers: d.tiers.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), minVisits: t.minVisits, perk: t.perk.trim() })),
    accentColor: d.accentColor,
    terms: d.terms.trim() || null,
    template: d.template,
    isActive: d.isActive,
    rewards: d.rewards.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      title: r.title.trim(),
      description: r.description.trim() || null,
      cost: r.cost,
      isActive: r.isActive,
    })),
  };
}
