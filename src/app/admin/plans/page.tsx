import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CreditCard, Crown, TrendingUp, Users } from 'lucide-react';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Avatar,
  Badge,
  Eyebrow,
  PageHeader,
  ProgressBar,
  StatCard,
} from '@/components/ui';
import { getAllPlansForAdmin } from '@/lib/subscription-plans';
import PlansManager from '@/components/admin/PlansManager';

export const metadata: Metadata = {
  title: 'Abonelikler — Buaze Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Plan tier hardcoded array kaldırıldı — paketler artık DB-driven
// (SubscriptionPlan tablosu). PlansManager admin paneli üzerinden CRUD eder,
// public /pricing aynı kaynaktan fetch eder.

export default async function AdminPlansPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value || cookieStore.get('user_token')?.value;
  if (!token) redirect('/admin');
  const payload = await verifyJwt(token);
  if (!payload || !isAdminRole(payload.role as string | undefined)) redirect('/admin');

  // Plan distribution from User table (workspace owners). Backend untouched.
  const owners = await prisma.user.findMany({
    where: { role: 'restaurant_owner' },
    select: { id: true, plan: true, trialEndsAt: true, isActive: true, createdAt: true },
  });

  const totalOwners = owners.length;
  const activeOwners = owners.filter((o) => o.isActive).length;
  const trialOwners = owners.filter((o) => o.plan === 'trial').length;
  const paidOwners = totalOwners - trialOwners;
  const paidShare = totalOwners ? Math.round((paidOwners / totalOwners) * 100) : 0;

  // Plan-key buckets — schema stores `plan` as a free string ("trial",
  // "monthly", "yearly", or future tier keys). Bucket loosely by prefix.
  const planBuckets: Array<{ key: string; label: string; color: string; count: number }> = [
    { key: 'pro', label: 'Pro', color: '#0A0A0A', count: 0 },
    { key: 'growth', label: 'Growth', color: '#525252', count: 0 },
    { key: 'starter', label: 'Starter', color: '#A3A3A3', count: 0 },
    { key: 'monthly', label: 'Monthly', color: '#525252', count: 0 },
    { key: 'yearly', label: 'Yearly', color: '#0A0A0A', count: 0 },
    { key: 'trial', label: 'Trial', color: '#C6F24E', count: 0 },
  ];
  for (const o of owners) {
    const plan = (o.plan || 'trial').toLowerCase();
    const bucket = planBuckets.find((b) => plan.includes(b.key));
    if (bucket) bucket.count += 1;
    else planBuckets[planBuckets.length - 1].count += 1; // fallback to trial
  }

  // Recently joined paid customers (last 5).
  const recentPaid = await prisma.user.findMany({
    where: { role: 'restaurant_owner', plan: { not: 'trial' } },
    select: { id: true, name: true, email: true, plan: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Subscription plans — DB-driven, managed by PlansManager below.
  // Boş ise PlansManager kullanıcıya "Varsayılan paketleri yükle" butonu sunar.
  const managedPlans = await getAllPlansForAdmin().catch(() => []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="ABONELİKLER"
        title="Plan yönetimi"
        description="Müşterilerinin plan dağılımını izle, paket fiyatlandırmasını incele. Iyzico ödeme entegrasyonu Wave 3.5'te canlıya alınacak — şimdilik write-side okuma modunda."
      />

      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard
          label="Toplam müşteri"
          value={totalOwners}
          delta={`${activeOwners} aktif`}
          deltaKind="neutral"
          icon={<Users size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Ödeyen müşteri"
          value={paidOwners}
          delta={`%${paidShare}`}
          deltaKind="up"
          icon={<TrendingUp size={14} strokeWidth={2} />}
          accent="#C6F24E"
        />
        <StatCard
          label="Aktif denemeler"
          value={trialOwners}
          delta="14 gün ort."
          deltaKind="neutral"
          icon={<Crown size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık MRR (tahmini)"
          value={`₺${(paidOwners * 749).toLocaleString('tr-TR')}`}
          delta="Iyzico bağlantısı bekleniyor"
          deltaKind="neutral"
          icon={<CreditCard size={14} strokeWidth={2} />}
        />
      </div>

      {/* Plan distribution + Recently joined */}
      <div className="grid gap-3.5 mb-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="bz-card p-5 sm:p-6">
          <Eyebrow>Plan dağılımı</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3.5" style={{ fontSize: 18 }}>
            {totalOwners} işletme
          </div>
          <div className="flex flex-col gap-2.5">
            {planBuckets
              .filter((b) => b.count > 0)
              .map((b) => {
                const pct = totalOwners ? (b.count / totalOwners) * 100 : 0;
                return (
                  <div key={b.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ fontWeight: 500 }}>{b.label}</span>
                      <span className="bz-mono text-[#525252]">
                        {b.count}
                      </span>
                    </div>
                    <ProgressBar
                      value={pct}
                      max={100}
                      color={b.color}
                      ariaLabel={`${b.label} plan ${b.count}`}
                    />
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bz-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EDEDED' }}>
            <Eyebrow>Son katılan ödeyen müşteriler</Eyebrow>
            <Link
              href="/admin/members"
              className="inline-flex items-center gap-1 text-[12px] font-medium hover:opacity-70 text-[#0A0A0A]"
            >
              Tümü
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </div>
          {recentPaid.length === 0 ? (
            <div className="p-8 text-center" style={{ fontSize: 13, color: '#737373' }}>
              Henüz ödeyen müşteri yok.
            </div>
          ) : (
            recentPaid.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid #F5F5F5' }}
              >
                <Avatar name={u.name || u.email} size={32} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {u.name || u.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: '#737373' }}>
                    {u.email} ·{' '}
                    {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <Badge kind="lime">{u.plan}</Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manageable plan cards — DB-driven via /api/admin/plans CRUD.
          Public /pricing fetches the same rows. */}
      <PlansManager initialPlans={managedPlans} />

      {/* Roadmap note */}
      <div
        className="mt-4 p-4 rounded-xl flex gap-3 flex-col sm:flex-row"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
      >
        <CreditCard
          size={18}
          color="#92400E"
          strokeWidth={2}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.55 }}>
          <strong>Yol haritası:</strong> Bu sayfa şu an plan-dağılım okuma görünümü.
          Iyzico ödeme entegrasyonu (`/api/payments`) Wave 3.5 kapsamında devreye
          alınacak; o zamana kadar plan değişiklikleri{' '}
          <Link href="/admin/members" className="underline text-[#92400E]">
            İşletme Sahipleri
          </Link>{' '}
          listesindeki inline-edit ile manuel yapılır.
        </div>
      </div>
    </div>
  );
}
