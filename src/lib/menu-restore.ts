/**
 * Undo window for deleted menu rows (Menu Studio, spec §6.1).
 *
 * Menu items and categories are soft-deleted (`deletedAt`). For a short time
 * after a delete the owner can bring them back with "Geri al" through
 * `POST /api/restaurants/[id]/menu/restore`; after that the delete is final
 * from the owner's point of view (the row stays archived in the database).
 *
 * Pure and dependency-free: used by the restore route and by the client undo
 * stack (`menu-undo.ts`), whose entries expire one minute before this window
 * closes so an offered "Geri al" never lands on an expired row.
 */

/** How long a deleted item or category can be restored. */
export const MENU_RESTORE_WINDOW_MS = 30 * 60_000;

/**
 * - `active`: not deleted (restoring is a no-op).
 * - `ok`: deleted within the window — can be restored.
 * - `expired`: deleted longer ago than the window, or the timestamp is unreadable.
 */
export type RestoreCheck = 'active' | 'ok' | 'expired';

/** Why an item in an `{ itemIds }` restore was not brought back (`skipped[].code`). */
export type RestoreSkipCode = 'NOT_FOUND' | 'RESTORE_EXPIRED' | 'CATEGORY_DELETED';

/**
 * Whether a row deleted at `deletedAt` can still be restored at `now`.
 * The window is inclusive: a row deleted exactly `windowMs` ago is still `ok`.
 * A timestamp slightly in the future (clock skew between app and database) is `ok`.
 */
export function canRestore(
  deletedAt: Date | string | null | undefined,
  now: Date,
  windowMs: number = MENU_RESTORE_WINDOW_MS,
): RestoreCheck {
  if (deletedAt === null || deletedAt === undefined) return 'active';
  const deletedMs = deletedAt instanceof Date ? deletedAt.getTime() : Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return 'expired';
  return now.getTime() - deletedMs <= windowMs ? 'ok' : 'expired';
}

/** Oldest `deletedAt` that can still be restored at `now` (for database filters). */
export function restoreCutoff(now: Date, windowMs: number = MENU_RESTORE_WINDOW_MS): Date {
  return new Date(now.getTime() - windowMs);
}
