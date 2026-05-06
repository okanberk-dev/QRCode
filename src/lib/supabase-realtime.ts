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

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Env yoksa Realtime aktif değil; caller graceful degrade ile sayfa
    // reload-bazlı CANLI AKIŞ (CLAUDE.md §38.31) modunda kalır.
    return null;
  }

  cachedClient = createClient(url, anonKey, {
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
}

/**
 * Token mint endpoint'inden alınan JWT'yi Supabase realtime auth context'ine
 * yazar. Supabase WebSocket open ise yeni token connection'a propagate
 * edilir; channel'lar yeniden subscribe etmeden devam eder.
 */
export function setRealtimeAuth(token: string | null): void {
  const client = getSupabaseRealtimeClient();
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
}
