// Loyalty program of one business (CLAUDE.md §60): read with stats, save.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute, loyaltyErrorResponse } from '@/lib/loyalty-route';
import { LOYALTY_LIMITS as L, templateForCategory } from '@/lib/loyalty';
import {
  loadLoyaltyProgram,
  loadPortalBusiness,
  loyaltyPublicBaseUrl,
  loyaltyStats,
  programInputProblems,
  saveLoyaltyProgram,
  toProgramDto,
} from '@/lib/loyalty-server';
import { moderateText } from '@/lib/loyalty-moderation';
import { recordConsentBatch } from '@/lib/legal/consent';
import { getClientIp } from '@/lib/rate-limit';

const RewardInput = z
  .object({
    id: z.string().max(40).optional(),
    title: z.string().trim().min(1).max(L.rewardTitleMax),
    description: z.string().trim().max(L.rewardDescriptionMax).optional().nullable(),
    cost: z.number().int().min(L.rewardCostMin).max(L.pointCostMax),
    isActive: z.boolean().optional(),
  })
  .strict();

const TierInput = z
  .object({
    name: z.string().trim().min(1).max(L.tierNameMax),
    minVisits: z.number().int().min(1).max(L.tierMinVisitsMax),
    perk: z.string().trim().max(L.tierPerkMax).default(''),
  })
  .strict();

const ProgramBody = z
  .object({
    name: z.string().trim().min(1).max(L.nameMax),
    kind: z.enum(['stamps', 'points']),
    pointsPerVisit: z.number().int().min(0).max(L.pointsPerVisitMax).default(0),
    pointsPerSpend: z.number().int().min(0).max(L.pointsPerSpendMax).default(0),
    spendStep: z.number().int().min(0).max(L.spendStepMax).default(0),
    welcomeBonus: z.number().int().min(0).max(L.welcomeBonusMaxPoints).default(0),
    visitCooldownMinutes: z.number().int().min(0).max(L.cooldownMaxMinutes).default(60),
    expiryDays: z.number().int().min(L.expiryMinDays).max(L.expiryMaxDays).nullable().default(null),
    birthdayReward: z.string().trim().max(L.birthdayRewardMax).nullable().default(null),
    tiers: z.array(TierInput).max(L.tiersMax).default([]),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .default(null),
    terms: z.string().trim().max(L.termsMax).nullable().default(null),
    template: z.string().max(20).nullable().default(null),
    isActive: z.boolean().default(false),
    rewards: z.array(RewardInput).min(1).max(L.rewardsMax),
  })
  .strict();

async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'read');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  const [stats, business] = await Promise.all([program ? loyaltyStats(program) : null, loadPortalBusiness(id)]);
  return NextResponse.json(
    {
      program: program ? toProgramDto(program) : null,
      stats,
      business,
      access: gate.access,
      moduleEnabled: gate.restaurant.loyaltyEnabled,
      baseUrl: loyaltyPublicBaseUrl(),
      suggestedTemplate: templateForCategory(gate.restaurant.category),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function handlePUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof ProgramBody>>(ProgramBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const input = {
    ...data,
    birthdayReward: data.birthdayReward || null,
    terms: data.terms || null,
    tiers: [...data.tiers].sort((a, b) => a.minVisits - b.minVisits),
    rewards: data.rewards.map((r) => ({ ...r, description: r.description || null })),
  };
  const problems = programInputProblems(input);
  if (problems.length > 0) {
    return NextResponse.json({ error: 'invalid_program', code: problems[0], problems }, { status: 400 });
  }
  // Customers read every text on their card: no profanity, links or hidden characters.
  const texts = [
    input.name,
    input.terms ?? '',
    input.birthdayReward ?? '',
    ...input.rewards.flatMap((r) => [r.title, r.description ?? '']),
    ...input.tiers.flatMap((t) => [t.name, t.perk]),
  ];
  const blocked = moderateText(texts.join('\n'));
  if (blocked) return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED', issues: blocked }, { status: 422 });

  try {
    const before = await loadLoyaltyProgram(id);
    const saved = await saveLoyaltyProgram(id, input);
    await writePanelAuditLog(gate.actor, before ? 'owner.loyalty.program.update' : 'owner.loyalty.program.create', id, {
      restaurantId: id,
      kind: saved.kind,
      isActive: saved.isActive,
      published: !before?.isActive && saved.isActive,
      rewards: saved.rewards.length,
    });
    // Publishing accepts the business addendum (§61): the editor says so next to the button.
    if (!before?.isActive && saved.isActive) {
      const ip = getClientIp(req.headers);
      const ua = req.headers.get('user-agent');
      const subject = gate.actor.realAdminId ? { type: 'admin' as const, id: gate.actor.realAdminId } : { type: gate.actor.source === 'admin' ? ('admin' as const) : ('user' as const), id: gate.actor.id };
      after(() =>
        recordConsentBatch(
          { locale: 'tr', subjectType: subject.type, subjectId: subject.id, source: 'loyalty_owner', ipAddress: ip, userAgent: ua },
          [{ key: 'sadakat-isletme-eki', granted: true }],
        ),
      );
    }
    const stats = await loyaltyStats(saved);
    return NextResponse.json({ program: toProgramDto(saved), stats });
  } catch (err) {
    return loyaltyErrorResponse(err);
  }
}

export const GET = withServerTiming(handleGET);
export const PUT = withServerTiming(handlePUT);
