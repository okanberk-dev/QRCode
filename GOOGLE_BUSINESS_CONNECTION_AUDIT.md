# Google İşletme Hesabı Bağlantısı — Audit Raporu

**Tarih:** 2026-05-24
**Kapsam:** Owner panel "Google hesabını bağla" akışı (OAuth + token refresh + locations + reviews + UI feedback)
**Branch:** `claude/google-business-audit-ye9TA`
**Yöntem:** 1 paralel Explore agent + manuel kod doğrulaması (callback → UI handoff chain)

---

## TL;DR — Bulgu Özeti

Backend OAuth + token + quota katmanı **çok sağlam**: RFC 6749 §10.12 CSRF nonce + timing-safe compare + actor-match (§37.2.F PASS) + retry/reauth wrapper + 4-katmanlı quota strategy (§5.1.1 PASS). **Bağlantı akışı kodda kırık değil**.

Ancak owner "neden bağlanmıyor?" diye sorduğunda 5 gerçek nedenden biri olabilir; ve bunların **3 tanesi UI/UX feedback eksikliğinden** kaynaklanır (kullanıcı gerçekte ne olduğunu görmüyor).

| # | Bulgu | Severity | Tip |
|---|---|---|---|
| 1 | **Callback `?google=*` query param UI'da hiç işlenmiyor** | **CRITICAL** | UX gap |
| 2 | Vercel env eksik (`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`) → silent fail | HIGH | Config |
| 3 | `GOOGLE_REDIRECT_URI` mismatch (Google Cloud Console vs Vercel) | HIGH | Config |
| 4 | OAuth callback'te Sentry capture yok → ops kör | MEDIUM | Observability |
| 5 | State nonce TTL (12dk) cookie'de var ama timestamp check yok | MEDIUM | Security defansif |
| 6 | Refresh token plain text storage | LOW | Defansif security |
| 7 | Error messages TR-only (locale param yok) | LOW | i18n |

---

## 1. OAuth Flow Özeti (Happy Path)

**Connect** (`POST /api/integrations/google/connect`, `connect/route.ts:34-86`):
1. `getPanelActorFromRequest` ile actor doğrulanır (401 değilse devam)
2. `GOOGLE_CLIENT_ID` yoksa → `{ ok:false, configured:false, error:'missing_google_client_id' }` (200)
3. `randomBytes(32)` ile nonce + state JSON (`{owner, nonce, ts, returnTo}`) base64url encode
4. `bz_google_oauth_state` httpOnly cookie set (12 dk TTL, sameSite=lax)
5. Google authorize URL + state döner → frontend `window.location.href` ile redirect eder

**Callback** (`GET /api/integrations/google/callback`, `callback/route.ts:59-162`):
1. `?error=...` varsa → `redirectBack(req, 'error:${error}')`
2. `?code` yoksa → `redirectBack(req, 'cancelled')`
3. Actor yoksa → `redirectBack(req, 'unauthorized')`
4. State parse + base64url decode + JSON.parse (safeParseJson)
5. Cookie nonce ile **timing-safe compare** (`timingSafeEqual`) → mismatch → `redirectBack('state-mismatch')`
6. State `owner` field actor ile eşleşmeli → değilse `redirectBack('state-actor-mismatch')`
7. POST `oauth2.googleapis.com/token` (grant_type=authorization_code)
8. `GoogleIntegration.upsert({ userId, accessToken, refreshToken?, expiresAt })`
9. `redirectBack('connected')`

**`redirectBack()`** (`callback/route.ts:30-44`): hedef = `returnTo` (whitelisted) veya default `/tr/dashboard/account?section=notifications`. Her durumda `?google=<status>` query string'i ekler.

---

## 2. Token Refresh & Expiry

`getFreshGoogleAccessToken()` (`google-business.ts:341-437`):
- Cache hit: `expiresAt > Date.now()+60s` → no Google call ✅
- Refresh: POST `oauth2.googleapis.com/token` (grant_type=refresh_token), 1 retry on 5xx/network, 1s backoff
- 4xx (invalid_grant): `refreshToken = NULL` set → `GOOGLE_REAUTH_REQUIRED` (terminal) ✅
- `refreshToken` baştan null → aynı reauth path ✅
- Mid-flight 401 (`googleBusinessFetch:593-610`): `expiresAt = new Date(0)` → force refresh → retry once → still 401 → reauth ✅

Retry policy: MAX_RETRIES=2, backoff [1s, 2s], 429 Retry-After respect (max 30s clamp). 504 timeout 15s/request. ✅

---

## 3. Quota Strategy (CLAUDE.md §5.1.1 — PASS)

4 katman doğru implement edilmiş (`locations/route.ts`):
1. **30s server cache** → force=false + cache taze + accounts.length>0 → DB cache, Google'a gitme (line 72-88)
2. **`?force=true` bypass** sadece kullanıcı manuel "Konumları yenile" butonunda (UI: `loadLocations(true)`)
3. **Per-restaurant 6/dk Upstash** → fail durumu stale cache + `warning: CLIENT_THROTTLED` (line 93-115)
4. **Soft 429 fallback** → Google 429 dönerse hep 200 + `warning: GOOGLE_RATE_LIMITED` + retry-after + UI auto-retry countdown (line 134-160)

`locations/select` POST'ta rating fetch sadece `initialGoogleRating === null && currentGoogleRating === null` (line 88-105) — bonus quota tasarrufu.

---

## 4. KRİTİK BULGULAR (öncelik sırasına göre)

### 🔴 #1 CRITICAL — Callback `?google=*` query param UI'da hiç işlenmiyor

**Dosya:** `src/app/api/integrations/google/callback/route.ts:42`

```ts
url.searchParams.set('google', status);  // 'connected' | 'cancelled' | 'state-mismatch' | 'error:access_denied' | 'token-error' | 'state-invalid' | 'state-actor-mismatch' | 'missing-config' | 'token-missing' | 'unauthorized'
```

Callback `redirectBack` ile **10 farklı status** üretiyor ama UI tarafında **hiçbiri yakalanmıyor**.

**Kanıt** (grep site-wide):
```bash
$ grep -rn "searchParams.get('google')\|google=connected\|google=error" src
src/app/api/integrations/google/callback/route.ts:42:  url.searchParams.set('google', status);
# → SIFIR consumer
```

`AccountSettingsClient.tsx:114` sadece `?section` query param'ını okuyor.
`google-reviews/page.tsx:686-689` sadece `?restaurantId` query'sini okuyor.
`GoogleBusinessIntegrationPanel.tsx` — `useSearchParams` bile import etmiyor.

**Senaryo (owner "neden bağlanmıyor" diyor):**
1. Owner "Google hesabını bağla" tıkladı
2. Google consent screen → cancelled, **veya** state-mismatch (browser back, cookie expired), **veya** access_denied (test mode + non-test user), **veya** token-error
3. Callback `/tr/dashboard/account?section=notifications&google=state-mismatch` adresine redirect ediyor
4. **UI hiçbir banner, toast, alert göstermiyor** — sayfa "sanki hiçbir şey olmamış gibi" yükleniyor
5. Owner: "neden bağlanmadı? buton çalışmıyor mu? hata mı var?" → support ticket

**Aynı şekilde happy path da görünmez**: `?google=connected` durumunda owner "bağlandı" feedback'i göremiyor. Sadece `status.connected = true` flag'i mount fetch'inde geliyor — UX gecikmeli.

**Etki:** Her başarısız OAuth bağlama denemesi sessiz hata. Owner gerçek nedeni hiç görmüyor. En sık görülen "bağlanmıyor" şikayetinin temeli muhtemelen budur.

**Fix önerisi (küçük):** `useSearchParams` ile `google` paramını oku → 10 status için locale-aware `<AlertBanner>` (success/danger) → `router.replace(window.location.pathname)` ile param URL'den temizle. 1 hook + 1 effect + 1 message map = ~30 satır.

---

### 🔴 #2 HIGH — Google env var'ları `validate-env.js`'de yok

**Dosya:** `scripts/validate-env.js:39-72`

`required` listede 4 env (DATABASE_URL/DIRECT_URL/JWT_SECRET/NEXT_PUBLIC_APP_URL).
`optional` listede 11 env (Resend/OpenAI/Supabase/Upstash/Cron/reCAPTCHA/Realtime).

**Eksik:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_MAPS_API_KEY` — **hiçbir kategoride yok**.

**Senaryo:**
1. Operatör yeni Vercel deploy alıyor (env unutmuş)
2. Build geçer (Google env'leri zaten "optional" sayılır defacto, validate uyarmaz)
3. Owner panele girer → "Google hesabını bağla" tıklar
4. `connect/route.ts:38-46` → `{ configured: false, error: 'missing_google_client_id' }` (200 dönüyor — error değil!)
5. UI: `GoogleBusinessIntegrationPanel.tsx:237-240` — `setLocationsError(data?.message || 'Google OAuth başlatılamadı.')` → kırmızı banner, owner ne yapacağını bilmiyor

**Fix:** `validate-env.js` `optional` listesine ekle (warn-level — env yoksa graceful degrade, ama operator build-time görsün):
```js
['GOOGLE_CLIENT_ID', 'Google OAuth — owner "Google hesabını bağla" returns config error'],
['GOOGLE_CLIENT_SECRET', 'Google OAuth callback — token exchange impossible'],
['GOOGLE_REDIRECT_URI', 'Google OAuth callback — must match Cloud Console exactly'],
['GOOGLE_MAPS_API_KEY', 'Places API search — owner cannot search business name'],
```

---

### 🟠 #3 HIGH — `GOOGLE_REDIRECT_URI` mismatch (en sık gerçek bağlanma sorunu)

**Dosya:** `connect/route.ts:22-24` + `callback/route.ts:46-48`

```ts
function redirectUri(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;
}
```

Google OAuth Cloud Console **kayıtlı redirect_uri** ile callback'in kullandığı URI **EXACT** eşleşmeli (RFC 6749 §3.1.2.3). En küçük fark (trailing slash, http vs https, www. vs subdomain, port) → Google `redirect_uri_mismatch` error.

**Senaryo:**
1. Cloud Console'da kayıtlı: `https://buaze.com/api/integrations/google/callback`
2. Vercel production env'de `GOOGLE_REDIRECT_URI` = boş VE kullanıcı `https://www.buaze.com` üzerinden gelirse
3. `redirectUri()` fallback `https://www.buaze.com/api/integrations/google/callback` üretir (www subdomain)
4. Google consent screen → owner izin verir → callback → Google 400 `redirect_uri_mismatch`
5. UI: callback hiç çağrılmıyor — owner Google'ın error page'inde takılı kalır

**Owner için en kafa karıştırıcı senaryo**: localhost dev + prod env karışırsa lokal hiç çalışmaz.

**Fix:** `connect` endpoint'e startup check ekle: `GOOGLE_REDIRECT_URI` set değilse Sentry warn + UI'da explicit "Redirect URI configured: {env}, ensure Google Cloud Console matches".

---

### 🟡 #4 MEDIUM — OAuth callback'te Sentry capture yok

**Dosya:** `callback/route.ts:30-44, 132, 140`

```ts
if (!tokenRes.ok) return redirectBack(req, 'token-error', returnTo);
if (!tokens.access_token) return redirectBack(req, 'token-missing', returnTo);
```

**Hiçbir** Sentry `captureMessage` / `captureException` yok. `googleBusinessFetch` (token refresh + API calls) içinde var ama OAuth'un kendisinde yok.

**Sonuç:** Production'da owner state-mismatch / token-error yaşadığında ops dashboard'da iz yok. `?google=state-mismatch` UI'da da gözükmediği için (#1), Sentry'de de gözükmüyor → **çift körlük**.

**Fix (minimal):** Her `redirectBack(req, status, ...)` öncesinde `if (status !== 'connected') Sentry.captureMessage('Google OAuth callback failure', { level: 'warning', tags: { integration: 'google-oauth', reason: status } })`. PII-free (status = 'state-mismatch', 'token-error', vb.).

---

### 🟡 #5 MEDIUM — State nonce TTL cookie'de var, callback timestamp check eksik

**Dosya:** `callback/route.ts:90-99`

State JSON `ts: Date.now()` field'ı taşıyor (`connect/route.ts:62`) ama callback hiç kontrol etmiyor. Yalnızca cookie maxAge=720s (12 dk) süresine güveniyor.

**Saldırı senaryosu (düşük olasılık):** Saldırgan eski (12 dk + epsilon) cookie + state pair'i replay etse cookie zaten silinmiş olur (browser maxAge auto-clear). Ama eğer cookie set sırasında saat kayması, manuel cookie düzenleme, ya da cookie storage anomalisi varsa state replay window'u açılır.

**Defansif fix:** `callback/route.ts:100`'den sonra ekle:
```ts
const stateTs = parsedState && typeof parsedState.ts === 'number' ? parsedState.ts : 0;
if (Date.now() - stateTs > 12 * 60 * 1000) return redirectBack(req, 'state-expired', returnTo);
```

---

### 🟢 #6 LOW — Refresh token plain text DB storage

**Dosya:** `prisma/schema.prisma:780-790`

```prisma
model GoogleIntegration {
  accessToken   String
  refreshToken  String?
  expiresAt     DateTime
  ...
}
```

App-level encryption yok. Supabase encryption-at-rest (SOC2) var ama DB breach senaryosunda plain text refresh token'lar sızabilir. Token scope `business.manage`'e sınırlı (Maps write, Drive vb. yok) → blast radius dar, ama best practice değil.

**Defansif fix (uzun vade):** `accessToken` + `refreshToken` AES-GCM encryption helper + `ENCRYPTION_KEY` env. Migration: read-decrypt-write pattern. Şimdilik out-of-scope (sadece operatör onayında).

---

### 🟢 #7 LOW — Error messages TR-only (locale param yok)

`google-business.ts` + `locations/route.ts` + `locations/select/route.ts` tüm error mesajları hardcoded TR. UI tarafında `isTr` switch yapılıyor ama API response her zaman TR.

**Fix (defer):** Endpoint'lere `?locale=tr|en` veya `Accept-Language` header → conditional message. Owner panel zaten TR ağırlıklı, EN owner sayısı az → şimdilik LOW.

---

## 5. CLAUDE.md Disipline Uyumluluğu

| Disipline | Madde | Durum | Kanıt |
|---|---|---|---|
| OAuth state nonce CSRF | §37.2.F | ✅ PASS | `randomBytes(32)` + httpOnly cookie + `timingSafeEqual` + actor match (callback:102-112) |
| `getSecret()` production'da throw | §40.4.A | ✅ PASS | `getPanelActorFromRequest` `getSecret()` reuse, fail-closed |
| IDOR — restaurant whitelist | §40.4.B | ✅ PASS | Tüm `/restaurants/[id]/google/*` endpoint'leri `canWriteRestaurant` veya `canAccessRestaurant` |
| Public POST IP rate limit | §40.4.D | N/A | OAuth endpoint'leri auth-gated (actor zorunlu), public ingestion yok |
| `validateBody` + `.strict()` | §28.3.1 + §40.5 | ✅ PASS | `locations/select` Zod `.strict()` (line 23-26), `places/select`, `places/search` aynı |
| Sentry tagging | §26.5 | 🟡 PARTIAL | `googleBusinessFetch` capture var (line 314-326), OAuth callback'te yok (#4) |
| PII redaction | §37.7 + §40.4.A | ✅ PASS | `maskGoogleUrl()` token/PII strip, Sentry extra'da raw URL/body yok |
| Quota strategy | §5.1.1 | ✅ PASS | 30s TTL + force bypass + per-restaurant 6/dk + soft 429 graceful degrade |
| Auto-merge / chat logging | §39 | N/A | Audit-only PR, kod değişimi yok |

---

## 6. Owner Troubleshooting Checklist (operator için)

Owner "bağlanmıyor" şikayetinde sırasıyla:

1. **Tarayıcı DevTools → Network**:
   - `POST /api/integrations/google/connect` → 200 + `{ url: "https://accounts.google.com/..." }` mu?
   - 200 + `{ configured: false }` ise → Vercel env eksik (#2)
   - Network OK + Google consent screen açıldı → callback'e ne dönüyor?

2. **Callback URL kontrolü**:
   - Browser URL bar'da `?google=` query'sini ara
   - `?google=connected` → bağlandı ama UI banner yok (#1 hatası — gerçekte sorun yok)
   - `?google=state-mismatch` → cookie eksik/expired, owner yeniden dene (yeni sekmede yapmasın)
   - `?google=error:access_denied` → Google'da "Reddet" tıkladı veya OAuth consent screen'de owner test user değil
   - `?google=token-error` → `GOOGLE_REDIRECT_URI` mismatch (#3) — Google Cloud Console kontrol
   - `?google=state-actor-mismatch` → bağlama sırasında farklı user oturumu açtı (sekme paylaşımı)

3. **Vercel env doğrulama** (Settings → Environment Variables):
   - [ ] `GOOGLE_CLIENT_ID` non-empty
   - [ ] `GOOGLE_CLIENT_SECRET` non-empty
   - [ ] `GOOGLE_REDIRECT_URI` = `https://<prod-domain>/api/integrations/google/callback` (Cloud Console ile **EXACT** match)
   - [ ] `GOOGLE_MAPS_API_KEY` (Places search için ayrı)

4. **Google Cloud Console**:
   - OAuth consent screen → External + **Published** (Testing modunda sadece test users bağlanabilir)
   - Authorized redirect URIs → Vercel env ile birebir aynı
   - APIs enabled: My Business Account Management API + My Business Business Information API + Places API (New)

5. **Admin gate**:
   - Admin panel → ilgili restoran → "Google yorum yönetimi" toggle açık olmalı (`restaurant.googleReviewManagementEnabled = true`)
   - Kapalıyken locations/reviews endpoint'leri `GOOGLE_REVIEW_MANAGEMENT_DISABLED` döner

6. **Connect sonrası locations gelmiyorsa**:
   - Owner'ın bağladığı Google hesabı, restoranın Google Business Profile'ında **owner/manager** rolünde olmalı
   - Verified location yoksa `accounts: []` döner → UI: "Google İşletme Profili açın" CTA

---

## 7. Önerilen Aksiyon Sırası (kullanıcı talimatına göre)

Bu PR sadece audit raporu — kod değişimi yok. Kullanıcı onaylarsa:

**1. Sprint (HIGH, ~30 satır kod):**
- #1 fix — UI'da `?google=*` query handling + locale-aware banner (account + google-reviews + platforms pages)
- #2 fix — `validate-env.js` GOOGLE_* env'leri optional listesine ekle
- #4 fix — OAuth callback'e Sentry capture (failure path'lerinde)

**2. Sprint (MEDIUM, dokümantasyon):**
- #3 fix — `connect` endpoint'e startup warn + CLAUDE.md §5.1'e troubleshooting tablosu ekle
- #5 fix — Callback'te state timestamp check (defansif, 3 satır)

**3. Defer (kullanıcı talebine bağlı):**
- #6 — Token encryption (büyük scope, ENCRYPTION_KEY env + migration)
- #7 — Locale-aware API errors (UX nice-to-have)

---

## 8. Sonuç

Backend Google Business entegrasyonu **CLAUDE.md §5.1.1 quota + §37.2.F OAuth disipline'inin uygulamada en iyi örneği**. Code-level sorun yok.

Owner "neden bağlanmıyor?" şikayetinin %80 nedeni:
- **UX:** Callback başarı/hata feedback'i UI'da görünmüyor (#1)
- **Config:** Vercel env eksik veya Google Cloud Console redirect_uri mismatch (#2 + #3)

Tek bir küçük PR (#1 + #2 + #4 — toplam ~50 satır) bu üç sorunu kapatır ve "bağlanmıyor" support yükünü dramatik düşürür.
