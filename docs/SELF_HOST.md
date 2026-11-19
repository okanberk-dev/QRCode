# Self-host: Coolify (Vercel'den geçiş)

Hedef: `https://www.buaze.com` (apex `buaze.com` → www), Coolify sunucusu `199.247.6.54` (gnbsite / Pruva ile aynı sunucu,
Traefik + Let's Encrypt). Veritabanı, dosyalar ve Realtime **Supabase'te kalır**; Upstash, Sentry, Firebase, Resend, PayNKolay aynen
kullanılır. Sunucu yalnız Next uygulamasını çalıştırır.

Neden: repo `okanberk-dev` organizasyonuna taşındı; Vercel Hobby organizasyonun private reposundan deploy almaz.

## Coolify uygulaması

| Ayar | Değer |
|---|---|
| Kaynak | GitHub App (okanberk-dev), repo `okanberk-dev/QRCode`, dal `main`, Auto Deploy açık |
| Build pack | Nixpacks (Dockerfile yok). Kurulum `npm ci` (postinstall: `prisma generate`), derleme `npm run build`, başlatma `npm run start` |
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

`PAYNKOLAY_SX`, `PAYNKOLAY_SX_LIST`, `PAYNKOLAY_MERCHANT_SECRET_KEY`, `PAYNKOLAY_MERCHANT_NO`, `PAYNKOLAY_BASE_URL`
(canlı: `https://paynkolay.nkolayislem.com.tr`). Dönüş adresi `https://www.buaze.com/api/billing/paynkolay/return`
(ödeme sırasında form ile gönderilir, PayNKolay panelinde ayrıca tanımlanması gerekmez).

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
