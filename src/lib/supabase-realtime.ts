// Stage 16 §38.86 — Supabase Realtime client factory (browser-side).
//
// Niye singleton? @supabase/supabase-js içinden createClient her çağrıldığında
// yeni bir WebSocket transport oluşur. ActivityFeed mount/unmount her seferinde
// yeni client yaratırsak (örn. React Strict Mode double-render dev'de) lingering
// WebSocket'lar Vercel function deploy quota'sını yiyemez ama tarayıcı CPU
// + memory artar. Module-level singleton + lazy init.
//
// Auth flow:
//  1. Component mount → fetch('/api/realtime/token') → { token, restaurantIds }
//  2. getRealtimeClient() singleton'a setAuth(token) yaz
//  3. supabase.channel(...).subscribe(...) ile postgres_changes dinle
//  4. ~55min'de token expire öncesi yeniden fetch + setAuth(newToken)
//     (channel kopmaz, header'da güncel token gider)
//
// Niye `realtime.setAuth` ve `auth.setSession` değil? supabase-js v2:
//   - `auth.setSession({ access_token, refresh_token })` Supabase Auth flow
//     için (kullanıcı login). Refresh token bizde yok, sahte değer geçmek
//     gereksiz risk.
//   - `realtime.setAuth(token)` doğrudan Realtime WebSocket connection'a
//     JWT yazar. PostgREST + Realtime aynı JWT'yi tüketir. Bizim use case
//     için doğru API.

// The SDK (~57 KB gzip) is loaded on demand: the client is only needed after
// the activity feed mounts, and never when the realtime env is unset. A
// static import put it in the dashboard home's initial JavaScript.
import type { SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

function realtimeEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Whether Realtime can run in this browser (env set). Synchronous and does
 * not download the SDK, so a missing env never costs a request.
 */
export function isRealtimeConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return realtimeEnv() !== null;
}

export function getSupabaseRealtimeClient(): Promise<SupabaseClient | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (cachedClient) return Promise.resolve(cachedClient);

  const env = realtimeEnv();
  if (!env) {
    // Env yoksa Realtime aktif değil; caller graceful degrade ile sayfa
    // reload-bazlı CANLI AKIŞ (CLAUDE.md §38.31) modunda kalır.
    return Promise.resolve(null);
  }

  // One in-flight import for concurrent callers, so only one client (and one
  // WebSocket transport) is ever created.
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) => {
      cachedClient = createClient(env.url, env.anonKey, {
        auth: {
          // Supabase Auth flow kullanmıyoruz (custom JWT, CLAUDE.md §4); bu
          // ayarlar Auth state machine'inin browser side'da localStorage'a
          // sahte oturum yazmasını engeller.
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            // Server-side eventsPerSecond: tek client'ın yayabileceği max
            // mesaj. Bizim use case sadece postgres_changes alıyor (server
            // push); 10/sec yüksek burst trafik için emniyet.
            eventsPerSecond: 10,
          },
        },
      });
      return cachedClient;
    })
    .catch(() => {
      // SDK chunk failed to load (offline / deploy swap): degrade like a
      // missing env; the next mount tries again.
      clientPromise = null;
      return null;
    });

  return clientPromise;
}

/** The client if it has already been created (no import, no creation). */
export function peekSupabaseRealtimeClient(): SupabaseClient | null {
  return cachedClient;
}

/**
 * Token mint endpoint'inden alınan JWT'yi Supabase realtime auth context'ine
 * yazar. Supabase WebSocket open ise yeni token connection'a propagate
 * edilir; channel'lar yeniden subscribe etmeden devam eder. Call after
 * `getSupabaseRealtimeClient()` resolved a client.
 */
export function setRealtimeAuth(token: string | null): void {
  const client = cachedClient;
  if (!client) return;
  client.realtime.setAuth(token);
}

/**
 * Cleanup helper — tüm channel'ları kapat. Pratikte component unmount'ta
 * `supabase.removeChannel(channel)` zaten yeterli; bu helper test/dev
 * "tüm WebSocket'ları kapat" için.
 */
export async function teardownRealtimeClient(): Promise<void> {
  if (!cachedClient) return;
  await cachedClient.removeAllChannels();
  cachedClient = null;
  clientPromise = null;
}
