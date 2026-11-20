/**
 * Menu API client of the Menu Studio (spec §5.2). Same contract as the old
 * builder's `apiCall`: one request → the parsed answer, or an owner-facing
 * sentence. Raw server text and machine codes never leave this module; they
 * are mapped by `mapMenuApiError` (the `code` is kept for control flow only:
 * `CATEGORY_NOT_EMPTY`, `forbidden_role`, …).
 *
 * Every write here is one of the routes that already exist (CRUD, bulk,
 * reorder, publish, upload, theme, QR) plus `restore` (chunk 1).
 */
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { mapMenuApiError } from '@/lib/menu-api-error';
import type { MenuDesign } from '@/lib/menu-design';
import type { RestoreSkipCode } from '@/lib/menu-restore';
import type { ItemPatch } from '../menu-item-form';
import type { SavedCategory, SavedItem } from '../menu-merge';

export type ApiCall<T> =
  | { ok: true; status: number; data: T | null }
  | { ok: false; status: number; code: string | null; itemCount: number | null; message: string };

export type ApiFailure = Extract<ApiCall<unknown>, { ok: false }>;

/** Tokens the server sends in `error` instead of `code` (the access gate answers `{ error: 'forbidden_role' }`). */
const ERROR_TOKENS = new Set(['forbidden_role']);

export async function apiCall<T>(url: string, init: RequestInit | undefined, isTr: boolean): Promise<ApiCall<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { ok: false, status: 0, code: null, itemCount: null, message: mapMenuApiError(e as Error, isTr) };
  }
  const body = (await res.json().catch(() => null)) as (Record<string, unknown> & T) | null;
  if (res.ok) return { ok: true, status: res.status, data: body };
  const code = typeof body?.code === 'string' ? body.code : null;
  const error = typeof body?.error === 'string' ? body.error : null;
  return {
    ok: false,
    status: res.status,
    code: code ?? (error && ERROR_TOKENS.has(error) ? error : null),
    itemCount: typeof body?.itemCount === 'number' ? body.itemCount : null,
    message: mapMenuApiError({ status: res.status, code, error }, isTr),
  };
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** `POST …/menu/items` body: every field of a new item. */
export type CreateItemPayload = Required<ItemPatch> & { currency?: string };

export interface RestoreAnswer {
  items?: SavedItem[];
  skipped?: { id: string; code: RestoreSkipCode }[];
  category?: SavedCategory & { items: MenuItemView[] };
}

/** Typed endpoints of one restaurant's menu. */
export function menuApi(restaurantId: string, isTr: boolean) {
  const base = `/api/restaurants/${restaurantId}`;
  const call = <T>(path: string, init?: RequestInit) => apiCall<T>(`${base}${path}`, init, isTr);
  return {
    createCategory: (body: { name: string; description?: string | null; isVisible: boolean }) =>
      call<{ category: SavedCategory }>('/menu/categories', json('POST', body)),
    updateCategory: (id: string, patch: { name?: string; description?: string | null; isVisible?: boolean }) =>
      call<{ category: SavedCategory }>(`/menu/categories/${id}`, json('PATCH', patch)),
    /** `?deleteItems=true` exactly — the route ignores any other value. */
    deleteCategory: (id: string, opts: { deleteItems: boolean }) =>
      call<{ success: boolean; deletedItems?: number }>(
        `/menu/categories/${id}${opts.deleteItems ? '?deleteItems=true' : ''}`,
        { method: 'DELETE' },
      ),
    createItem: (payload: CreateItemPayload) => call<{ item: SavedItem }>('/menu/items', json('POST', payload)),
    updateItem: (id: string, patch: ItemPatch) => call<{ item: SavedItem }>(`/menu/items/${id}`, json('PATCH', patch)),
    deleteItem: (id: string) => call<{ success: boolean }>(`/menu/items/${id}`, { method: 'DELETE' }),
    bulkCreateItems: (categoryId: string, items: { name: string; priceCents: number }[]) =>
      call<{ items: SavedItem[] }>('/menu/items/bulk', json('POST', { categoryId, items })),
    reorder: (body: { categories?: { id: string; sortOrder: number }[]; items?: { id: string; sortOrder: number }[] }) =>
      call<{ success: boolean }>('/menu/reorder', json('PATCH', body)),
    setPublished: (menuPublished: boolean) =>
      call<{ restaurant: { menuPublished: boolean; menuUpdatedAt: string | null } }>(
        '/menu/publish',
        json('PATCH', { menuPublished }),
      ),
    uploadImage: (file: Blob, kind: 'item' | 'logo' | 'cover') => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      return call<{ url: string }>('/menu/upload', { method: 'POST', body: fd });
    },
    patchTheme: (patch: {
      menuTheme?: string;
      menuAccentColor?: string | null;
      menuLogoUrl?: string | null;
      menuDesign?: MenuDesign | null;
      menuCoverUrl?: string | null;
    }) =>
      // Canonical values only — the route never echoes the logo or cover blobs.
      call<{
        id: string;
        menuTheme: string;
        menuAccentColor: string | null;
        menuDesign: unknown;
        menuCoverVersion: string | null;
      }>('/theme', json('PATCH', patch)),
    restore: (body: { itemIds: string[] } | { categoryId: string }) =>
      call<RestoreAnswer>('/menu/restore', json('POST', body)),
    qrUrl: ({ format, width }: { format: 'png' | 'svg'; width: number }) =>
      `${base}/menu/qr?format=${format}&width=${width}`,
  };
}

export type MenuApi = ReturnType<typeof menuApi>;

/** Owner-facing sentence for the first item an undo could not bring back. */
export function skippedMessage(skipped: { code: RestoreSkipCode }[] | undefined, isTr: boolean): string | null {
  const first = skipped?.[0];
  if (!first) return null;
  return mapMenuApiError({ code: first.code }, isTr);
}
