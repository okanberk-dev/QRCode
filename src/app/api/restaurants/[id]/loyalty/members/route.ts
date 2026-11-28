// Loyalty members (CLAUDE.md §60): list (search, sort, cursor) and enrol a
// customer at the counter.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { withServerTiming } from '@/lib/server-timing';
import { actorRef, gateLoyaltyRoute, loyaltyErrorResponse } from '@/lib/loyalty-route';
import { activeRewards, isValidBirthday, LOYALTY_LIMITS, normalizePhone } from '@/lib/loyalty';
import {
  createLoyaltyMember,
  listLoyaltyMembers,
  loadLoyaltyProgram,
  toMemberDto,
  type MemberSort,
} from '@/lib/loyalty-server';
import { moderateText } from '@/lib/loyalty-moderation';
import { isValidEmail } from '@/lib/validations';

const SORTS = new Set<MemberSort>(['recent', 'visits', 'balance', 'new']);

async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'read');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ items: [], total: 0, nextCursor: null });

  const sp = new URL(req.url).searchParams;
  const sortRaw = sp.get('sort') as MemberSort | null;
  const minCost = activeRewards(program.rewards)[0]?.cost;
  const result = await listLoyaltyMembers(program.id, {
    q: sp.get('q'),
    sort: sortRaw && SORTS.has(sortRaw) ? sortRaw : 'recent',
    cursor: sp.get('cursor'),
    limit: Number(sp.get('limit')) || 30,
    rewardReady: sp.get('ready') === '1',
    minCost,
  });
  return NextResponse.json(
    { ...result, items: result.items.map((m) => toMemberDto(m, { full: gate.access.manage })) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

const EnrolBody = z
  .object({
    firstName: z.string().trim().max(LOYALTY_LIMITS.memberNameMax).optional().nullable(),
    lastName: z.string().trim().max(LOYALTY_LIMITS.memberNameMax).optional().nullable(),
    // Optional since 2026-11-28: a name or a phone identifies the card.
    phone: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().max(160).optional().nullable(),
    birthMonth: z.number().int().min(1).max(12).optional().nullable(),
    birthDay: z.number().int().min(1).max(31).optional().nullable(),
    marketingConsent: z.boolean().optional().default(false),
    // The staff confirms the customer saw the privacy notice (KVKK).
    noticeConfirmed: z.literal(true),
  })
  .strict();

async function handlePOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'operate');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM', code: 'NO_PROGRAM' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof EnrolBody>>(EnrolBody, body);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return NextResponse.json({ error: 'INVALID_PHONE', code: 'INVALID_PHONE' }, { status: 400 });
  const email = d.email ? d.email.toLowerCase() : null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL', code: 'INVALID_EMAIL' }, { status: 400 });
  }
  const hasBirthday = d.birthMonth != null || d.birthDay != null;
  if (hasBirthday && !isValidBirthday(d.birthMonth, d.birthDay)) {
    return NextResponse.json({ error: 'INVALID_BIRTHDAY', code: 'INVALID_BIRTHDAY' }, { status: 400 });
  }
  const firstName = d.firstName?.replace(/\s+/g, ' ').trim() || null;
  const lastName = d.lastName?.replace(/\s+/g, ' ').trim() || null;
  const name = [firstName, lastName].filter(Boolean).join(' ');
  if (!name && !phone) return NextResponse.json({ error: 'NAME_REQUIRED', code: 'NAME_REQUIRED' }, { status: 400 });
  if (name && moderateText(name)) {
    return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED' }, { status: 422 });
  }

  try {
    const member = await createLoyaltyMember(
      program,
      {
        firstName,
        lastName,
        phone,
        email,
        birthMonth: hasBirthday ? d.birthMonth ?? null : null,
        birthDay: hasBirthday ? d.birthDay ?? null : null,
        marketingConsent: d.marketingConsent,
        joinedVia: 'staff',
      },
      { ...actorRef(gate.actor), restaurantId: id },
    );
    const { cardToken, ...rest } = member;
    return NextResponse.json(
      { member: toMemberDto(rest, { full: gate.access.manage }), cardUrl: `/l/${program.slug}/k/${cardToken}` },
      { status: 201 },
    );
  } catch (err) {
    return loyaltyErrorResponse(err);
  }
}

export const GET = withServerTiming(handleGET);
export const POST = withServerTiming(handlePOST);
