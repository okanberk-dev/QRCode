// Menu setup wizard — pure state helpers (no React, no network).
//
// The wizard (`MenuSetupWizard`) asks three things for an empty menu:
//   1. what kind of business (a starter preset, or "my own list")
//   2. the category names (rename / remove / reorder / add)
//   3. optionally, items per category as a pasted list ("Klasik Burger 185")
// and then creates everything in one go. This module decides what is valid
// and what will be sent; `tests/menu-setup.test.ts` covers it.

import { MENU_BULK_MAX_ITEMS, parseMenuLines, type ParsedMenuLine } from '@/lib/menu-bulk-parse';
import type { StarterPreset } from './menu-starter-data';

/** Longest category name; mirrors `validateMenuCategory` (`sanitizeText(name, 80)`). */
export const SETUP_CATEGORY_NAME_MAX = 80;
/** Most categories the wizard creates in one go. */
export const SETUP_MAX_CATEGORIES = 20;

export interface SetupCategory {
  /** Stable React key (never sent). */
  key: string;
  name: string;
  /** Pasted item lines for this category ('' = no items yet). */
  itemsText: string;
}

let keySeq = 0;
export function makeSetupKey(): string {
  keySeq += 1;
  return `c${keySeq}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Preset → editable category rows (in the menu's language). */
export function categoriesFromPreset(preset: StarterPreset, isTr: boolean): SetupCategory[] {
  return preset[isTr ? 'tr' : 'en'].categories.map((name) => ({ key: makeSetupKey(), name, itemsText: '' }));
}

export function emptySetupCategory(): SetupCategory {
  return { key: makeSetupKey(), name: '', itemsText: '' };
}

/** Move a row up (-1) or down (+1); out-of-range moves are a no-op. */
export function moveSetupCategory(list: readonly SetupCategory[], index: number, dir: -1 | 1): SetupCategory[] {
  const target = index + dir;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list.slice();
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type SetupCategoryError = 'empty' | 'too_long' | 'duplicate';

export interface SetupValidation {
  ok: boolean;
  /** Nothing to create at all (every row blank / list empty). */
  noCategories: boolean;
  tooMany: boolean;
  /** key → problem with that row's name. Blank rows are ignored, not errors. */
  errors: Record<string, SetupCategoryError>;
}

function normName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Blank rows are simply skipped (the owner cleared a preset row). A name may
 * not be longer than the API accepts or repeat another row (case-insensitive).
 */
export function validateSetupCategories(list: readonly SetupCategory[], isTr: boolean): SetupValidation {
  const errors: Record<string, SetupCategoryError> = {};
  const seen = new Set<string>();
  let filled = 0;
  for (const c of list) {
    const name = normName(c.name);
    if (!name) {
      // A blank row with items pasted under it would silently lose them.
      if (c.itemsText.trim()) errors[c.key] = 'empty';
      continue;
    }
    filled += 1;
    if (name.length > SETUP_CATEGORY_NAME_MAX) {
      errors[c.key] = 'too_long';
      continue;
    }
    const k = name.toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US');
    if (seen.has(k)) errors[c.key] = 'duplicate';
    seen.add(k);
  }
  const noCategories = filled === 0;
  const tooMany = filled > SETUP_MAX_CATEGORIES;
  return { ok: !noCategories && !tooMany && Object.keys(errors).length === 0, noCategories, tooMany, errors };
}

type GoodLine = Extract<ParsedMenuLine, { error?: undefined }>;

export interface SetupItemsPreview {
  items: { name: string; priceCents: number }[];
  /** Lines that could not be read (no price, bad price…). They are left out. */
  unreadable: number;
  /** More than `MENU_BULK_MAX_ITEMS` lines — the extras are dropped. */
  overLimit: boolean;
}

export function previewSetupItems(text: string): SetupItemsPreview {
  if (!text.trim()) return { items: [], unreadable: 0, overLimit: false };
  const parsed = parseMenuLines(text);
  const good = parsed.rows.filter((r): r is GoodLine => r.error === undefined);
  return {
    items: good.map((r) => ({ name: r.name, priceCents: r.priceCents })),
    unreadable: parsed.rows.length - good.length,
    overLimit: parsed.overLimit,
  };
}

export interface SetupPlanCategory {
  name: string;
  items: { name: string; priceCents: number }[];
}

/** What will be created, in order: non-blank categories with their readable items. */
export function buildSetupPlan(list: readonly SetupCategory[]): SetupPlanCategory[] {
  return list
    .map((c) => ({ name: normName(c.name), items: previewSetupItems(c.itemsText).items.slice(0, MENU_BULK_MAX_ITEMS) }))
    .filter((c) => c.name.length > 0);
}

export function planTotals(plan: readonly SetupPlanCategory[]): { categories: number; items: number } {
  return { categories: plan.length, items: plan.reduce((n, c) => n + c.items.length, 0) };
}
