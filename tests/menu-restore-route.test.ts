/**
 * Route-level smoke tests for `POST /api/restaurants/[id]/menu/restore`
 * (Menu Studio spec §6.2, §18 chunk 1 "done when").
 *
 * These call the real route handlers (restore + the existing item / category
 * DELETE routes) with real auth cookies against a real PostgreSQL database, so
 * they only run when a LOCAL throwaway database is named explicitly:
 *
 *   MENU_TEST_DATABASE_URL=postgresql://user@127.0.0.1:5432/some_test_db npm test
 *
 * Without it (CI, a laptop without Postgres) the suite is skipped. The URL must
 * point at localhost / 127.0.0.1 / ::1 — never a shared or hosted database. The
 * tests create their own users, restaurants and menu rows (unique ids) and
 * delete them afterwards. The JWT secret is a random value made at runtime.
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
  ? 'set MENU_TEST_DATABASE_URL to a local throwaway database to run the restore route tests'
  : !isLocalDatabase(TEST_DB_URL)
    ? 'MENU_TEST_DATABASE_URL must point at localhost'
    : false;

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: import('next/server').NextRequest, ctx: RouteContext) => Promise<Response>;

describe('POST /api/restaurants/[id]/menu/restore (route + database)', { skip }, () => {
  const suffix = randomBytes(5).toString('hex');
  const MINUTE = 60_000;

  let prisma: import('@prisma/client').PrismaClient;
  let NextRequestCtor: typeof import('next/server').NextRequest;
  let restorePOST: Handler;
  let itemDELETE: Handler;
  let categoryDELETE: Handler;

  const ids = {
    ownerA: '',
    ownerB: '',
    viewer: '',
    restaurantA: '',
    restaurantOff: '',
    restaurantB: '',
  };
  const tokens = { ownerA: '', ownerB: '', viewer: '' };
  const originalConsoleError = console.error;

  // ── helpers ────────────────────────────────────────────────────────────

  function request(method: string, path: string, token: string | null, body?: unknown) {
    const headers = new Headers();
    if (token) headers.set('cookie', `user_token=${token}`);
    if (body !== undefined) headers.set('content-type', 'application/json');
    return new NextRequestCtor(`http://localhost${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  async function restore(restaurantId: string, body: unknown, token: string | null = tokens.ownerA) {
    const res = await restorePOST(request('POST', `/api/restaurants/${restaurantId}/menu/restore`, token, body), {
      params: Promise.resolve({ id: restaurantId }),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }

  async function deleteItem(restaurantId: string, itemId: string) {
    const res = await itemDELETE(request('DELETE', `/api/restaurants/${restaurantId}/menu/items/${itemId}`, tokens.ownerA), {
      params: Promise.resolve({ id: restaurantId, itemId }),
    });
    assert.equal(res.status, 200, 'item DELETE should succeed');
  }

  async function deleteCategoryWithItems(restaurantId: string, categoryId: string) {
    const res = await categoryDELETE(
      request('DELETE', `/api/restaurants/${restaurantId}/menu/categories/${categoryId}?deleteItems=true`, tokens.ownerA),
      { params: Promise.resolve({ id: restaurantId, categoryId }) },
    );
    assert.equal(res.status, 200, 'category DELETE should succeed');
    return (await res.json()) as { deletedItems: number };
  }

  async function makeCategory(restaurantId: string, name: string, itemNames: string[]) {
    const category = await prisma.menuCategory.create({
      data: { restaurantId, name, sortOrder: 0 },
      select: { id: true },
    });
    const items: string[] = [];
    for (let i = 0; i < itemNames.length; i += 1) {
      const item = await prisma.menuItem.create({
        data: { restaurantId, categoryId: category.id, name: itemNames[i], priceCents: 1000 + i, sortOrder: i * 10 },
        select: { id: true },
      });
      items.push(item.id);
    }
    return { categoryId: category.id, items };
  }

  async function deletedAtOf(itemId: string) {
    const row = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { deletedAt: true } });
    return row?.deletedAt ?? null;
  }

  async function makeUser(label: string, role: string) {
    const user = await prisma.user.create({
      data: {
        email: `restore-${label}-${suffix}@example.test`,
        passwordHash: 'not-a-real-hash',
        role,
      },
      select: { id: true, email: true },
    });
    return user;
  }

  async function issueToken(userId: string, role: string, email: string) {
    const { signJwt } = await import('../src/lib/auth');
    const { hashToken } = await import('../src/lib/session-hash');
    const token = await signJwt({ userId, role, email });
    await prisma.userSession.create({ data: { userId, tokenHash: hashToken(token) }, select: { id: true } });
    return token;
  }

  // ── fixtures ───────────────────────────────────────────────────────────

  before(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.DIRECT_URL = TEST_DB_URL;
    // Throwaway signing key, generated per run.
    process.env.JWT_SECRET = randomBytes(32).toString('base64');
    // `touchMenuUpdated` calls `revalidatePath`, which has no Next.js request
    // store here; it is fail-soft and logs. Keep the test output readable.
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('[touchMenuUpdated]')) return;
      originalConsoleError(...args);
    };

    ({ prisma } = await import('../src/lib/prisma'));
    ({ NextRequest: NextRequestCtor } = await import('next/server'));
    ({ POST: restorePOST } = (await import('../src/app/api/restaurants/[id]/menu/restore/route')) as unknown as {
      POST: Handler;
    });
    ({ DELETE: itemDELETE } = (await import('../src/app/api/restaurants/[id]/menu/items/[itemId]/route')) as unknown as {
      DELETE: Handler;
    });
    ({ DELETE: categoryDELETE } = (await import(
      '../src/app/api/restaurants/[id]/menu/categories/[categoryId]/route'
    )) as unknown as { DELETE: Handler });

    const ownerA = await makeUser('owner-a', 'restaurant_owner');
    const ownerB = await makeUser('owner-b', 'restaurant_owner');
    const viewer = await makeUser('viewer', 'team_member');
    ids.ownerA = ownerA.id;
    ids.ownerB = ownerB.id;
    ids.viewer = viewer.id;

    const restaurant = (label: string, userId: string, menuEnabled: boolean) =>
      prisma.restaurant.create({
        data: { slug: `restore-${label}-${suffix}`, name: `Restore ${label}`, userId, menuEnabled },
        select: { id: true },
      });
    ids.restaurantA = (await restaurant('a', ownerA.id, true)).id;
    ids.restaurantOff = (await restaurant('off', ownerA.id, false)).id;
    ids.restaurantB = (await restaurant('b', ownerB.id, true)).id;

    await prisma.teamMember.create({
      data: { ownerId: ownerA.id, email: viewer.email, role: 'viewer', status: 'active' },
      select: { id: true },
    });

    tokens.ownerA = await issueToken(ownerA.id, 'restaurant_owner', ownerA.email);
    tokens.ownerB = await issueToken(ownerB.id, 'restaurant_owner', ownerB.email);
    tokens.viewer = await issueToken(viewer.id, 'team_member', viewer.email);
  });

  after(async () => {
    console.error = originalConsoleError;
    if (!prisma) return;
    const restaurantIds = [ids.restaurantA, ids.restaurantOff, ids.restaurantB].filter(Boolean);
    const userIds = [ids.ownerA, ids.ownerB, ids.viewer].filter(Boolean);
    await prisma.menuItem.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
    await prisma.menuCategory.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: restaurantIds } } });
    await prisma.teamMember.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  // ── owner ──────────────────────────────────────────────────────────────

  it('owner: a deleted item comes back with its category and sort order', async () => {
    const { categoryId, items } = await makeCategory(ids.restaurantA, 'Kahveler', ['Türk Kahvesi', 'Latte']);
    const before = await prisma.restaurant.findUnique({ where: { id: ids.restaurantA }, select: { menuUpdatedAt: true } });

    await deleteItem(ids.restaurantA, items[1]);
    assert.ok(await deletedAtOf(items[1]), 'the item is soft-deleted');

    const res = await restore(ids.restaurantA, { itemIds: [items[1]] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.skipped, []);
    const restored = res.body.items as { id: string; categoryId: string; sortOrder: number; name: string }[];
    assert.equal(restored.length, 1);
    assert.equal(restored[0].id, items[1]);
    assert.equal(restored[0].categoryId, categoryId);
    assert.equal(restored[0].sortOrder, 10);
    assert.equal(restored[0].name, 'Latte');
    assert.equal(await deletedAtOf(items[1]), null);

    const after = await prisma.restaurant.findUnique({ where: { id: ids.restaurantA }, select: { menuUpdatedAt: true } });
    assert.ok(after?.menuUpdatedAt, 'menuUpdatedAt is stamped');
    if (before?.menuUpdatedAt) assert.ok(after.menuUpdatedAt >= before.menuUpdatedAt);

    // Restoring an active item again is a no-op that still returns it.
    const again = await restore(ids.restaurantA, { itemIds: [items[1]] });
    assert.equal(again.status, 200);
    assert.deepEqual((again.body.items as { id: string }[]).map((i) => i.id), [items[1]]);
    assert.deepEqual(again.body.skipped, []);
  });

  it('owner: a category deleted with its items comes back with only that cascade', async () => {
    const { categoryId, items } = await makeCategory(ids.restaurantA, 'Tatlılar', ['Baklava', 'Künefe', 'Sütlaç']);

    // Künefe is deleted on its own first; it must stay deleted.
    await deleteItem(ids.restaurantA, items[1]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const deleted = await deleteCategoryWithItems(ids.restaurantA, categoryId);
    assert.equal(deleted.deletedItems, 2);

    const res = await restore(ids.restaurantA, { categoryId });
    assert.equal(res.status, 200);
    const category = res.body.category as { id: string; name: string; items: { id: string }[] };
    assert.equal(category.id, categoryId);
    assert.equal(category.name, 'Tatlılar');
    assert.deepEqual(category.items.map((i) => i.id), [items[0], items[2]], 'only the cascade, in sort order');

    const row = await prisma.menuCategory.findUnique({ where: { id: categoryId }, select: { deletedAt: true } });
    assert.equal(row?.deletedAt, null);
    assert.equal(await deletedAtOf(items[0]), null);
    assert.equal(await deletedAtOf(items[2]), null);
    assert.ok(await deletedAtOf(items[1]), 'the item deleted earlier stays deleted');

    // Idempotent: the category is active now.
    const again = await restore(ids.restaurantA, { categoryId });
    assert.equal(again.status, 200);
    assert.deepEqual((again.body.category as { items: { id: string }[] }).items.map((i) => i.id), [items[0], items[2]]);
  });

  it('owner: an item whose category is deleted is skipped with CATEGORY_DELETED', async () => {
    const { categoryId, items } = await makeCategory(ids.restaurantA, 'İçecekler', ['Ayran']);
    await deleteCategoryWithItems(ids.restaurantA, categoryId);

    const res = await restore(ids.restaurantA, { itemIds: [items[0]] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items, []);
    assert.deepEqual(res.body.skipped, [{ id: items[0], code: 'CATEGORY_DELETED' }]);
    assert.ok(await deletedAtOf(items[0]), 'still deleted');
  });

  it('after 30 minutes: category → 410 RESTORE_EXPIRED, item → skipped RESTORE_EXPIRED', async () => {
    const old = await makeCategory(ids.restaurantA, 'Eski', ['Eski ürün']);
    await deleteCategoryWithItems(ids.restaurantA, old.categoryId);
    const longAgo = new Date(Date.now() - 31 * MINUTE);
    await prisma.menuCategory.update({ where: { id: old.categoryId }, data: { deletedAt: longAgo }, select: { id: true } });
    await prisma.menuItem.update({ where: { id: old.items[0] }, data: { deletedAt: longAgo }, select: { id: true } });

    const res = await restore(ids.restaurantA, { categoryId: old.categoryId });
    assert.equal(res.status, 410);
    assert.equal(res.body.code, 'RESTORE_EXPIRED');
    const row = await prisma.menuCategory.findUnique({ where: { id: old.categoryId }, select: { deletedAt: true } });
    assert.ok(row?.deletedAt, 'stays deleted');

    const live = await makeCategory(ids.restaurantA, 'Ana yemekler', ['Adana', 'Urfa']);
    await deleteItem(ids.restaurantA, live.items[0]);
    await deleteItem(ids.restaurantA, live.items[1]);
    await prisma.menuItem.update({ where: { id: live.items[0] }, data: { deletedAt: longAgo }, select: { id: true } });
    // 29 minutes ago is still inside the window.
    await prisma.menuItem.update({
      where: { id: live.items[1] },
      data: { deletedAt: new Date(Date.now() - 29 * MINUTE) },
      select: { id: true },
    });

    const items = await restore(ids.restaurantA, { itemIds: [live.items[0], live.items[1]] });
    assert.equal(items.status, 200);
    assert.deepEqual((items.body.items as { id: string }[]).map((i) => i.id), [live.items[1]]);
    assert.deepEqual(items.body.skipped, [{ id: live.items[0], code: 'RESTORE_EXPIRED' }]);
    assert.ok(await deletedAtOf(live.items[0]), 'expired item stays deleted');
    assert.equal(await deletedAtOf(live.items[1]), null);
  });

  it('a mixed bulk restore reports each id (restored first, then already active)', async () => {
    const { items } = await makeCategory(ids.restaurantA, 'Karışık', ['Bir', 'İki', 'Üç']);
    await deleteItem(ids.restaurantA, items[0]);
    await deleteItem(ids.restaurantA, items[2]);

    const res = await restore(ids.restaurantA, { itemIds: [items[1], 'missing-id', items[2], items[0], items[2]] });
    assert.equal(res.status, 200);
    assert.deepEqual((res.body.items as { id: string }[]).map((i) => i.id), [items[2], items[0], items[1]]);
    assert.deepEqual(res.body.skipped, [{ id: 'missing-id', code: 'NOT_FOUND' }]);
  });

  // ── access ─────────────────────────────────────────────────────────────

  it('viewer: 403 forbidden_role and nothing is restored', async () => {
    const { items } = await makeCategory(ids.restaurantA, 'Görüntüleme', ['Çay']);
    await deleteItem(ids.restaurantA, items[0]);

    const res = await restore(ids.restaurantA, { itemIds: [items[0]] }, tokens.viewer);
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'forbidden_role');
    assert.ok(await deletedAtOf(items[0]), 'still deleted');
  });

  it('module off: 403 MENU_MODULE_DISABLED', async () => {
    const { items } = await makeCategory(ids.restaurantOff, 'Kapalı', ['Simit']);
    await prisma.menuItem.update({ where: { id: items[0] }, data: { deletedAt: new Date() }, select: { id: true } });

    const res = await restore(ids.restaurantOff, { itemIds: [items[0]] });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'MENU_MODULE_DISABLED');
    assert.ok(await deletedAtOf(items[0]), 'still deleted');
  });

  it('foreign restaurant: 403 on another owner’s restaurant; their ids are invisible from your own', async () => {
    const foreign = await makeCategory(ids.restaurantB, 'Yabancı', ['Gizli ürün']);
    const deletedAt = new Date();
    await prisma.menuCategory.update({ where: { id: foreign.categoryId }, data: { deletedAt }, select: { id: true } });
    await prisma.menuItem.update({ where: { id: foreign.items[0] }, data: { deletedAt }, select: { id: true } });

    const direct = await restore(ids.restaurantB, { categoryId: foreign.categoryId });
    assert.equal(direct.status, 403);

    const viaOwnCategory = await restore(ids.restaurantA, { categoryId: foreign.categoryId });
    assert.equal(viaOwnCategory.status, 404);
    assert.equal(viaOwnCategory.body.code, 'NOT_FOUND');

    const viaOwnItems = await restore(ids.restaurantA, { itemIds: [foreign.items[0]] });
    assert.equal(viaOwnItems.status, 200);
    assert.deepEqual(viaOwnItems.body.items, []);
    assert.deepEqual(viaOwnItems.body.skipped, [{ id: foreign.items[0], code: 'NOT_FOUND' }]);

    const row = await prisma.menuCategory.findUnique({ where: { id: foreign.categoryId }, select: { deletedAt: true } });
    assert.ok(row?.deletedAt, 'foreign category untouched');
    assert.ok(await deletedAtOf(foreign.items[0]), 'foreign item untouched');

    // Owner B can restore their own category.
    const own = await restore(ids.restaurantB, { categoryId: foreign.categoryId }, tokens.ownerB);
    assert.equal(own.status, 200);
    assert.deepEqual((own.body.category as { items: { id: string }[] }).items.map((i) => i.id), [foreign.items[0]]);
  });

  it('no session: 401', async () => {
    const res = await restore(ids.restaurantA, { itemIds: ['x'] }, null);
    assert.equal(res.status, 401);
  });

  // ── validation ─────────────────────────────────────────────────────────

  it('rejects malformed bodies with 400 validation_error', async () => {
    const bad: unknown[] = [
      {},
      { itemIds: [] },
      { itemIds: Array.from({ length: 101 }, (_, i) => `id-${i}`) },
      { itemIds: ['a'], categoryId: 'b' },
      { categoryId: '' },
      { categoryId: 'c', extra: true },
      { itemIds: [42] },
      'not json',
    ];
    for (const body of bad) {
      const res = await restore(ids.restaurantA, body);
      assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body)}`);
      assert.equal(res.body.error, 'validation_error');
    }
  });
});
