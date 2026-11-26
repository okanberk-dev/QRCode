/**
 * Loyalty card rules (CLAUDE.md §60). Pure and client-safe — no Prisma, no
 * Node APIs — so the panel, the public card page, the API and the tests all
 * share one definition of how stamps / points are earned, when a reward is
 * ready, which tier a customer is in and when a balance lapses.
 *
 * Two kinds of card:
 *  - `stamps`: one visit = 1..10 stamps (e.g. two coffees = 2). A reward
 *    costs N stamps; the card shows as many boxes as the largest reward.
 *  - `points`: a visit earns `pointsPerVisit` plus `pointsPerSpend` for every
 *    `spendStep` TL the staff enters. Rewards cost points.
 *
 * Rewards are never earned for a review or a rating: the review flow knows
 * nothing about the card (Google policy forbids incentives for reviews).
 */
import { resolveDisplayTimeZone } from '@/lib/timezone';

export type LoyaltyKind = 'stamps' | 'points';
export type LoyaltyEventType = 'join' | 'earn' | 'redeem' | 'adjust' | 'expire' | 'birthday';

export const LOYALTY_LIMITS = {
  nameMax: 60,
  termsMax: 1000,
  rewardTitleMax: 60,
  rewardDescriptionMax: 140,
  rewardsMax: 6,
  rewardCostMin: 1,
  stampCostMax: 30,
  pointCostMax: 100_000,
  pointsPerVisitMax: 1000,
  pointsPerSpendMax: 1000,
  spendStepMax: 10_000,
  spendMax: 1_000_000,
  welcomeBonusMaxStamps: 5,
  welcomeBonusMaxPoints: 10_000,
  cooldownMaxMinutes: 24 * 60,
  expiryMinDays: 30,
  expiryMaxDays: 3 * 365,
  birthdayRewardMax: 120,
  tiersMax: 3,
  tierNameMax: 30,
  tierPerkMax: 120,
  tierMinVisitsMax: 1000,
  stampsPerVisitMax: 10,
  adjustMax: 100_000,
  noteMax: 200,
  memberNameMax: 60,
} as const;

export interface LoyaltyTier {
  name: string;
  minVisits: number;
  perk: string;
}

export interface LoyaltyRewardLike {
  id?: string;
  title: string;
  description?: string | null;
  cost: number;
  isActive?: boolean;
}

export interface LoyaltyProgramLike {
  kind: LoyaltyKind | string;
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  welcomeBonus: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: string | null;
  tiers?: unknown;
}

export interface LoyaltyMemberLike {
  balance: number;
  visits: number;
  lastVisitAt: Date | string | null;
  createdAt?: Date | string | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  lastBirthdayRewardYear?: number | null;
}

export function normalizeKind(value: unknown): LoyaltyKind {
  return value === 'points' ? 'points' : 'stamps';
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// ─── tiers ────────────────────────────────────────────────────────────────

/** Reads the stored tiers JSON; never throws. Sorted by minVisits, max 3. */
export function readLoyaltyTiers(value: unknown): LoyaltyTier[] {
  if (!Array.isArray(value)) return [];
  const out: LoyaltyTier[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, LOYALTY_LIMITS.tierNameMax) : '';
    const minVisits = clampInt(r.minVisits, 1, LOYALTY_LIMITS.tierMinVisitsMax, 0);
    const perk = typeof r.perk === 'string' ? r.perk.trim().slice(0, LOYALTY_LIMITS.tierPerkMax) : '';
    if (!name || minVisits < 1) continue;
    if (out.some((t) => t.minVisits === minVisits)) continue;
    out.push({ name, minVisits, perk });
  }
  return out.sort((a, b) => a.minVisits - b.minVisits).slice(0, LOYALTY_LIMITS.tiersMax);
}

/** The highest tier the visit count reaches, or null. */
export function tierFor(visits: number, tiers: LoyaltyTier[]): LoyaltyTier | null {
  let current: LoyaltyTier | null = null;
  for (const t of tiers) if (visits >= t.minVisits) current = t;
  return current;
}

/** The next tier and how many visits it still needs, or null at the top. */
export function nextTier(visits: number, tiers: LoyaltyTier[]): { tier: LoyaltyTier; visitsLeft: number } | null {
  const t = tiers.find((x) => x.minVisits > visits);
  return t ? { tier: t, visitsLeft: t.minVisits - visits } : null;
}

// ─── rewards ──────────────────────────────────────────────────────────────

export function activeRewards<T extends LoyaltyRewardLike>(rewards: T[]): T[] {
  return rewards.filter((r) => r.isActive !== false && r.cost >= 1).sort((a, b) => a.cost - b.cost);
}

/** Rewards the balance already covers (cheapest first). */
export function redeemableRewards<T extends LoyaltyRewardLike>(balance: number, rewards: T[]): T[] {
  return activeRewards(rewards).filter((r) => r.cost <= balance);
}

/** The cheapest reward the balance does not cover yet, with what is missing. */
export function nextReward<T extends LoyaltyRewardLike>(
  balance: number,
  rewards: T[],
): { reward: T; remaining: number } | null {
  const r = activeRewards(rewards).find((x) => x.cost > balance);
  return r ? { reward: r, remaining: r.cost - balance } : null;
}

/** Number of stamp boxes on the card: the largest active reward (1..30). */
export function stampCardSize(rewards: LoyaltyRewardLike[]): number {
  const costs = activeRewards(rewards).map((r) => r.cost);
  if (costs.length === 0) return 10;
  return Math.min(LOYALTY_LIMITS.stampCostMax, Math.max(1, ...costs));
}

// ─── earning ──────────────────────────────────────────────────────────────

/**
 * Balance a visit adds. Stamps: `count` (1..10, default 1). Points:
 * `pointsPerVisit` + `pointsPerSpend` per full `spendStep` TL of `spend`.
 */
export function computeEarn(
  program: Pick<LoyaltyProgramLike, 'kind' | 'pointsPerVisit' | 'pointsPerSpend' | 'spendStep'>,
  input: { count?: number | null; spend?: number | null },
): number {
  if (normalizeKind(program.kind) === 'stamps') {
    return clampInt(input.count ?? 1, 1, LOYALTY_LIMITS.stampsPerVisitMax, 1);
  }
  const base = Math.max(0, Math.trunc(program.pointsPerVisit));
  const spend = clampInt(input.spend ?? 0, 0, LOYALTY_LIMITS.spendMax, 0);
  const bySpend =
    program.spendStep > 0 && program.pointsPerSpend > 0
      ? Math.floor(spend / program.spendStep) * program.pointsPerSpend
      : 0;
  return base + bySpend;
}

/** Milliseconds until another visit may be recorded (0 = now). */
export function cooldownRemainingMs(
  lastVisitAt: Date | string | null,
  cooldownMinutes: number,
  now: Date,
): number {
  const last = toDate(lastVisitAt);
  if (!last || cooldownMinutes <= 0) return 0;
  return Math.max(0, last.getTime() + cooldownMinutes * 60_000 - now.getTime());
}

// ─── expiry ───────────────────────────────────────────────────────────────

/**
 * A balance lapses after `expiryDays` without a visit (counted from the last
 * visit, or from joining when there was none). Returns the balance lost.
 */
export function expiredBalance(
  member: Pick<LoyaltyMemberLike, 'balance' | 'lastVisitAt' | 'createdAt'>,
  expiryDays: number | null,
  now: Date,
): number {
  if (!expiryDays || expiryDays <= 0 || member.balance <= 0) return 0;
  const since = toDate(member.lastVisitAt) ?? toDate(member.createdAt ?? null);
  if (!since) return 0;
  return now.getTime() - since.getTime() > expiryDays * 86_400_000 ? member.balance : 0;
}

/** When the current balance lapses, or null. */
export function expiresAt(
  member: Pick<LoyaltyMemberLike, 'balance' | 'lastVisitAt' | 'createdAt'>,
  expiryDays: number | null,
): Date | null {
  if (!expiryDays || member.balance <= 0) return null;
  const since = toDate(member.lastVisitAt) ?? toDate(member.createdAt ?? null);
  return since ? new Date(since.getTime() + expiryDays * 86_400_000) : null;
}

// ─── birthday ─────────────────────────────────────────────────────────────

/** Month (1..12) and year in the business's time zone. */
export function zonedMonthYear(now: Date, timeZone?: string | null): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveDisplayTimeZone(timeZone),
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? now.getUTCMonth() + 1);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? now.getUTCFullYear());
  return { month, year };
}

/**
 * The birthday gift can be given during the birthday month, once a year,
 * when the program has one.
 */
export function birthdayGiftAvailable(
  program: Pick<LoyaltyProgramLike, 'birthdayReward'>,
  member: Pick<LoyaltyMemberLike, 'birthMonth' | 'lastBirthdayRewardYear'>,
  now: Date,
  timeZone?: string | null,
): boolean {
  if (!program.birthdayReward || !member.birthMonth) return false;
  const { month, year } = zonedMonthYear(now, timeZone);
  return member.birthMonth === month && member.lastBirthdayRewardYear !== year;
}

export function isValidBirthday(month: unknown, day: unknown): boolean {
  if (typeof month !== 'number' || typeof day !== 'number') return false;
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return false;
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= maxDay;
}

// ─── identity ─────────────────────────────────────────────────────────────

/**
 * Phone in one form for lookup and uniqueness: "+905321234567". Turkish
 * mobiles typed as 0532…, 532… or +90 532… all become the same; other
 * countries need their country code. Null when not 8–15 digits.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00')) digits = digits.slice(2);
  else if (!trimmed.startsWith('+')) {
    if (digits.length === 11 && digits.startsWith('05')) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10 && digits.startsWith('5')) digits = `90${digits}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/** "+90 532 *** ** 67" — for lists that do not need the whole number. */
export function maskPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length < 8) return '***';
  if (d.startsWith('90') && d.length === 12) return `+90 ${d.slice(2, 5)} *** ** ${d.slice(-2)}`;
  return `+${d.slice(0, Math.max(1, d.length - 7))} *** ** ${d.slice(-2)}`;
}

/** "+90 532 123 45 67" — whole number, for the business's own records (§61). */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('90') && d.length === 12) return `+90 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  return `+${d}`;
}

/** Last four digits — the customer types them to leave the program. */
export function phoneLast4(phone: string | null | undefined): string {
  return phone ? phone.replace(/\D/g, '').slice(-4) : '';
}

/** No 0/O, 1/I/L — easy to read aloud and type at the counter. */
export const MEMBER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MEMBER_CODE_LENGTH = 6;

/** `randomByte` returns 0..255; the server passes crypto bytes. */
export function generateMemberCode(randomByte: () => number): string {
  let code = '';
  const n = MEMBER_CODE_ALPHABET.length;
  while (code.length < MEMBER_CODE_LENGTH) {
    const b = randomByte() & 0xff;
    // Rejection sampling keeps every character equally likely.
    if (b >= 256 - (256 % n)) continue;
    code += MEMBER_CODE_ALPHABET[b % n];
  }
  return code;
}

/** "abc-123", "ABC 123" → "ABC123"; null when it cannot be a code. */
export function normalizeMemberCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.toUpperCase().replace(/[\s-]/g, '');
  if (v.length !== MEMBER_CODE_LENGTH) return null;
  for (const ch of v) if (!MEMBER_CODE_ALPHABET.includes(ch)) return null;
  return v;
}

/** "ABC123" → "ABC 123" */
export function formatMemberCode(code: string): string {
  return code.length === MEMBER_CODE_LENGTH ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export const CARD_TOKEN_RE = /^[A-Za-z0-9_-]{24,64}$/;

export type LookupQuery =
  | { kind: 'token'; token: string }
  | { kind: 'code'; code: string }
  | { kind: 'phone'; phone: string }
  | { kind: 'text'; text: string }
  | { kind: 'empty' };

/**
 * What the staff typed or scanned: a card link (QR on the customer's card),
 * a 6-character card code, a phone number or part of a name.
 */
export function parseLookupQuery(raw: unknown): LookupQuery {
  if (typeof raw !== 'string') return { kind: 'empty' };
  const v = raw.trim().slice(0, 300);
  if (!v) return { kind: 'empty' };
  const link = v.match(/\/l\/[a-z0-9-]+\/k\/([A-Za-z0-9_-]{24,64})(?:[/?#].*)?$/);
  if (link) return { kind: 'token', token: link[1] };
  const code = normalizeMemberCode(v);
  if (code && /[A-Z]/i.test(v)) return { kind: 'code', code };
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 7 && /^[+\d\s().-]+$/.test(v)) {
    const phone = normalizePhone(v);
    if (phone) return { kind: 'phone', phone };
  }
  if (code) return { kind: 'code', code };
  return v.length >= 2 ? { kind: 'text', text: v.slice(0, 60) } : { kind: 'empty' };
}

// ─── links ────────────────────────────────────────────────────────────────

export function loyaltyJoinPath(slug: string): string {
  return `/l/${slug}`;
}

export function loyaltyCardPath(slug: string, token: string): string {
  return `/l/${slug}/k/${token}`;
}

// ─── wording ──────────────────────────────────────────────────────────────

export function unitLabel(kind: LoyaltyKind, count: number, locale: 'tr' | 'en'): string {
  if (locale === 'en') {
    if (kind === 'stamps') return count === 1 ? 'stamp' : 'stamps';
    return count === 1 ? 'point' : 'points';
  }
  return kind === 'stamps' ? 'damga' : 'puan';
}

/** "9 damga → Ücretsiz kahve" */
export function rewardRuleLine(kind: LoyaltyKind, reward: Pick<LoyaltyRewardLike, 'title' | 'cost'>, locale: 'tr' | 'en'): string {
  return `${reward.cost} ${unitLabel(kind, reward.cost, locale)} → ${reward.title}`;
}

/** How a visit earns, in one sentence. */
export function earnRuleLine(
  program: Pick<LoyaltyProgramLike, 'kind' | 'pointsPerVisit' | 'pointsPerSpend' | 'spendStep'>,
  locale: 'tr' | 'en',
): string {
  const tr = locale !== 'en';
  if (normalizeKind(program.kind) === 'stamps') {
    return tr ? 'Her ziyarette kasada damga alırsınız.' : 'You get a stamp at the counter on every visit.';
  }
  const parts: string[] = [];
  if (program.pointsPerVisit > 0) {
    parts.push(tr ? `her ziyarette ${program.pointsPerVisit} puan` : `${program.pointsPerVisit} points per visit`);
  }
  if (program.pointsPerSpend > 0 && program.spendStep > 0) {
    parts.push(
      tr
        ? `her ${program.spendStep} TL harcamaya ${program.pointsPerSpend} puan`
        : `${program.pointsPerSpend} points for every ${program.spendStep} TL spent`,
    );
  }
  if (parts.length === 0) return tr ? 'Puanlar kasada eklenir.' : 'Points are added at the counter.';
  const sentence = parts.join(tr ? ' ve ' : ' and ');
  return tr ? `Kasada ${sentence} kazanırsınız.` : `You earn ${sentence} at the counter.`;
}

// ─── sector templates ─────────────────────────────────────────────────────

export interface LoyaltyTemplate {
  key: 'cafe' | 'restaurant' | 'barber' | 'beauty' | 'bakery' | 'general';
  label: { tr: string; en: string };
  hint: { tr: string; en: string };
  kind: LoyaltyKind;
  name: { tr: string; en: string };
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  welcomeBonus: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: { tr: string; en: string } | null;
  rewards: Array<{ title: { tr: string; en: string }; cost: number }>;
  tiers: Array<{ name: { tr: string; en: string }; minVisits: number; perk: { tr: string; en: string } }>;
}

export const LOYALTY_TEMPLATES: readonly LoyaltyTemplate[] = [
  {
    key: 'cafe',
    label: { tr: 'Kafe', en: 'Café' },
    hint: { tr: '9 kahveye 1 kahve hediye', en: 'Buy 9 coffees, get 1 free' },
    kind: 'stamps',
    name: { tr: 'Kahve kartı', en: 'Coffee card' },
    pointsPerVisit: 0,
    pointsPerSpend: 0,
    spendStep: 0,
    welcomeBonus: 1,
    visitCooldownMinutes: 30,
    expiryDays: 365,
    birthdayReward: { tr: 'Doğum gününüzde bir kahve bizden', en: 'A free coffee on your birthday' },
    rewards: [{ title: { tr: 'Ücretsiz kahve', en: 'Free coffee' }, cost: 9 }],
    tiers: [],
  },
  {
    key: 'restaurant',
    label: { tr: 'Restoran', en: 'Restaurant' },
    hint: { tr: 'Harcamaya göre puan, puanla ikram', en: 'Points on spend, treats for points' },
    kind: 'points',
    name: { tr: 'Misafir kartı', en: 'Guest card' },
    pointsPerVisit: 10,
    pointsPerSpend: 1,
    spendStep: 10,
    welcomeBonus: 20,
    visitCooldownMinutes: 120,
    expiryDays: 365,
    birthdayReward: { tr: 'Doğum gününüzde tatlı ikramı', en: 'A free dessert on your birthday' },
    rewards: [
      { title: { tr: 'Ücretsiz tatlı', en: 'Free dessert' }, cost: 150 },
      { title: { tr: 'Ücretsiz ana yemek', en: 'Free main course' }, cost: 400 },
    ],
    tiers: [
      { name: { tr: 'Gümüş', en: 'Silver' }, minVisits: 10, perk: { tr: 'Her ziyarette ücretsiz içecek', en: 'A free drink on every visit' } },
      { name: { tr: 'Altın', en: 'Gold' }, minVisits: 25, perk: { tr: 'Rezervasyonda öncelik', en: 'Priority for reservations' } },
    ],
  },
  {
    key: 'barber',
    label: { tr: 'Berber / Kuaför', en: 'Barber / Hair salon' },
    hint: { tr: '6 tıraşa 1 tıraş hediye', en: 'Every 7th cut free' },
    kind: 'stamps',
    name: { tr: 'Tıraş kartı', en: 'Haircut card' },
    pointsPerVisit: 0,
    pointsPerSpend: 0,
    spendStep: 0,
    welcomeBonus: 0,
    visitCooldownMinutes: 240,
    expiryDays: 365,
    birthdayReward: { tr: 'Doğum gününüzde ücretsiz sakal tıraşı', en: 'A free beard trim on your birthday' },
    rewards: [{ title: { tr: 'Ücretsiz saç kesimi', en: 'Free haircut' }, cost: 6 }],
    tiers: [
      { name: { tr: 'Daimi müşteri', en: 'Regular' }, minVisits: 12, perk: { tr: 'Randevuda öncelik', en: 'Priority booking' } },
    ],
  },
  {
    key: 'beauty',
    label: { tr: 'Güzellik salonu', en: 'Beauty salon' },
    hint: { tr: 'Puan + seviyeler', en: 'Points + tiers' },
    kind: 'points',
    name: { tr: 'Güzellik kartı', en: 'Beauty card' },
    pointsPerVisit: 20,
    pointsPerSpend: 1,
    spendStep: 10,
    welcomeBonus: 50,
    visitCooldownMinutes: 240,
    expiryDays: 365,
    birthdayReward: { tr: 'Doğum gününüzde %20 indirim', en: '20% off on your birthday' },
    rewards: [
      { title: { tr: 'Ücretsiz manikür', en: 'Free manicure' }, cost: 300 },
      { title: { tr: 'Ücretsiz cilt bakımı', en: 'Free facial' }, cost: 800 },
    ],
    tiers: [
      { name: { tr: 'Gümüş', en: 'Silver' }, minVisits: 6, perk: { tr: 'Her hizmette %5 indirim', en: '5% off every service' } },
      { name: { tr: 'Altın', en: 'Gold' }, minVisits: 15, perk: { tr: 'Her hizmette %10 indirim', en: '10% off every service' } },
    ],
  },
  {
    key: 'bakery',
    label: { tr: 'Fırın / Pastane', en: 'Bakery' },
    hint: { tr: '10 alışverişe 1 ürün hediye', en: 'Every 11th item free' },
    kind: 'stamps',
    name: { tr: 'Fırın kartı', en: 'Bakery card' },
    pointsPerVisit: 0,
    pointsPerSpend: 0,
    spendStep: 0,
    welcomeBonus: 0,
    visitCooldownMinutes: 60,
    expiryDays: 180,
    birthdayReward: null,
    rewards: [{ title: { tr: 'Ücretsiz ürün', en: 'Free item' }, cost: 10 }],
    tiers: [],
  },
  {
    key: 'general',
    label: { tr: 'Diğer işletmeler', en: 'Other businesses' },
    hint: { tr: '10 damgaya 1 ödül', en: '10 stamps, 1 reward' },
    kind: 'stamps',
    name: { tr: 'Sadakat kartı', en: 'Loyalty card' },
    pointsPerVisit: 0,
    pointsPerSpend: 0,
    spendStep: 0,
    welcomeBonus: 0,
    visitCooldownMinutes: 60,
    expiryDays: null,
    birthdayReward: null,
    rewards: [{ title: { tr: 'Hediye', en: 'Reward' }, cost: 10 }],
    tiers: [],
  },
];

/** Best starting template for a business category ("Restoran", "Kafe", …). */
export function templateForCategory(category: string | null | undefined): LoyaltyTemplate['key'] {
  const c = (category ?? '').toLocaleLowerCase('tr');
  if (/kafe|kahve|cafe|coffee/.test(c)) return 'cafe';
  if (/berber|kuaför|kuafor|barber|hair/.test(c)) return 'barber';
  if (/güzellik|guzellik|spa|beauty|estetik|nail/.test(c)) return 'beauty';
  if (/fırın|firin|pastane|bakery|patisserie/.test(c)) return 'bakery';
  if (/restoran|restaurant|lokanta|meyhane|bistro|yemek|paket|delivery/.test(c)) return 'restaurant';
  return 'general';
}
