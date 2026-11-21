// Denetim Merkezi — owner sayfalarının (liste / detay / yeni / düzenle) ortak
// sunucu tarafı girişi.
//
// Dört sayfa aynı 25 satırı tekrar ediyordu: cookie → JWT → admin rolü kontrolü
// → işletme kapsamı. Tek yerde tutulur ki bir sayfada unutulan kontrol
// (ör. ekip üyesi kapsamı, CLAUDE.md §38.240) bir daha oluşmasın.
//
// Sonuçlar / yanıt incelemesi sayfaları kendi kopyalarını kullanmaya devam
// eder; bu yardımcı yalnız burada çağrılır.

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import { isAdminRole, verifyJwt } from '@/lib/auth';
import { canWriteForUserPayload, getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';

export interface OwnerAuditPageContext {
  locale: Locale;
  userId: string;
  /** Çağıranın erişebildiği işletmeler (ekip üyeleri dahil). */
  scopedIds: string[];
  /** Salt-okunur (viewer) ekip üyesi false. Gerçek kapı API'dir; bu yalnız UI içindir. */
  canWrite: boolean;
}

/**
 * Oturumu doğrular, işletme kapsamını ve yazma yetkisini çözer. Oturum yoksa /
 * admin ise giriş sayfasına yönlendirir (`redirect` fırlatır).
 *
 * @param nextPath giriş sonrası dönülecek yol (`/tr/dashboard/audits/…`).
 */
export async function requireOwnerAuditContext(
  localeParam: string,
  nextPath: string,
): Promise<OwnerAuditPageContext> {
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const loginUrl = `/${locale}/auth/login?next=${nextPath}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(loginUrl);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(loginUrl);
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) redirect(loginUrl);

  const tokenPayload = { userId: payload.userId, role: payload.role, email: payload.email };
  // Ekip üyeleri dahil — API katmanının çözdüğü kapsamın aynısı. `userId:
  // payload.userId` filtresi davetli üyelerden tüm işletmeleri gizlerdi.
  // The two lookups are independent (team members only hit the DB for both).
  const [scopedIds, canWrite] = await Promise.all([
    getScopedRestaurantIdsForUserPayload(tokenPayload),
    canWriteForUserPayload(tokenPayload),
  ]);

  return { locale, userId: payload.userId, scopedIds, canWrite };
}

/** Katılımcıya verilen linklerin köküdür (`<appUrl>/audits/<token>`). */
export async function resolveAuditAppUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return 'https://www.buaze.com';
}
