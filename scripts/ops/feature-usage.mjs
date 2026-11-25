#!/usr/bin/env node
// Feature usage snapshot (CLAUDE.md §57). Counts only — no names, emails or
// text leave the database. Runs in the app container as a Coolify scheduled
// task:  node scripts/ops/feature-usage.mjs
import { Prisma } from '@prisma/client';
import { writeFile, mkdir } from 'node:fs/promises';
import { OPS_DIR, prismaFor, json } from '../db-migration/common.mjs';

const prisma = prismaFor('DIRECT_URL');
const since30 = new Date(Date.now() - 30 * 86400_000);
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const out = { at: new Date().toISOString(), models: {}, extra: {} };

try {
  for (const m of Prisma.dmmf.datamodel.models) {
    const delegate = prisma[lc(m.name)];
    if (!delegate) continue;
    const fields = new Set(m.fields.map((f) => f.name));
    const row = {};
    try {
      row.total = await delegate.count();
      if (fields.has('createdAt')) {
        row.last30 = await delegate.count({ where: { createdAt: { gte: since30 } } });
        const agg = await delegate.aggregate({ _max: { createdAt: true } });
        row.lastAt = agg._max.createdAt?.toISOString().slice(0, 10) ?? null;
      }
      if (fields.has('restaurantId') && row.total > 0) {
        const g = await delegate.groupBy({ by: ['restaurantId'] });
        row.restaurants = g.length;
      }
    } catch (e) {
      row.error = String(e?.message ?? e).slice(0, 80);
    }
    out.models[m.name] = row;
  }

  const q = (sql) => prisma.$queryRawUnsafe(sql);
  out.extra.restaurants = await q(`select
      count(*) filter (where is_active) active,
      count(*) filter (where google_review_url is not null or google_place_id is not null) google_link,
      count(*) filter (where yemek_sepeti_url is not null) yemeksepeti,
      count(*) filter (where getir_yemek_url is not null) getir,
      count(*) filter (where trendyol_yemek_url is not null) trendyol,
      count(*) filter (where tripadvisor_url is not null) tripadvisor,
      count(*) filter (where menu_enabled) menu_enabled,
      count(*) filter (where menu_published) menu_published,
      count(*) filter (where google_review_management_enabled) gbp_mgmt
    from restaurants`).catch((e) => String(e.message).slice(0, 120));
  out.extra.owners = await q(`select count(*) total,
      count(*) filter (where u.created_at > now() - interval '30 days') new30,
      count(distinct s.user_id) active_sessions30
    from users u left join user_sessions s on s.user_id = u.id and s.created_at > now() - interval '30 days'
    where u.role = 'restaurant_owner'`).catch((e) => String(e.message).slice(0, 120));
  out.extra.feedbackContact = await q(`select count(*) total,
      count(*) filter (where email is not null or phone is not null) with_contact,
      count(*) filter (where rating >= 4) high, count(*) filter (where rating <= 3) low
    from feedback`).catch((e) => String(e.message).slice(0, 120));
  out.extra.replySources = await q(`select coalesce(source,'null') source, count(*) n from feedback_replies group by 1`).catch((e) => String(e.message).slice(0, 120));
  out.extra.redirectProviders = await q(`select provider, count(*) n from platform_redirect_events group by 1 order by 2 desc`).catch((e) => String(e.message).slice(0, 120));
  out.extra.lifecycle = await q(`select type, count(*) n from lifecycle_email_logs group by 1 order by 2 desc`).catch((e) => String(e.message).slice(0, 120));
  out.extra.healthKinds = await q(`select kind, count(*) n from restaurant_health_snapshots group by 1`).catch((e) => String(e.message).slice(0, 120));
  out.extra.auditTemplates = await q(`select coalesce(restaurant_id is null, true) system_wide, count(*) n from audit_templates group by 1`).catch((e) => String(e.message).slice(0, 120));
  out.extra.surveyStatus = await q(`select is_published, count(*) n from surveys group by 1`).catch((e) => String(e.message).slice(0, 120));
} finally {
  await prisma.$disconnect();
}

await mkdir(`${OPS_DIR}/reports`, { recursive: true });
const file = `${OPS_DIR}/reports/feature-usage-${out.at.replace(/[:.]/g, '')}.json`;
await writeFile(file, json(out));
for (const [name, r] of Object.entries(out.models)) {
  if (r.total === 0 && !r.error) continue;
  console.log(`${name} ${json(r)}`);
}
console.log('EMPTY', Object.entries(out.models).filter(([, r]) => r.total === 0).map(([n]) => n).join(','));
for (const [k, v] of Object.entries(out.extra)) console.log(`${k} ${json(v)}`);
