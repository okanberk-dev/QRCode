# Self-host: Coolify (Vercel'den geçiş)

Hedef: `https://www.buaze.com` (apex `buaze.com` → www), Coolify sunucusu `199.247.6.54` (gnbsite / Pruva ile aynı sunucu,
Traefik + Let's Encrypt). 2026-11-24'ten beri veritabanı da bu sunucuda: Coolify PostgreSQL 17 (`buaze-postgres`, iç ağ),
dosyalar onun içinde (`stored_files`), canlı akış uygulamanın kendi SSE'si (README "Veritabanı ve yedekler", CLAUDE.md §55).
Supabase yalnız 14 günlük geri dönüş yedeği olarak dokunulmadan bekler. Upstash, Sentry, Firebase, Resend, PayNKolay aynen
kullanılır.

Neden: repo `okanberk-dev` organizasyonuna taşındı; Vercel Hobby organizasyonun private reposundan deploy almaz.

## Coolify uygulaması

| Ayar | Değer |
|---|---|
| Kaynak | GitHub App (okanberk-dev), repo `okanberk-dev/QRCode`, dal `main`, Auto Deploy açık |
| Build pack | Dockerfile (depo kökü, `node:22-trixie-slim` + `postgresql-client` 17 + `curl`). "Use Docker Build Secrets" açık (derleme sırları imaj geçmişine yazılmaz). Kurulum `npm ci` (postinstall: `prisma generate`), derleme `npm run build`, başlatma `npm run start`. Railpack kullanılmıyor: derleme `prisma migrate deploy` ve ön render için iç ağdaki veritabanına bağlanır, Railpack derlemesi o adı çözemiyor (`railpack.json` yalnız geri dönüş için duruyor) |
| Sağlık kontrolü | `GET /api/health` (Coolify; curl ile). Yeni konteyner sağlıklı olmazsa eskisi çalışmaya devam eder. Dockerfile'dan önceki (Railpack) bir imaja rollback etmeden önce sağlık kontrolünü kapatın: o imajlarda curl yok |
| Node | `NIXPACKS_NODE_VERSION=22` (CI ile aynı) |
| Port | Exposes `3000`; Ports Mappings **boş** (Traefik Docker ağından erişir) |
| Domains | `https://www.buaze.com,https://buaze.com` |
| Health check | `GET /api/health` → 200 (veritabanına gitmez) |
| Ölçek | Tek örnek |

`npm run build` Vercel'deki gibi `validate-env.js` → `generate-public-routes` → `prisma migrate deploy` → `next build` çalıştırır:
derleme sırasında `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` ve bütün `NEXT_PUBLIC_*` değişkenleri
gerekir (Coolify'da "Available at Buildtime" açık). `NEXT_PUBLIC_*` değerleri istemci paketine derlemede gömülür; değişince yeniden
derleme gerekir.

### Ortam değişkenleri

Vercel Production'daki değişkenlerin aynısı, şunlar **hariç**: `VERCEL`, `VERCEL_*`, `SENTRY_VERCEL_LOG_DRAIN_URL` (Vercel log
drain'i; burada kullanılmaz). Vercel'de "Sensitive" işaretli değerler Vercel'den geri okunamaz; yerel `.env.local`'dan ya da
sağlayıcının panelinden alınır. `JWT_SECRET` değişirse bütün oturumlar bir kez kapanır. `CRON_SECRET` yeni üretilebilir
(`openssl rand -hex 32`); aşağıdaki görevler onu konteynerin kendi ortamından okur.

Kod Vercel'e özgü iki şeyi ayırır: Vercel Analytics / Speed Insights yalnız `VERCEL=1` iken yüklenir; `/api/health`'in `commit`
alanı Coolify'da `SOURCE_COMMIT`'ten gelir.

### Otomatik deploy denetimi

`.github/workflows/deploy-verify.yml` `main`'e her push'ta `/api/health`'i yoklar; push edilen commit 20 dakikada yayına
çıkmazsa Coolify deploy webhook'unu bir kez çağırır, yine çıkmazsa iş kırmızı biter (GitHub push edene mail atar).
Gereken ayarlar:

- Coolify uygulamasında Auto Deploy açık ve "Include Source Commit in Build" açık (`commit` alanı boş kalırsa denetim hep
  kırmızı olur).
- GitHub → Settings → Secrets and variables → Actions: secret `COOLIFY_DEPLOY_WEBHOOK` (Coolify → uygulama → Webhooks →
  Deploy Webhook URL) ve `COOLIFY_TOKEN` (deploy izinli API token). İsteğe bağlı variable `DEPLOY_CHECK_URL`
  (varsayılan `https://www.buaze.com`).

### PayNKolay

- `PAYNKOLAY_ENV=live` **zorunlu** (PayNKolay değerlerinden biri varken yoksa `validate-env` derlemeyi durdurur; çalışma anında
  kartla ödeme kapalıdır). Varsayılan sunucu yoktur.
- `PAYNKOLAY_SX`, `PAYNKOLAY_SX_LIST`, `PAYNKOLAY_MERCHANT_SECRET_KEY`, `PAYNKOLAY_MERCHANT_NO`; `PAYNKOLAY_BASE_URL` isteğe bağlı,
  verilirse tam olarak `https://paynkolay.nkolayislem.com.tr` olmalı. Dönüş adresi
  `https://www.buaze.com/api/billing/paynkolay/return` (ödeme sırasında form ile gönderilir, PayNKolay panelinde ayrıca
  tanımlanması gerekmez).
- Faturalama bağlaması (billing spec §5): `NEXT_PUBLIC_SITE_URL=https://www.buaze.com` (açıkça yazılmalı; boşsa bağlama tutmaz),
  `BILLING_ALLOWED_HOSTS=www.buaze.com,buaze.com` (Coolify Domains listesindeki host'lardan en az biri de bu listede olmalı),
  `BILLING_LIVE_DB_REF=<üretim veritabanı host'u, DATABASE_URL içinde geçen: wgnqbhlzm6nbftv3qqkvzxv3>`, `BILLING_HMAC_KEY` ve `BILLING_VAULT_KEY` (32 bayt base64,
  `openssl rand -base64 32`; çevrimdışı yedeklenir), isteğe bağlı `TRUSTED_PROXIES`. Ardından üretim veritabanında bir kez
  `npx tsx scripts/billing-bind-env.ts --env live`. Bağlama tutmazsa `billing-renewals` hiçbir şey yapmaz (yanıt
  `skipped: "binding"`, Sentry uyarısı `billing-binding-skipped`): bekleyen kart ödemeleri mutabakat görmez, `pending` kalır.
- **Yalnız çalışma anında** (Coolify'da "Available at Buildtime" kapalı): `PAYNKOLAY_SX`, `PAYNKOLAY_SX_LIST`,
  `PAYNKOLAY_MERCHANT_SECRET_KEY`, `PAYNKOLAY_MIT_SX`, `PAYNKOLAY_MIT_SECRET_KEY`, `BILLING_VAULT_KEY(_PREVIOUS)`,
  `BILLING_HMAC_KEY(_PREVIOUS)`, `ENCRYPTION_KEY`, `CRON_SECRET`. Nixpacks derleme değişkenlerini imaja gömer.
- `PAYNKOLAY_ENV=test` yalnız ayrı bir test veritabanıyla (`billing-bind-env --env test`); üretim veritabanına karşı
  derleme hata verir, ödeme oluşturulmaz ve sonuçlandırılmaz.
- Vekil düzeni: istemci → Traefik (Coolify, `199.247.6.54`) → uygulama, CDN yok. Traefik `forwardedHeaders.trustedIPs` boş
  kalır (istemcinin gönderdiği `X-Forwarded-For`'u ezer). Önüne bir CDN konursa aralıkları aynı değişiklikte hem Traefik
  `forwardedHeaders.trustedIPs`'e hem `TRUSTED_PROXIES`'e eklenir. Traefik erişim günlüğü bu uygulama için kapalı kalır.

## Zamanlanmış görevler (vercel.json `crons` + cron-hourly.yml)

Vercel Cron artık yok; Coolify → uygulama → **Scheduled Tasks**. Saatler **UTC** (Vercel Cron gibi; Coolify sunucusunun saat dilimi
UTC değilse ifadeleri ona göre kaydırın). Her görevin komutu (konteynerde çalışır; `scripts/cron.mjs` 2xx dışında 1 ile çıkar,
zaman aşımı Coolify'da 330 sn):

```sh
node scripts/cron.mjs <YOL>
```

| Görev | Yol | Zaman (UTC) |
|---|---|---|
| weekly-digest | `/api/cron/weekly-digest` | `0 9 * * 1` |
| anonymize-ips | `/api/cron/anonymize-ips` | `0 3 * * 0` |
| monthly-newsletter | `/api/cron/monthly-newsletter` | `0 12 1 * *` |
| platform-link-retest | `/api/cron/platform-link-retest` | `0 4 * * *` |
| lifecycle-emails | `/api/cron/lifecycle-emails` | `0 8 * * *` |
| google-reviews-alert | `/api/cron/google-reviews-alert` | `35 * * * *` (saatlik) |
| expire-impersonation-sessions | `/api/cron/expire-impersonation-sessions` | `5 * * * *` (saatlik) |
| feedback-autodraft | `/api/cron/feedback-autodraft` | `10 * * * *` (saatlik) |
| google-reviews-autodraft | `/api/cron/google-reviews-autodraft` | `20 * * * *` (saatlik) |
| monthly-health-snapshot | `/api/cron/monthly-health-snapshot` | `0 2 1 * *` |
| monthly-health-report | `/api/cron/monthly-health-report` | `0 13 1 * *` |
| process-scheduled-deletions | `/api/cron/process-scheduled-deletions` | `0 3 * * *` |
| rating-drop-alert | `/api/cron/rating-drop-alert` | `0 11 * * 1` |
| billing-renewals | `/api/cron/billing-renewals` | `25 * * * *` (saatlik) |
| google-reviews-refresh | `/api/cron/google-reviews-refresh` | `*/15 * * * *` |

`google-reviews-refresh` (zaman aşımı 330 sn): Google yorum widget'ının merkezi yenileme kuyruğu (CLAUDE.md §53). Her
çalışmada önce yarım kalan toplu Google yanıt işlerini sürdürür (CLAUDE.md §54), sonra sırası gelen en çok 20 işletmenin
tüm yorumlarını sayfa sayfa yeniler (işletme başına 6–12 saatte bir), kota hatasında turu keser.
vercel.json'daki günlük satır yalnız test sözleşmesidir.

`billing-renewals` (zaman aşımı 330 sn): kart ödemelerinin mutabakatı (dönüşte doğrulanamayan ödemeler `pending` kalır ve
burada sonuçlanır), dönem sonları, hesap silme sonrası kart temizliği, günlük taramalar ve saklama. Bu görev yoksa **hiçbir şey
zamanında yenilenmez ya da sona ermez** (dönem sonu yine 08:00'deki lifecycle-emails ile işler) ve bekleyen ödemeler `pending`
kalır; hesap silmeler en çok 7 gün ertelenir. vercel.json'daki günlük satır yalnız test sözleşmesidir; `cron-hourly.yml`'a
eklenmez.

Saatlik dört görev Vercel'de günde bir kez (Hobby sınırı) koşuyordu, saatlik turu GitHub Actions'taki `cron-hourly.yml`
veriyordu. Burada ikisi tek görevde: saatte bir, `cron-hourly.yml`'ın sırasıyla (önce taslaklar, sonra uyarı). O iş akışı devre
dışı kalır. Uçlar idempotent: geçişte bir tur iki kez koşsa da zarar yok.

Görevler `withCronGuard`'dan geçer; `User-Agent` Vercel'inki olmadığı için hata durumunda gerçek durum kodu döner ve görev
kırmızı görünür (Coolify görev geçmişinde).

## Geçiş sırası

1. Coolify uygulaması kurulur, geçici `*.sslip.io` adresinde açılır ve denenir (`/api/health`, ana sayfa). Bu sırada Vercel
   üretimi aynen çalışır; Coolify'da zamanlanmış görev **yok** (Vercel Cron iki kez koşmasın).
2. DNS (Vercel DNS, `buaze.com` zonu): `@` ve `www` için A kaydı `199.247.6.54`; domainler Vercel projesinden çıkarılır.
   Coolify'da domainler eklenir, Let's Encrypt sertifikası alınır.
3. Zamanlanmış görevler Coolify'a eklenir; Vercel projesi duraklatılır (Vercel Cron da durur).
4. Firebase Auth (`/__/auth` proxy), Google OAuth yönlendirmesi ve PayNKolay dönüş adresi (`/api/billing/paynkolay/return`) aynı alan adında kaldığı için değişiklik
   gerekmez; yine de giriş ve ödeme sayfası denenir.

Geri dönüş: DNS kayıtları silinip domainler Vercel projesine geri eklenir, proje `unpause` edilir.
