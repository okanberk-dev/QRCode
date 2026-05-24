import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { PLAN_QUOTA, PLAN_QUOTA_AI_REPLIES, PLAN_LABELS } from '@/lib/constants';
import { resolveBillingAmount, toAdminRow } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

function trialDaysLeft(trialEndsAt: Date | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json({ error: 'forbidden', hint: 'billing is workspace-scoped' }, { status: 403 });
  }

  // §40.1 — Supabase pooler connection_limit=1; aynı request içinde 3 paralel
  // read $transaction'a alındı (yeni: subscriptionPlan join'i de aynı pool slot'unda).
  const [user, subscription, restaurants] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, trialEndsAt: true, locale: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { userId },
      include: { subscriptionPlan: true },
    }),
    prisma.restaurant.findMany({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  // BillingSubscription is source of truth once present; fall back to User.plan
  // for trial users who haven't hit checkout yet.
  const plan = subscription?.plan ?? user.plan ?? 'trial';
  const locale = user.locale === 'en' ? 'en' : 'tr';
  // §15.2 canonical billing label öncelik: gerçek tier ismi (Starter/Growth/Pro)
  // > legacy PLAN_LABELS bucket > raw plan key. Marketing pricing kartında
  // gözüken tier ismi ile owner kartı parity tutar.
  const tierName = subscription?.subscriptionPlan
    ? locale === 'en'
      ? subscription.subscriptionPlan.nameEn
      : subscription.subscriptionPlan.nameTr
    : null;
  const planLabel = tierName ?? PLAN_LABELS[plan]?.[locale] ?? plan;
  const renewsAt = subscription?.renewsAt ?? null;

  // §15.2 canonical amount — eğer subscription tier'a bağlıysa
  // resolveBillingAmount kanonik tutarı verir; admin `amount` field'ı doluysa
  // override olarak kullanılır (örn. sezonluk indirim).
  const tierBilling = subscription?.subscriptionPlan
    ? resolveBillingAmount(
        toAdminRow(subscription.subscriptionPlan),
        subscription.billingCycle === 'yearly' || subscription.billingCycle === 'monthly'
          ? subscription.billingCycle
          : null,
        subscription.currency === 'USD' ? 'USD' : 'TRY',
      )
    : null;
  const overrideAmount = subscription?.amount ? Number(subscription.amount) : null;
  // Display amount: admin override > tier-derived (cycle-aware) > null
  const displayAmount = overrideAmount ?? tierBilling?.amount ?? null;
  // Yıllık toplam — sadece tier bağlıysa hesaplanır; legacy `amount` override'da
  // owner cycle bilgisi olmadığı için yıllık toplam türetilemez (null).
  const yearlyTotal = tierBilling?.amountYearlyTotal ?? null;

  // Prefer the subscription's own trial end (payment provider will set it
  // once checkout succeeds), fall back to the User's onboarding trial.
  const trialEnd = subscription?.trialEndsAt ?? user.trialEndsAt ?? null;
  const isTrial = plan === 'trial';

  // Usage: feedback rows across every restaurant owned by this user,
  // month-to-date window.
  const restaurantIds = restaurants.map((r) => r.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // §38.51 — feedback ingest + AI reply quota tek transaction (CLAUDE.md §14.1
  // pgbouncer connection_limit=1 disiplini). FeedbackReply.source='ai_copilot'
  // owner panelinde Pulse AI Co-Pilot kullanımı; aylık quota Plan widget'a yansır.
  const [used, aiRepliesUsed] =
    restaurantIds.length === 0
      ? [0, 0]
      : await prisma.$transaction([
          prisma.feedback.count({
            where: {
              restaurantId: { in: restaurantIds },
              createdAt: { gte: monthStart },
            },
          }),
          prisma.feedbackReply.count({
            where: {
              source: 'ai_copilot',
              feedback: {
                restaurantId: { in: restaurantIds },
              },
              createdAt: { gte: monthStart },
            },
          }),
        ]);


  const limit = PLAN_QUOTA[plan] ?? PLAN_QUOTA.trial;
  const aiRepliesQuota = PLAN_QUOTA_AI_REPLIES[plan] ?? PLAN_QUOTA_AI_REPLIES.trial;

  const paymentMethod =
    subscription?.paymentBrand && subscription?.paymentLast4
      ? { brand: subscription.paymentBrand, last4: subscription.paymentLast4 }
      : null;

  return NextResponse.json(
    {
      plan,
      planLabel,
      status: subscription?.status ?? 'active',
      trialDaysLeft: isTrial ? trialDaysLeft(trialEnd) : null,
      renewsAt: renewsAt ? renewsAt.toISOString() : null,
      quota: { used, limit },
      aiReplies: { used: aiRepliesUsed, limit: aiRepliesQuota },
      paymentMethod,
      // Pricing snapshot — Faz 2 owner-readonly billing card. Null when admin
      // hasn't seeded values yet; UI falls back to plan-derived label.
      // §15.2 canonical: `amount` admin override > tier-derived; UI yıllık
      // toplam göstermek için `yearlyTotal` field'ını kullanır (kanonik DB
      // değeri, rounding-safe).
      amount: displayAmount,
      yearlyTotal,
      currency: subscription?.currency ?? 'TRY',
      billingCycle: subscription?.billingCycle ?? null,
      subscriptionPlanId: subscription?.subscriptionPlanId ?? null,
      tier: subscription?.subscriptionPlan
        ? {
            id: subscription.subscriptionPlan.id,
            name: tierName,
            isFeatured: subscription.subscriptionPlan.isFeatured,
          }
        : null,
      // §44.9 Wave 2 — Lemon Squeezy self-service signals. Owner UI
      // (BillingReadOnlyCard) uses these to decide which CTAs to show:
      //   source='lemon_squeezy' + cancelAtPeriodEnd=false → "İptal et"
      //   source='lemon_squeezy' + cancelAtPeriodEnd=true → "Yeniden başlat"
      //   source='lemon_squeezy' → "Aboneliği yönet" (portal)
      //   no subscription / source='manual' → manual flow CTA disabled
      source: subscription?.source ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      // Billing address — never surface adminNotes (admin-only).
      billingAddress: subscription
        ? {
            companyName: subscription.companyName,
            taxNumber: subscription.taxNumber,
            address: subscription.billingAddress,
            city: subscription.billingCity,
          }
        : null,
    },
    {
      headers: {
        // Edge cache (CLAUDE.md §38.100 Stage 24). Plan + usage data —
        // mutation frequency çok düşük (admin Iyzico flow'u Wave 3.5);
        // 60s fresh + 5min SWR billing widget refresh için yeterli.
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
