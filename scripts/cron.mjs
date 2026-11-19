// Self-host (Coolify) zamanlanmış görevleri için tetikleyici: `node scripts/cron.mjs /api/cron/<iş>`.
// Konteynerin içinden kendi sunucusuna, Vercel Cron'un yaptığı gibi `Authorization: Bearer $CRON_SECRET`
// ile GET atar. 2xx dışında çıkış kodu 1 olur, görev Coolify'da kırmızı görünür. docs/SELF_HOST.md
const path = process.argv[2];
if (!path || !path.startsWith('/api/cron/')) {
  console.error('kullanım: node scripts/cron.mjs /api/cron/<iş>');
  process.exit(2);
}
if (!process.env.CRON_SECRET) {
  console.error('CRON_SECRET tanımlı değil');
  process.exit(1);
}
const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
try {
  const res = await fetch(base + path, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    signal: AbortSignal.timeout(320_000),
  });
  const body = (await res.text()).slice(0, 800);
  console.log(`${path} → HTTP ${res.status}`, body);
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.error(`${path} → istek başarısız:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
