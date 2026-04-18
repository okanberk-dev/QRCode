import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';

/**
 * Root page — detects the best locale for the visitor and redirects.
 *
 * Priority order:
 *   1. `NEXT_LOCALE` cookie (explicit user choice, set by the language switcher)
 *   2. `Accept-Language` request header (browser preference)
 *   3. Fallback to English so international visitors are never stuck on Turkish
 */
export default async function RootPage() {
  // 1. Honor an existing user preference stored in the cookie.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale === 'tr' || cookieLocale === 'en') {
    redirect(`/${cookieLocale}`);
  }

  // 2. Fall back to the browser's Accept-Language header.
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferredLangs = acceptLanguage
    .split(',')
    .map((l) => l.split(';')[0].trim().toLowerCase())
    .filter(Boolean);

  for (const lang of preferredLangs) {
    if (lang.startsWith('tr')) redirect('/tr');
    if (lang.startsWith('en')) redirect('/en');
  }

  // 3. Default to English for any other international visitors.
  redirect('/en');
}
