import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectLocaleFromAcceptLanguage } from '@/lib/translations';

// Locale-less Dodo Payments return-URL landing.
//
// `DODO_PAYMENTS_RETURN_URL` env'i tek bir adres taşıyabilir (locale-aware
// olamaz çünkü Dodo akışı pre-checkout sırasında kullanıcı locale'ini
// tek başına bilemez). Bu yüzden owner self-service checkout sonrası
// Dodo `buaze.com/dashboard/account?subscription_id=...&status=active`
// gibi locale-less bir adrese döner. Buaze panel route'ları
// `src/app/[locale]/dashboard/account` altında olduğu için locale-less
// path Next.js routing'de 404 dönüyordu.
//
// Bu segment'in tek görevi:
//   1. Accept-Language header'ından locale tespit et (TR primary, EN fallback)
//   2. Dodo query string'ini (subscription_id / status / email) preserve et
//   3. `/{locale}/dashboard/account?<query>` adresine redirect et
//
// CLAUDE.md §22.9 (locale fallback disiplini) + §44.6 (Dodo portal-driven
// flow) + §38.229 (Stage 149 closure) ile uyumlu.
export const dynamic = 'force-dynamic';

function buildQueryString(sp: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else {
      params.set(key, value);
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export default async function DashboardAccountLocaleRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = buildQueryString(sp);

  const hdrs = await headers();
  const locale = detectLocaleFromAcceptLanguage(hdrs.get('accept-language'));

  redirect(`/${locale}/dashboard/account${query}`);
}
