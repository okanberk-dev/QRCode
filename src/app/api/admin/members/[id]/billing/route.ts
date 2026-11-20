import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyPlanModulesForOwner } from '@/lib/plan-modules';
import { getAdminFromRequest } from '@/lib/auth';
import { resolveBillingAmount, toAdminRow } from '@/lib/subscription-plans';

// Admin per-user billing management — Faz 3 of Marka Kimliği + Billing flow.
// Owner-side endpoint (/api/billing/summary) reads same row but excludes
// adminNotes for privacy. Edit gated by superadmin role.

export const dynamic = 'force-dynamic';

const VALID_PLANS = new Set(['trial', 'monthly', 'yearly', 'enterprise', 'free']);
const VALID_STATUS = new Set(['active', 'past_due', 'canceled']);
const VALID_CURRENCIES = new Set(['TRY', 'USD', 'EUR', 'GBP']);
const VALID_CYCLES = new Set(['monthly', 'yearly']);

function trimOrNull(value: unknown, max: number): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const t = value.trim();
  if (!t) return null;
  if (t.length > max) return 'invalid';
  return t;
}

function validateTaxNumber(value: unknown): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const t = value.trim();
  if (!t) return null;
  // Turkish VKN (10 digits) or TCKN (11 digits). Pure-digit check.
  if (!/^\d{10,11}$/.test(t)) return 'invalid';
  return t;
}

function validateLast4(value: unknown): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const t = value.trim();
  if (!t) return null;
  if (!/^\d{4}$/.test(t)) return 'invalid';
  return t;
}

function validateAmount(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return 'invalid';
  if (n < 0 || n > 9_999_999.99) return 'invalid';
  return Math.round(n * 100) / 100;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id: userId } = await params;

  // §15.2 canonical billing — admin needs both the subscription row AND the
  // full active tier catalog (Starter/Growth/Pro) for the modal dropdown +
  // amount auto-fill. `$transaction` keeps it on one pooler connection
  // (CLAUDE.md §40.1).
  const [user, subscription, plans] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, plan: true, trialEndsAt: true },
    }),
    prisma.billingSubscription.findUnique({ where: { userId } }),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  // Public catalog projection — `MemberBillingModal` consumes this for the
  // tier dropdown + amount placeholder (CLAUDE.md §15.2 single source of
  // truth with /pricing). Only the editable fields, no marketing chrome.
  const catalog = plans.map((row) => {
    const admin = toAdminRow(row);
    const monthly = resolveBillingAmount(admin, 'monthly');
    const yearly = resolveBillingAmount(admin, 'yearly');
    return {
      id: admin.id,
      nameTr: admin.nameTr,
      nameEn: admin.nameEn,
      priceTry: admin.priceTry,
      priceUsd: admin.priceUsd,
      priceYearlyTry: admin.priceYearlyTry,
      priceYearlyUsd: admin.priceYearlyUsd,
      // Pre-computed canonical amounts; modal renders without re-running
      // the resolver client-side.
      monthlyAmount: monthly.amount,
      yearlyAmountTotal: yearly.amountYearlyTotal,
      yearlyAmountMonthly: yearly.amountMonthly,
      isFeatured: admin.isFeatured,
    };
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      planFromUser: user.plan,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    },
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          renewsAt: subscription.renewsAt?.toISOString() ?? null,
          subscriptionPlanId: subscription.subscriptionPlanId,
          paymentBrand: subscription.paymentBrand,
          paymentLast4: subscription.paymentLast4,
          amount: subscription.amount ? Number(subscription.amount) : null,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
          companyName: subscription.companyName,
          taxNumber: subscription.taxNumber,
          billingAddress: subscription.billingAddress,
          billingCity: subscription.billingCity,
          adminNotes: subscription.adminNotes,
          updatedAt: subscription.updatedAt.toISOString(),
        }
      : null,
    catalog,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // ── Validate ──
  const plan = typeof body.plan === 'string' && VALID_PLANS.has(body.plan) ? body.plan : null;
  if (plan === null && body.plan !== undefined) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  }

  // Canonical tier link (CLAUDE.md §15.2). String → SubscriptionPlan.id
  // existence check; null/empty → clear link (admin "Tier yok" diyebilmeli,
  // legacy enterprise/free row'ları için). undefined → dokunma.
  let subscriptionPlanId: string | null | undefined;
  if (body.subscriptionPlanId === null || body.subscriptionPlanId === '') {
    subscriptionPlanId = null;
  } else if (typeof body.subscriptionPlanId === 'string') {
    const sp = await prisma.subscriptionPlan.findUnique({
      where: { id: body.subscriptionPlanId },
      select: { id: true },
    });
    if (!sp) return NextResponse.json({ error: 'invalid_subscription_plan_id' }, { status: 400 });
    subscriptionPlanId = sp.id;
  }

  const status = typeof body.status === 'string' && VALID_STATUS.has(body.status) ? body.status : null;
  if (status === null && body.status !== undefined) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  let renewsAt: Date | null | undefined;
  if (body.renewsAt === null || body.renewsAt === '') {
    renewsAt = null;
  } else if (typeof body.renewsAt === 'string') {
    const d = new Date(body.renewsAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'invalid_renews_at' }, { status: 400 });
    }
    renewsAt = d;
  }

  const paymentBrand = trimOrNull(body.paymentBrand, 50);
  if (paymentBrand === 'invalid') return NextResponse.json({ error: 'invalid_payment_brand' }, { status: 400 });

  const paymentLast4 = validateLast4(body.paymentLast4);
  if (paymentLast4 === 'invalid') return NextResponse.json({ error: 'invalid_payment_last4' }, { status: 400 });

  const amount = validateAmount(body.amount);
  if (amount === 'invalid') return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });

  let currency: string | null | undefined;
  if (body.currency === null || body.currency === '') {
    currency = null;
  } else if (typeof body.currency === 'string') {
    if (!VALID_CURRENCIES.has(body.currency)) {
      return NextResponse.json({ error: 'invalid_currency' }, { status: 400 });
    }
    currency = body.currency;
  }

  let billingCycle: string | null | undefined;
  if (body.billingCycle === null || body.billingCycle === '') {
    billingCycle = null;
  } else if (typeof body.billingCycle === 'string') {
    if (!VALID_CYCLES.has(body.billingCycle)) {
      return NextResponse.json({ error: 'invalid_billing_cycle' }, { status: 400 });
    }
    billingCycle = body.billingCycle;
  }

  const companyName = trimOrNull(body.companyName, 200);
  if (companyName === 'invalid') return NextResponse.json({ error: 'invalid_company_name' }, { status: 400 });

  const taxNumber = validateTaxNumber(body.taxNumber);
  if (taxNumber === 'invalid') return NextResponse.json({ error: 'invalid_tax_number' }, { status: 400 });

  const billingAddress = trimOrNull(body.billingAddress, 500);
  if (billingAddress === 'invalid') return NextResponse.json({ error: 'invalid_billing_address' }, { status: 400 });

  const billingCity = trimOrNull(body.billingCity, 100);
  if (billingCity === 'invalid') return NextResponse.json({ error: 'invalid_billing_city' }, { status: 400 });

  const adminNotes = trimOrNull(body.adminNotes, 2000);
  if (adminNotes === 'invalid') return NextResponse.json({ error: 'invalid_admin_notes' }, { status: 400 });

  // ── Upsert + audit (single transaction) ──
  const before = await prisma.billingSubscription.findUnique({ where: { userId } });

  // The card billing anchor day (billing spec §11.1) describes the current period end, plan and cycle. An admin
  // change of any of them leaves it stale, so it is cleared; the next card payment derives a fresh one.
  const periodChanged =
    (renewsAt !== undefined && (renewsAt?.getTime() ?? null) !== (before?.renewsAt?.getTime() ?? null)) ||
    (billingCycle !== undefined && billingCycle !== (before?.billingCycle ?? null)) ||
    (subscriptionPlanId !== undefined && subscriptionPlanId !== (before?.subscriptionPlanId ?? null));

  const data = {
    ...(plan !== null ? { plan } : {}),
    ...(status !== null ? { status } : {}),
    ...(renewsAt !== undefined ? { renewsAt } : {}),
    ...(subscriptionPlanId !== undefined ? { subscriptionPlanId } : {}),
    ...(periodChanged ? { billingAnchorDay: null } : {}),
    paymentBrand,
    paymentLast4,
    amount,
    currency,
    billingCycle,
    companyName,
    taxNumber,
    billingAddress,
    billingCity,
    adminNotes,
  };

  const [subscription] = await prisma.$transaction([
    prisma.billingSubscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: plan ?? 'trial',
        status: status ?? 'active',
        ...data,
      },
      update: data,
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.billing.update',
        targetId: userId,
        payload: {
          before: before
            ? {
                plan: before.plan,
                status: before.status,
                subscriptionPlanId: before.subscriptionPlanId,
                amount: before.amount ? Number(before.amount) : null,
                currency: before.currency,
                billingCycle: before.billingCycle,
                paymentLast4: before.paymentLast4,
              }
            : null,
          after: {
            plan: subscriptionAfterPlan(plan, before?.plan ?? 'trial'),
            status: subscriptionAfterStatus(status, before?.status ?? 'active'),
            subscriptionPlanId:
              subscriptionPlanId !== undefined ? subscriptionPlanId : before?.subscriptionPlanId ?? null,
            amount,
            currency,
            billingCycle,
            paymentLast4,
          },
        },
      },
    }),
  ]);

  // Mirror plan onto User.plan so quota lookup + onboarding gates stay
  // consistent (existing /api/billing/summary already prefers
  // subscription.plan over user.plan, but other surfaces still read User).
  if (plan !== null) {
    await prisma.user.update({ where: { id: userId }, data: { plan } });
  }

  // Assigning a plan that manages modules sets the owner's feature switches
  // (§5.2). Best effort: the billing change is already saved.
  let modulesApplied = 0;
  if (subscriptionPlanId !== undefined || status !== null) {
    modulesApplied = await applyPlanModulesForOwner(userId).catch((err) => {
      console.error('[admin/members/billing] plan modules not applied', {
        userId,
        error: (err as Error).message,
      });
      return 0;
    });
  }

  return NextResponse.json({
    ok: true,
    modulesApplied,
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      renewsAt: subscription.renewsAt?.toISOString() ?? null,
      subscriptionPlanId: subscription.subscriptionPlanId,
      paymentBrand: subscription.paymentBrand,
      paymentLast4: subscription.paymentLast4,
      amount: subscription.amount ? Number(subscription.amount) : null,
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      companyName: subscription.companyName,
      taxNumber: subscription.taxNumber,
      billingAddress: subscription.billingAddress,
      billingCity: subscription.billingCity,
      adminNotes: subscription.adminNotes,
      updatedAt: subscription.updatedAt.toISOString(),
    },
  });
}

// Helpers — keep audit "after" snapshot in sync with the upsert's effective
// values when the request omits a field (existing value carries through).
function subscriptionAfterPlan(next: string | null, prev: string): string {
  return next ?? prev;
}
function subscriptionAfterStatus(next: string | null, prev: string): string {
  return next ?? prev;
}
