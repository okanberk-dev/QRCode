/**
 * Drag and drop across categories in one outline (Menu Studio, spec §7.7 / §8.4).
 *
 * dnd-kit gives ids only. The outline keeps a working copy of
 * `categoryId → item ids` while a drag is in progress:
 *  - `onDragOver` → `moveAcross` moves the dragged id into the section under
 *    the pointer (so the gap opens there);
 *  - `onDragEnd` → `resolveDrop` compares the working copy with the order
 *    before the drag and says what to send: nothing, a reorder in one
 *    category, or a move to another category at an index.
 * Sections are droppable as `container:<categoryId>` (an empty or collapsed
 * section takes the item at its end).
 *
 * Pure and React-free (node:test).
 */

export const CONTAINER_PREFIX = 'container:';

/** Droppable id of a whole section. */
export function containerId(categoryId: string): string {
  return `${CONTAINER_PREFIX}${categoryId}`;
}

export function isContainerId(id: string): boolean {
  return id.startsWith(CONTAINER_PREFIX);
}

/** categoryId → ordered item ids. */
export type DndItems = Record<string, string[]>;

/** The category an id belongs to: a section id itself, or the section holding the item. */
export function findContainer(items: DndItems, id: string): string | null {
  if (isContainerId(id)) {
    const categoryId = id.slice(CONTAINER_PREFIX.length);
    return Object.prototype.hasOwnProperty.call(items, categoryId) ? categoryId : null;
  }
  for (const categoryId of Object.keys(items)) {
    if (items[categoryId].includes(id)) return categoryId;
  }
  return null;
}

/**
 * Move `activeId` into the section of `overId` while dragging: before the item
 * it is over, or at the end when over a section. Same section or unknown ids →
 * the same object (no re-render).
 */
export function moveAcross(items: DndItems, activeId: string, overId: string): DndItems {
  const from = findContainer(items, activeId);
  const to = findContainer(items, overId);
  if (!from || !to || from === to) return items;
  const target = items[to].filter((id) => id !== activeId);
  const overIndex = isContainerId(overId) ? -1 : target.indexOf(overId);
  target.splice(overIndex === -1 ? target.length : overIndex, 0, activeId);
  return { ...items, [from]: items[from].filter((id) => id !== activeId), [to]: target };
}

export type DropResult =
  | { kind: 'none' }
  | { kind: 'reorder'; categoryId: string; ids: string[] }
  | {
      kind: 'move';
      itemId: string;
      fromCategoryId: string;
      toCategoryId: string;
      toIndex: number;
      /** Target section's final order (for the reorder call that follows the move). */
      targetIds: string[];
      /** Source section's order without the item. */
      sourceIds: string[];
    };

function arrayMove(list: string[], from: number, to: number): string[] {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * What a drop means.
 * @param original order before the drag started
 * @param working  the working copy after `moveAcross` calls
 */
export function resolveDrop(
  original: DndItems,
  working: DndItems,
  activeId: string,
  overId: string | null,
): DropResult {
  if (!overId) return { kind: 'none' };
  const from = findContainer(original, activeId);
  const to = findContainer(working, activeId);
  if (!from || !to) return { kind: 'none' };

  let finalIds = working[to];
  if (!isContainerId(overId) && overId !== activeId && findContainer(working, overId) === to) {
    finalIds = arrayMove(finalIds, finalIds.indexOf(activeId), finalIds.indexOf(overId));
  }

  if (from === to) {
    return sameOrder(finalIds, original[from]) ? { kind: 'none' } : { kind: 'reorder', categoryId: from, ids: finalIds };
  }
  return {
    kind: 'move',
    itemId: activeId,
    fromCategoryId: from,
    toCategoryId: to,
    toIndex: finalIds.indexOf(activeId),
    targetIds: finalIds,
    sourceIds: original[from].filter((id) => id !== activeId),
  };
}
