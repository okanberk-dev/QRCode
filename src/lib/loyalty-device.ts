/**
 * "This phone has a card here" (CLAUDE.md §61). When a card opens, the
 * browser keeps its token in an httpOnly cookie scoped to that business's
 * pages (`Path=/l/<slug>`), so the next QR scan or NFC tap at the counter
 * opens the card straight away instead of the join form. The same secret is
 * already in the card URL; the cookie is never sent anywhere else.
 */
import type { NextRequest, NextResponse } from 'next/server';

const MAX_AGE = 400 * 24 * 60 * 60; // the longest a browser keeps a cookie

export function cardCookieName(slug: string): string {
  return `bzc_${slug}`;
}

function secureFlag(req?: NextRequest): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    (!req || req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:')
  );
}

export function setCardCookie(res: NextResponse, slug: string, token: string, req?: NextRequest): void {
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !/^[A-Za-z0-9_-]{24,64}$/.test(token)) return;
  res.cookies.set(cardCookieName(slug), token, {
    httpOnly: true,
    secure: secureFlag(req),
    sameSite: 'lax',
    path: `/l/${slug}`,
    maxAge: MAX_AGE,
  });
}

export function clearCardCookie(res: NextResponse, slug: string): void {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return;
  res.cookies.set(cardCookieName(slug), '', { httpOnly: true, sameSite: 'lax', path: `/l/${slug}`, maxAge: 0 });
}

/** Token from the cookie value, if it looks like one. */
export function readCardCookie(value: string | undefined | null): string | null {
  return value && /^[A-Za-z0-9_-]{24,64}$/.test(value) ? value : null;
}
