# Owner Menu Studio — FINAL build spec

Route: `src/app/[locale]/dashboard/restaurants/[id]/menu` (Next.js 15 App Router client page, Prisma 6, Tailwind v4.2, Pulse panel theme).
Status: design only. Nothing in the repo has been changed by this spec.
Base: the **clarity** design (winner), with the judge's 13 grafts from **speed** and **mobile** applied and every conflict resolved below. Where this spec is silent, clarity's text applies, except where a graft or §0.2 says otherwise.

Fixed product decisions (unchanged from the brief):
1. **Publishing model stays.** On a published menu, every saved edit is live at once. There is no draft snapshot. The UI says this plainly (status card, live indicator, toasts, panel footers).
2. **Undo for every reversible action.** One additive endpoint, `POST /api/restaurants/[id]/menu/restore`, brings back soft-deleted items and categories for 30 minutes.
3. **Design is previewed locally.** Theme, accent colour and logo change only the preview until **Uygula**.

Hard constraints: no new npm packages; no Prisma schema change; `PublicMenuView` is not edited; the upload, QR, publish, theme, reorder, bulk and CRUD routes are not edited; the only new route is `restore`. A batch endpoint is a **follow-up that needs explicit backend approval** (§20).

---

## 0. Decision record

### 0.1 Grafts applied (from the judge)

| # | Graft | Where in this spec |
|---|---|---|
| G1 | Speed's three-tier container-query rows (narrow / medium / full) replace clarity's 560px two-tier rows; name column ≥190px in the critical layouts | §3.3, §7.7 `ItemRow`, `outline/row-layout.ts` |
| G2 | One-tap Satışta/Tükendi `APSwitch` in every row (lg + visible label on touch, md on desktop) + eye toggle / `Göster` button for hidden items; 3-state control only in the item panel | §7.7 `StatusCell`, §7.8 `StatusField`, §8.6 |
| G3 | Selection mode is core; `BulkPriceDialog` + pure `menu-bulk-price.ts`; runs on `runPool` N×PATCH (concurrency 4) with one undo entry | §7.7 `SelectionBar`, `BulkPriceDialog`, §8.16 |
| G4 | No toast for inline name/price commits; aria-live `SaveIndicator` ("Kaydedildi · canlı") + undo history; price Enter saves and moves to the next row's price | §5.5, §7.10 `SaveIndicator`, §8.1 |
| G5 | Item list stays usable while editing: at ≥1024 the item panel lives in the right column as an **Önizleme \| Ürün** tab, not in place of the outline | §3, §7.9 `RightPanel` |
| G6 | `menu-keys.ts` (`e.key`, Turkish-keyboard safe), `ShortcutsDialog` generated from one `SHORTCUTS` table, "Tek tuş kısayolları" off switch (WCAG 2.1.4), ⌘D duplicate, `m` move | §9 |
| G7 | Optimistic quick-add pending row with a per-category serial queue; per-item serial queues for all writes | §5.3, §8.2 |
| G8 | Servis mode; `useKeyboardInset` for bottom sheets; `navigator.share`; "● Canlı" in the phone sticky chip bar | §7.5, §7.10, §8.17, §7.12 `Sheet` |
| G9 | Owner-entered text (category names, item names, panel item title) in Inter; Clash only for Buaze chrome | §15.3 |
| G10 | "Fotoğrafsız" / "Açıklamasız" completion workflow; single "name price" line pasted into quick-add fills both fields | §8.5, §8.2 |
| G11 | Window file-drop guard; offline state; mid-session `forbidden_role` / `MENU_MODULE_DISABLED` → invalidate `['current-user-role']` + refetch → read-only | §5.6, §12 |
| G12 | Kept modules stay at their `_components/` paths (no `git mv` to `_lib/`); new pure modules sit beside them; zero test-import churn | §4 |
| G13 | ContextBar "Hepsini satışa aç" on the Tükendi filter; category ⋯ "Tümünü satışa aç / Tümünü tükendi yap / Ürünleri seç"; delete confirm only for bulk selections of **5 or more** | §7.6, §7.7, §8.16 |

### 0.2 Conflicts resolved

| Conflict | Resolution | Why |
|---|---|---|
| Medium tier threshold (speed: 448) | Medium starts at **480px** (`@min-[480px]/outline`), full at **672px** (`@2xl/outline`) | With the medium grid's 288px of fixed width, 448 gives a 160px name; 480 gives ≥192px at every medium width (§3.3 table) |
| Speed's full tier had a details column | Dropped; details open from the row background, the description line, ⋯ "Ayrıntılar" or `E` | Saves 40px; full tier name ≥230px at 672 |
| Medium/full tiers on touch tablets | Tiers 2–3 are gated by `pointer-fine:`; coarse pointers always use the two-line touch layout | 20–32px columns cannot hold 44px touch targets |
| Item panel location at ≥1024 (speed docked sheet vs mobile tabs) | Mobile's **tabs in the right column** (`Önizleme \| Ürün`), column 340/360/380px | Reuses clarity's always-present right column, no overlay, outline stays clickable, one sticky column to manage |
| Design panel at ≥1024 | Keeps clarity: replaces the outline in the workspace column; the right column shows the draft preview | Design is not list editing; the preview must stay visible while choosing |
| Toolbar placement | Full-width sticky toolbar **above** the grid at ≥1024 (speed), 2 rows at 1024–1399, 1 row at ≥1400 | A 360px workspace cannot hold search + filters + indicator + mode + add |
| Undo/redo (speed) vs undo only (clarity) | **Undo only**, 20 entries, 29-minute age (clarity's `menu-undo.ts`), plus a toolbar Undo button and a transient "Geri al" in the SaveIndicator | Judge flagged speed's undo/redo stack as the highest build risk; touch users still need an undo affordance for silent inline edits |
| Coalescing (speed) vs serial queues (mobile) | **Serial per-key queues, no coalescing** | Ordering guarantee without timers; simpler revert rules |
| External stores / roving ARIA grid (speed) | Not used. Rows are list items; ↑/↓ moves between row focus buttons; selection is React state passed as a `selected` prop to memoized rows | Judge flagged both as risk/power-user weight |
| Quick-add toast (clarity) vs silent (speed) | Silent: pending row → flash → SaveIndicator; undo entry pushed | G4; rapid entry must stay calm |
| Paste that creates categories (clarity: `fetchAll`) | Merge responses (`applySavedCategory` + `applySavedItem`); no `fetchAll` | Closer to must-keep #9 |
| Restore window and status (speed 15 min / 409; clarity 30 min / 410) | **30 minutes, 410 `RESTORE_EXPIRED`**, items cap raised to **100** (bulk delete) | Clarity's contract; cap must cover a 100-item selection |
| Bulk delete confirm threshold (speed 5 / mobile 10) | **≥5** | G13 |
| Category select in item panel (clarity: only >1 categories) | Always shown; disabled with hint when there is 1 category | Explains why moving is not possible instead of hiding the control |
| Bulk "Satışa aç" on a selection that contains hidden items | Bulk actions change **one flag each** (`markAvailable` = `isOutOfStock:false` only; `show` = `isAvailable:true` only) | Restocking never un-hides an item by accident |
| Row "Göster" | Sends `{ isAvailable: true }` only (keeps `isOutOfStock`) | Minimal patch; the switch then shows the true sold-out state |
| `menu-copy.ts` rewrite in place (speed) vs new module (clarity) | New module **`_components/menu-i18n.ts`**; old `menu-copy.ts` deleted in chunk 4 | Chunk 1 must type-check while the old UI still imports `buildMenuCopy` |
| `menu-ui.ts` (clarity: split into `kit/`) | **Kept and extended** at its path; dead exports removed in chunk 4 | G12 spirit (smaller first PR, less churn) |
| `ThemeThumb.tsx` (clarity: port to `design/`) | **Kept** at `_components/ThemeThumb.tsx` | No change needed; it renders no text |

### 0.3 Rejected on purpose (do not build)
Swipe actions, long-press, FAB, drag-to-dismiss sheets, two-level `ReorderSheet` (mobile); undo **redo**, coalescing timers, `useSyncExternalStore` UI stores, cross-category roving ARIA grid, `items/batch` + `items/batch-delete` endpoints, `BulkLabelsDialog` (speed); `git mv` of kept modules to `_lib/` (clarity). Each is either a judged risk or a backend change that needs approval (§20).

---

## 1. Principles

| Principle | On screen |
|---|---|
| Left is what you edit, right is what customers see | From 1024px the customer phone is in the right column (collapsible). Below 1024 a `Düzenle · Servis · Önizle` switch. |
| One obvious next step | The status card shows the state and one primary action (draft: `Yayına al`). |
| Edit in place | Name, price, Satışta/Tükendi and Göster are in the row. Details open in one panel that never hides the list on desktop. |
| Plain words | Item states are always **Satışta / Tükendi / Gizli**. Category: **Menüde / Gizli**. Verbs: **Gizle / Göster**. |
| Calm and forgiving | Silent saves for inline edits (SaveIndicator + Geri al); toasts with Geri al for toggles, deletes, moves, bulk, paste, duplicate, panel save, Apply. Confirms only for deleting a category with items, deleting ≥5 selected items, and unpublishing. |
| Honest about live | Status card, the live indicator ("● Canlı"), toasts (lime live dot) and panel footers all say saved = visible to customers. |
| Fast when it matters | Spreadsheet price runs (Enter → next row), optimistic quick-add, one-tap sold-out, Servis mode, bulk price for inflation updates, single-key shortcuts that can be turned off. |

---

## 2. Information architecture

```
Menü (PageHeader)                              [Görünüm] [Paylaş ve QR] [⋯ Diğer]
└─ Status card (draft | live | locked | viewer | just-published)   — "can customers see it?"
└─ (<1024) ViewSwitch  [Düzenle | Servis | Önizle]
└─ Toolbar  (≥1024 full width, sticky): search · filter chips · SaveIndicator · Undo · [Düzenle|Servis] · Seç · + Ekle ▾
└─ Grid
   ├─ Category rail (≥1400)
   ├─ Workspace: ContextBar · Outline (sections → header, rows, quick-add) · + Yeni kategori
   │             (design mode at ≥1024: DesignPanel replaces the outline)
   └─ Right column (≥1024): [Önizleme | Ürün] — preview (draft overlays, focus highlight, pick-to-edit) or item panel
└─ SelectionBar (fixed, selection non-empty) · Toaster (single slot)
└─ Dialogs/sheets: ShareDialog · MoveToCategoryDialog · BulkPriceDialog · PasteSheet · CategoryOrderSheet · ShortcutsDialog ·
                   (<1024) ItemPanel sheet · DesignPanel sheet · confirms (useConfirmDialog)
```

- **One continuous outline.** All categories are sections on one page in customer order. Category chips (<1400) or the rail (≥1400) jump to a section; scroll-spy keeps them in sync.
- **Modes.** `mode: 'edit' | 'service'` (persisted per viewer). `workspace: 'outline' | 'design'`. `itemTarget` (panel open or not). `<1024` also `phonePreview: boolean`.
- **Header actions** (§49: 1 primary + 1 secondary + Diğer): primary `Paylaş ve QR` (`bz-btn-primary`), secondary `Görünüm` (`bz-btn-ghost`, `aria-pressed` in design mode). `Diğer`: Analitik · Tam ekran önizle · divider · Kategorileri sırala · Liste yapıştır · Tümünü daralt / Tümünü genişlet · Klavye kısayolları (fine pointer only). `Yayına al` and `Yayından kaldır` live only in the status card.
- **Read-only** (`!menuEnabled || isViewer || roleLoading`): identical layout, controls disabled (never hidden), viewers open the item panel read-only, no upgrade promises.

---

## 3. Layout per breakpoint

Page wrapper (§42.3 DnD builder width): `<div className="relative mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">`. No bottom-nav padding (shell `<main>` provides it). `PageHeader` inside `<div>` with `className="!mb-0"`.

Variant conventions (Tailwind v4.2, repo syntax as in `CustomersToolbar.tsx`): `@container/outline` on the outline wrapper; `@min-[480px]/outline:` and `@2xl/outline:` (672px) on rows; unnamed `@container` on panel bodies with `@min-[420px]:` / `@min-[520px]:`. Pointer variants `pointer-fine:` / `pointer-coarse:`. Controls default to 44px touch size and are compacted with `pointer-fine:`.

Shell facts: topbar 61px `z-40` below 1024, `h-14` (56px) `z-30` from 1024. Bottom nav uses `--dash-bottom-nav-h`. Sidebar 248px expanded / 68px collapsed. **Rows use container queries, never viewport breakpoints.**

### 3.1 Grid

| Breakpoint | Classes on the grid element | Columns |
|---|---|---|
| `<1024` | `block` | workspace only |
| 1024–1279 | `lg:grid lg:items-start lg:gap-5 lg:grid-cols-[minmax(0,1fr)_340px]` | workspace + right 340 |
| 1280–1399 | `xl:grid-cols-[minmax(0,1fr)_360px]` | workspace + right 360 |
| 1400–1599 | `min-[1400px]:grid-cols-[184px_minmax(0,1fr)_360px]` | rail 184 + workspace + right 360 |
| ≥1600 | `min-[1600px]:grid-cols-[184px_minmax(0,1fr)_380px]` | rail 184 + workspace + right 380 |
| right column hidden (preview collapsed **and** no item open) | `lg:grid-cols-[minmax(0,1fr)] min-[1400px]:grid-cols-[184px_minmax(0,1fr)]` | — |

The rail is `hidden min-[1400px]:block` (a `display:none` child takes no grid cell). `previewCollapsed` is per viewer (`localStorage['buaze:menu:preview-collapsed']='1'`, try/catch). Opening an item shows the right column even when the preview is collapsed; closing the item hides it again.

### 3.2 Sticky geometry

| Element | <1024 | 1024–1399 | ≥1400 |
|---|---|---|---|
| Phone/tablet category chip bar | `sticky top-[61px] z-20 h-[52px]` | hidden | hidden |
| Toolbar | not sticky | `lg:sticky lg:top-14 z-20`, 2 rows × 56 = 112 | 1 row, 56 |
| Rail | — | — | `sticky top-[128px] max-h-[calc(100dvh-144px)] overflow-y-auto` |
| Right column | — | `sticky top-[184px] max-h-[calc(100dvh-200px)]` | `min-[1400px]:top-[128px] min-[1400px]:max-h-[calc(100dvh-144px)]` |
| Section `scroll-mt` | `scroll-mt-[124px]` | `lg:scroll-mt-[180px]` | `min-[1400px]:scroll-mt-[124px]` |
| Row `li` focus clearance | `scroll-mt-[124px] scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+var(--menu-stack,0px)+16px)]` | `lg:scroll-mt-[180px]` | `min-[1400px]:scroll-mt-[124px]` |

Toolbar: `-mx-4 px-4 sm:-mx-7 sm:px-7 bg-[#FAFAFA]/95 backdrop-blur`, a 1px sentinel `IntersectionObserver` sets `data-stuck`, `data-[stuck=true]:border-b data-[stuck=true]:border-[#EDEDED]`.

### 3.3 Row tiers and the name-column check (G1)

Defined once in `outline/row-layout.ts` (string constants used by `ItemRow` **and** `loading.tsx`):

| Tier | Applies when | Grid | Fixed width (cols + gaps + padding + border) | Name width |
|---|---|---|---|---|
| **narrow** (default, and always on coarse pointers) | outline <480px, or `pointer-coarse` | `grid grid-cols-[48px_minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-3 gap-y-1.5 px-3 py-3 min-h-[76px]` | 48 + 12 + 12 + ⋯ (32 fine / 44 coarse) + 24 + 2 | W − 130 (fine) / W − 142 (coarse) |
| **medium** | `pointer-fine` and 480–671px | `pointer-fine:@min-[480px]/outline:grid-cols-[20px_40px_minmax(0,1fr)_84px_46px_32px] pointer-fine:@min-[480px]/outline:grid-rows-1 pointer-fine:@min-[480px]/outline:items-center pointer-fine:@min-[480px]/outline:gap-x-2 pointer-fine:@min-[480px]/outline:py-2 pointer-fine:@min-[480px]/outline:min-h-[60px]` | 222 + 40 + 24 + 2 = 288 | W − 288 (≥192 at 480) |
| **full** | `pointer-fine` and ≥672px | `pointer-fine:@2xl/outline:grid-cols-[20px_20px_40px_minmax(0,1fr)_96px_120px_32px_32px] pointer-fine:@2xl/outline:min-h-[56px]` | 360 + 56 + 24 + 2 = 442 | W − 442 (≥230 at 672) |

Outline width W = content width − right column − gaps (content = viewport − sidebar − 56). Checked layouts (fine pointer, right column open, which is also the item-open layout because of G5):

| Viewport | Sidebar | Outline W | Tier | Name |
|---|---|---|---|---|
| 1024 | expanded | 720 − 340 − 20 = 360 | narrow | **230** |
| 1024 | collapsed | 900 − 360 = 540 | medium | 252 |
| 1280 | expanded | 976 − 380 = 596 | medium | 308 |
| 1399 | expanded | 1095 − 380 = 715 | full | 273 |
| 1400 | expanded | 1096 − 184 − 360 − 40 = 512 | medium | **224** |
| 1440 | expanded | 552 | medium | 264 |
| 1600 | expanded | 1296 − 184 − 380 − 40 = 692 | full | 250 |
| 1920 | expanded | 1544 − 604 = 940 (wrapper capped) | full | 498 |
| 375 phone | — | 343 | narrow coarse | 201 (2-line clamp) |
| 360 phone | — | 328 | narrow coarse | 186 (2-line clamp; accepted) |
| 768 tablet | — | 712 | narrow coarse | 570 |

Selection mode in narrow adds a 28px checkbox column (−40px). Acceptance requires ≥190px in every desktop row above (§19).

### 3.4 Phone (<640)

```
┌ shell topbar 61 ─────────────────────────────┐
│ Menü / Kahve Durağı                          │ PageHeader compact
│ [🎨 Görünüm ][ ▦ Paylaş ve QR ][⋯]           │ 44px; first two flex-1
│┌ Status card ─────────────────────────────┐ │
││ ● Yayında  Menün yayında …   [link][⧉][↗]│ │ + "Paylaş…" when navigator.share exists
││ 14 üründe fotoğraf yok ›  3 ürün tükendi ›│ │ nudges (max 2)
│└──────────────────────────────────────────┘ │
│ [ ✎ Düzenle | ⏻ Servis | 📱 Önizle ]         │ ViewSwitch 44px, 3 equal segments
│ [🔍 Ürün ara            ][↕ Sırala][☑ Seç]  │ search + reorder mode + selection
│ (Tükendi 3)(Gizli 2)(Fotoğrafsız 14) →      │ filter chips (zero counts hidden)
├ sticky chip bar top-61 h-52 ────────────────┤
│ ●Canlı │(Kahveler 8)(Tatlılar 6)(…)  │ 👁   │ SaveIndicator compact · chips · pinned Önizle
├──────────────────────────────────────────────┤
│┌ Kahveler · 8 ürün          [Menüde ●][⋯]┐  │
││ [img48] Türk Kahvesi              [⋯]    │  │ narrow row, name 2-line clamp
││         ₺85                Satışta [●══] │  │ price button · APSwitch lg + label
││ [img48] Salep  (Gizli)            [⋯]    │  │
││         ₺95                    [👁 Göster]│  │ hidden → Göster
││ + Ürün ekle                               │  │ quick-add (collapsed)
│└───────────────────────────────────────────┘  │
│ [ + Yeni kategori ] (dashed)                  │
└ shell bottom nav ─────────────────────────────┘
```
- `Önizle` view: outline hidden (stays mounted), `PhonePreview variant="bare"` fills the width; status card and ViewSwitch stay.
- `Servis` view: `ServiceRow`s (§7.7) instead of `ItemRow`s.
- Item panel and design panel: bottom `Sheet` (`max-h-[94dvh]`, keyboard-inset aware).
- Name tap opens the item sheet (no inline rename on coarse pointers). Price tap edits inline (`inputMode="decimal"`).

### 3.5 Tablet (640–1023)
- Header actions inline (`sm:w-auto`, `sm:min-h-[36px]`). ViewSwitch `sm:w-auto` left-aligned.
- Search + Sırala + Seç + filter chips on one wrapping row (`flex flex-wrap items-center gap-2`, search `w-full sm:w-[280px]`).
- Rows: coarse pointers stay narrow (two-line); a fine-pointer tablet/laptop window gets medium/full by container width.
- Item panel: right `Sheet` (`sm:max-w-[520px]`) with `Düzenle / Önizle` in its header. Design: bottom `Sheet` with `sm:grid-cols-[minmax(0,1fr)_280px]` (sticky preview right).

### 3.6 Desktop (1024–1399)

```
┌ topbar 56 ───────────────────────────────────────────────────────────────────────┐
│ Menü / Kahve Durağı                         [🎨 Görünüm] [▦ Paylaş ve QR] [⋯ Diğer]│
│ ┌ Status card (single row, min-h 112) ─────────────────────────────────────────┐ │
├ Toolbar row 1 (sticky top-14) ───────────────────────────────────────────────────┤
│ [🔍 Ürün ara   /] (Tümü)(Tükendi 3)(Gizli 2)(Fotoğrafsız 14)…  ✓ Kaydedildi · canlı [↶] │
├ Toolbar row 2 ───────────────────────────────────────────────────────────────────┤
│ (Kahveler)(Tatlılar)(İçecekler)(+ Kategori)…        [Düzenle|Servis] [☑ Seç] [+ Ekle ▾] │
├──────────────────────────────────────────────────┬───────────────────────────────┤
│ workspace @container/outline                      │ right 340 (sticky top-184)    │
│ ┌ Kahveler · 8 ürün            [● Menüde] [⋯] ┐  │ [Önizleme | Ürün: Latte  ✕]   │
│ │ [img] Türk Kahvesi           ⋯             │  │  phone frame  /  item form     │
│ │       ₺85               Satışta [●═]       │  │                                │
│ │ + Ürün ekle                                 │  │                                │
└──────────────────────────────────────────────────┴───────────────────────────────┘
```
- Opening an item switches the right column to the `Ürün` tab. The outline stays live: clicking another row opens that item (dirty guard first).
- Design mode: `DesignPanel` replaces the outline in the workspace; the right column is forced to `Önizleme` and shows the draft.

### 3.7 Wide (≥1400)
- Rail (184) replaces toolbar row 2; mode/Seç/Ekle move into toolbar row 1. Rail = jump + drag-to-reorder categories + `+ Kategori ekle`.
- Right column 360 (≥1600: 380).

---

## 4. File plan

All paths below are relative to `src/app/[locale]/dashboard/restaurants/[id]/menu/` unless absolute.

### 4.1 Tree (C = create, R = rewrite, K = keep unchanged, E = keep + additive edits, D = delete in chunk 4)

```
page.tsx                         R  'use client'; params → <MenuStudio/> | <CustomerPreviewRoute/> (?preview=1)
loading.tsx                      R  default export MenuBuilderSkeleton (§11)
error.tsx                        R  same reportBoundaryError / scheduleTransientRetry; copy fix
analytics/                       K  untouched
_components/
  # kept at the same path (tests import these — G12)
  menu-merge.ts                  E  additive exports (§5.7)
  menu-item-form.ts              K
  menu-setup.ts                  K
  menu-starter-data.ts           K
  menu-theme.ts                  E  + themeDiff, isThemeDirty
  menu-constants.ts              K
  menu-types.ts                  E  + MenuData, ItemTarget, RowSaveState
  menu-ui.ts                     E  + hooks (§7.12); chunk 4 removes MENU_INPUT_CLASS, MENU_LABEL_CLASS, copyText
  ThemeThumb.tsx                 K  used by design/ThemeCard
  # new pure modules, beside the kept ones (node:test-able, React-free)
  menu-status.ts                 C
  menu-filter.ts                 C
  menu-paste.ts                  C
  menu-undo.ts                   C
  menu-dnd.ts                    C
  menu-bulk-price.ts             C
  menu-keys.ts                   C
  menu-queue.ts                  C  createSerialQueue, runPool
  menu-setup-preview.ts          C
  menu-i18n.ts                   C  single TR/EN copy module (replaces menu-copy.ts + setupCopy + inline strings)
  data/
    menu-api.ts                  C  apiCall (mapMenuApiError) + typed endpoints
    useMenuData.ts               C  React Query load + cache helpers
    useSerialQueue.ts            C  hook around createSerialQueue
    useMenuActions.ts            C  every mutation: optimistic → queue → API → merge → undo
    usePhotoUpload.ts            C  compress + upload + seq guard + object URLs
    useThemeDraft.ts             C  local design draft, apply, undo-of-apply (ThemeSync)
  kit/
    Sheet.tsx                    C  Radix Dialog sheet (right | bottom), keyboard-inset aware
    Toaster.tsx                  C  ToasterProvider + useToaster (single toast + undo stack)
    SaveIndicator.tsx            C  aria-live save/live/offline indicator (+ transient Geri al)
    storage.ts                   C  safeLocal*/safeSession* (try/catch)
    useMenuCopy.ts               C  locale from useParams → getMenuCopy()
    useFileDropGuard.ts          C  window dragover/drop guard
  studio/
    MenuStudio.tsx               C  orchestrator: data, role, modes, grid, providers, preview slot
    studio-context.tsx           C
    StudioHeader.tsx             C
    MenuStatusCard.tsx           C
    ViewSwitch.tsx               C  <1024: Düzenle | Servis | Önizle
    StudioToolbar.tsx            C
    ModeSwitch.tsx               C  ≥1024: Düzenle | Servis
    ContextBar.tsx               C
    ShortcutsDialog.tsx          C
    useStudioShortcuts.ts        C
    useUrlIntents.ts             C  ?edit= / ?share=1 once, then router.replace
    useScrollSpy.ts              C
    LoadErrorView.tsx            C
  outline/
    row-layout.ts                C  tier class strings shared with loading.tsx
    MenuOutline.tsx              C
    FilterChips.tsx              C
    CategoryChips.tsx            C
    CategoryRail.tsx             C
    CategorySection.tsx          C
    CategoryHeader.tsx           C
    ItemRow.tsx                  C
    ServiceRow.tsx               C
    DragPreviewRow.tsx           C  DragOverlay content
    InlineText.tsx               C
    InlinePrice.tsx              C
    StatusCell.tsx               C
    RowPhoto.tsx                 C
    QuickAddRow.tsx              C
    PasteReview.tsx              C
    NewCategoryRow.tsx           C
    CategoryOrderSheet.tsx       C
    MoveToCategoryDialog.tsx     C
    SelectionBar.tsx             C
    BulkPriceDialog.tsx          C
  item/
    ItemPanel.tsx                C  docked (right column) | sheet
    ItemForm.tsx                 C
    PhotoField.tsx               C
    StatusField.tsx              C
    ChipGroupField.tsx           C
    PasteSheet.tsx               C
  design/
    DesignPanel.tsx              C
    ThemeCard.tsx                C
    AccentPicker.tsx             C
    LogoField.tsx                C
  share/
    ShareDialog.tsx              C
  preview/
    RightPanel.tsx               C  ≥1024 column: [Önizleme | Ürün]
    PreviewPanel.tsx             C
    PhonePreview.tsx             C
    usePhoneFit.ts               C
    CustomerPreviewScreen.tsx    C
  setup/
    SetupStart.tsx               C
    SetupWizard.tsx              C
    SetupPreviewEmpty.tsx        C
    useSetupDraft.ts             C
```

### 4.2 Deleted in chunk 4 (after their replacements exist; read each before deleting)
```
_components/BulkAddModal.tsx         → outline/PasteReview + item/PasteSheet
_components/CategoryMenu.tsx         → outline/CategoryHeader (⋯)
_components/CategoryModal.tsx        → InlineText rename/description + NewCategoryRow
_components/CategoryNav.tsx          → outline/CategoryChips + CategoryRail
_components/ItemEditorModal.tsx      → item/ItemPanel + ItemForm
_components/ItemList.tsx             → outline/MenuOutline + CategorySection
_components/MenuDesignModal.tsx      → design/DesignPanel
_components/MenuItemRow.tsx          → outline/ItemRow + StatusCell
_components/MenuLivePreview.tsx      → preview/PreviewPanel + PhonePreview (frame ported first)
_components/MenuSetupWizard.tsx      → setup/* (PRESET_PALETTE ported first)
_components/MenuShareModal.tsx       → share/ShareDialog (logic ported 1:1 first)
_components/MenuStatusBar.tsx        → studio/MenuStatusCard
_components/SortableCategoryRow.tsx  → CategoryRail / CategoryOrderSheet rows
_components/SwitchRow.tsx            → not needed
_components/menu-copy.ts             → _components/menu-i18n.ts
_components/useMenuBuilder.ts        → _components/data/*
```
Verification after deletion: `grep -rn "buildMenuCopy\|useMenuBuilder\|MENU_INPUT_CLASS\|MENU_LABEL_CLASS\|ItemEditorModal\|MenuLivePreview" src tests` → 0 hits. Test imports are unchanged by design: `grep -rn "menu/_components/menu-" tests` must list exactly the five existing tests plus the new ones in §17.

### 4.3 Outside the folder

| File | Change |
|---|---|
| `src/lib/menu-restore.ts` | C — `MENU_RESTORE_WINDOW_MS`, `canRestore` (§6.1) |
| `src/app/api/restaurants/[id]/menu/restore/route.ts` | C — §6.2 |
| `src/lib/menu-api-error.ts` | E — `RESTORE_EXPIRED`, `CATEGORY_DELETED` |
| `src/app/globals.css` | E — `bz-row-flash`, `bz-toast-in` keyframes + reduced-motion rule (§15.6) |
| `CLAUDE.md` | §12.1 builder structure rewrite (chunk 4); §12.4 "Restore yolu yok" → restore endpoint sentence (chunk 1); §38 stage entry (chunk 4) |
| `tests/*` | new + extended (§17) |

Untouched and verified to keep working: `dashboard/menu/loading.tsx`, `dashboard/menu/_components/MenuHubRedirect.tsx` (default-import `…/restaurants/[id]/menu/loading`), `dashboard/menu/page.tsx`, `UserDashboardShell.tsx`, `RestaurantDetailClient.tsx`, `RestaurantsClient.tsx`, admin links, `analytics/`, `BrandIdentityCard.tsx` (upload route), `PublicMenuView.tsx`.

Shared libs used unchanged: `menu-readiness`, `menu-bulk-parse`, `client-image`, `qr-colors`, `format`, `validations`, `sector-platforms`, `site`, `timezone`, `clipboard` (`copyToClipboard`), `src/hooks/useCurrentRole`, `src/components/ui/*`, `dashboard/surveys/_components/useUnsavedGuard` and `…/menu-touch` (`MENU_TOUCH`).

---

## 5. Data layer

### 5.1 Load (`data/useMenuData.ts`)
```ts
export function useMenuData(restaurantId: string, isTr: boolean): {
  data: MenuData | undefined;
  isPending: boolean;              // first load only
  loadError: string | null;        // localized; meaningful when !data
  fetchAll: () => Promise<void>;   // silent refetch (keeps data + scroll)
  setMenu: (fn: (m: MenuData) => MenuData) => void;   // queryClient.setQueryData
  getMenu: () => MenuData | undefined;                // latest inside async actions
  touchLocal: () => void;          // restaurant.menuUpdatedAt = now
}
```
- `useQuery({ queryKey: ['menu-builder', restaurantId], queryFn: () => fetchMenuData(restaurantId, isTr), staleTime: Infinity, gcTime: 0, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })`. `gcTime: 0` = every visit loads fresh (today's behaviour).
- `fetchMenuData` = old `fetchAll` body: `Promise.all([GET /api/restaurants/[id], GET …/menu/categories])`, same mapping (`primaryColor ?? '#C6F24E'`, `menuEnabled ?? true`, theme falls back to `'classic'` when not in `MENU_THEMES`, items sorted by `sortOrder`). Errors: `Restoran yüklenemedi` / `Menü yüklenemedi` (TR/EN).
- A failed silent `fetchAll` keeps data and shows the error toast `errors.refreshFailed` with `Tekrar dene`.
- Role: `useCurrentRole()`. `MenuStudio` renders `<MenuBuilderSkeleton/>` while `isPending || roleLoading` (`roleLoading` is React Query `isLoading`, true only on first load — a later invalidation never brings the skeleton back).

### 5.2 API client (`data/menu-api.ts`)
Keeps the old `apiCall` contract:
```ts
export type ApiCall<T> =
  | { ok: true; status: number; data: T | null }
  | { ok: false; status: number; code: string | null; itemCount: number | null; message: string }; // message = mapMenuApiError(...)
export async function apiCall<T>(url: string, init: RequestInit | undefined, isTr: boolean): Promise<ApiCall<T>>;
```
Typed endpoints (all take `restaurantId`, `isTr`): `createCategory`, `updateCategory`, `deleteCategory(id, { deleteItems })` (`?deleteItems=true` exact), `createItem(payload: Required<ItemPatch>)`, `updateItem(id, patch: ItemPatch)`, `deleteItem(id)`, `bulkCreateItems(categoryId, items)`, `reorder({ categories? | items? })`, `setPublished(bool)`, `uploadImage(file, 'item'|'logo')`, `patchTheme(patch)`, `restore({ itemIds } | { categoryId })` (new), `qrUrl({ format, width })`.

### 5.3 Write ordering (`menu-queue.ts` + `data/useSerialQueue.ts`) — G7
```ts
// menu-queue.ts (pure)
export function createSerialQueue(): <T>(key: string, task: () => Promise<T>) => Promise<T>; // per-key FIFO; keys independent; a rejected task never blocks the next
export async function runPool<T>(tasks: (() => Promise<T>)[], limit = 4): Promise<PromiseSettledResult<T>[]>; // results in input order
```
Queue keys (every write goes through exactly one):

| Key | Used by | Why |
|---|---|---|
| `item:<id>` | every item PATCH/DELETE (inline, toggles, panel save, photo, bulk per-item, undo) | rapid on→off→on lands in order |
| `cat:<id>` | category PATCH (rename, description, visibility) and DELETE | order per category |
| `append:<categoryId>` | item POST (quick-add, panel create, duplicate), bulk POST, category-change PATCH (single, bulk, drag) | server computes `last+10` / `MAX+1` per request; serializing appends prevents sortOrder collisions |
| `order:items:<categoryId>` / `order:categories` | reorder PATCH | last write wins in order |
| `theme` | theme apply and undo-of-apply (inside ThemeSync) | — |

`useMenuActions` exposes `pending: number` (requests in flight) for the SaveIndicator and the leave guard.

### 5.4 Actions (`data/useMenuActions.ts`)
`useMenuActions({ restaurantId, isTr, menu, toaster, copy, isPublished, onAccessLost })` returns a **stable** object (latest-ref pattern). Each returns `Promise<{ ok: true } | { ok: false; message: string }>`. On success: `menu.touchLocal()`. No shared `busy`. Per-row state `rowState: Record<itemId, 'saving' | 'saved' | 'error'>` (`saved` clears after 1200ms).

Rules:
- **Revert only if unchanged since**: on failure restore the previous value only if the field still holds this call's optimistic value.
- **Temp ids**: `TEMP_PREFIX = 'tmp_'`. Temp rows are excluded from reorder payloads, readiness, nudges, filters' counts and the preview. Actions that need a server id are disabled on temp rows.
- **Access lost** (G11): any response with `code` `forbidden_role` or `MENU_MODULE_DISABLED` → error toast (mapped) + `queryClient.invalidateQueries({ queryKey: ['current-user-role'] })` + `fetchAll()`; throttled to once per 10s.
- Toast policy column: **silent** = undo entry pushed, SaveIndicator only (G4); **toast** = `toaster.notify` with Geri al.

| Action | Optimistic | Request (queue) | Merge | Undo | Feedback |
|---|---|---|---|---|---|
| `renameItem(id, name)` | yes | PATCH `{name}` (`item:`) | `applySavedItem(edit)` | PATCH previous | silent |
| `setItemPrice(id, cents)` | yes | PATCH `{priceCents}` (`item:`) | same | PATCH previous | silent |
| `toggleSoldOut(id)` | yes | PATCH `{isOutOfStock}` | same | PATCH previous | toast `statusChanged(name, Satışta/Tükendi)` |
| `hideItem(id)` / `showItem(id)` | yes | PATCH `{isAvailable}` only | same | PATCH previous | toast `hidden(name)` / `shown(name)` |
| `setItemStatus(id, s)` (panel) | — | part of `saveItem` | — | — | — |
| `createItemQuick(catId, {name, priceCents})` | **pending row** appended | POST (`append:<catId>`) with defaults (`description:null, imageUrl:null, badges:[], allergens:[], isAvailable:true, isOutOfStock:false`, currency `'TRY'`) | `replaceItem(tempId, saved)`; fallback `applySavedItem(create)` if the temp row is gone and the id is new | DELETE | silent; row flash; failure → pending row error state with `Tekrar dene` / `Sil`, typed text kept |
| `retryCreate(tempId)` / `discardCreate(tempId)` | — | re-POST / remove locally | — | — | — |
| `saveItem(mode, id?, values)` (panel) | no | POST (`append:`) / PATCH `buildEditPatch` (`item:`; `append:<new>` when `categoryId` changed) | `applySavedItem`; category change → scroll + flash in new section | create → DELETE; edit → PATCH inverse of changed fields | toast `saved(name)` (Kaydet) / inline notice in panel (Kaydet ve yenisini ekle) |
| `duplicateItem(id)` | no | POST copy (`append:`), name + `copySuffix` trimmed to 120, `isOutOfStock:false`, other fields copied → `reorder` copy below source (`order:items:`) | merge + `withIndexSortOrder` | DELETE copy | toast `duplicated(name)`; fine pointer: copy's name opens in inline edit with text selected |
| `deleteItem(id)` | remove | DELETE (`item:`) | — | `restore({itemIds:[id]})` → `insertItemBySortOrder` | toast `itemDeleted(name)` |
| `setItemPhoto(id, file)` | object-URL preview | upload → PATCH `{imageUrl}` (`item:`) | merge | PATCH previous `imageUrl` | silent + flash; error text on row |
| `setItemPhotoUrl(id, url\|null)` | no | PATCH | merge | PATCH previous | silent |
| `moveItemToCategory(id, toCat, toIndex?)` | `moveItemLocal` | PATCH `{categoryId}` (`append:<to>`); if `toIndex` → `reorder` target (+ source) (`order:items:`) | `applySavedItem` | PATCH original `categoryId`, then reorder both lists to snapshot | toast `moved(name, category)`; failure → `fetchAll` + error toast |
| `reorderItems(catId, ids)` | `withIndexSortOrder` | `reorder {items}` | — | reorder previous | toast `orderSaved`; failure → `fetchAll` + error toast |
| `bulkSetFlags(ids, op)` op ∈ `markAvailable \| markSoldOut \| hide \| show` | yes (only items whose flag differs, via `flagPatch`) | `runPool` N×PATCH, limit 4 | per item | one entry: PATCH each previous flag | toast `bulkUpdated(n)`; partial → revert failed, toast `bulkPartial(f)` |
| `bulkSetPrices(changes: {id, to}[])` | yes | `runPool` N×PATCH `{priceCents}`, limit 4 | per item | one entry: PATCH previous cents | dialog progress; toast `pricesUpdated(n)`; partial → dialog banner |
| `bulkMove(ids, toCat)` | `moveItemsToEnd` (visual order) | sequential PATCH `{categoryId}` (`append:<to>`) | per item | PATCH back + reorder originals to snapshot | toast `bulkMoved(n, category)` |
| `bulkDelete(ids)` | remove | `runPool` N×DELETE, limit 4 | — | one `restore({itemIds: succeeded})` (≤100) | confirm if ≥5; toast `bulkDeleted(n)` |
| `bulkCreate(catId, rows)` | no | POST `/items/bulk` ≤30 (`append:`) | `applySavedItem(create)` each | DELETE each (`runPool`) | toast `itemsAdded(n)`; error inside the review, text kept |
| `commitPaste(plan)` | no | `intoTarget` → bulk; each new category: POST category then bulk; stop at first failure | merge every response (no `fetchAll`) | delete created items, then created categories | §8.3 |
| `createCategory(name)` | no | POST (`isVisible:true`) | `applySavedCategory(create)`; open its quick-add | DELETE (empty) | toast `categoryAdded(name)` |
| `renameCategory` / `setCategoryDescription` | yes | PATCH (`cat:`) | `applySavedCategory(edit)` | PATCH previous | silent |
| `setCategoryVisible(id, v)` | yes | PATCH `{isVisible}` | — | PATCH previous | toast `categoryHidden/Shown(name)` |
| `deleteCategory(id)` | `removeCategory` | DELETE `?deleteItems=true` when itemCount > 0 (`cat:`); a 409 `CATEGORY_NOT_EMPTY` re-asks with the server's `itemCount` | focus `neighbourCategoryId` | `restore({categoryId})` → `insertCategoryBySortOrder` | toast `categoryDeleted(name, n)` |
| `reorderCategories(ids)` | yes | `reorder {categories}` | — | reorder previous | toast `orderSaved`; failure → `fetchAll` |
| `publish()` / `unpublish()` | no | `setPublished` | apply `restaurant.menuPublished/menuUpdatedAt`; unmergeable → `fetchAll` | none | §8.13 |
| `createMenuFromSetup(plan, onProgress)` | no | sequential category POST then bulk per category, stop at first failure | **always `fetchAll`** | none | `setupCreated` / `presetPartial` |

### 5.5 Undo, toasts, SaveIndicator (`menu-undo.ts`, `kit/Toaster.tsx`, `kit/SaveIndicator.tsx`)
```ts
// menu-undo.ts (pure) — clarity's, unchanged
export interface UndoEntry { id: string; label: string; createdAt: number; run: () => Promise<{ ok: boolean; message?: string }> }
export interface UndoState { entries: UndoEntry[]; running: string | null }
export const UNDO_LIMIT = 20;
export const UNDO_MAX_AGE_MS = MENU_RESTORE_WINDOW_MS - 60_000; // 29 min
export function pushUndo(s, e, now): UndoState; export function takeLatest(s, now): { state; entry };
export function removeUndo(s, id): UndoState; export function pruneUndo(s, now): UndoState;
```
`ToasterProvider` (in `MenuStudio`) exposes:
```ts
notify(o: { message: string; tone?: 'success' | 'error' | 'info'; undo?: UndoEntry['run']; undoLabel?: string; action?: { label: string; run(): void }; durationMs?: number; silentIfModal?: boolean }): void;
pushUndo(label: string, run: UndoEntry['run']): string;   // silent entry (inline edits, quick-add, photo); returns id
undoLatest(): Promise<void>;  undoById(id: string): Promise<void>;
canUndo: boolean; lastSilentUndo: { id: string; at: number } | null; dismiss(): void;
```
- One visible toast; a newer one replaces it; the older entry stays in the stack. Durations: 8000ms with undo, 4000ms info/success, errors until dismissed. Hover/focus pauses.
- Geri al → spinner + `Geri alınıyor…` → success info `Geri alındı` / failure error toast (mapped, e.g. `RESTORE_EXPIRED`). While one undo runs, others are ignored.
- Markup: always-mounted `<div role="status" aria-live="polite" className="sr-only">`; error also `role="alert"`. Visible bar `fixed inset-x-4 z-[65] mx-auto max-w-[560px] rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-white shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bz-toast-in` with `bottom-[calc(var(--dash-bottom-nav-h,0px)+var(--menu-stack,0px)+12px)] lg:bottom-[calc(var(--menu-stack,0px)+24px)]`; when `useKeyboardInset() > 0` the bar gets `style={{ bottom: inset + 12 }}`. Content: lime live dot (published only, sr text `toast.liveSr`) · message `text-[13px] font-medium` · `Geri al` (`h-9 rounded-lg bg-[#C6F24E] px-3 text-[13px] font-semibold text-[#0A0A0A]`) · X (`bz-btn-icon-on-dark`). Error tone `border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]`.
- z-[65]: above sheets/modals (50) and the impersonation banner (60), below PulseMenu (70).
- **Radix modal inertness**: while a modal Sheet/Dialog is open, actions triggered inside it pass `silentIfModal: true`; the surface shows its own inline notice ("“Ayran” eklendi · Geri al") and the entry is still pushed. Surfaces that close on success (Kaydet in the item sheet, PasteSheet, BulkPriceDialog, MoveToCategoryDialog, Design sheet Apply) toast after closing.
- **SaveIndicator** (G4): `<div className="flex items-center gap-2"><p role="status" aria-live="polite">…</p>{undo button}</div>` — never `aria-live` on a button. State priority: offline > error > saving > saved > idle.

| State | Desktop text | Compact (phone chip bar) |
|---|---|---|
| idle, published | `● Canlı` (green #16A34A dot) | `● Canlı` |
| idle, draft | `Taslak` (grey #A3A3A3 dot) | `Taslak` |
| saving (`pending > 0`) | Loader2 `Kaydediliyor…` | Loader2 |
| saved (2.5s after the last success) | Check `Kaydedildi · canlı` / `Kaydedildi` | Check `Kaydedildi` |
| error | AlertCircle `Kaydedilemedi` — a separate button focuses the failed row | same |
| offline (`navigator.onLine === false`) | amber dot `Çevrimdışı` | same |

  When `lastSilentUndo` is under 8s old, a `Geri al` text button (`min-h-11 pointer-fine:min-h-8 text-[12.5px] font-semibold underline-offset-2`) follows the text → `undoById`. Desktop also has a permanent toolbar Undo icon button (`Undo2`, tooltip `Geri al (⌘Z)`, `aria-keyshortcuts="Meta+Z Control+Z"`, disabled when `!canUndo`).

### 5.6 Global guards (`kit/useFileDropGuard.ts`, `menu-ui.ts useOnline`) — G11
- **File drop**: `window` `dragover` + `drop` listeners: if `e.dataTransfer?.types.includes('Files')` and `!(e.target as Element)?.closest('[data-dropzone]')` → `preventDefault()` (+ `dropEffect = 'none'` on dragover). Drop zones: row `li`, `RowPhoto`, `PhotoField`, `LogoField`. dnd-kit uses pointer events, so it is unaffected.
- **Offline**: `useOnline()` (navigator.onLine + `online`/`offline` events) drives the SaveIndicator. Mutations still attempt and revert with the mapped `network` message.
- **Leave guard**: `useUnsavedGuard(itemDirty || themeDirty || pasteDirty || pending > 0, locale)`. Inline cells commit on blur, so they never need it.

### 5.7 Pure helper additions
`menu-merge.ts` (existing exports and signatures unchanged; `patchItem` keeps the identity of untouched categories):
```ts
export const TEMP_PREFIX = 'tmp_'; export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);
export function withoutTemps(cats: CategoryShape[]): CategoryShape[];
export function replaceItem(cats, tempId: string, saved: SavedItem): CategoryShape[];        // fallback applySavedItem(create)
export function removeItems(cats, ids: string[]): CategoryShape[];
export function patchItems(cats, patches: { id: string; patch: Partial<MenuItemView> }[]): CategoryShape[];
export function snapshotItemPositions(cats, ids: string[]): { item: MenuItemView; categoryId: string; index: number }[];
export function moveItemsToEnd(cats, ids: string[], toCategoryId: string): CategoryShape[];
export function insertItemBySortOrder(cats, categoryId: string, item: SavedItem): CategoryShape[] | null;
export function insertCategoryBySortOrder(cats, category: SavedCategory & { items: MenuItemView[] }): CategoryShape[];
export function moveItemLocal(cats, itemId: string, toCategoryId: string, toIndex?: number): CategoryShape[] | null;
export const DRAFT_ITEM_ID = '__draft__';
export function overlayItemDraft(cats, draft: { mode: 'create' | 'edit'; itemId?: string; categoryId: string; values: ItemFormValues; fallbackName: string; currency: string }): CategoryShape[];
```
`menu-status.ts`:
```ts
export type ItemStatus = 'available' | 'soldOut' | 'hidden';
export function itemStatus(i): ItemStatus;                       // !isAvailable → hidden; isOutOfStock → soldOut; else available
export function statusPatch(target: ItemStatus, cur): { isAvailable?: boolean; isOutOfStock?: boolean }; // panel 3-state; only changed keys
export type FlagOp = 'markAvailable' | 'markSoldOut' | 'hide' | 'show';
export function flagPatch(op: FlagOp, cur): { isAvailable?: boolean; isOutOfStock?: boolean } | null; // one flag; null = no change
export type RowBadge = 'categoryHidden' | 'hidden' | 'soldOut' | null;
export function rowBadge(item, category): RowBadge;              // priority categoryHidden > hidden > soldOut
export type CustomerVisibility = 'visible' | 'soldOut' | 'hiddenItem' | 'hiddenCategory';
export function customerVisibility(item, category): CustomerVisibility;
export interface MenuNudges { noPhoto: number; soldOut: number; zeroPrice: number; noDescription: number; hidden: number }
export function menuNudges(cats): MenuNudges;                    // temps excluded
```
`menu-filter.ts`:
```ts
export type MenuFilter = 'all' | 'soldOut' | 'hidden' | 'noPhoto' | 'noDescription' | 'zeroPrice';
export function foldSearch(s: string): string; // toLocaleLowerCase('tr-TR'); ç→c ğ→g ı→i i̇→i ö→o ş→s ü→u â→a î→i û→u; collapse spaces
export function itemMatches(item, categoryName, tokens: string[], filter, categoryVisible): boolean;
//  soldOut = isAvailable && isOutOfStock; hidden = !isAvailable || !categoryVisible; noPhoto = !imageUrl; noDescription = !description?.trim(); zeroPrice = priceCents === 0
export function filterCounts(cats): Record<Exclude<MenuFilter, 'all'>, number>;
export function filterMenu(cats, query, filter, opts?: { keepIds?: Set<string> }):
  { sections: { category: CategoryShape; items: MenuItemView[] }[]; total: number; active: boolean };
//  keepIds: rows that just stopped matching stay visible (completion workflow linger)
export function visibleItemIds(sections, collapsed: Set<string>): string[]; // flat visual order, temps excluded
```
`menu-paste.ts` (clarity's, plus one function):
```ts
export function isMultiLinePaste(text: string): boolean;
export function parseSingleLine(text: string): { name: string; priceCents: number } | null; // one non-blank line that parseMenuLines reads with no error
export function parsePasteBlock(text: string, isTr: boolean): { sections: PasteSection[] };
export function revalidateRow(row: PasteRow, isTr: boolean): PasteRow;
export function pastePlan(sections): { intoTarget: {name; priceCents}[]; newCategories: { name; items }[] }; // ≤30 per list
export function setupCategoriesFromPaste(sections, isTr): SetupCategory[];
```
`menu-dnd.ts` (clarity's): `containerId`, `findContainer`, `moveAcross`, `DropResult`, `resolveDrop`.
`menu-bulk-price.ts` (G3):
```ts
export type PriceOp = { kind: 'percent'; direction: 'up' | 'down'; value: number }      // value in percent, e.g. 7.5
                    | { kind: 'amount';  direction: 'up' | 'down'; cents: number }
                    | { kind: 'fixed'; cents: number };
export type PriceRounding = 0 | 100 | 500 | 1000;                                        // minor units (Yok · 1 · 5 · 10)
export function parsePercentInput(raw: string): number | null;                           // "10", "7,5", "7.5"; 0 < v ≤ 500
export function roundTo(cents: number, step: PriceRounding): number;                     // Math.floor((x + step/2)/step)*step
export function applyPriceOp(cents: number, op: PriceOp, rounding: PriceRounding): number; // integer, clamped ≥ 0
export function previewPriceOp(items: { id; name; priceCents; currency }[], op, rounding):
  { changes: { id; name; from: number; to: number }[]; unchanged: number; zeroCount: number; mixedCurrency: boolean };
```
`menu-keys.ts`: §9. `menu-queue.ts`: §5.3. `menu-setup-preview.ts`: `planToPreviewCategories(plan)` (ids `setup-${i}` / `setup-${i}-${j}`, currency `TRY`, visible/available true, sortOrder = index). `menu-theme.ts`: `themeDiff(applied, draft)`, `isThemeDirty(applied, draft)` (accent compared after `normaliseHex`; logo by string equality). `menu-types.ts`: `MenuData = { restaurant: RestaurantShape; categories: CategoryShape[] }`, `ItemTarget = { mode: 'create'; categoryId: string } | { mode: 'edit'; itemId: string }`, `RowSaveState = 'saving' | 'saved' | 'error'`.

---

## 6. Backend additive: restore endpoint

### 6.1 `src/lib/menu-restore.ts` (pure, tested)
```ts
export const MENU_RESTORE_WINDOW_MS = 30 * 60_000;
export type RestoreCheck = 'active' | 'ok' | 'expired';
export function canRestore(deletedAt: Date | string | null | undefined, now: Date, windowMs = MENU_RESTORE_WINDOW_MS): RestoreCheck;
```

### 6.2 `src/app/api/restaurants/[id]/menu/restore/route.ts`
```ts
const BodySchema = z.union([
  z.object({ itemIds: z.array(z.string().min(1).max(128)).min(1).max(100) }).strict(),
  z.object({ categoryId: z.string().min(1).max(128) }).strict(),
]);
export async function POST(req, { params }) {
  const { id } = await params;
  const gate = await requireMenuModuleAccess(req, id);     // viewer 403 forbidden_role; module off 403 MENU_MODULE_DISABLED; admins bypass
  if (!gate.ok) return gate.res;
  const limit = await rateLimit(`menu:restore:${gate.actor.id}`, 60, 60_000);   // 429 + Retry-After
  const parsed = validateBody(BodySchema, await req.json().catch(() => null));
  …
}
```
- **Category branch**: find (`select: { id, restaurantId, deletedAt }`); missing or foreign → `404 { error: 'Kategori bulunamadı', code: 'NOT_FOUND' }`. `canRestore`: `active` → `200 { category }` (idempotent); `expired` → `410 { error: 'Geri alma süresi doldu', code: 'RESTORE_EXPIRED' }`. Otherwise `$transaction([ menuItem.updateMany({ where: { categoryId, restaurantId: id, deletedAt: cat.deletedAt }, data: { deletedAt: null } }), menuCategory.update({ where: { id: categoryId }, data: { deletedAt: null } }) ])`. Only items with the **exact shared `deletedAt`** come back (the `?deleteItems=true` cascade writes one timestamp in one transaction — verified in `categories/[categoryId]/route.ts:57-65`); items deleted earlier on their own stay deleted. Then load with active items ordered `[sortOrder asc, createdAt asc]`, `touchMenuUpdated(id)`, `200 { category }`.
- **Items branch**: `findMany({ where: { id: { in }, restaurantId: id }, select: { id, deletedAt, category: { select: { deletedAt: true } } } })`. Classify: missing → `skipped NOT_FOUND`; active → keep; expired → `skipped RESTORE_EXPIRED`; category deleted → `skipped CATEGORY_DELETED`; else eligible. `updateMany` eligible → `deletedAt: null`; `touchMenuUpdated` if any. `200 { items: [...eligible, ...alreadyActive], skipped }`. Restored items keep `sortOrder` and `categoryId`; the client places them with `insertItemBySortOrder`.
- Every query uses explicit `select`. No schema change.

### 6.3 Error mapping (`src/lib/menu-api-error.ts`, + tests)
```
RESTORE_EXPIRED:  tr 'Bu işlem artık geri alınamıyor.'  en 'This can no longer be undone.'
CATEGORY_DELETED: tr 'Ürünün kategorisi silinmiş. Önce kategoriyi geri al.'  en "This item's category was deleted. Restore the category first."
```
A 200 with a non-empty `skipped` is a partial undo: show the first skipped code's message.

---

## 7. Components

Conventions: `copy` from `useMenuCopy()`; actions and flags from `useStudio()`; `lucide-react` icons 14px in buttons, 13px in menu items; primitives from `@/components/ui`; PulseMenus get `className="min-w-[220px] " + MENU_TOUCH`; items that open dialogs use `afterMenuCloses`.

### 7.1 `page.tsx`
```tsx
'use client';
export default function RestaurantMenuPage() {
  const params = useParams(); const sp = useSearchParams();
  const id = params.id as string; const locale: 'tr' | 'en' = params.locale === 'en' ? 'en' : 'tr';
  return sp.get('preview') === '1' ? <CustomerPreviewRoute restaurantId={id} locale={locale}/> : <MenuStudio restaurantId={id} locale={locale}/>;
}
```

### 7.2 `studio/MenuStudio.tsx`
Props `{ restaurantId: string; locale: 'tr' | 'en' }`.
- `useMenuData`, `useCurrentRole`; skeleton while `isPending || roleLoading`; full-page `LoadErrorView` when `!data && loadError`.
- Flags: `menuEnabled`, `readOnly = !menuEnabled || isViewer || roleLoading`, `lockReason = !menuEnabled ? 'locked' : isViewer ? 'viewer' : null`, `canEdit = !readOnly`, `canDesign = menuEnabled && !isViewer`, `canShare = menuEnabled`, `isPublished = restaurant.menuPublished && menuEnabled`.
- Derived: `stable = withoutTemps(categories)`; `readiness = getMenuReadiness(stable)`; `nudges = menuNudges(stable)`; `filtered = filterMenu(categories, deferredQuery, filter, { keepIds: lingerIds })`; `visibleIds = visibleItemIds(filtered.sections, collapsed)`.
- State: `mode: 'edit' | 'service'` (`localStorage['buaze:menu:mode']`), `phonePreview` (<1024), `workspace: 'outline' | 'design'`, `itemTarget: ItemTarget | null`, `rightTab: 'preview' | 'item'`, `previewCollapsed`, `query`, `filter`, `lingerIds`, `selection: Set<string> | null` (null = not selecting), `selectionAnchor`, `reorderMode` (coarse), `collapsed` (`buaze:menu:collapsed:<restaurantId>`), dialogs (`shareOpen`, `shortcutsOpen`, `categoryOrderOpen`, `pasteSheet: null | { categoryId }`, `moveDialog: null | { itemIds }`, `bulkPrice: null | { itemIds }`), `justPublished`, `setupMode: null | 'template' | 'paste' | 'blank'`, `itemDraft` (for the overlay).
- `useThemeDraft` (draft shared by DesignPanel and preview). Providers: `<ToasterProvider>` → `<StudioContext.Provider>`. Hooks: `useUrlIntents`, `useStudioShortcuts`, `useFileDropGuard`, `useUnsavedGuard(...)`.
- Preview data: `previewRestaurant = { ...restaurant, ...themeDraft.draft }`; `previewCategories = itemTarget && itemDraft ? overlayItemDraft(stable, itemDraft) : stable`; `focusItemId` = panel target (edit id or `DRAFT_ITEM_ID`), else the inline-edited/focused row (debounced 150ms); `followCategoryId = scrollSpy.activeId`.
- **Preview slot (one `PublicMenuView` at a time)** — `PublicMenuView` queries `document` globally:
  ```
  previewSlot = isDesktop
      ? (rightColumnVisible && rightTab === 'preview' && !tooShort ? 'right' : (tooShortSheetOpen ? 'sheet' : null))
      : itemSheetOpen && itemSheetTab === 'preview' ? 'itemSheet'
      : designSheetOpen ? 'designSheet'
      : phonePreview ? 'page' : null
  ```
  Every `PhonePreview` host renders only when it owns the slot.
- Entering design mode closes the item panel (dirty guard) and forces `rightTab='preview'`.
- Empty menu (`categories.length === 0`): `!readOnly` → setup flow (§10) instead of status card + toolbar + outline; the right column shows the plan preview. `readOnly` → status card + `EmptyState` ("Bu işletmenin menüsü henüz boş.").
- Layout §3; the outline wrapper has `id="menu-items-pane"` and `@container/outline`.

### 7.3 `studio/studio-context.tsx`
```ts
export interface StudioContextValue {
  restaurantId: string; locale: 'tr' | 'en'; isTr: boolean;
  readOnly: boolean; canEdit: boolean; isPublished: boolean; finePointer: boolean; mode: 'edit' | 'service';
  categories: CategoryShape[]; actions: MenuActions; rowState: Record<string, RowSaveState>; pendingCreates: Record<string, { status: 'saving' | 'error'; message?: string }>;
  selection: Set<string> | null; toggleSelect(id: string, opts?: { range?: boolean }): void;
  openItem(itemId: string, focusField?: 'photo' | 'description'): void; createItemIn(categoryId: string): void;
  openMoveDialog(itemIds: string[]): void; openBulkPrice(itemIds: string[]): void; openCategoryOrder(): void; openPasteSheet(categoryId: string | null): void;
  focusQuickAdd(categoryId: string): void; focusNewCategory(): void; jumpToCategory(categoryId: string): void;
  registerPriceCell(itemId: string, open: () => void): () => void; openPriceCell(fromItemId: string, dir: 1 | -1): void; // spreadsheet run over visibleIds
  flashItem(itemId: string): void; // scrollIntoView({block:'nearest'}) + bz-row-flash
  linger(itemId: string): void;    // completion workflow: keep visible 1200ms
}
```

### 7.4 `studio/StudioHeader.tsx`
Props `{ restaurantName; canDesign; canShare; designActive; onOpenDesign(); onOpenShare(); analyticsHref; fullPreview: { href; external }; onSortCategories?(); onPasteList?(); onCollapseAll?(); onExpandAll?(); onShortcuts?() }`. `PageHeader className="!mb-0" titleScale="compact" title={copy.header.title} description={<span className="font-medium text-[#0A0A0A]">{restaurantName}</span>}`. Actions `flex w-full items-center gap-2 sm:w-auto`: `Görünüm` (`bz-btn-ghost flex-1 sm:flex-none min-h-[44px] sm:min-h-[36px]`, Palette, `aria-pressed`, disabled with reason when `!canDesign`), `Paylaş ve QR` (`bz-btn-primary flex-1 sm:flex-none`, QrCode, disabled when `!canShare`), `Diğer` (`bz-btn-ghost min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0`, MoreHorizontal, text `hidden sm:inline`). Diğer items §2.

### 7.5 `studio/MenuStatusCard.tsx`
Clarity's card, unchanged except where noted. Props `{ restaurant; readiness; nudges; lockReason; canEdit; publishBusy; justPublished; canNativeShare: boolean; onPublish(); onUnpublish(); onDismissJustPublished(); onStep(step); onNudge(filter); onReopenAllSoldOut(); onOpenShare(); onNativeShare() }`. Container `<section aria-labelledby="menu-status-title" className="bz-card p-4 sm:p-5 min-h-[164px] sm:min-h-[128px] lg:min-h-[112px]">`.
States (first match wins): **locked** (Badge off + Lock "Kilitli", `lockedTitle/Body`, `mailto:support@buaze.com?subject=…` "Bize yaz"); **viewer** (Badge info "Yalnızca görüntüleme", live/draft title, link chip + copy if live); **draft** (Badge off "Taslak", `draftTitle/Body`, "Son değişiklik" at every size, clickable 3-step `<ol>`: category → `focusNewCategory`, items → `focusQuickAdd(first)`, publish → `onPublish`; `Yayına al` `bz-btn-lime min-h-[44px] w-full lg:w-auto`, `aria-disabled` + `aria-describedby` reason); **live** (Badge ok + `bz-pulse-dot` "Yayında", `liveTitle/Body`, link chip `SITE_HOST/menu/<slug>`, `Linki kopyala`, **`Paylaş…`** (`bz-btn`, Share2; only when `canNativeShare`, computed in an effect as `typeof navigator.share === 'function'`; `navigator.share({ title: restaurant.name, url })`, `AbortError` ignored), `Menüyü aç`, quiet `Yayından kaldır` (`canEdit`); `publishableItems === 0` → `AlertBanner warn liveEmpty`; one-time `liveHint` row with `Anladım` (`buaze:menu:live-hint:v1`)); **justPublished** overlay (lime-soft card, `Linki kopyala`, `QR’ı indir` → share, `Paylaş…` when supported, X; text in `<p aria-live="polite">`).
Nudges row (draft and live, `canEdit`, items > 0; max 2; priority soldOut, zeroPrice, noPhoto, noDescription): link-buttons set the filter and scroll to the toolbar; soldOut adds `Hepsini satışa aç` (`bz-btn bz-btn-sm`) → `bulkSetFlags(soldOutIds, 'markAvailable')`.

### 7.6 Toolbar, view switches, ContextBar
**`studio/ViewSwitch.tsx`** (`lg:hidden`): `role="group" aria-label={copy.view.label}`, `inline-flex w-full gap-0.5 rounded-[10px] bg-[#F2F2F2] p-[3px] sm:w-auto`; three `aria-pressed` buttons `flex-1 sm:flex-none min-h-[44px] rounded-[7px] px-4 text-[13px] font-medium`: Düzenle (PencilLine), Servis (ToggleRight), Önizle (Smartphone). Selected `bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(10,10,10,0.08),0_0_0_1px_rgba(10,10,10,0.04)]`. Düzenle/Servis set `mode` (persisted); Önizle sets `phonePreview=true` (not persisted). Switching to Önizle scrolls so the switch sits under the topbar.
**`studio/ModeSwitch.tsx`** (≥1024): same idiom, two segments, `h-9`.
**`studio/StudioToolbar.tsx`**. Props `{ query; onQuery; filter; onFilter; counts; isPublished; pending; online; canUndo; onUndo(); mode; onMode; selecting: boolean; onToggleSelect(); reorderMode; onToggleReorder(); previewCollapsed; onShowPreview(); categoryChips: ReactNode; onAdd: { item(); category(); paste() }; readOnly }`.
- ≥1024 (`hidden lg:block`, sticky §3.2). Row 1 `flex h-14 items-center gap-2`: Search (`relative w-[240px] xl:w-[300px] shrink-0`; `bz-input h-9 pl-9 pr-8`; Search icon; `/` kbd hint when empty; clear X; `aria-label={copy.outline.searchLabel}`; `enterKeyHint="search"`; `useDeferredValue`) · `FilterChips` (`no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto`) · `SaveIndicator` · Undo · at ≥1400 (`hidden min-[1400px]:flex items-center gap-2`): `ModeSwitch` · `Seç` (`bz-btn-ghost h-9`, ListChecks, `aria-pressed`; selecting → label `Seçimi kapat`, X) · `+ Ekle ▾` (`bz-btn-primary h-[34px]`; PulseMenu Ürün ekle `N` / Kategori ekle `⇧N` / Liste yapıştır) · `Önizlemeyi göster` when collapsed. Row 2 (`flex h-14 items-center gap-2 min-[1400px]:hidden`): `categoryChips` (flex-1 min-w-0) · ModeSwitch · Seç · + Ekle · Önizlemeyi göster.
- <1024 (not sticky): `ViewSwitch`; row `flex flex-wrap items-center gap-2`: search (`flex-1 sm:flex-none sm:w-[280px]`, 44px) · `Sırala` (`bz-btn-ghost min-h-[44px]`, ArrowUpDown, `aria-pressed`; coarse pointers and `canEdit` only; hidden in Servis) · `Seç` (`bz-btn-ghost min-h-[44px]`; hidden in Servis); then a `FilterChips` row. Adding on phones = quick-add rows + `+ Yeni kategori` (no FAB).
**`outline/FilterChips.tsx`**: `Tümü` + chips with count > 0 (plus the active one). `button aria-pressed inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium`; off `border-[#E5E5E5] bg-white text-[#525252]`; on `border-[#0A0A0A] bg-[#0A0A0A] text-white`; count `tabular-nums text-[12px] opacity-70`. Row hidden when all counts are 0 and value is `all`.
**`studio/ContextBar.tsx`** (top of the workspace column, not sticky; renders only when searching/filtering, selecting, or in reorder mode). `flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[13px]`:
- Search/filter: `<p role="status">` `resultsCount(n)` / `filterSummary(label, n)` + `Temizle`. Tükendi filter with n > 0 → `Hepsini satışa aç` (`bz-btn bz-btn-sm`) → `bulkSetFlags(ids, 'markAvailable')` (one undo). Fotoğrafsız/Açıklamasız → hint `completionHint` ("Tamamladıkça ürünler bu listeden çıkar."). Drag disabled note `dragDisabledWhileFiltering` (fine pointer, edit mode).
- Selecting: `selectedCount(n)` (+ `outsideFilter(k)` when selected rows are filtered out) · `Tümünü seç (görünen m)` · `Seçimi temizle`.
- Reorder mode: `reorderHint` + `Bitti` (`bz-btn bz-btn-sm`).

### 7.7 Outline
**`outline/MenuOutline.tsx`**. Props `{ sections; filterActive; query; onClearSearch(); collapsed: Set<string>; onToggleCollapse(id); mode; selecting; reorderMode; completion: 'noPhoto' | 'noDescription' | null }`.
- `!filterActive && sections.length === 0` → only `<NewCategoryRow autoFocus/>`. Otherwise `<h2 className="sr-only">{copy.outline.srTitle}</h2>` + `<div className="space-y-4">` of `CategorySection`s + `NewCategoryRow` (not while filtering / Servis / selecting). No results → `EmptyState` SearchX `noResults(query)` + `Aramayı temizle`.
- DnD: one `DndContext` around all sections (`sensors = useMenuDndSensors()`, `collisionDetection = closestCorners`, `accessibility = useDndAccessibility(isTr, nameOf, copy.dnd.instructions)` with `container:<id>` → "{name} kategorisi"). Drag start → snapshot; `onDragOver` → `moveAcross` into a local working copy; `onDragEnd` → `resolveDrop` → `reorderItems` or `moveItemToCategory(itemId, to, toIndex)`; cancel → drop the copy. `DragOverlay` (zIndex 45) → `DragPreviewRow` (`bz-elev-3`, thumb + name + price, `motion-safe:scale-[1.02]`).
- `dndEnabled = canEdit && mode === 'edit' && !filterActive && !selecting && !inlineEditing && (finePointer || reorderMode)`. Temp rows are never draggable. Collapsed sections stay droppable through their header (appends).

**`outline/CategoryChips.tsx`** (clarity's): variants `sticky-mobile` (`sticky top-[61px] z-20 -mx-4 border-b border-[#EDEDED] bg-[#FAFAFA]/95 px-4 backdrop-blur sm:-mx-7 sm:px-7 lg:hidden`, inner `flex h-[52px] items-center gap-2`) and `toolbar`. **Leading** `SaveIndicator variant="compact"` (G8, sticky-mobile only; `shrink-0`). Chips `h-9 rounded-full border px-3 text-[13px] font-medium`, active `border-[#D9EE7A] bg-[#EAF9B8]` + `aria-current="true"`, EyeOff 12 for hidden, count `text-[#737373]`; kept in view with `scrollIntoView({ inline: 'nearest', block: 'nearest' })` on the strip only. Trailing pinned `Önizle` (`bz-btn-ghost min-h-[44px]`, Eye; text `hidden min-[400px]:inline`) → `phonePreview=true`. Dashed `+ Kategori` chip when `canEdit`.

**`outline/CategoryRail.tsx`** (≥1400, clarity's): `bz-card p-2`, heading "Kategoriler", 40px rows `[grip][name truncate 13.5px][count 12px][EyeOff|amber sold-out dot + sr text]`, active `bg-[#F7FAEF] shadow-[inset_2px_0_0_#C6F24E]`, own `DndContext` (`verticalListSortingStrategy`) → `reorderCategories`, footer `+ Kategori ekle`.

**`outline/CategorySection.tsx`**. `<section id={`menu-section-${id}`} aria-labelledby={`menu-section-title-${id}`} data-section-id={id} className="bz-card overflow-hidden p-0 scroll-mt-[124px] lg:scroll-mt-[180px] min-[1400px]:scroll-mt-[124px]">` (hidden categories add `border-l-[3px] border-l-[#D4D4D4]`). **Never** `data-cat-id` or `cat-*` ids (PublicMenuView uses them). `CategoryHeader` → (unless collapsed) `SortableContext` → `<ul role="list" ref={setDroppableRef} className="divide-y divide-[#EDEDED]">` of `ItemRow` (or `ServiceRow` in Servis). Empty → `emptyCategory` hint (+ "Liste yapıştır" link). Empty drop target `min-h-[56px]`, hovered `outline-dashed outline-2 outline-[#C6F24E]`. `QuickAddRow` last (edit mode, not filtering, not selecting).

**`outline/CategoryHeader.tsx`**. Layout `flex items-center gap-2 border-b border-[#EDEDED] px-3 py-2.5 sm:px-4`:
- Collapse button (`bz-btn-icon h-11 w-11 pointer-fine:h-8 pointer-fine:w-8`, ChevronDown −90° when collapsed, `aria-expanded`, `aria-controls`).
- `<h3 id=… className="min-w-0 flex-1">` containing `InlineText` whose **display button/span** carries `font-body text-[16px] font-semibold tracking-[-0.01em] text-[#0A0A0A]` (G9; see §15.3 for why the classes go on the inner element). Fine pointer: click renames; coarse: plain text, rename via ⋯ (inline input + 44px Kaydet/Vazgeç). Validation: required, ≤80, locale case-insensitive duplicate → `category.duplicate`.
- Meta `text-[12px] text-[#737373] whitespace-nowrap`: `itemCount(n)` + ` · n tükendi`.
- Visibility `APSwitch size="sm" checked={isVisible} label={<span className="hidden sm:inline">Menüde</span>} ariaLabel={copy.category.visibleAria(name)}`.
- ⋯ PulseMenu (edit mode): Yeniden adlandır · Açıklama ekle/düzenle · Bu kategoriye ürün ekle · Liste yapıştır · divider · **Tümünü satışa aç** · **Tümünü tükendi yap** · **Fiyatları değiştir…** (→ `openBulkPrice(all item ids)`) · **Ürünleri seç** · divider · Yukarı taşı / Aşağı taşı · Kategorileri sırala… · Gizle / Göster · divider · Kategoriyi sil (danger). Servis mode ⋯: Tümünü satışa aç · Tümünü tükendi yap only.
- Hidden note under the header (`category.hiddenNote` + EyeOff 12). Description `text-[12.5px] text-[#525252]`; editing = `textarea.bz-input` ≤300, counter after 250, saved on blur or ⌘/Ctrl+Enter, Esc cancels.

**`outline/row-layout.ts`**: exports `ROW_BASE`, `ROW_NARROW`, `ROW_MEDIUM`, `ROW_FULL`, `ROW_NARROW_SELECT` (`grid-cols-[28px_48px_minmax(0,1fr)_auto]`) — the exact class strings of §3.3. Used by `ItemRow`, `ServiceRow` and `loading.tsx`.

**`outline/ItemRow.tsx`** (`React.memo`). Props `{ item; categoryId; categoryVisible; index; count; dndEnabled; reorderMode; selecting; selected; saveState?; pending?: { status: 'saving' | 'error'; message? }; completion: 'noPhoto' | 'noDescription' | null }`.
- `<li id={`menu-row-li-${id}`} data-item-id={id} data-dropzone className={`group/row relative ${ROW_BASE} ${ROW_NARROW} ${ROW_MEDIUM} ${ROW_FULL}`}>` + `useSortable({ id, disabled: !dndEnabled })`; dragging `opacity-40`; flash `bz-row-flash`; selected `bg-[#EAF9B8]/40`; pending `opacity-60 aria-busy`; pending error `bg-[#FEF2F2]/60 shadow-[inset_2px_0_0_#DC2626]`.
- **Narrow** (two lines): row 1 = `RowPhoto` (48, `row-span-2`) · name block · ⋯ (44 coarse / 32 fine). Row 2 (`col-start-2 col-span-2 flex items-center gap-3`) = `InlinePrice` · `ml-auto` `StatusCell`. Name: Inter `text-[15px] font-semibold leading-5 line-clamp-2` (coarse) / `text-[14.5px] font-medium` (fine); badges after the name: `Gizli` (Badge off) / `Kategori gizli` (Badge off + EyeOff); no `Tükendi` badge here because the switch label says it. Selection mode: `ROW_NARROW_SELECT` with `APCheckbox` (`row-span-2`). Reorder mode (coarse): ⋯ is replaced by the grip (`h-11 w-8`), row 2 shows `[↑][↓]` (`bz-btn-icon h-11 w-11`, disabled at the ends) instead of price and switch.
- **Medium** (fine, 480–671): `[grip|checkbox 20][RowPhoto 40][name block][InlinePrice 84 right][StatusCell 46][⋯ 32]`. Name line: name `truncate` + inline `rowBadge` (Tükendi / Gizli / Kategori gizli); line 2: description `line-clamp-1 text-[12.5px] text-[#737373]` or faint `+ Açıklama ekle`. Status = switch md (label sr-only, tooltip `Satışta`/`Tükendi`) or, for hidden items, an icon button Eye `bz-btn-icon h-8 w-8` (`aria-label` `showAria(name)`, tooltip `Göster`). ⋯ includes Gizle/Göster and Ayrıntılar.
- **Full** (fine, ≥672): `[checkbox 20][grip 20][RowPhoto 40][name block][InlinePrice 96][StatusCell 120][eye 32][⋯ 32]`. Line 2 adds up to 2 badge chips (`BADGE_TINTS`, `h-5 text-[11.5px] rounded-full px-2`) and `Alerjen: 3` with names in sr-only text. Status = switch md + visible label, or `Göster` text button for hidden. Eye = `bz-btn-icon h-8 w-8` EyeOff (`aria-label` `hideAria(name)`, tooltip `Gizle (H)`) for visible items; empty cell for hidden items. Badges: `Gizli` / `Kategori gizli` only.
- Checkbox and grip columns always reserve width; content `opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100`, visible when selecting (checkbox) or on coarse pointers (grip in reorder mode).
- **Click map**:

| Target | Fine pointer | Coarse pointer |
|---|---|---|
| Name | inline rename (`InlineText`, display button `id={`menu-row-${id}`} data-row-focus`) | open item |
| Description line / `+ Açıklama ekle` | open item (focus description) | open item |
| Row background (guard `closest('button,a,input,textarea,[role=menu],[role=switch]')`) | open item | open item |
| Thumb empty / with photo | file picker / open item at photo | same |
| Price | inline price | inline price |
| Switch / Göster / eye | toggle sold out / show / hide | same |
| ⋯ | Ayrıntılar `E` · Fotoğraf ekle/değiştir · Kopyasını oluştur `⌘D` · divider · Yukarı taşı `Alt↑` · Aşağı taşı `Alt↓` · Başka kategoriye taşı… `M` · Gizle/Göster `H` · Seç `X` · divider · Sil `Del` (danger, no confirm, undo toast) | same (no key hints) |

  Selecting: a row click (non-control area) toggles selection; Shift+click selects the range over `visibleIds`; inline edits and drag are off; switches stay active. Opening an item while the right-column panel is dirty asks first.
- Read-only: name/price render as text; switch/Göster/eye disabled; ⋯ keeps only `Görüntüle`; clicking the row opens the read-only panel. Temp rows: everything disabled except the error-state `Tekrar dene` / `Sil`.

**`outline/StatusCell.tsx`** (G2). Props `{ item; tier: 'narrow' | 'medium' | 'full'; disabled }`. Not hidden → `APSwitch size={finePointer ? 'md' : 'lg'} checked={!item.isOutOfStock} loading={saving} ariaLabel={copy.item.switchAria(name)} label={visibleLabel ? <span className={item.isOutOfStock ? 'text-[12.5px] font-medium text-[#92400E]' : 'text-[12.5px] font-medium text-[#166534]'}>{item.isOutOfStock ? 'Tükendi' : 'Satışta'}</span> : undefined}` → `toggleSoldOut`. Visible label in narrow and full, sr-only in medium. Hidden → `Göster` (`bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8`, Eye 14) in narrow/full, icon-only in medium → `showItem` (`{ isAvailable: true }` only).

**`outline/ServiceRow.tsx`** (G8, Servis mode, all widths). `<li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 min-h-[60px]">`: name button (Inter `text-[15px] font-semibold line-clamp-2`, opens the item read/edit panel) + price `text-[13px] text-[#737373] tabular-nums` (not editable) + `Gizli` / `Kategori gizli` badge; right: `StatusCell tier="narrow"` (switch lg on coarse with label, or Göster). No thumb, ⋯, grip, quick-add or inline edit. Read-only: switches disabled.

**`outline/InlineText.tsx`** (clarity's): display button with `aria-label={copy.inline.editLabel(label, value)}` + Pencil 12 on hover; edit = `input.bz-input h-9 py-1.5` selected; Enter/blur commit; Esc cancel → focus display; Tab commit → `onTabNext`; IME guard (`isComposing`); unchanged → no request; empty + required → error; `onCommit` returns `null | message` (message stays under the input `role="alert"`).

**`outline/InlinePrice.tsx`** (clarity's + G4 chaining). Display `tabular-nums text-[14px] font-semibold pointer-coarse:text-[16px]` with `formatPrice(cents, currency, isTr ? 'tr-TR' : 'en-US')` in a `min-h-11 pointer-fine:min-h-0` button marked `data-price-cell`; zero → `text-[#92400E]` + dot + sr `zeroPriceSr`. Edit: `relative w-[120px]`, `input.bz-input h-9 pointer-coarse:h-11 pr-7 text-right tabular-nums` `inputMode="decimal" enterKeyHint="done" autoComplete="off" autoCorrect="off"`, suffix `currencySymbol(currency)`, initial `priceToInput(cents, isTr)`; popover-like line under the input: `priceEcho` / `priceRequired` / `priceInvalid`. Registers with `registerPriceCell(itemId, open)`.
Keys: **Enter** = commit; on fine pointers then `openPriceCell(itemId, +1)` (next visible row's price editor; at the end → close); **Shift+Enter** = commit + previous row; **Tab** = commit + next cell; **Esc** = cancel; coarse pointers: Enter commits and closes. Empty → revert (price required). Zero commits and the row shows the zero hint. No toast (silent + SaveIndicator).

**`outline/RowPhoto.tsx`**: clarity's (button 48/40, lazy `<img alt="">`, ImagePlus placeholder, hidden `input type="file" accept="image/*"` without `capture`, native drop with `ring-2 ring-[#C6F24E]` + "Bırak", row paste of `clipboardData.files[0]`, uploading overlay, error line + retry), `data-dropzone`. **Completion tile** (G10): when `completion === 'noPhoto'` and there is no photo, render a dashed tile `border-2 border-dashed border-[#D4D4D4] bg-white` with Plus 14 + `Fotoğraf` (12px) — same pick/drop behaviour. On success → `flashItem` + `linger(id)`; the row leaves the filtered list after 1200ms.

**`outline/QuickAddRow.tsx`** (clarity's layout + G7/G10). Collapsed button `min-h-[48px]` Plus + "Ürün ekle" (category in sr text). Expanded form `grid-cols-[1fr_120px] gap-2 @min-[480px]/outline:grid-cols-[1fr_140px_auto]`: name (`bz-input`, `autoCapitalize="sentences"`, `enterKeyHint="next"`, maxLength 120), price (`inputMode="decimal"`, `enterKeyHint="done"`, currency suffix), `Ekle`, hint `quickAddHint`.
- Name Enter → price (empty → error). Price Enter → `checkPrice` (`empty` → `priceRequired`; `invalid` → `priceInvalid`) → `createItemQuick` → **inputs clear and focus returns to the name immediately** (keyboard stays up on phones); the pending row appears at the end of the section. Esc → clear (both empty → collapse). Blur with both empty → collapse.
- Paste on the name input: `isMultiLinePaste(text)` → `preventDefault()` + mount `PasteReview variant="inline"` in place of the form. Else, when the name input is empty and `parseSingleLine(text)` returns a value → `preventDefault()`, fill name + price (`priceToInput`), focus price.

**`outline/PasteReview.tsx`** + **`item/PasteSheet.tsx`**: clarity's (§7.7/§7.8 there): every line with parse result, header rows → "Yeni kategori: {name}" with `asCategory` checkbox, inline row edits via `revalidateRow`, reasons (`bulkNoPrice`, `bulkNoName`, `bulkNameTooLong`, `bulkBadPrice`, `emptyName`), `overLimitNote` per section, `Vazgeç` (confirm when edited) + `paste.commit(i, c)` with `Ekleniyor… x/y`. PasteSheet: `Sheet` "Liste yapıştır", `Hangi kategoriye?` `PulseSelect`, textarea (rows 8, `text-[16px] sm:text-[14px]`), live review, `Yeniden oku` after edits, text kept on error; dirty guard on every close path.

**`outline/NewCategoryRow.tsx`**: clarity's (dashed button → `Field "Kategori adı"` + input ≤80 + Vazgeç/Ekle; duplicate check; Enter → `createCategory` → new section with its quick-add open and focused).

**`outline/CategoryOrderSheet.tsx`**: clarity's (`Sheet` "Kategorileri sırala", 56px rows `[grip][name+count][↑][↓]`, each change → `reorderCategories`, inline undo notices, `Bitti`).

**`outline/MoveToCategoryDialog.tsx`**: `Modal size={440}`; props `{ itemIds: string[]; onClose }`; title `move.title(name)` (1 item) / `move.titleMany(n)`; `role="radiogroup"` of categories (48px rows, hidden marked, current category disabled "Şu anki" when all selected items share it); hint `move.endHint` ("Ürünler seçtiğin kategorinin sonuna eklenir."); footer Vazgeç / Taşı → `moveItemToCategory` (1) or `bulkMove` (n); then flash rows in the target section.

**`outline/SelectionBar.tsx`** (G3). Wraps `PanelSelectionBar` (`reserveSpace`, `count`, `label=selectedCount`, `clearLabel`, `onClear`). Desktop actions: Satışa aç (`markAvailable`) · Tükendi yap · Fiyat… (Percent) · Gizle · Göster · Taşı… · Sil (danger). Phone: Tükendi yap · Satışa aç · Fiyat… · Diğer… (opens a small bottom `Sheet` with Gizle / Göster / Taşı… / Sil). Each action disabled when `flagPatch` would change nothing. Measures itself (ResizeObserver) and sets `--menu-stack` = height + 8px on `<html>`; removes it on unmount. Selection cap 100: beyond it, info toast `selectionCap`. Sil: `askConfirm` danger when count ≥ 5 (`bulkDeleteTitle(n)` / `bulkDeleteBody`: "Silinen ürünleri 30 dakika içinde “Geri al” ile geri getirebilirsin."), otherwise no confirm.

**`outline/BulkPriceDialog.tsx`** (G3). `Modal size={480}`, title `bulkPrice.title` ("Fiyatları değiştir") + `bulkPrice.subtitle(n)`.
- Mode segmented (house idiom): **Yüzde · Tutar · Sabit**. Direction segmented (Yüzde, Tutar): **Artır · Azalt**.
- Value `Field`: percent → `parsePercentInput` (`10`, `7,5`); amount/fixed → `parsePriceInput` via `checkPrice` (currency suffix). Invalid → field error.
- `Yuvarla` `PulseSelect`: Yok · 1 · 5 · 10 (labels use `currencySymbol` when one currency: "1 ₺"), default 1 for Yüzde, Yok otherwise.
- Mixed currencies in the selection → Tutar and Sabit disabled with `bulkPrice.mixedCurrency`.
- Preview list (`previewPriceOp`): first 6 rows "Adana Kebap ₺320 → ₺340" (`tabular-nums`, arrow ArrowRight 12), then `+N ürün daha`; `bulkPrice.unchanged(k)`; amber warning `bulkPrice.zeroWarning(z)` ("2 ürün 0 ₺ olacak") when `zeroCount > 0`; `Değişen ürün yok` when changes = 0.
- Footer: Vazgeç · primary `bulkPrice.apply(k)` ("{k} ürünü güncelle"), disabled at k = 0 or invalid. Running: inputs disabled, label `Güncelleniyor… x/k`. All OK → close + toast `pricesUpdated(k)` + Geri al. Partial → stay open, `AlertBanner danger` `bulkPrice.partial(f)` + `Başarısızları tekrar dene`; succeeded ones are one undo entry.

### 7.8 Item panel
**`item/ItemPanel.tsx`** (clarity's with G5/G9). Props `{ target: ItemTarget; presentation: 'docked' | 'sheet'; readOnly; onClose(); onNavigate?(dir: -1 | 1); onDraftChange(draft | null); focusField?: 'photo' | 'description' }`.
- **docked** (inside `RightPanel`, `Ürün` tab): `<section role="region" aria-labelledby="item-panel-title" className="flex min-h-0 flex-1 flex-col">`. Header `flex items-center gap-2 border-b border-[#EDEDED] px-4 py-3`: title `h2#item-panel-title` — create: `Yeni ürün` (chrome, `bz-h-tight text-[18px]` on an inner span); edit: item name on an inner `<span className="font-body text-[17px] font-semibold tracking-[-0.01em] truncate">` with sr-only prefix `item.editPrefix` ("Ürünü düzenle:"); meta (category · Canlı menü / Taslak, `text-[12px] text-[#737373]`); prev/next `bz-btn-icon` (ChevronUp/Down; order = `visibleIds`); ⋯ (edit: Kopyasını oluştur, Başka kategoriye taşı…, Sil). Body `min-h-0 flex-1 overflow-y-auto px-4 py-5 @container`. Footer sticky `border-t`. Opening focuses the title (`tabIndex=-1`), or `focusField`.
- **sheet** (<1024): `<Sheet side={smUp ? 'right' : 'bottom'} widthClass="sm:max-w-[520px]">` with the same header controls + `Düzenle / Önizle` segmented (Önizle renders `PhonePreview variant="bare"` with the draft overlay and focus, owning the preview slot). `onCloseAutoFocus` → the row's focus button.
- Footer: line 1 (published, `canEdit`): `item.saveLiveHint` with a 6px green dot. Line 2 `flex flex-wrap items-center justify-end gap-2`: create → Vazgeç · Kaydet ve yenisini ekle · **Kaydet**; edit → Vazgeç · **Kaydet**; read-only → Kapat. Kaydet `bz-btn-primary` (`aria-busy`, Loader2, `Kaydediliyor…`), disabled while a photo uploads (`photo.waitUpload`). Errors `AlertBanner kind="danger"` above the buttons. **Kaydet** closes the panel (docked: back to `Önizleme`, row flashes) and toasts `saved(name)` with Geri al. **Kaydet ve yenisini ekle** keeps the panel (`nextItemFormValues`, category kept) and shows the inline notice "“Ayran” eklendi · Geri al".
- Dirty guard (`isItemFormDirty`) on **every** close path: back/X, Vazgeç, Esc, backdrop, prev/next, clicking another row, rail jump, `?edit` navigation, entering design mode → `useConfirmDialog` (`leaveTitle`, `leaveBody`, `Kaydetmeden çık` danger, `Düzenlemeye devam`).
- Edit target deleted meanwhile → close silently + toast `item.goneToast`.

**`item/ItemForm.tsx`** (clarity's, contracts verbatim): single column `max-w-[560px] space-y-6`, no tabs, no "Daha fazla seçenek": inline notice → `PhotoField` → name + price (`grid gap-3 @min-[420px]:grid-cols-[1fr_160px]`; name required ≤120, `enterKeyHint="next"`; price required, starts empty in create, `checkPrice`/`parsePriceInput`, invalid blocked, zero amber `priceZero(symbol)`, `priceEcho`, currency from `item.currency`) → description (`textarea` rows 3, ≤500, counter `n/500` when focused or n > 400) → **Kategori** (`PulseSelect w-full sm:w-[280px]`, always shown; disabled with `item.oneCategoryHint` when there is 1 category) → **StatusField** → Etiketler (`ChipGroupField` BADGE_GROUPS/LABELS/TINTS) → Alerjenler (ALLERGEN_GROUPS/LABELS, `allergenHint`, Tümünü temizle; always visible). Enter: name⏎ → price (edit: save); price⏎ → create: save & add another / edit: save; IME skipped. Name auto-focus only when `isFinePointer()`. Inputs 16px on phones (`bz-input`). ⌘/Ctrl+Enter saves anywhere in the form.

**`item/PhotoField.tsx`**: clarity's (4:3 dashed drop zone ≤240px, Değiştir/Kaldır, drop/paste/pick via `usePhotoUpload('item')`, `Fotoğraf hazırlanıyor…`, `Bağlantı ile ekle` → URL input http(s) ≤1000, `photoHelp`), `data-dropzone`.
**`item/StatusField.tsx`** (the only 3-state control, G2): `role="radiogroup"` legend `Müşteriler ne görür?`, 3 cards `grid gap-2 @min-[420px]:grid-cols-3` (Satışta — Menüde görünür / Tükendi — Menüde “Tükendi” yazar / Gizli — Menüde görünmez), arrow-key roving, selected `border-[#0A0A0A] shadow-[0_0_0_1px_#0A0A0A]` + Check; maps through `statusPatch`. Category hidden → note `item.categoryHiddenNote` + link `Kategoriyi göster`.
**`item/ChipGroupField.tsx`**: clarity's (`fieldset`, chips `h-11 pointer-fine:h-8`, badges tinted, allergens graphite when on + Check).

### 7.9 Right column and preview
**`preview/RightPanel.tsx`** (≥1024, G5). Props `{ itemOpen: boolean; itemTitle: string | null; tab: 'preview' | 'item'; onTab(t); onCloseItem(); previewCollapsed: boolean; onCollapse(); preview: ReactNode; item: ReactNode; published; openLink: { href; external } }`.
`<aside aria-labelledby="right-panel-title" className="hidden lg:flex lg:flex-col sticky top-[184px] min-[1400px]:top-[128px] max-h-[calc(100dvh-200px)] min-[1400px]:max-h-[calc(100dvh-144px)] self-start bz-card overflow-hidden p-0">`.
- Header `flex h-11 items-center gap-2 border-b border-[#EDEDED] px-3`: item open → segmented `[Önizleme][Ürün]` (`role="tablist"`, `aria-selected`; Ürün label `Ürün` + sr item name) + spacer + close X (`onCloseItem`, guarded). No item → Smartphone 14 + `h2#right-panel-title` "Müşterinin gördüğü" + open link (`Yayındakini aç` new tab / `Tam ekran` → `?preview=1`, `bz-btn bz-btn-sm`) + collapse (`PanelRightClose`, `Önizlemeyi gizle`).
- Body: `tab === 'preview'` → `preview`; `tab === 'item'` → `item` (the docked ItemPanel). The inactive tab is unmounted for the preview (slot rule) and **kept mounted** (`hidden`) for the item form so its state survives a tab switch.
- Skip link before the aside: `<a href="#menu-items-pane" className="bz-skip-link">Önizlemeyi atla</a>`.

**`preview/PreviewPanel.tsx`**: stage `bg-gradient-to-b from-[#FAFAFA] to-[#F0F0F0] px-4 py-4` → `PhonePreview variant="framed"`; badge above the phone: `preview.draftBadge` ("Önizleme · henüz uygulanmadı") in design mode with a dirty draft, `preview.unsavedBadge` ("Önizleme · kaydedilmedi") with a dirty item draft; footer `preview.footer` ("scaled to fit · click an item to edit"). Too short → footer replaced by `Önizlemeyi aç` (bare preview in a `Sheet`, owns the slot).

**`preview/PhonePreview.tsx`** (clarity's): props `{ restaurant; categories; locale; variant: 'framed' | 'bare'; focusItemId?; followCategoryId?; onPickItem?(id); height? }`. `dynamic(() => import('@/components/menu/PublicMenuView'), { ssr: false, loading: () => <PreviewSkeleton/> })` with `disableAnalytics`. Framed bezel (ported constants), viewport `<div data-preview-root={uid} style={{ width: 375, height: Hn, zoom: z, contain: 'layout paint' }} className="overflow-y-auto overflow-x-hidden bg-white [scrollbar-gutter:stable]">`. Bare: `rounded-xl border` with `z = min(1, containerWidth / 375)`.
- **Pick to edit**: wrapper `onClickCapture` finds `closest('[data-pid]')`, `stopPropagation()` + `preventDefault()` (stops `ProductDetailModal`), ignores `DRAFT_ITEM_ID` and temp ids, calls `onPickItem`. Full-screen `?preview=1` keeps normal behaviour.
- **Focus highlight**: when `focusItemId` matches `/^[A-Za-z0-9_-]{1,64}$/`, inject `<style>{`[data-preview-root="${uid}"] [data-pid="${focusItemId}"]{outline:2px solid #C6F24E;outline-offset:3px;border-radius:14px;box-shadow:0 0 0 6px rgba(198,242,78,.25)}`}</style>` (no DOM mutation).
- **Scroll to focus** after two rAFs with `viewport.querySelector` (never `document`) and clarity's `scrollPreviewTo(vp, el, 80)` (instant, residual correction). `followCategoryId` → `[data-cat-id]`, offset 64, debounced 250ms, paused 5s after pointer/wheel inside.
- Hidden focus item → chip `previewHiddenNote` / `previewCategoryHiddenNote`.
**`preview/usePhoneFit.ts`**: framed: `zW = (stageWidth − 16) / 375`; `A = innerHeight − topOffset − 112` where `topOffset = 184` (lg) / `128` (≥1400); `z = clamp(min(zW, (A − 38) / 600), 0.55, 0.9)`; `Hn = clamp((A − 38) / z, 600, 812)`; `A < 368` → `{ tooShort: true }`. Bare: `Hn = max(480, budget / z)`, `budget = height ?? innerHeight − 61 − bottomNav − 52 − 48 − 24`.
**`preview/CustomerPreviewScreen.tsx`** (`?preview=1`): sticky graphite bar `top-[61px] lg:top-14 z-20` (Eye chip, "Önizleme", restaurant name, `Önizlemeden çık` `bz-btn-on-dark bz-btn-sm` → builder URL), then `PublicMenuView disableAnalytics`.

### 7.10 Kit
**`kit/Sheet.tsx`** (Radix Dialog): props `{ open; onRequestClose(); side: 'right' | 'bottom'; widthClass?; title; titleId?; headerExtra?; footer?; children; initialFocusRef?; onCloseAutoFocus? }`. Overlay `fixed inset-0 z-50 bg-[#0A0A0A]/30 backdrop-blur-[2px] bz-fade-in`. Right `fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[#E8E8E8] bg-white bz-elev-3` + `widthClass`, `style={{ animation: 'cust-drawer-in 220ms cubic-bezier(0.2,0.8,0.2,1)' }}`. Bottom `fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white pb-safe bz-elev-3`, `style={{ animation: 'bz-mob-sheet-in 220ms …', bottom: inset, maxHeight: `calc(94dvh - ${inset}px)` }}` with `inset = useKeyboardInset()` (G8) + 36×4 grab bar. Both keyframes are already in the reduced-motion blanket. Esc / outside → `preventDefault()` + `onRequestClose()` (caller guards). Header `Dialog.Title className="bz-h-tight text-[18px]"` (chrome only; owner text goes in an inner `font-body` span), close `bz-btn-icon-lg`. Body `flex-1 overflow-y-auto px-4 py-5 sm:px-6`. `aria-describedby={undefined}` when no description.
**`kit/SaveIndicator.tsx`**: §5.5. Props `{ variant: 'desktop' | 'compact'; published; pending; error: { message; itemId? } | null; online; lastSilentUndo; onUndo(id); onJumpToError() }`.
**`kit/storage.ts`**: `safeLocalGet/Set`, `safeSessionGet/Set/Remove` (try/catch, `null` on failure). Keys: `buaze:menu:preview-collapsed`, `buaze:menu:live-hint:v1`, `buaze:menu:mode`, `buaze:menu:service-hint:v1`, `buaze:menu:single-keys`, `buaze:menu:collapsed:<restaurantId>`, `buaze:menu-setup:<restaurantId>` (session).
**`menu-ui.ts` additions** (chunk 2): `useFinePointer()`, `useIsWide()` (≥1400), `useIsSmUp()` (≥640), `usePrefersReducedMotion()`, `useKeyboardInset()` (visualViewport: `innerHeight − vv.height − vv.offsetTop`, ≥0, rAF-throttled; 0 when unsupported), `useOnline()`, re-export `MENU_TOUCH` from `@/app/[locale]/dashboard/surveys/_components/menu-touch`; extend `useDndAccessibility`'s `nameOf` for `container:<id>`.

### 7.11 Design (chunk 4; clarity's, unchanged except placement notes)
**`data/useThemeDraft.ts`**: `{ applied; draft; dirty; setTheme; setAccent (rAF-throttled, preview only); setLogoFile (upload → draft, nothing saved); removeLogo; logoUploading; error; apply() (PATCH themeDiff via ThemeSync; success → merge, touchLocal, toast `themeApplied` + Geri al = PATCH previous applied values through ThemeSync); discard(); applying }`. Draft resets to applied when applied changes and the draft is clean.
**`design/DesignPanel.tsx`**: `presentation: 'docked' | 'sheet'`. Sections Tema (radiogroup, `grid grid-cols-2 gap-3 @min-[520px]:grid-cols-3`, 7 `ThemeCard`s in `MENU_THEMES` order), Vurgu rengi (`AccentPicker`), Logo (`LogoField`). Sticky apply bar: dirty → "Uygulanmamış değişiklik var" + `applyLiveHint` (published) + Vazgeç / **Uygula** (`bz-btn-lime`); clean → "Görünüm kayıtlı" + Kapat; error banner. Close while dirty → confirm (`closeDirtyTitle/Body`, `Uygulamadan çık`, `Geri dön`). Docked (≥1024): replaces the outline in the workspace; right column preview shows the draft. Sheet (<1024): phone → `PhonePreview variant="bare"` strip `h-[38dvh]` on top + settings below; tablet → `sm:grid-cols-[minmax(0,1fr)_280px]`. Sheet Apply closes the sheet, then toasts.
**`design/ThemeCard.tsx`** (uses kept `ThemeThumb`), **`AccentPicker.tsx`** (12 `ACCENT_SWATCHES` radios `h-11 w-11 pointer-fine:h-9 pointer-fine:w-9`, `Özel` → native colour input, `Varsayılan` → null), **`LogoField.tsx`** (72px tile, Logo yükle/Değiştir/Kaldır, `logoHint`, `data-dropzone`): clarity's.

### 7.12 Share (`share/ShareDialog.tsx`)
Clarity's port of `MenuShareModal` logic 1:1 (`Modal size={640}`; QR svg 400 preview via object URL `<img>`; `menuUrl = X-Menu-Url ?? `${SITE_URL}/menu/${slug}`` — never `window.location.origin`; PNG 1200 / SVG 1200 downloads, filename `menu-qr-<slug>.<ext>`, revoke after 2000ms; `qrAdjusted` note on `X-Qr-Color-Adjusted: 1`; draft `AlertBanner warn shareDraftWarning` + `Yayına al` when allowed; `Tekrar dene`; `Analitiği aç →`; AbortController on unmount; `?source=qr` untouched). **Added** (G8): `Paylaş…` button next to `Kopyala` when `navigator.share` exists. Viewers may open and download.

---

## 8. Interactions

### 8.1 Inline name and price (G4)
- Fine pointer: click name/price, or Enter on a focused cell. Coarse: price inline; name opens the panel.
- Commit on Enter/blur; Esc cancels; Tab name → price; Shift+Tab back.
- Optimistic → `rowState` saving → saved; failure reverts with the error under the cell (Enter retries).
- **No toast.** SaveIndicator shows `Kaydedildi · canlı` (+ transient `Geri al`), the undo entry is pushed, ⌘Z undoes.
- **Repricing run**: price Enter saves and opens the next visible row's price (fine pointer); Shift+Enter goes up; Esc stops. While editing, the preview focuses the item.

### 8.2 Quick add (G7, G10)
Keyboard: `N` → quick-add of the scroll-spy category → name ⏎ → price ⏎ → pending row appears, inputs clear, focus back on name → repeat. Creates in one category run serially (`append:<id>`), so `last+10` sortOrders never collide. Pending row: same row anatomy at `opacity-60` + Loader2; success → replaced + flash; failure → error state with mapped message and `Tekrar dene` / `Sil`. Paste of one "Mercimek Çorbası 90" line fills both fields; multi-line paste opens the inline review.

### 8.3 Paste to bulk with preview
Entry points: multi-line paste in quick-add (inline review for that category); `+ Ekle → Liste yapıştır`, section ⋯, `Diğer → Liste yapıştır` (PasteSheet with category picker); setup "Listemi yapıştır". Review shows every line before anything is created; headers become categories (opt-out); ≤30 items per category per paste; each bulk request is atomic; partial failure keeps unfinished rows with the banner; one undo entry removes everything created; responses are merged (no `fetchAll`); toast `itemsAdded(n)` (+ `categoriesAdded(m)`); scroll to and flash the target.

### 8.4 Drag reorder (incl. across categories)
Within: grip → `reorderItems`. Across: drop into another section (or a collapsed header) → `moveItemToCategory(id, to, toIndex)` = PATCH `{categoryId}` (server MAX+1) then `reorder` target + source with `sortOrder = index`; any failure → `fetchAll` + error toast. Categories: rail (≥1400), CategoryOrderSheet, section ⋯ up/down. Keyboard DnD on a focused grip (Space/arrows/Space/Esc, localized announcements); `Alt+↑/↓` on a focused row. Touch: `Sırala` reorder mode (grip + ↑↓); cross-category on touch via ⋯ → `Başka kategoriye taşı…`. Disabled while searching/filtering/selecting/in Servis. One undo entry restores order (and category for moves).

### 8.5 Search, filters, completion workflow (G10)
Search folds Turkish characters ("cay" finds "Çay"), matches name, description and category name, all tokens required; filters are single-select chips with whole-menu counts (zero-count chips hidden). Filtering shows only matching rows in their sections, hides empty sections, quick-add and NewCategoryRow, and force-expands collapsed sections. Status-card nudges set the filter and scroll to the toolbar. `/` focuses search; Esc clears query, then filter.
**Fotoğrafsız**: thumbnails become dashed `+ Fotoğraf` tiles (pick + drop); after a successful upload the row flashes and leaves the list after 1200ms (`linger`). **Açıklamasız**: line 2 shows `Açıklama ekle` → opens the item with `focusField="description"`; after Kaydet the row lingers then leaves. ContextBar shows `completionHint`.

### 8.6 Availability (G2, G13)
- Row switch = Satışta ⇄ Tükendi (one tap), toast `statusChanged` + Geri al, revert + error toast on failure. `S` toggles on the focused row (no-op with polite announcement `hiddenNoSoldOut` on hidden items).
- Hidden: `Göster` (narrow/full) or eye icon (medium) → `{ isAvailable: true }`; eye toggle (full) / ⋯ / `H` → hide. Toast `hidden(name)` / `shown(name)`.
- Category visibility = header switch; rows in a hidden category show `Kategori gizli`; preview shows the note.
- Panel: 3-state `StatusField` (statusPatch).
- Bulk: ContextBar `Hepsini satışa aç` (Tükendi filter), status-card nudge, category ⋯ `Tümünü satışa aç` / `Tümünü tükendi yap`, SelectionBar — all `bulkSetFlags` with one undo.
- Sold-out auto-expiry is out of scope (needs a schema field).

### 8.7 Photo on a row
Pick (empty thumb / ⋯), drop (row or thumb), paste (row has focus-within, not in an input). Pipeline `usePhotoUpload` (must-keep #13): `image/*` check (else `IMAGE_UNPROCESSABLE` copy) → `compressImage` (item `{maxDim:960, quality:0.8}`, logo `{maxDim:1024, quality:0.85}`) → >5MB → `IMAGE_TOO_LARGE` → FormData `{file, kind}` → data URL → PATCH `imageUrl`; object-URL preview, revoke on replace/unmount/settle; `seq` guard so only the latest upload writes; panel save blocked while uploading; network/generic → `photo.failed` ("Yüklenemedi. Tekrar dene."). Silent success (flash + SaveIndicator Geri al).

### 8.8 Item panel
Opened by: row background/description (any pointer), name tap (coarse), ⋯ Ayrıntılar, `E`/Enter on the row, `+ Açıklama ekle`, clicking an item in the preview, `?edit=<id>`, `+ Ekle → Ürün ekle` (create in the scroll-spy category), Servis name tap. ≥1024: right column `Ürün` tab; the outline stays clickable; clicking another row switches the panel (guard). Prev/next walk `visibleIds`. The `Önizleme` tab shows the unsaved draft (overlay) and highlights it.

### 8.9 Category management
Create: NewCategoryRow, `+ Ekle → Kategori`, rail `+`, chip `+ Kategori`, `Shift+N`. Rename: inline (fine) / ⋯ (coarse). Description: ⋯ → inline textarea. Visibility: header switch. Reorder §8.4. Bulk in ⋯ (G13). Delete: empty → no confirm, toast with undo; with items → `askConfirm` danger (`deleteCategoryWithItemsTitle(name, n)`, `deleteWithItemsBody`, `Kategoriyi ve ürünleri sil`) → `?deleteItems=true` → toast with undo (restore brings back only the cascade); focus moves to `neighbourCategoryId`.

### 8.10 Design (chunk 4)
Theme/colour/logo change only the preview until **Uygula**; Apply toast offers Geri al; unapplied changes are protected by the close confirm and the leave guard; the QR keeps the saved accent until Apply.

### 8.11 Share / QR
Header `Paylaş ve QR`, status card `QR’ı indir` (just published), `?share=1` once when `menuEnabled`. Viewers allowed.

### 8.12 Preview
≥1024 right column (collapsible), follows the scroll-spy section, highlights the focused item, click-to-edit. <1024: ViewSwitch `Önizle`, pinned chip-bar `Önizle`, `Önizle` tab in the item sheet. `Tam ekran` (draft → `?preview=1`) / `Yayındakini aç` (live → `/menu/<slug>` new tab).

### 8.13 Publish / unpublish
Draft → status card `Yayına al` (disabled with reason until `readiness.canPublish`) → just-published state + toast `published`. Live → status card body, `● Canlı` indicator, lime toast dot, panel and apply-bar hints. Unpublish → status card `Yayından kaldır` → danger confirm (`unpublishTitle/Body`: link and printed QRs stop working, customers see "Menü bulunamadı") → toast `unpublished`; no undo. `MENU_EMPTY` / `MENU_MODULE_DISABLED` mapped.

### 8.14 Undo
Every action with an undo column (§5.4) pushes an entry (toast or silent). ⌘/Ctrl+Z (outside text inputs), toolbar Undo, toast Geri al, SaveIndicator Geri al. Entries expire after 29 minutes; session only.

### 8.15 Leaving the page
`useUnsavedGuard(itemDirty || themeDirty || pasteDirty || pending > 0, locale)`.

### 8.16 Selection and bulk (G3, G13)
Enter via `Seç` (toolbar), `x` on a focused row, ⋯ Seç, category ⋯ `Ürünleri seç`, or a hover checkbox (full tier). Rows show checkboxes; row click toggles; Shift+click = range over `visibleIds`; ContextBar `Tümünü seç (görünen n)`; Esc clears (cascade). Selection survives filtering (ContextBar counts rows outside the filter). Cap 100. Actions §7.7 SelectionBar; price §7.7 BulkPriceDialog; move = MoveToCategoryDialog → `bulkMove` (lands at the end in visual order); delete confirm only at ≥5. All bulk changes are N requests through `runPool` (4) — not atomic: failed rows revert and are reported; succeeded rows form one undo entry.

### 8.17 Servis mode (G8)
`Düzenle | Servis` (ViewSwitch <1024, ModeSwitch ≥1024), persisted per viewer. Shows `ServiceRow`s in the same collapsible sections; search and filters work; no quick-add, drag, selection, inline edits or thumbnails. Hint line under the toolbar (dismissible, `buaze:menu:service-hint:v1`): `serviceHintLive` / `serviceHintDraft`. Read-only users may use it as a compact view (switches disabled).

---

## 9. Keyboard shortcuts (G6)

Single source `SHORTCUTS` in `_components/menu-keys.ts`; `useStudioShortcuts` and `ShortcutsDialog` both read it.
```ts
export type ShortcutId = 'search' | 'help' | 'newItem' | 'newCategory' | 'togglePreview' | 'undo' | 'escape'
  | 'rowPrev' | 'rowNext' | 'open' | 'toggleSoldOut' | 'toggleHidden' | 'select' | 'move' | 'duplicate' | 'delete' | 'moveUp' | 'moveDown';
export interface ShortcutDef { id: ShortcutId; combos: { key: string; mod?: boolean; shift?: boolean; alt?: boolean }[];
  scope: 'page' | 'row'; singleKey: boolean; group: 'general' | 'rows'; label: { tr: string; en: string } }
export const SHORTCUTS: readonly ShortcutDef[];
export function isTypingTarget(el: Element | null): boolean;   // input, textarea, select, [contenteditable], [role=combobox]
export function matchShortcut(e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; isComposing: boolean },
  ctx: { isMac: boolean; singleKeysEnabled: boolean; typing: boolean; modalOpen: boolean; menuOpen: boolean; inRow: boolean }): ShortcutId | null;
export function formatShortcut(def: ShortcutDef, isMac: boolean): string[];   // ⌘ on Mac, Ctrl elsewhere
```
Matching rules: compare **`e.key`**, never `e.code` (layout-safe on Turkish Q and F keyboards). Letters: `e.key.length === 1 && e.key.toLowerCase() === letter` plus the `shift` flag (`Shift+N` arrives as `'N'`). Symbols (`/`, `?`): exact `e.key`, shift ignored (on Turkish Q, `/` is Shift+7). Mod: `isMac ? metaKey : ctrlKey`. Ignore `isComposing`. Never fire while typing, while a modal dialog (`[role=dialog][aria-modal=true]`) or a PulseMenu (`[role=menu]`) is open (Esc excepted), and row scope only when `document.activeElement.closest('[data-item-id]')` is inside `#menu-items-pane`. ⌘/Ctrl combos call `preventDefault()`. Cmd+K belongs to the shell.

| Key | Action | Scope | Single key |
|---|---|---|---|
| `/` | Focus search | page | yes |
| `?` | Shortcuts dialog | page | yes |
| `n` | New item in the scroll-spy category (focus its quick-add) | page | yes |
| `Shift+N` | New category (NewCategoryRow focused) | page | yes |
| `p` | Toggle preview (≥1024 collapse; <1024 Önizle view) | page | yes |
| `⌘/Ctrl+Z` | Undo the latest change | page | no |
| `Esc` | Cascade: cancel inline edit → close panel (guarded) → clear selection → clear search → clear filter | page | no |
| `↑` / `↓` | Previous / next row (focus moves between `[data-row-focus]` over `visibleIds`) | row | no |
| `Enter` / `e` | Open the focused row in the item panel | row | `e` yes |
| `s` | Satışta ⇄ Tükendi | row | yes |
| `h` | Gizle ⇄ Göster | row | yes |
| `x` | Select / unselect the row (enters selection) | row | yes |
| `m` | Başka kategoriye taşı… | row | yes |
| `⌘/Ctrl+D` | Kopyasını oluştur | row | no |
| `Delete` / `Backspace` | Delete with undo | row | no |
| `Alt+↑` / `Alt+↓` | Move the row up/down in its category | row | no |
| Inline price: `Enter` / `Shift+Enter` / `Tab` / `Esc` | Save + next row / previous row / next cell / cancel | cell | — |
| Item panel: `⌘/Ctrl+Enter` | Save | panel | — |

**WCAG 2.1.4 off switch**: `ShortcutsDialog` (`Modal size={520}`, two-column `<dl>`, `<kbd className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-1.5 py-0.5 font-mono text-[12px]">`) has `APSwitch` **"Tek tuş kısayolları"** (sublabel `shortcuts.singleKeysHint`: "Kapalıyken yalnızca ⌘/Ctrl ve Alt ile çalışan kısayollar etkin kalır."), stored in `buaze:menu:single-keys` (`'0'` = off; default on). The `Klavye kısayolları` entry in Diğer is shown on fine pointers only. Buttons with shortcuts carry `aria-keyshortcuts`.

---

## 10. Empty state and setup wizard (chunk 4; clarity's, unchanged)

Shown when `categories.length === 0 && !readOnly`; the status card and toolbar are hidden (§38.249); the PageHeader stays.
- **`setup/SetupStart.tsx`**: `bz-card p-6 sm:p-8`, `startTitle` (`bz-h-tight text-[24px]`), `startBody`; three option buttons (`grid gap-3 @min-[640px]:grid-cols-3`, `min-h-[132px]`, lime-soft icon tile): **Hazır şablonla başla** → wizard `template`; **Listemi yapıştır** → wizard `paste`; **Boş başla** → `setupMode='blank'` → empty outline with `NewCategoryRow autoFocus` + link `Şablonlara dön` (the path to start empty). Restored draft → `AlertBanner info draftRestored` + `Baştan başla`. ≥1024 right column: `SetupPreviewEmpty`.
- **`setup/SetupWizard.tsx`**: `WizardSteps` (`ariaLabel=stepsAria`): [Tür | Yapıştır] → Kategoriler → Ürünler (isteğe bağlı). Template: `orderStarterPresets(detectSector(restaurant.category))`, first `STARTER_FEATURED_COUNT` (4) visible, `Diğer şablonlar`, `Kendi kategorilerimi yazacağım`; preset cards with the ported `PRESET_PALETTE`; switching after edits → `askConfirm(replaceTitle, replaceBody)`. Paste: textarea + live `n kategori, m ürün bulundu` → `setupCategoriesFromPaste`. Kategoriler: rows `[↑][↓][input][Kaldır]`, `+ Kategori ekle`, `validateSetupCategories` (empty, too_long, duplicate, noCategories, tooMany 20). Ürünler: `<details>` per category with textarea + `previewSetupItems` chips. Steps hidden with `hidden`, not unmounted. Sticky bar `sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 … lg:bottom-4` with `Menüyü oluştur (c kategori, i ürün)` (`bz-btn-lime`) + `ProgressBar` while creating.
- Creation: `createMenuFromSetup(buildSetupPlan(list), onProgress)` — sequential, stops at first failure, **always `fetchAll`**; `safeSessionRemove('buaze:menu-setup:<id>')`; phones `document.getElementById('menu-items-pane')?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })`; toast `setupCreated(c, i)` or `presetPartial`.
- Plan preview (≥1024): `planToPreviewCategories(buildSetupPlan(list))`.
- `useSetupDraft(restaurantId)`: sessionStorage `{ entry, step, list, pasteText }`, debounced 300ms.

---

## 11. Loading skeleton (`loading.tsx`, default export `MenuBuilderSkeleton`)

Used by the segment loading state, by `MenuStudio` (pending or role loading), by `CustomerPreviewRoute`, and by `dashboard/menu/loading.tsx` + `MenuHubRedirect.tsx`. Built from `SkPageShell max={1600} space={5}` + `SkBox` (flat #EDEDED), cloning the studio DOM with the **same classes**:
1. Header: title box `height: calc(clamp(20px,2.6vw,24px)*1.15)`, name line `h-5`; actions phone `[h-11 flex-1][h-11 flex-1][h-11 w-11]`, `sm:` `[h-9 w-[112px]][h-9 w-[128px]][h-9 w-[76px]]`.
2. Status card: `bz-card p-4 sm:p-5 min-h-[164px] sm:min-h-[128px] lg:min-h-[112px]` → badge `h-5 w-16`, title `h-5 w-48`, body `h-3.5 w-72 max-w-full`, button `h-11 w-full lg:w-28 lg:h-9`.
3. `<1024`: ViewSwitch `h-11 w-full sm:w-[300px] rounded-[10px]`; search row `h-11`; filter row 3 × `h-9 w-24 rounded-full`; sticky chip bar `h-[52px]` = `[h-4 w-14]` + 4 × `h-9 w-24 rounded-full` + `[h-11 w-11]`.
4. `≥1024` toolbar: row 1 `h-14`: `[h-9 w-[240px] xl:w-[300px]]` 4 × `[h-9 w-20 rounded-full]` `ml-auto [h-4 w-28] [h-9 w-9]`; row 2 `h-14 min-[1400px]:hidden`: 5 × `[h-9 w-24 rounded-full]` `ml-auto [h-9 w-[150px]] [h-9 w-16] [h-[34px] w-20]`.
5. Grid with the exact studio grid classes (§3.1): rail `hidden min-[1400px]:block bz-card p-2` 6 × `h-10`; workspace `@container/outline`: 2 section cards (header `h-[52px]`: title `h-4 w-40`, meta `h-3 w-14`, switch `h-[22px] w-9`), 4 rows each using **`row-layout.ts` constants** (narrow 76 / medium 60 / full 56, thumb 48/40, name `h-4 w-40`, desc `h-3 w-56`, price `h-4 w-12`, switch `h-[28px] w-[46px]` fine / `h-8 w-14` coarse), quick-add `h-12`; right column `hidden lg:flex` with the same sticky classes: header `h-11`, stage `px-4 py-4`, phone `mx-auto w-[288px] xl:w-[308px] rounded-[40px]` with `height: min(640px, calc(100dvh - 312px))`, footer `h-[60px]`.
When the studio layout changes, `loading.tsx` changes in the same commit (§40.10).

---

## 12. Error states

| Situation | UI |
|---|---|
| First load fails | `LoadErrorView`: `mx-auto max-w-[640px] py-12 lg:py-16` red card (`rounded-2xl border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-8`, AlertTriangle), `Menü yüklenemedi`, message, `Tekrar dene` (`bz-btn-primary` → `fetchAll`, skeleton while retrying), `İşletmeye dön` (`bz-btn-ghost` → `/${locale}/dashboard/restaurants/${id}`) |
| Silent refetch fails | Error toast `refreshFailed` + `Tekrar dene`; data stays |
| Inline cell save fails | Revert + `role="alert"` text under the cell; Enter retries; SaveIndicator error button focuses the row |
| Quick-add create fails | Pending row error state + `Tekrar dene` / `Sil`; text kept |
| Toggle / reorder / move / delete fails | Revert (reorder and move: `fetchAll`) + error toast |
| Bulk partially fails | Failed rows revert + error state; toast `bulkPartial(f)` or banner inside BulkPriceDialog |
| Panel / dialog / sheet save fails | `AlertBanner kind="danger"` inside that surface; values kept |
| Photo upload fails | Photo-specific sentence on the row / under PhotoField; retry |
| Paste commit partially fails | Banner inside PasteReview; created rows removed; rest kept |
| Undo fails | Error toast (`RESTORE_EXPIRED`, `CATEGORY_DELETED`, generic) |
| `forbidden_role` / `MENU_MODULE_DISABLED` mid-session (G11) | Mapped toast + invalidate `['current-user-role']` + `fetchAll` → UI recomputes `readOnly` (controls disable, status card shows viewer/locked) |
| Offline (G11) | SaveIndicator `Çevrimdışı`; requests still try and revert with the `network` sentence |
| 429 | Mapped "Çok fazla istek…" (toast or in-dialog) |
| QR preview fails | Message + `Tekrar dene` in the QR box |
| Publish blocked | Disabled with reason; server `MENU_EMPTY` / `MENU_MODULE_DISABLED` → mapped toast |
| Render crash | `error.tsx`: `reportBoundaryError('menu-builder-error-boundary', error)` + `return scheduleTransientRetry('menu-builder', error, reset)`; title `Menü düzenleyici açılamadı`; body matches its button (`… sorun sürerse panele dön.`); `Tekrar dene` + `Panele dön` (`bz-btn-ghost`, `/${locale}/dashboard`); digest `ref: …` 12px mono |

All messages go through `mapMenuApiError`; raw server text and codes are never shown.

---

## 13. Accessibility

- Headings: h1 (PageHeader) → h2 status → h2 sr-only "Menü içeriği" → h3 per category; right column `aside` with its own h2; panels are `region`s with an h2; sheets/modals are titled dialogs.
- Focus: docked panel focuses its title; closing returns focus to the row's `[data-row-focus]` and scrolls it (`block: 'center'`); sheets use Radix trap + `onCloseAutoFocus` to the row; inline edit selects text and returns focus to the display button; after quick-add focus stays in the name input; after delete focus moves to the next row (else previous, else section header).
- Labels include the item name (`Ayran fiyatını düzenle`, `Ayran: satışta`, `Ayran için işlemler`, `Ayran fotoğrafını değiştir`, `Ayran öğesini sürükle`, `“Ayran” menüden gizle`, `“Ayran” menüde göster`).
- Status never colour-only (label/badge/icon); allergens and badges in visible or sr-only text, never `title` only.
- Live regions: toaster (polite, always mounted; errors `role="alert"`), SaveIndicator `<p role="status">`, ContextBar `role="status"`, DnD announcements, just-published `<p aria-live>`. Never `aria-live` on a button.
- Touch targets 44px on coarse pointers; dense desktop controls 32–36px; APSwitch lg (56×32) on touch rows.
- Text ≥12px (11.5px only for footnotes/echo/badge chips); no uppercase mono micro-labels; body contrast ≥4.5:1.
- Drag alternatives: ⋯ move, Alt+↑/↓, reorder mode arrows, CategoryOrderSheet arrows, keyboard DnD.
- Forms: `Field` wires label, `aria-describedby`, `aria-invalid`, `aria-required`; errors `role="alert"`.
- Preview reachable but skippable (skip link); `onClickCapture` also handles keyboard clicks.
- WCAG 2.1.4: single-key shortcuts can be turned off (§9) and row shortcuts only fire with focus inside the outline.
- Reduced motion §15.6. `lang`: copy follows the route locale; no mixed TR/EN.

---

## 14. Copy (TR/EN)

### 14.1 Module (`_components/menu-i18n.ts`)
```ts
const tr = { header: {…}, status: {…}, view: {…}, toolbar: {…}, save: {…}, outline: {…}, context: {…}, category: {…}, item: {…},
  photo: {…}, paste: {…}, move: {…}, selection: {…}, bulkPrice: {…}, design: {…}, share: {…}, preview: {…}, service: {…},
  setup: {…}, toast: {…}, inline: {…}, shortcuts: {…}, dnd: {…}, errors: {…}, dialogs: {…},
  fmt: { itemCount: (n: number) => `${n} ürün`, … } };     // functions for anything with a number or a name
export type MenuCopy = typeof tr;
const en: MenuCopy = { … };                                 // TS enforces key + signature parity
export function getMenuCopy(locale: 'tr' | 'en'): MenuCopy;
export function count(n: number, one: string, many: string): string;  // EN plurals; TR has none
```
`kit/useMenuCopy.ts`: `useMemo(() => getMenuCopy(params.locale === 'en' ? 'en' : 'tr'), [locale])`. Carry over **verbatim** every still-used string of the old `buildMenuCopy` / `menuFmt` / `setupCopy` (all `bulk*`, `price*`, `photo*`, `allergen*`, `unpublish*`, `share*`/`qr*`, `locked*`, `viewerOnly`, setup step copy, `create`/`creating`/`replace*`, `presetPartial`, `setupCreated`, `deleteCategoryWithItemsTitle`), then delete inline strings. Badge/allergen/theme labels stay in `menu-constants.ts`; error sentences stay in `src/lib/menu-api-error.ts`. Dates `formatFullDateTimeInTimeZone(iso, locale)`; money `formatPrice(cents, currency, isTr ? 'tr-TR' : 'en-US')`. Voice: short, plain, professional, no emoji, no developer terms, no upgrade promises.

### 14.2 Glossary (use nothing else)
| Concept | TR | EN |
|---|---|---|
| Item states | Satışta / Tükendi / Gizli | Available / Sold out / Hidden |
| Item verbs | Satışa aç / Tükendi yap / Gizle / Göster | Mark available / Mark sold out / Hide / Show |
| Category | Menüde / Gizli / Kategori gizli | On menu / Hidden / Category hidden |
| Publish | Yayında / Taslak · Yayına al / Yayından kaldır | Live / Draft · Publish / Unpublish |
| Live indicator (short) | Canlı | Live |
| Modes | Düzenle / Servis / Önizle | Edit / Service / Preview |
| Design | Görünüm · Uygula | Design · Apply |
| Undo | Geri al | Undo |
| Details | Ayrıntılar | Details |
| Duplicate / Move / Delete | Kopyasını oluştur / Başka kategoriye taşı / Sil | Duplicate / Move to category / Delete |
| Paste / Share | Liste yapıştır / Paylaş ve QR | Paste a list / Share & QR |
Never "Menüde gizle" / "Menüden gizle" as a state; never "Menüde göster" for a category.

### 14.3 Key strings (new or changed; clarity's §14.2 table applies for the rest)
| Key | TR | EN |
|---|---|---|
| header.design / share / fullPreview / sortCategories / shortcuts / collapseAll / expandAll | Görünüm / Paylaş ve QR / Tam ekran önizle / Kategorileri sırala / Klavye kısayolları / Tümünü daralt / Tümünü genişlet | Design / Share & QR / Full-screen preview / Reorder categories / Keyboard shortcuts / Collapse all / Expand all |
| status.draftTitle / draftBody | Menün henüz yayında değil / Müşteriler QR kodu okuttuğunda menünü henüz göremez. Hazır olduğunda yayına al. | Your menu isn't live yet / Customers who scan your QR can't see the menu yet. Publish it when you're ready. |
| status.liveTitle / liveBody | Menün yayında / Burada kaydettiğin her değişiklik müşterilere hemen görünür. | Your menu is live / Every change you save here is visible to customers right away. |
| status.liveHint / liveEmpty | Yanlışlıkla bir şey değiştirirsen “Geri al”a bas. / Menün yayında ama müşterilere gösterilecek ürün yok. Gizli olmayan en az bir ürün ekle. | If you change something by mistake, press “Undo”. / Your menu is live but has nothing to show. Add at least one item that isn't hidden. |
| status.nativeShare | Paylaş… | Share… |
| view.label / edit / service / preview | Ekran / Düzenle / Servis / Önizle | View / Edit / Service / Preview |
| save.live / draft / saving / savedLive / saved / error / offline / undo | Canlı / Taslak / Kaydediliyor… / Kaydedildi · canlı / Kaydedildi / Kaydedilemedi / Çevrimdışı / Geri al | Live / Draft / Saving… / Saved · live / Saved / Couldn't save / Offline / Undo |
| toolbar.select / selectOff / undoTip | Seç / Seçimi kapat / Geri al (⌘Z) | Select / Stop selecting / Undo (⌘Z) |
| outline.filters | Tümü · Tükendi · Gizli · Fotoğrafsız · Açıklamasız · Fiyatı 0 | All · Sold out · Hidden · No photo · No description · Price 0 |
| context.restockAll / clear / completionHint / reorderHint / done | Hepsini satışa aç / Temizle / Tamamladıkça ürünler bu listeden çıkar. / Okları kullanarak sırala. / Bitti | Mark all available / Clear / Items leave this list as you complete them. / Use the arrows to reorder. / Done |
| fmt.resultsCount(n) / filterSummary(l,n) | {n} sonuç / {l} · {n} ürün | {n} result(s) / {l} · {n} item(s) |
| item.switchAria(n) / showAria(n) / hideAria(n) | {n}: satışta / “{n}” menüde göster / “{n}” menüden gizle | {n}: available / Show “{n}” on the menu / Hide “{n}” from the menu |
| item.show / details / editPrefix / oneCategoryHint | Göster / Ayrıntılar / Ürünü düzenle: / Başka kategori ekleyince taşıyabilirsin. | Show / Details / Edit item: / Add another category to move items. |
| item.hiddenNoSoldOut | Gizli ürün; önce göster (H). | Hidden item; show it first (H). |
| item.addDescription / completionPhoto | Açıklama ekle / Fotoğraf | Add description / Photo |
| outline.pendingRetry / pendingDiscard | Tekrar dene / Sil | Try again / Remove |
| outline.quickAddHint | Enter ile ekle · “Ürün 90” gibi yapıştırabilir ya da birden çok satır ekleyebilirsin | Press Enter to add · Paste “Item 90” or several lines at once |
| selection.count(n) / outsideFilter(k) / selectVisible(n) / clear / cap | {n} seçili / {k}’i filtre dışında / Tümünü seç (görünen {n}) / Seçimi temizle / Tek seferde en fazla 100 ürün seçebilirsin. | {n} selected / {k} outside the filter / Select all ({n} shown) / Clear selection / You can select up to 100 items at once. |
| selection.markAvailable / markSoldOut / price / hide / show / move / delete / more | Satışa aç / Tükendi yap / Fiyat… / Gizle / Göster / Taşı… / Sil / Diğer… | Mark available / Mark sold out / Price… / Hide / Show / Move… / Delete / More… |
| fmt.bulkDeleteTitle(n) / bulkDeleteBody | {n} ürün silinsin mi? / Silinen ürünleri 30 dakika içinde “Geri al” ile geri getirebilirsin. | Delete {n} item(s)? / You can bring them back with “Undo” within 30 minutes. |
| bulkPrice.title / subtitle(n) / modes / directions / round | Fiyatları değiştir / {n} ürün / Yüzde · Tutar · Sabit / Artır · Azalt / Yuvarla: Yok · 1 · 5 · 10 | Change prices / {n} item(s) / Percent · Amount · Fixed / Increase · Decrease / Round: None · 1 · 5 · 10 |
| fmt.bulkPrice.apply(k) / progress(x,k) / unchanged(k) / zeroWarning(z) / more(n) / partial(f) | {k} ürünü güncelle / Güncelleniyor… {x}/{k} / {k} üründe değişiklik olmayacak / {z} ürün 0 ₺ olacak / +{n} ürün daha / {f} ürün güncellenemedi. | Update {k} item(s) / Updating… {x}/{k} / {k} item(s) won't change / {z} item(s) will cost 0 / +{n} more / {f} item(s) couldn't be updated. |
| bulkPrice.mixedCurrency / none / retryFailed | Seçili ürünlerin para birimleri farklı; yalnızca yüzde kullanılabilir. / Değişen ürün yok / Başarısızları tekrar dene | Selected items use different currencies; only percent is available. / Nothing changes / Retry failed ones |
| move.titleMany(n) / endHint / current | {n} ürün hangi kategoriye taşınsın? / Ürünler seçtiğin kategorinin sonuna eklenir. / Şu anki | Move {n} item(s) to which category? / Items are added to the end of the category you pick. / Current |
| service.hintLive / hintDraft | Servis görünümü: yalnızca satış durumu. Dokunduğun an müşterilere yansır. / Servis görünümü: yalnızca satış durumu. Menü yayına alınınca müşterilere yansır. | Service view: availability only. Changes reach customers the moment you tap. / Service view: availability only. Customers see it once the menu is published. |
| shortcuts.title / singleKeys / singleKeysHint | Klavye kısayolları / Tek tuş kısayolları / Kapalıyken yalnızca ⌘/Ctrl ve Alt ile çalışan kısayollar etkin kalır. | Keyboard shortcuts / Single-key shortcuts / When off, only shortcuts with ⌘/Ctrl or Alt stay active. |
| fmt.toast.statusChanged(n,s) / hidden(n) / shown(n) / saved(n) / duplicated(n) | “{n}”: {s} / “{n}” gizlendi / “{n}” menüde / “{n}” kaydedildi / “{n}” kopyalandı | “{n}”: {s} / “{n}” hidden / “{n}” shown / “{n}” saved / “{n}” duplicated |
| fmt.toast.bulkUpdated(n) / bulkPartial(f) / pricesUpdated(n) / bulkMoved(n,c) / bulkDeleted(n) | {n} ürün güncellendi / {f} üründe değişiklik yapılamadı / {n} ürünün fiyatı güncellendi / {n} ürün “{c}” kategorisine taşındı / {n} ürün silindi | {n} item(s) updated / {f} item(s) couldn't be changed / Prices updated for {n} item(s) / {n} item(s) moved to “{c}” / {n} item(s) deleted |
| fmt.toast.categoryHidden(n) / categoryShown(n) | “{n}” kategorisi gizlendi / “{n}” kategorisi menüde | “{n}” category hidden / “{n}” category shown |
| preview.footer | Müşterinin telefonundaki görünüm, sığması için küçültüldü. Bir ürüne tıklayarak düzenleyebilirsin. | The customer's phone view, scaled to fit. Click an item to edit it. |
| dnd.instructions | Sürüklemek için boşluk tuşuna bas; ok tuşlarıyla taşı, bırakmak için tekrar boşluk; vazgeçmek için Esc. | Press space to pick up, use the arrow keys to move, press space again to drop, Esc to cancel. |

---

## 15. Visual style

### 15.1 Spacing (4px base)
Page `space-y-5`; grid `gap-5`; sections `space-y-4`; cards `p-4 sm:p-5`; panels `px-4 sm:px-6`; rows `px-3`, narrow `py-3`, medium `py-2`; row min-heights narrow 76 / medium 60 / full 56; section header ≥52; row gaps `gap-x-3` (narrow) / `gap-x-2` (medium/full); chip rows `gap-1.5`; button groups `gap-2`.

### 15.2 Radii
Cards 12 (`bz-card`) · thumbs 10 (48) / 8 (40) · photo field and option cards 12 · inputs/buttons 8 · segmented 10/7 · chips/pills `rounded-full` · badges 6 · phone frame 40/32 · bottom sheet `rounded-t-2xl` · toast `rounded-2xl`.

### 15.3 Typography (G9)
Clash Display (`--font-heading`) is **Buaze chrome only**: page title, status card title, panel/sheet/dialog titles, section sub-titles in design/paste review, setup headline. **All owner-entered text is Inter** (`--font-body`): category names, item names, the item title in the panel, descriptions, prices. Reasons: the Clash licence note in `src/components/root/fonts.ts` (not for customers' content), small-size legibility, Turkish ğ/ş/ı/İ safety.
**Implementation note (important):** `globals.css` has an **unlayered** `:where(h1,…,h6) { font-family: var(--font-heading); letter-spacing: -0.025em; font-weight: 500 }`. Unlayered rules beat Tailwind v4's layered utilities regardless of specificity, so `font-body`, `font-semibold` or `tracking-*` placed **on an h-element do nothing**. Always put typography utilities on an inner `<span>`/`<button>` inside the heading. `font-body` is the utility generated from `@theme --font-body`.

| Role | Style |
|---|---|
| Page title | PageHeader compact (Clash) |
| Status card title | inner span `bz-h-tight text-[18px]` |
| Panel/sheet titles (chrome text) | inner span `bz-h-tight text-[18px]` |
| Panel title = item name | inner span `font-body text-[17px] font-semibold tracking-[-0.01em]` |
| Category name | inner span/button `font-body text-[16px] font-semibold tracking-[-0.01em]` |
| Item name | `text-[14.5px] font-medium` (fine) / `text-[15px] font-semibold leading-5` (coarse, 2-line clamp) |
| Price | `text-[14px] font-semibold tabular-nums` / coarse `text-[16px]` |
| Description / body | `text-[12.5px]`–`text-[13.5px] text-[#525252]`/`#737373` |
| Meta / hints | `text-[12px] text-[#737373]`; footnotes ≥11.5px |
| Link chip / kbd | `font-mono` 12–12.5px |

### 15.4 Colour (Pulse, inline hex)
Surfaces #FAFAFA page / #FFFFFF cards / #FCFCFC expanded quick-add. Ink #0A0A0A / #525252 / #737373 / #A3A3A3. Lines #EDEDED / #E5E5E5 / #E8E8E8 / #D4D4D4. **Lime sparingly** (go / live / selected-positive): `Yayına al`, `Uygula`, live dot, focus ring, APSwitch on-track, active category chip (#EAF9B8 / #D9EE7A), row flash (#EAF9B8), selected row (#EAF9B8/40), preview highlight, toast Geri al, done step circles. Status: Satışta #16A34A / #166534; Tükendi #D97706 / #92400E on #FFFBEB / #FDE68A; Gizli #525252 on #F5F5F5; danger #DC2626 / #B91C1C / #FEF2F2 / #FECACA; info #EFF6FF / #1E40AF; offline amber #D97706.

### 15.5 Elevation
Cards `shadow-xs` (panel); sticky bars only `border-b` + blur; DragOverlay and sheets `bz-elev-3`; toast `shadow-lg`; phone bezel shadow ported.

### 15.6 Motion (CSS only)
Ease `cubic-bezier(0.2,0.8,0.2,1)`. 120ms hover/colour, 180ms panel swap (`bz-fade-in`), 220ms sheets, 200ms toast, 900ms row flash, 150ms switch. New in `globals.css`:
```css
@keyframes bz-row-flash { from { background-color: #EAF9B8; } to { background-color: transparent; } }
.bz-row-flash { animation: bz-row-flash 900ms ease-out 1; }
@keyframes bz-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.bz-toast-in { animation: bz-toast-in 200ms cubic-bezier(0.2,0.8,0.2,1); }
@media (prefers-reduced-motion: reduce) { .bz-row-flash, .bz-toast-in { animation: none !important; } }
```
Reduced motion: no slides/transforms (sheet keyframes already in the blanket), `scrollIntoView`/`scrollTo` `behavior: 'auto'`, DragOverlay unscaled, preview highlight static, flash becomes a static 900ms tint, `motion-safe:` for any translate.

---

## 16. Must-keep checklist (research.menu.must_keep_behaviours)

| # | Must-keep | Where handled | Status |
|---|---|---|---|
| 1 | Route/file contracts: `page.tsx` path; `loading.tsx` default-export skeleton imported by `dashboard/menu/loading.tsx` + `MenuHubRedirect.tsx`; `error.tsx` calls `reportBoundaryError('menu-builder-error-boundary')` + `scheduleTransientRetry('menu-builder')`; `analytics/` untouched | §4.1 (`page.tsx` R, `loading.tsx` R default export, `error.tsx` R), §11, §12 last row, §4.3 untouched list | Kept (error copy fixed to match its button) |
| 2 | Hub `/dashboard/menu` (scope, EmptyState, `?restaurantId`, single-business redirect, MenuHubRedirect, no picker) | Not touched (§4.3); skeleton import path unchanged | Kept |
| 3 | `?edit` once after load+role, not readOnly, item exists, unknown ignored; `?share=1` once when `menuEnabled`; params removed with `router.replace(…,{scroll:false})` keeping others; `?preview=1` full-screen `disableAnalytics` + "Önizlemeden çık"; analytics/preview links | `studio/useUrlIntents.ts` (§7.2), `page.tsx` (§7.1), `preview/CustomerPreviewScreen.tsx` (§7.9), right-column/draft links (§7.9) | Kept; "selects category + opens editor" → "expands section, scrolls to row, opens panel (≥1024 Ürün tab / <1024 sheet)" — justified by the one-outline IA |
| 4 | `readOnly = !menuEnabled \|\| isViewer \|\| roleLoading`; disabled not hidden; no upgrade copy; locked (admin control + contact) / viewer states; Share only when `menuEnabled` (viewers may download); Design only when `menuEnabled && !isViewer`; server gates; admins bypass | `MenuStudio` flags (§7.2), `MenuStatusCard` locked/viewer (§7.5), header disabled states (§7.4), read-only rows/panel (§7.7, §7.8), restore route uses `requireMenuModuleAccess` (§6.2), mid-session access loss (§5.4, §12) | Kept; skeleton until role resolves (removes the disabled flash) |
| 5 | Publish via `PATCH /menu/publish`; 403 `MENU_MODULE_DISABLED`, 409 `MENU_EMPTY`; `getMenuReadiness` disables with a reason (sold-out counts); unpublish danger confirm (link + QRs stop); one-time "menu is live"; "live but no items" warning; apply `menuPublished/menuUpdatedAt` from response | `publish/unpublish` actions (§5.4), status card draft/live/justPublished/liveEmpty (§7.5), §8.13; readiness computed on `withoutTemps` | Kept |
| 6 | Category delete: confirm with count; `?deleteItems=true` exact when count > 0; 409 `CATEGORY_NOT_EMPTY` + itemCount; next active from `neighbourCategoryId`; no restore UI without a new API | `deleteCategory` (§5.4), §8.9, restore endpoint (§6) | Kept; empty categories delete without confirm because Undo exists; restore added through the additive endpoint the contract names |
| 7 | `isAvailable=false` hidden / `isOutOfStock=true` "Tükendi"; quick toggles incl. category `isVisible`, optimistic + revert + error; PATCH only changed fields (`buildEditPatch`, never resend an untouched photo); category change lands at the end (server MAX+1 + `applySavedItem`) and the UI follows; create appends | `StatusCell`, `toggleSoldOut`/`hideItem`/`showItem`, `setCategoryVisible`, `flagPatch` single-field patches, panel `buildEditPatch` (§5.4, §7.7, §7.8); moves via `append:` queue | Kept; drag across categories lands at the drop index via a second reorder call (justified, no backend change); "switches to category" → scroll + flash in the new section |
| 8 | Optimistic reorder `withIndexSortOrder`, `PATCH /menu/reorder` with `sortOrder=index`, `fetchAll` only on failure; non-drag alternative; dnd-kit sensors (Pointer 8, Touch 150/5, Keyboard `sortableKeyboardCoordinates`); localized announcements | `reorderItems`/`reorderCategories` (§5.4), `menu-ui.ts` `useMenuDndSensors` + `useDndAccessibility` (kept), §8.4 alternatives (⋯, Alt+↑/↓, reorder mode, CategoryOrderSheet) | Kept |
| 9 | Merge POST/PATCH/DELETE responses with `menu-merge.ts`; stamp `menuUpdatedAt` locally after every success; `fetchAll` only on first load, retry, after wizard, after failed reorder, or unmergeable response | `useMenuActions` merge column + `touchLocal` (§5.4), `menu-merge.ts` additions (§5.7) | Kept; extra `fetchAll` only after a failed cross-category move and after mid-session access loss (both justified: server state unknown / permissions changed); paste merges instead of refetching |
| 10 | Bulk add `POST /items/bulk` strict, 1..30, atomic, 20/min; `parseMenuLines` reasons (`no_price`, `no_name`, `name_too_long`, `bad_price`) + overLimit; keep pasted text on error; notice "N ürün eklendi" and select the target category | `PasteReview`/`PasteSheet` (§7.7), `bulkCreate`/`commitPaste` (§5.4), §8.3 | Kept; "select category" → scroll to and flash the target section; header lines can become categories (each its own atomic call) |
| 11 | Setup wizard only when `categories.length===0`, status strip hidden; `orderStarterPresets(detectSector(...))`, `STARTER_FEATURED_COUNT`, 9 presets; `validateSetupCategories` rules; confirm before replacing edits; sequential creation, stop at first failure, always `fetchAll`, `presetPartial`/`setupCreated`; path to start empty; phones scroll to `#menu-items-pane` | §10 (`SetupStart`, `SetupWizard`, `useSetupDraft`), `createMenuFromSetup` (§5.4), outline id (§7.2) | Kept; read-only + empty shows an EmptyState (creation would 403); third "Listemi yapıştır" path feeds the same plan |
| 12 | Item editor: name required ≤120, description ≤500, price required + starts empty, `parsePriceInput`, invalid blocked, zero warning, ambiguous echo, currency symbol from `item.currency`; Enter flow with IME skip; Save & add another keeps category; autofocus fine pointers only; 16px phone inputs; unsaved guard; 12 badges + 12 allergens grouped with TR/EN + `BADGE_TINTS`; optional http(s) photo link | `ItemForm` (§7.8) on unchanged `menu-item-form.ts`; dirty guard on every close path incl. X/Vazgeç (fixes the pain point); quick-add and inline price reuse `checkPrice` | Kept |
| 13 | Image pipeline: `image/*` check, `compressImage` options, >5MB `IMAGE_TOO_LARGE`, FormData to `/menu/upload` (contract unchanged, shared with BrandIdentityCard), data URL storage, object-URL preview + revoke, sequence guard, block saving while uploading, raster ≤300KB, `photoFailed` copy | `data/usePhotoUpload.ts` (§8.7), `RowPhoto`, `PhotoField`, `LogoField` | Kept |
| 14 | Theme: partial `PATCH /theme`; 7 themes parity with `MENU_THEMES` + PublicMenuView; 12 swatches + custom; reset to null → `primaryColor`; ThemeSync overlap safety; logo through upload then theme; instant preview | `useThemeDraft` + `DesignPanel` (§7.11), `menu-theme.ts` + `themeDiff` | **Changed per brief**: local draft + Uygula replaces save-on-click and the 500ms debounce/flush (nothing to lose before Apply; the leave guard protects the draft); ThemeSync still arbitrates Apply and undo-of-apply |
| 15 | QR: svg 400 preview, png 1200, svg 1200; link from `X-Menu-Url` → `SITE_URL/menu/<slug>`, never `window.location.origin`; `qrAdjusted` note; `?source=qr` untouched; filename; revoke after 2s; draft warning + publish CTA; retry; analytics link | `share/ShareDialog.tsx` 1:1 port (§7.12) | Kept; `navigator.share` button added |
| 16 | Live preview: `PublicMenuView` with `disableAnalytics`, dynamic `ssr:false`, in-memory data (unsaved theme shows); published → `/menu/<slug>` new tab, draft → `?preview=1` | `PhonePreview`, `PreviewPanel`, `RightPanel` (§7.9); preview-slot rule (§7.2) | Kept; also shows unsaved item drafts and highlights the focused item without mutating PublicMenuView |
| 17 | Every failure through `mapMenuApiError` (codes listed); no raw text; dialog errors inside dialogs; initial load full-page error with `Tekrar dene` + back link to `/dashboard/restaurants/<id>` | `data/menu-api.ts` `apiCall` (§5.2), §12, `LoadErrorView`; +2 codes (§6.3) | Kept |
| 18 | i18n TR/EN parity via `isTr`; Pulse voice; no developer terms; no upgrade promise; EN plurals; migrate `menu-copy.ts`, `setupCopy` and inline strings; `formatFullDateTimeInTimeZone`; `formatPrice` | `menu-i18n.ts` + `tests/menu-i18n.test.ts` parity (§14, §17) | Kept (migrated to one typed module) |
| 19 | Tests keep paths and exports: `menu-merge`, `menu-item-form`, `menu-setup` (+ `STARTER_PRESETS`), `menu-starter-data`, `menu-theme`; lib tests relied on | Modules stay at `_components/` (G12, §4.1); additions only; §17 | Kept with **zero import changes** |
| 20 | Shell coupling: sticky offsets 61 (z-40) / 56; `max-w-[1600px]`; no added bottom-nav spacing; skeleton matches (CLS); shell nav/rewrite/breadcrumb depend on the route | §3 wrapper + §3.2 offsets, bottom-anchored elements use `--dash-bottom-nav-h`, §11 skeleton shares `row-layout.ts`, route unchanged | Kept |
| 21 | Every write calls `touchMenuUpdated` (+ revalidatePath); publish revalidates; public menu never carries data URLs | Existing routes untouched; restore calls `touchMenuUpdated` (§6.2); no public-side change | Kept |

Pain points addressed (research.menu.pain_points): modal overload → inline + one panel; price edits → inline spreadsheet run; slow adding → optimistic quick-add, paste with headers, duplicate, bulk; no search/filter → search + filters + completion workflow; buried fields → no disclosure in the panel, allergens always visible; confusing flags → glossary + one switch + Göster; buried design/analytics/unpublish → header buttons + status card; preview missing → right column ≥1024 and ViewSwitch <1024, follows and highlights; design auto-live → Apply; unclear live state → status card + "● Canlı" + toasts; photo friction → drop/paste/pick on rows + completion tiles; close-without-save → guard on every path; no undo → restore + undo stack; cramped mobile rows → two-line rows, 44px controls, name 2-line clamp; viewers can't inspect → read-only panel; disabled flash → skeleton until role; a11y (aria-live on buttons, title-only allergens, tiny text) → fixed; inaccurate copy → fixed; scattered i18n → one module; shared busy flag → per-key queues and per-row state; wizard state lost → sessionStorage.

---

## 17. Tests (`npm test` = `node --import tsx --test tests/**/*.test.ts`)

Existing, **paths unchanged**: `tests/menu-merge.test.ts`, `tests/menu-item-form.test.ts`, `tests/menu-setup.test.ts`, `tests/menu-starter-order.test.ts`, `tests/menu-theme-sync.test.ts`; lib tests `menu-readiness`, `menu-api-error`, `menu-bulk-parse`, `menu-image-url`, `parse-price-input`, `qr-colors-scannable`, `qr-shared` stay green.

Extended:
- `menu-merge.test.ts`: `replaceItem` (found; temp gone → applySavedItem create; saved id already present → no duplicate), `withoutTemps`, `removeItems`, `patchItems`, `snapshotItemPositions`, `moveItemsToEnd`, `insertItemBySortOrder` (middle/end/unknown → null), `insertCategoryBySortOrder`, `moveItemLocal` (end/index/same/unknown), `overlayItemDraft` (edit patch, category move, create appends `__draft__`, invalid price keeps original), `patchItem` identity of untouched categories.
- `menu-theme-sync.test.ts`: `themeDiff` (no change → {}, accent case-normalised, logo removal → null), `isThemeDirty`.
- `menu-api-error.test.ts`: `RESTORE_EXPIRED`, `CATEGORY_DELETED` TR/EN.

New (all import `../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/<module>` or `../src/lib/<module>`):
- `menu-status.test.ts`: `itemStatus` truth table; `statusPatch` minimal diffs (9 transitions); `flagPatch` per op incl. null when unchanged and "markAvailable never touches isAvailable"; `rowBadge` priority; `customerVisibility`; `menuNudges` (temps excluded).
- `menu-filter.test.ts`: `foldSearch` ("ÇAY"→"cay", "ışık"→"isik", İ); multi-token AND; category-name match; each filter; `filterCounts`; inactive → all sections incl. empty; `keepIds` linger; `visibleItemIds` (collapsed skipped, temps skipped).
- `menu-paste.test.ts`: `isMultiLinePaste`; `parseSingleLine` (ok, error, multi-line → null); header detection (colon, followed-by-priced, trailing no-price line is an error); headerless section; overLimit; `revalidateRow`; `pastePlan` (asCategory off merges; errors dropped; cap 30); `setupCategoriesFromPaste` default name.
- `menu-undo.test.ts`: push/cap 20; `takeLatest` order; prune by age (29 min); remove.
- `menu-dnd.test.ts`: `findContainer`; `moveAcross` into empty container and onto an item; `resolveDrop` none/reorder/move with correct ordered ids.
- `menu-bulk-price.test.ts`: `parsePercentInput` ("10", "7,5", "7.5", invalid, >500); percent up/down; amount up/down; fixed; clamp at 0; `roundTo` 100/500/1000 half-up; unchanged detection; `zeroCount`; `mixedCurrency`.
- `menu-keys.test.ts`: letters via `e.key` (incl. `'N'`+shift), symbols ignore shift (`/` with shiftKey true matches), mod mapping Mac/other, Alt+Arrow, `isComposing` ignored, typing-target guard, modal/menu guard, single-key off switch disables letters/symbols but not ⌘Z/⌘D/Alt+↑, row scope requires `inRow`, every `SHORTCUTS` entry has TR+EN labels and unique combos.
- `menu-queue.test.ts`: per-key FIFO order under random delays; different keys run in parallel; a rejection does not block the next task; `runPool` limit respected, results in input order, settled values.
- `menu-setup-preview.test.ts`: ids, order, flags.
- `menu-restore.test.ts`: `canRestore` active/ok/boundary (exactly 30 min)/expired, string dates.
- `menu-i18n.test.ts`: TR and EN deep key sets equal; every leaf string non-empty; function leaves have equal `length`; EN `itemCount(1)` = "1 item"; glossary strings present (Satışta/Tükendi/Gizli; Available/Sold out/Hidden).

Checks per chunk: `npm test`, `npx tsc --noEmit` (required: `next.config` has `ignoreBuildErrors: true`, so the build hides type drift), `npm run lint` (no new errors; §21.25 baseline).

---

## 18. Implementation order — 4 chunks

Workflow: stacked branches (CLAUDE.md §21.22). **Chunk 1 is purely additive and can merge alone.** Chunk 2 switches the route to the new studio, so **chunks 2–4 ship together** (merge the last branch). Every chunk ends with `npx tsc --noEmit` at 0 errors in `src`, `npm test` green and `npm run lint` with no new errors. Old UI files stay on disk (unreferenced but still compiling) until chunk 4 so their logic can be ported.

### Chunk 1 — Foundations (pure logic, copy, restore endpoint)
Files: create `menu-status.ts`, `menu-filter.ts`, `menu-paste.ts`, `menu-undo.ts`, `menu-dnd.ts`, `menu-bulk-price.ts`, `menu-keys.ts`, `menu-queue.ts`, `menu-setup-preview.ts`, `menu-i18n.ts` (complete TR/EN, carrying over old strings); extend `menu-merge.ts`, `menu-theme.ts`, `menu-types.ts`; create `src/lib/menu-restore.ts`, `src/app/api/restaurants/[id]/menu/restore/route.ts`; extend `src/lib/menu-api-error.ts`; add keyframes to `globals.css`; all tests in §17; CLAUDE.md §12.4 restore sentence.
Type-check boundary: nothing in the old UI changes; additions are additive exports.
Done when: all tests pass; restore smoke-tested with HTTP calls as owner (item delete → restore; category with items delete → restore brings back only the cascade; an item deleted earlier stays deleted), viewer (403 `forbidden_role`), module off (403 `MENU_MODULE_DISABLED`), foreign restaurant (403/404), after 30 minutes (410 `RESTORE_EXPIRED`), item whose category is deleted (`skipped CATEGORY_DELETED`).

### Chunk 2 — Studio core and switchover (daily editing)
Files: `menu-ui.ts` additions; `data/menu-api.ts`, `useMenuData.ts`, `useSerialQueue.ts`, `useMenuActions.ts` (single-item, quick-add, category, publish, photo, duplicate, delete/restore actions, plus `bulkSetFlags` because the status-card nudge, the ContextBar and the category ⋯ "Tümünü satışa aç / tükendi yap" use it), `usePhotoUpload.ts`; `kit/*` (Sheet, Toaster, SaveIndicator, storage, useMenuCopy, useFileDropGuard); `studio/*` except `ShortcutsDialog`/`useStudioShortcuts` (MenuStudio, context, StudioHeader, MenuStatusCard, ViewSwitch, ModeSwitch, StudioToolbar without Seç/Sırala, ContextBar search/filter part, useUrlIntents, useScrollSpy, LoadErrorView); `outline/` row-layout, MenuOutline (no DnD), FilterChips, CategoryChips, CategorySection, CategoryHeader (rename, description, visibility, add item, hide/show, delete, Tümünü satışa aç / tükendi yap), ItemRow (3 tiers), ServiceRow, InlineText, InlinePrice (with price run), StatusCell, RowPhoto (incl. completion tile), QuickAddRow (pending rows + single-line paste), NewCategoryRow; `item/` ItemPanel, ItemForm, PhotoField, StatusField, ChipGroupField; `preview/*`; `share/ShareDialog.tsx`; rewrite `page.tsx`, `loading.tsx`, `error.tsx`. Interim: empty menus show the "Boş başla" outline; `Görünüm` is `aria-disabled` until chunk 4.
Type-check boundary: new files only import kept/extended modules and chunk-1 modules; old components are no longer imported by `page.tsx`.
Done when: skeleton has no visible layout shift at 375/768/1024/1440; header/status states correct for draft, live, live-empty, locked, viewer; publish/unpublish; inline name/price with silent save + SaveIndicator Geri al + ⌘Z (via toolbar Undo button until chunk 3 adds the shortcut); price run across rows and categories; quick-add 5 items fast without collisions; switch/Göster/eye toggles with toasts; delete + undo (restore); duplicate; item panel create/add another/edit/prev-next/category change/dirty guard on every close path; right column tabs at ≥1024 with the outline clickable; preview overlay, highlight, pick-to-edit; ViewSwitch with Servis and Önizle; `?edit`, `?share=1`, `?preview=1`; share downloads; offline indicator; file-drop guard; §3.3 width table verified.

### Chunk 3 — Organise and bulk
Files: `useMenuActions` additions (`bulkSetPrices`, `bulkMove`, `bulkDelete`, `moveItemToCategory` with `toIndex`, `reorderItems`, `reorderCategories`, `bulkCreate`, `commitPaste`); `outline/` DnD in MenuOutline + DragPreviewRow, CategoryRail, CategoryOrderSheet, MoveToCategoryDialog, SelectionBar, BulkPriceDialog, PasteReview; `item/PasteSheet.tsx`; StudioToolbar `Seç` + `Sırala`; ContextBar selection/reorder/completion parts; CategoryHeader ⋯ `Fiyatları değiştir…` / `Ürünleri seç` / move / `Kategorileri sırala…`; `studio/useStudioShortcuts.ts`, `studio/ShortcutsDialog.tsx` (+ single-key switch).
Type-check boundary: only extends chunk-2 components and actions.
Done when: drag within and across categories (mouse, keyboard, touch reorder mode) with failure → `fetchAll`; rail category drag; selection (click, Shift+click, `x`, category ⋯, select visible); bulk restock/sold-out/hide/show with one undo; bulk price +10 % rounded to 5 ₺ on 40 items with preview, zero warning and one undo; bulk move lands at the end in visual order; delete 4 (no confirm) vs 5 (confirm) + undo; paste with headers incl. a forced 429 partial failure; keyboard-only run of every §9 shortcut on a Turkish Q layout; single-key switch off disables `s`/`h`/`/` but not ⌘Z.

### Chunk 4 — Design, setup, cleanup, docs
Files: `data/useThemeDraft.ts`; `design/*`; `setup/*` + `createMenuFromSetup`; header `Görünüm` enabled; delete the 16 files in §4.2; trim `menu-ui.ts` (`MENU_INPUT_CLASS`, `MENU_LABEL_CLASS`, `copyText` if unused); CLAUDE.md §12.1 rewrite (structure, publish + undo model, Apply, Servis, right-column tabs) and §38 stage entry; final skeleton pass.
Type-check boundary: deletions happen last, after the grep in §4.2 shows no importers.
Done when: the acceptance criteria in §19 all pass.

---

## 19. Acceptance criteria (definition of done)

**Build and tests**
- [ ] `npx tsc --noEmit` 0 errors in `src`; `npm test` green (incl. every §17 test); `npm run lint` no new errors; `npx prisma validate` green (no schema change).
- [ ] The 5 existing builder tests run **without import changes**; `grep` in §4.2 returns 0 hits for deleted modules.

**Layout**
- [ ] No horizontal page scroll at 360, 375, 414, 768, 1024, 1280, 1400, 1440, 1600, 1920 with the sidebar expanded and collapsed.
- [ ] Item name column ≥190px in every desktop row of the §3.3 table, **with the right column open and with an item open** (measure the name element's width in DevTools).
- [ ] Rows switch tiers by outline width (container queries), not by viewport; coarse pointers always get the two-line layout with 44px targets.
- [ ] Skeleton → studio has no vertical layout shift at 375, 1024 and 1440.
- [ ] At most one `PublicMenuView` is mounted at any time (`document.querySelectorAll('[data-preview-root]').length <= 1` in every state: right column, item sheet Önizle, design sheet, phone Önizle, too-short sheet).

**Daily speed**
- [ ] Reprice 10 items by keyboard only (click first price → type → Enter ×10) with no toasts, SaveIndicator showing `Kaydedildi · canlı`, and ⌘Z restoring the last price.
- [ ] Add 10 items via quick-add without waiting; server sortOrders strictly increase in entry order (no duplicates).
- [ ] Toggle sold-out on/off/on quickly: the server ends in the last state (serial queue).
- [ ] Bulk price: 40 items +10 %, rounded to 5 ₺, preview list correct, zero warning when a fixed 0 is entered, one Geri al restores all.
- [ ] Servis mode: one tap per sold-out change on a 375px phone; mode remembered after reload.

**Clarity**
- [ ] Status card shows exactly one primary action per state; nudges ≤2; "● Canlı" visible in the phone chip bar while scrolled.
- [ ] Design: browsing themes sends **no PATCH** (network tab); Apply sends one PATCH with only changed keys; Geri al restores; the live menu in another tab is unchanged until Apply.
- [ ] Item panel at ≥1024 never hides the outline; clicking another row opens it (with the dirty guard when needed).
- [ ] Every item-panel close path (X, Vazgeç, Esc, backdrop, prev/next, other row, rail jump, design mode) asks when dirty.

**Safety and contracts**
- [ ] Every row in §16 verified, including: `?edit` once + stripped, unknown id ignored; `?share=1` once; `?preview=1` exits to the builder; QR link from `X-Menu-Url`; category with items deleted with `?deleteItems=true` and restored with only its cascade; delete undo after 30 min → `RESTORE_EXPIRED` message.
- [ ] Viewer: read-only panel opens, Share downloads work, Design disabled, all writes disabled (not hidden). Module off: locked card, everything disabled. Admin "Owner gibi aç" works.
- [ ] Mid-session role downgrade (viewer) or module off: the next write shows the mapped message and the UI becomes read-only without a reload.
- [ ] Dropping an image outside a drop zone never navigates away; offline shows `Çevrimdışı` and toggles revert with the network sentence.
- [ ] Single-key shortcuts work on a Turkish Q keyboard (`s`, `h`, `/`, `?`) and stop when "Tek tuş kısayolları" is off; ⌘Z/⌘D/Alt+↑ still work.

**Accessibility and copy**
- [ ] Keyboard-only run of §9; focus never lost after dialogs/sheets/panel close; VoiceOver announces saves (SaveIndicator), toasts, DnD instructions in Turkish.
- [ ] No `aria-live` on interactive elements; no text under 12px except footnotes/echo/badge chips; status never colour-only.
- [ ] Category names, item names and the panel item title render in Inter (computed `font-family` starts with the Inter stack); Clash only on chrome.
- [ ] TR/EN parity test passes; no mixed-language strings on either locale; reduced motion removes slides, flashes become static tints, scrolls are instant.
- [ ] Performance: 200 items / 20 categories — toggling a switch re-renders one row (React Profiler), search typing stays smooth with `useDeferredValue`.

QA matrix (manual): widths above × roles (owner, team editor, viewer, module off, admin) × states (empty → 3 setup paths; draft 0 / some publishable; live; live-empty; just published) × flows (§19 lists) × TR/EN × reduced motion × iOS Safari 17 bottom sheets with the keyboard open (`useKeyboardInset`).

---

## 20. Out of scope and follow-ups

| Item | Status |
|---|---|
| Atomic `PATCH /menu/items/batch` (+ batch delete) — speed §14.2–14.3, or mobile's with per-item fallback | **Follow-up; needs explicit backend approval.** The client already funnels bulk work through `bulkSetFlags` / `bulkSetPrices` / `bulkDelete` so a batch endpoint can replace `runPool` inside those three functions only. |
| Owner thumbnail endpoint (drop base64 `imageUrl` from the builder list) | Follow-up (load size on large menus) |
| Sold-out until end of day | Needs a schema field + cron |
| Redo, `BulkLabelsDialog`, swipe/long-press/FAB, two-level ReorderSheet, roving grid, coalescing | Rejected for this build (§0.3) |
| Draft snapshots / unpublished changes | Contradicts the fixed publishing model |
