/**
 * Route-level tests for `PATCH /api/restaurants/[id]/theme` (menu design spec
 * §8.1, §13, §16) and for the cover blob staying out of the generic
 * restaurant responses (§8.6).
 *
 * They call the real route handlers with real auth cookies against a real
 * PostgreSQL database, so they only run when a LOCAL throwaway database is
 * named explicitly:
 *
 *   MENU_TEST_DATABASE_URL=postgresql://user@127.0.0.1:5432/some_test_db npm test
 *
 * Without it the suite is skipped. The URL must point at localhost. The tests
 * create their own users and restaurants (unique ids) and delete them
 * afterwards. The JWT secret is a random value made at runtime.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const TEST_DB_URL = process.env.MENU_TEST_DATABASE_URL ?? '';

function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

const skip = !TEST_DB_URL
  ? 'set MENU_TEST_DATABASE_URL to a local throwaway database to run the theme route tests'
  : !isLocalDatabase(TEST_DB_URL)
    ? 'MENU_TEST_DATABASE_URL must point at localhost'
    : false;

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: import('next/server').NextRequest, ctx: RouteContext) => Promise<Response>;

// A tiny valid raster data URL (1x1 PNG).
const COVER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('PATCH /api/restaurants/[id]/theme (route + database)', { skip }, () => {
  const suffix = randomBytes(5).toString('hex');

  let prisma: import('@prisma/client').PrismaClient;
  let NextRequestCtor: typeof import('next/server').NextRequest;
  let themePATCH: Handler;
  let restaurantPUT: Handler;
  let contentVersion: (value: string) => string;

  const ids = { owner: '', viewer: '', restaurant: '' };
  const tokens = { owner: '', viewer: '' };
  const originalConsoleError = console.error;

  function request(method: string, path: string, token: string | null, body?: unknown, extra?: Record<string, string>) {
    const headers = new Headers();
    if (token) headers.set('cookie', `user_token=${token}`);
    if (body !== undefined) headers.set('content-type', 'application/json');
    for (const [k, v] of Object.entries(extra ?? {})) headers.set(k, v);
    return new NextRequestCtor(`http://localhost${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  async function patch(body: unknown, token: string | null = tokens.owner, extra?: Record<string, string>) {
    const res = await themePATCH(request('PATCH', `/api/restaurants/${ids.restaurant}/theme`, token, body, extra), {
      params: Promise.resolve({ id: ids.restaurant }),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }

  async function designIsSqlNull(): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ is_null: boolean }[]>`
      SELECT menu_design IS NULL AS is_null FROM restaurants WHERE id = ${ids.restaurant}`;
    return rows[0]?.is_null === true;
  }

  async function makeUser(label: string, role: string) {
    return prisma.user.create({
      data: { email: `theme-${label}-${suffix}@example.test`, passwordHash: 'not-a-real-hash', role },
      select: { id: true, email: true },
    });
  }

  async function issueToken(userId: string, role: string, email: string) {
    const { signJwt } = await import('../src/lib/auth');
    const { hashToken } = await import('../src/lib/session-hash');
    const token = await signJwt({ userId, role, email });
    await prisma.userSession.create({ data: { userId, tokenHash: hashToken(token) }, select: { id: true } });
    return token;
  }

  before(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.DIRECT_URL = TEST_DB_URL;
    process.env.JWT_SECRET = randomBytes(32).toString('base64');
    // `touchMenuUpdated` / revalidation have no Next.js request store here; they
    // are fail-soft and log. Keep the test output readable.
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && /^\[(touchMenuUpdated|revalidate)/.test(args[0])) return;
      originalConsoleError(...args);
    };

    ({ prisma } = await import('../src/lib/prisma'));
    ({ NextRequest: NextRequestCtor } = await import('next/server'));
    ({ PATCH: themePATCH } = (await import('../src/app/api/restaurants/[id]/theme/route')) as unknown as {
      PATCH: Handler;
    });
    ({ PUT: restaurantPUT } = (await import('../src/app/api/restaurants/[id]/route')) as unknown as { PUT: Handler });
    ({ contentVersion } = await import('../src/lib/menu-image-url'));

    const owner = await makeUser('owner', 'restaurant_owner');
    const viewer = await makeUser('viewer', 'team_member');
    ids.owner = owner.id;
    ids.viewer = viewer.id;
    ids.restaurant = (
      await prisma.restaurant.create({
        data: { slug: `theme-${suffix}`, name: 'Theme Test', userId: owner.id, menuEnabled: true, menuTheme: 'classic' },
        select: { id: true },
      })
    ).id;
    await prisma.teamMember.create({
      data: { ownerId: owner.id, email: viewer.email, role: 'viewer', status: 'active' },
      select: { id: true },
    });
    tokens.owner = await issueToken(owner.id, 'restaurant_owner', owner.email);
    tokens.viewer = await issueToken(viewer.id, 'team_member', viewer.email);
  });

  after(async () => {
    console.error = originalConsoleError;
    if (!prisma) return;
    const userIds = [ids.owner, ids.viewer].filter(Boolean);
    if (ids.restaurant) await prisma.restaurant.deleteMany({ where: { id: ids.restaurant } });
    await prisma.teamMember.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('an unknown key is a 400 and nothing is written', async () => {
    const res = await patch({ menuTheme: 'modern', menuFancy: true });
    assert.equal(res.status, 400);
    const row = await prisma.restaurant.findUnique({ where: { id: ids.restaurant }, select: { menuTheme: true } });
    assert.equal(row?.menuTheme, 'classic');
  });

  it('a viewer gets 403', async () => {
    const res = await patch({ menuTheme: 'modern' }, tokens.viewer);
    assert.equal(res.status, 403);
  });

  it('a declared body over the limit is a 413', async () => {
    const res = await patch({ menuTheme: 'modern' }, tokens.owner, { 'content-length': '1000000' });
    assert.equal(res.status, 413);
    const row = await prisma.restaurant.findUnique({ where: { id: ids.restaurant }, select: { menuTheme: true } });
    assert.equal(row?.menuTheme, 'classic');
  });

  it('a design from another family is a 409 DESIGN_CONFLICT', async () => {
    const res = await patch({ menuDesign: { v: 1, preset: 'sokak' } });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'DESIGN_CONFLICT');
    assert.equal(await designIsSqlNull(), true);
  });

  it('a family switch sent with the design is accepted and stored normalised', async () => {
    const res = await patch({ menuTheme: 'modern', menuDesign: { v: 1, preset: 'sokak', surface: 'stone' } });
    assert.equal(res.status, 200);
    // `stone` is sokak's default, so normalisation drops it.
    assert.deepEqual(res.body.menuDesign, { v: 1, preset: 'sokak' });
    assert.equal(res.body.menuTheme, 'modern');
    assert.equal(await designIsSqlNull(), false);
  });

  it('menuDesign: null writes SQL NULL (DbNull, not JSON null)', async () => {
    const res = await patch({ menuDesign: null });
    assert.equal(res.status, 200);
    assert.equal(res.body.menuDesign, null);
    assert.equal(await designIsSqlNull(), true);
  });

  it("a pure family default design also stores SQL NULL", async () => {
    const res = await patch({ menuDesign: { v: 1, preset: 'modern' } });
    assert.equal(res.status, 200);
    assert.equal(await designIsSqlNull(), true);
  });

  it('a cover write stores its version and the response carries no blobs', async () => {
    const res = await patch({ menuCoverUrl: COVER });
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), [
      'id',
      'menuAccentColor',
      'menuCoverVersion',
      'menuDesign',
      'menuTheme',
    ]);
    assert.equal(res.body.menuCoverVersion, contentVersion(COVER));
    const row = await prisma.restaurant.findUnique({
      where: { id: ids.restaurant },
      select: { menuCoverUrl: true, menuCoverVersion: true },
    });
    assert.equal(row?.menuCoverUrl, COVER);
    assert.equal(row?.menuCoverVersion, contentVersion(COVER));
  });

  it('the restaurant settings PUT does not echo the cover blob', async () => {
    const res = await restaurantPUT(
      request('PUT', `/api/restaurants/${ids.restaurant}`, tokens.owner, { name: 'Theme Test 2' }),
      { params: Promise.resolve({ id: ids.restaurant }) },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.name, 'Theme Test 2');
    assert.equal('menuCoverUrl' in body, false);
  });

  it('clearing the cover clears its version', async () => {
    const res = await patch({ menuCoverUrl: null });
    assert.equal(res.status, 200);
    assert.equal(res.body.menuCoverVersion, null);
    const row = await prisma.restaurant.findUnique({
      where: { id: ids.restaurant },
      select: { menuCoverUrl: true, menuCoverVersion: true },
    });
    assert.equal(row?.menuCoverUrl, null);
    assert.equal(row?.menuCoverVersion, null);
  });
});
