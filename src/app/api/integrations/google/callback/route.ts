// SCAFFOLDED: Google OAuth callback. Exchange `code` for tokens and
// upsert a `GoogleIntegration` row, then fetch the user's Business
// Profile locations.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Until wired, redirect back to settings with a query flag.
  const redirect = new URL(url.origin);
  redirect.pathname = '/tr/dashboard/profile';
  redirect.searchParams.set(
    'google',
    error ? `error:${error}` : code ? 'pending-wire' : 'cancelled',
  );
  return Response.redirect(redirect.toString(), 302);
}
