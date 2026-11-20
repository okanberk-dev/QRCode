# Public menu design: final build spec (binding)

Owner request (TR): *"Menü tasarımını geliştir, güzel görünen estetik menü yap ve kullanıcılara da tasarım vs değiştirme esnekliği ver."*

Goal: the public menus diners see after scanning the QR (`/menu/[slug]`) become genuinely beautiful, and restaurant owners get real, safe control over the design from Menu Studio's **Görünüm** panel.

This document is the only spec to build from. It takes the **Editorial** proposal as the base and grafts the best parts of **App** and **Brand**. Where this spec and a proposal disagree, this spec wins. Where this spec is silent, follow the Editorial proposal (`design-specs/menu-design-editorial.md`), unless doing so breaks a rule here.

## 0. Ground rules for the builders

- **Branch.** Work in `wt-menu-design` on `claude/menu-design-themes`. That worktree sits at `b4b1acc`, but `claude/menu-studio-rebuild` has since moved to `a1a0634` (`fix(menu): address Menu Studio review findings`). **Rebase onto the current tip of `claude/menu-studio-rebuild` before chunk 1 starts.** Never commit `src/app/[locale]/zz-menu-measure/` (it was absent in `wt-menu` at the time of writing; keep it out if it reappears).
- **Lifted restrictions.** `menu-spec-final.md` line 12 forbade schema changes, edits to `PublicMenuView` and edits to the theme route. Those limits were for the Menu Studio rebuild. **This change explicitly lifts them.**
- **Hard constraints (from the brief).**
  - No new npm dependencies.
  - No owner CSS or HTML. Only enumerated values, `#RRGGBB` colours (normalised) and one sanitised plain-text tagline.
  - WCAG AA guaranteed for every owner colour, by automatic adjustment at render time.
  - Clash Display never reaches a menu. Menus use OFL Google fonts only, through `next/font/google` with `preload: false` and `['latin','latin-ext']`, via the existing `MenuFontScope` / `--font-menu-heading` mechanism.
  - SSR, with no layout shift.
  - Images only through `/api/menu/[slug]/img/[itemId|logo|cover]`.
  - Analytics, the splash, JSON-LD, the read-only and plan gates, and reduced motion all stay.
  - Existing rows render as well or better with no owner action.
- **Type safety.** `next.config` ignores type and lint errors. Every chunk runs `npx tsc --noEmit` and `npm test` (`node --import tsx --test tests/**/*.test.ts`) before committing.
- **Scope discipline (CLAUDE.md §7).** No drive-by refactors. Tailwind arbitrary values stay inline. TR copy comes first, with EN parity.

---

## 1. Verdict: scores and reasons

Each criterion is scored 1–10.

| Proposal | Beauty | Owner flexibility | Safety (contrast, no CSS, font licence) | Implementability here, no new deps | Backward compatibility | Total |
|---|---|---|---|---|---|---|
| **Editorial** (base) | **9** | 7 | **9** | **8** | **9** | **42** |
| App | 7 | 8 | 8 | 6 | 8 | 37 |
| Brand | 7 | **10** | 7 | 5 | 8 | 37 |

### Editorial: 42 (base)

**Strengths**
- **Beauty.** It has the strongest visual language of the three:
  - deliberate type pairings with real italics;
  - paper and ink surfaces with hairline rules;
  - neutral badges, so the chef's pick is the only loud chip;
  - tabular prices that no longer fight the item name;
  - monogram placeholders;
  - nothing smaller than 12 px.

  The 12 presets are varied and each one has a clear point of view.
- **Safety.** Curated surfaces with pre-verified text tokens mean the owner only controls the accent, so the contrast problem shrinks to one colour.
- **Backward compatibility.** It keeps `MENU_THEMES` at 7: new presets live in `menuDesign.preset` and belong to a legacy "family". As a result:
  - the admin enums, labels and i18n parity stay untouched;
  - production code on the shared database renders a new preset as its family's look instead of falling back to `classic`.
- **Implementability.** It adds a `menuCoverVersion` column, so the public page never loads the cover blob. It moves `loadMenu` to an explicit select.

**Weaknesses fixed here**
- It puts the product sheet and splash *inside* the `@container` element. Container containment can turn that element into the containing block for `position: fixed`, which would break the overlays on the public page.
- It uses `scrollIntoView` for category jumps, which would also scroll the Studio page.
- With a lime accent on cream, the pill fallback discards the brand colour.
- It has no tagline.
- Knobs are lost on a preset switch even for content.

### App: 37

**Strengths (grafted)**
- The overlay and container separation.
- `inert` on the background while the sheet or splash is open.
- Product-view tracking gated while the splash is visible.
- Merging canonical server values from the PATCH response.
- A verified dark palette for colourful badges.
- An ink pill with accent-coloured text for very light accents.
- A worst-case check of the translucent sticky nav.
- Zod kept out of the client bundle.
- Smooth anchor scrolling via a page-level style.

**Rejected**
- Auto dark mode: SSR cannot know the OS scheme without a flash, it doubles the token and QA matrix, and the preview stops matching production.
- The featured rail: it duplicates items, needs a new `data-feature-pid` contract in PhonePreview, and conversion features were not asked for.
- Growing `MENU_THEMES`: old production code on the shared DB clamps unknown ids to `classic`.
- `hex6` rejecting `#RGB` on write: Undo of a legacy `#RGB` row would then fail.
- Keeping `include` in `loadMenu`: it would load the 0.5 MB cover blob on every render.
- The beauty bar sits at "delivery app": clean but generic.

### Brand: 37

**Strengths (grafted)**
- Tagline sanitising.
- The rule that preset switches reset style knobs but keep content.
- Literal `next/font` options (spreads are rejected by the font loader).
- Card style and badge style as owner knobs.
- The `content-length` 413 guard.
- The `#RGB` expansion in the migration.
- The PhonePreview background and the auto-scroll hint.
- Playfair Display as a sixth typeface.

**Rejected**
- Owner-chosen background, card and text hex colours. They are the biggest source of ugly menus, they need plane clamping that silently shifts owner colours, and they blow up QA.
- Show/hide toggles.
- The image-shape knob and its matrix.
- Eight new font families.
- Dynamically importing the sheet, which adds a delay on first open.
- The 7:1 AAA ink floor, which is unnecessary with curated surfaces.

Brand gives the most freedom, but with 18 keys the combinatorial surface cannot be QA'd and taste is not guaranteed.

### What the final design is, in one paragraph

One token-driven renderer. Twelve curated **presets**: the 7 legacy themes are refreshed, and 5 are new. On top of a preset, the owner can override **10 enumerated knobs**:
- surface (8)
- typeface (6)
- item layout (4)
- header (4)
- category nav (2)
- card style (2)
- density (3)
- corners (3)
- price style (3)
- badge style (2)

Beyond the knobs, the owner also has:
- a **tagline**;
- the existing **accent**, with its 12 swatches, a custom colour and Varsayılan;
- the existing **logo**;
- a new **cover photo**.

A pure resolver turns this into CSS custom properties on the server, guarantees AA for any accent on any surface, and tells the owner when it adjusted something.

---

## 2. Visual language (summary; values in §3–§4)

1. **Type carries the brand; colour whispers.** Each preset has a deliberate display face. The accent appears only in these roles:
   - the active nav marker;
   - section rules and numbers;
   - the chef's pick chip;
   - the banner;
   - the focus ring and splash progress;
   - optionally the price.

   Raw accent text never reaches the page; only the resolver's `accentText` does.
2. **Paper, not boxes.** Warm off-whites and true inks, with 1 px hairlines (about 1.25:1) between rows. Card chrome only where it is the preset's identity, or where the owner picks "Kartlı".
3. **Strict rhythm.**
   - A 4 px grid, with gutters of 20 px below a 28rem container and 24 px from 28rem.
   - Name, price and description share the left edge.
   - **Mixed photos:** a list category that has at least one photo reserves the thumb slot on every row and fills gaps with a monogram tile. A category with zero photos has no media column. This way every uploaded photo always shows, and rows never look ragged.
4. **Hierarchy:** name > price (ink, or `accentText` when the price style is "Renkli"; tabular lining figures; never wraps) > description (`ink2`) > meta (`muted`). The smallest text anywhere is 12 px. Labels use 0.12em tracking, never 0.4em.
5. **Calm motion.** One easing, `cubic-bezier(.2,.8,.2,1)`, over 160–280 ms. Everything is off under `prefers-reduced-motion`.
6. **Turkish-correct.** The scope carries `lang={locale}`, so `?lang=en` no longer prints "CHEF'S PİCK". All monograms use `toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US')`. All font families include `latin-ext`.
7. **Text never sits on a photo.** The cover has no text over it. The only thing drawn on a photo is the self-contained price chip (Modern and Sokak), with its own fill and shadow.

---

## 3. Tokens

### 3.1 Surfaces: knob `surface`, 8 values (all constants, verified)

All values are `#RRGGBB`. Ratios are WCAG 2.x, computed with the same formula as `qr-colors.ts`.
- **ink / ink2:** the minimum against `bg`, `surface`, `surface2` and **navWorst**.
- **muted / ruleStrong:** the minimum against `bg`, `surface` and `surface2`.
- **navWorst:** `bg` mixed 8 % towards black (light scheme) or white (dark scheme). This models content scrolling under the translucent sticky nav.

| key | TR / EN | scheme | bg | surface | surface2 | ink | ink2 | muted | rule | ruleStrong |
|---|---|---|---|---|---|---|---|---|---|---|
| `white` | Beyaz / White | light | `#FFFFFF` | `#FFFFFF` | `#F4F3F1` | `#141210` 15.68 | `#46423D` 8.36 | `#6B665F` 5.13 | `#E7E4DF` | `#8E877E` 3.20 |
| `ivory` | Fildişi / Ivory | light | `#FBF8F1` | `#FFFDF8` | `#F1ECE1` | `#1D1A15` 13.67 | `#4A443A` 7.59 | `#6B6355` 5.03 | `#E6DFD0` | `#8C8271` 3.21 |
| `cream` | Krem / Cream | light | `#F5EEE0` | `#FBF7EE` | `#EBE2CF` | `#241D14` 12.08 | `#4C4234` 7.13 | `#675B48` 5.15 | `#DFD3BC` | `#8A7D66` 3.13 |
| `stone` | Taş / Stone | light | `#EEECE7` | `#F8F7F4` | `#E3E0D9` | `#1A1917` 12.46 | `#44413C` 7.21 | `#625E57` 4.89 | `#D8D4CC` | `#7E796F` 3.28 |
| `sage` | Adaçayı / Sage | light | `#EEF2EA` | `#F9FBF6` | `#E2E8DC` | `#18211A` 12.23 | `#3F4A41` 6.86 | `#5A665C` 4.82 | `#D5DDCF` | `#77837A` 3.16 |
| `ink` | Mürekkep / Ink | dark | `#0F0E0D` | `#181715` | `#23211F` | `#F3EFE7` 13.99 | `#C8C2B7` 9.06 | `#A39D92` 5.96 | `#2E2C29` | `#78726A` 3.37 |
| `night` | Gece mavisi / Night blue | dark | `#0C1220` | `#131A2A` | `#1B2436` | `#EFF2F7` 13.67 | `#C2C9D5` 9.21 | `#9AA3B4` 6.12 | `#253049` | `#67738C` 3.26 |
| `forest` | Orman / Forest | dark | `#0D1A15` | `#13241D` | `#1A2E26` | `#EEF3EC` 12.76 | `#C3CFC6` 8.93 | `#9AAAA0` 5.90 | `#24392F` | `#62786C` 3.02 |

Rules:
- `muted` is never used inside the sticky nav. Nav labels use `ink2`.
- Light `bg` luminance is ≥ 0.83 and dark `bg` luminance is ≤ 0.01. That is why blending towards black (light) or white (dark) always terminates in §7.3.
- This table fixes today's failing muted tokens: Elegant's `#8C7E66` on `#FCFBF8` (3.84) and Minimal's `#A3A3A3` on white (2.52).

### 3.2 Typefaces: knob `typeface`, 6 values (OFL only)

Stacks are **strings in `src/lib/menu-design.ts`** (no `next/font` import there). Every `var()` has a fallback, and no stack references `--font-heading` or `--font-clash-display`.

```ts
const SANS  = "var(--font-inter, system-ui), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "var(--font-jetbrains-mono, ui-monospace), ui-monospace, SFMono-Regular, Menlo, monospace";
grotesk:        display "var(--font-space-grotesk, var(--font-inter, system-ui)), " + SANS
soft-serif:     display "var(--font-m-fraunces, Georgia), " + SERIF
book-serif:     display "var(--font-m-newsreader, Georgia), " + SERIF        (also the body face)
display-serif:  display "var(--font-m-instrument, Georgia), " + SERIF
bold-sans:      display "var(--font-m-bricolage, var(--font-space-grotesk, system-ui)), " + SANS
classic-serif:  display "var(--font-m-playfair, Georgia), " + SERIF
```

The table below gives size/line-height in px. Display and section weights are in the first rows.
- **"lg"** applies when the menu container is at least 42rem (672 px).
- **Item names** use the display face in every typeface.
- **Body** is Inter everywhere, except `book-serif`, which uses Newsreader.
- **Price** uses the body face with `tabular-nums lining-nums`. Price style `mono` switches it to `MONO` at weight 500 and 15/22.

| Role | grotesk | soft-serif | book-serif | display-serif | bold-sans | classic-serif |
|---|---|---|---|---|---|---|
| TR / EN label | Çağdaş / Contemporary | Sıcak / Warm | Zarif / Refined | Dergi / Magazine | Güçlü / Bold | Klasik serif / Classic serif |
| Family | Space Grotesk (existing) | Fraunces | Newsreader | Instrument Serif | Bricolage Grotesque | Playfair Display |
| Display (masthead name) | 34/38, lg 48/52, w500, −0.025em | 40/44, lg 60/62, w450, −0.02em | 40/44, lg 58/60, w400, −0.015em | 46/46, lg 68/66, w400, −0.01em | 36/38, lg 52/54, w700, −0.03em | 38/42, lg 56/58, w600, −0.01em |
| Banner/compact name | 28/32, lg 36/40 | 30/34, lg 40/44 | 30/34, lg 40/44 | 34/36, lg 44/46 | 28/32, lg 38/40 | 30/34, lg 40/44 |
| Section title | 22/28 w500 | 28/32 w500 | 28/32 w500 | 32/34 w400 | 24/28 w650 | 26/30 w600 |
| Item name (list/text) | 16/22 w500 −0.01em | 18/23 w500 | 18/23 w500 | 21/24 w400 | 17/22 w600 −0.01em | 18/23 w500 |
| Item name (grid) | 15/20 | 17/21 | 17/21 | 19/22 | 16/20 | 17/21 |
| Item name (feature) | 20/24 | 22/26 | 22/26 | 26/28 | 21/25 | 22/26 |
| Description | Inter 14/21 | Inter 14/21 | Newsreader 15/22 | Inter 14/21 | Inter 14/21 | Inter 14/21 |
| Price | Inter 600 16/22 | Inter 600 16/22 | Newsreader 500 17/22 | Inter 500 16/22 | Inter 700 16/22 | Inter 600 16/22 |
| Category description + tagline | Inter 14/21 normal | Fraunces *italic* 15/22 | Newsreader *italic* 16/23 | Instrument *italic* 17/22 | Inter 14/21 normal | Playfair *italic* 15/22 |

The following are fixed for all typefaces. **Nothing on a menu is smaller than 12 px.**

| Text | Size and style |
|---|---|
| Label / eyebrow | Inter 12/16, w600, uppercase, 0.12em, `muted` |
| Badge | 12/16, w500, sentence case |
| Allergen line | 13/19 |
| Meta (address, hours, phone) | 13/20 |
| Footer | 12/16, 0.08em |

Wrapping:
- Display and section text use `text-wrap: balance`.
- Items use `text-wrap: pretty`.
- All names use `overflow-wrap: anywhere`.

The scope sets `font-synthesis: none`. This rules out fake bold and fake italic: Instrument Serif is 400 only, and Space Grotesk and Bricolage have no italics, so italics are only ever used in the typefaces above that have real italic files.

### 3.3 Density: knob `density`

| Token | `airy` Ferah | `regular` Dengeli | `compact` Sıkı |
|---|---|---|---|
| `--m-row-py` (list/text row vertical padding) | 22px | 18px | 12px |
| `--m-section-gap` | 72px | 56px | 40px |
| `--m-thumb` (list thumb edge) | 96px | 84px | 64px |
| `--m-grid-gap` | 16px | 12px | 10px |
| `--m-clamp` (description lines in list/grid; feature always 3) | 3 | 2 | 2 |
| `--m-masthead-pt` / `--m-masthead-pb` | 64px / 48px | 48px / 36px | 32px / 24px |

Fixed values:
- Nav height `--m-nav-h`: 56px for pills, 52px for underline. PhonePreview's 64 px follow offset relies on this, so **never exceed 56**.
- Content max width: 680px for list, text and feature; 1040px for grid.
- Gutters are classes, not a variable: `px-5 @md/menu:px-6`.

### 3.4 Corners: knob `corners`

| Token | `sharp` Keskin | `soft` Yumuşak | `round` Yuvarlak |
|---|---|---|---|
| `--m-r-img` | 2px | 12px | 20px |
| `--m-r-card` | 4px | 16px | 24px |
| `--m-r-pill` | 6px | 999px | 999px |
| `--m-r-sheet` (top of sheet) | 12px | 24px | 28px |

The preset-only thumb shape overrides `--m-r-img` for list thumbs:
- `circle`: `999px`.
- `arch`: `999px 999px var(--m-r-img) var(--m-r-img)`, in a box of `--m-thumb` × `1.25·--m-thumb`.

### 3.5 Badges: knob `badges`

`sef_onerisi` is always the emphasised chip, in both styles:

```
bg-(--m-accent-fill) text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge)]
```

This replaces today's hard-coded Buaze lime-on-black.

**`quiet`** (Sade):
- Chip: `inline-flex h-6 items-center gap-1 rounded-(--m-r-pill) bg-(--m-surface-2) px-2 text-[12px] font-medium text-(--m-ink-2)`. `ink2` on `surface2` is ≥ 6.86 on every surface.
- The 12 px icon is tinted from a fixed per-scheme table. Verified minimums against `bg`, `surface` and `surface2`: light ≥ 3.78, dark ≥ 6.27.

| badge | light | dark | | badge | light | dark |
|---|---|---|---|---|---|---|
| populer | `#A15C07` | `#F2B84B` | | kahvalti | `#B4540A` | `#F6A85C` |
| yeni | `#1D4ED8` | `#8DB0FF` | | organik | `#166534` | `#6FD39A` |
| vegan | `#2F7A3A` | `#7FCF8C` | | taze | `#0E7490` | `#67D4EA` |
| vegetaryen | `#4D7C0F` | `#A8D66A` | | sezonluk | `#6D28D9` | `#C4A8FF` |
| aci | `#B42318` | `#FF8A7A` | | ev_yapimi | `#9F1239` | `#F59AB4` |
| glutensiz | `#8A5A00` | `#E3B65A` | | | | |

**`color`** (Renkli):
- Static, self-contained bg/fg pairs per scheme, with text checked against the chip's own background: light ≥ 6.15, dark ≥ 8.86.
- Light pairs are today's `BADGE_META` hues.
- Dark pairs add a 1 px border of `fg` at 30 %, written as a static 8-digit hex (for example `border-[#FCD34D4D]`).
- Dark classes apply through `group-data-[scheme=dark]/menu:`.

| badge | light bg / fg | dark bg / fg |
|---|---|---|
| populer | `#FFFBEB` / `#92400E` | `#2B2110` / `#FCD34D` |
| yeni | `#EFF6FF` / `#1E40AF` | `#14213D` / `#93C5FD` |
| vegan | `#F0FDF4` / `#166534` | `#102A1A` / `#86EFAC` |
| vegetaryen | `#EAF9B8` / `#4D5C00` | `#1F2A0E` / `#C6F24E` |
| aci | `#FEF2F2` / `#991B1B` | `#2E1414` / `#FCA5A5` |
| glutensiz | `#EAF9B8` / `#0A0A0A` | `#24300F` / `#D9F99D` |
| kahvalti | `#FFEDD5` / `#9A3412` | `#2E1C0E` / `#FDBA74` |
| organik | `#ECFDF5` / `#14532D` | `#0F2A20` / `#6EE7B7` |
| taze | `#ECFEFF` / `#155E75` | `#0E2A30` / `#67E8F9` |
| sezonluk | `#F5F3FF` / `#5B21B6` | `#221A3A` / `#C4B5FD` |
| ev_yapimi | `#FEF3C7` / `#854D0E` | `#2B2310` / `#FDE68A` |

Badge chips are sentence case, never uppercase.
- Grid cards show the first 2 badges plus a "+N" chip.
- List, text and feature cards show all badges.
- The product sheet always shows all badges.

---

## 4. Presets (12, exact defaults)

### 4.1 Knob defaults

- **family** is what `menuTheme` stores.
- The first 7 rows are the legacy themes. They render for every existing restaurant whose `menuDesign` is `NULL`.

| id | family | TR / EN | TR / EN vibe | surface | typeface | items | header | nav | cardStyle | density | corners | price | badges |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `classic` | classic | Klasik / Classic | Restoran · Aile / Restaurant · Family | white | grotesk | list | banner | pills | cards | regular | soft | accent | color |
| `modern` | modern | Modern / Modern | Fast food · Burger / Fast food · Burger | white | grotesk | grid | compact | pills | cards | regular | soft | accent | color |
| `elegant` | elegant | Şık / Elegant | Fine dining / Fine dining | ivory | book-serif | list | centered | underline | rows | airy | sharp | plain | quiet |
| `gastronomy` | gastronomy | Gastronomi / Gastronomy | Şef · Bar · Gece / Chef · Bar · Night | ink | display-serif | list | centered | pills | rows | airy | soft | accent | quiet |
| `minimal` | minimal | Minimal / Minimal | Cafe · Pastane / Cafe · Bakery | white | grotesk | list | compact | underline | rows | compact | sharp | mono | quiet |
| `bistro` | bistro | Bistro / Bistro | Bistro · Kahvaltı / Bistro · Brunch | cream | soft-serif | grid | centered | pills | cards | regular | round | plain | color |
| `pulse` | pulse | Pulse / Pulse | Grafit · Canlı vurgu / Graphite · Vivid accent | white | grotesk | list | banner | pills | cards | regular | soft | mono | color |
| `sokak` | modern | Sokak / Street | Burger · Döner · Pizza / Burger · Döner · Pizza | stone | bold-sans | feature | compact | pills | cards | compact | round | accent | color |
| `atelier` | bistro | Atölye / Atelier | Fırın · Kahve · Tatlı / Bakery · Coffee · Dessert | ivory | soft-serif | list | centered | pills | rows | airy | round | plain | quiet |
| `gallery` | modern | Galeri / Gallery | Brunch · Tatlı · Fotoğraflı / Brunch · Dessert · Photo-led | white | display-serif | grid | cover | underline | rows | regular | soft | plain | quiet |
| `meyhane` | elegant | Meyhane / Tavern | Meze · Rakı · Ocakbaşı / Meze · Grill · Tavern | cream | classic-serif | text | centered | underline | rows | regular | sharp | plain | quiet |
| `noir` | gastronomy | Gece / Noir | Kokteyl · Şarap · Bar / Cocktails · Wine · Bar | night | book-serif | text | centered | underline | rows | airy | sharp | accent | quiet |

### 4.2 Preset-only structure tokens (not owner knobs)

| id | section | thumbShape | thumbSide | gridAspect | priceOverlay | bannerTone | showCount | suggestedAccent |
|---|---|---|---|---|---|---|---|---|
| classic | rule | rounded | start | 1/1 | no | accent | no | — |
| modern | rule | rounded | end | 1/1 | yes | accent | no | — |
| elegant | chapter | rounded | end | 4/5 | no | accent | no | `#1F2937` |
| gastronomy | chapter | circle | end | 1/1 | no | accent | no | `#D97706` |
| minimal | plain | rounded | end | 1/1 | no | accent | yes | `#0A0A0A` |
| bistro | rule | rounded | end | 4/3 | no | accent | no | `#9A3412` |
| pulse | numbered | rounded | start | 1/1 | no | **ink** | no | `#C6F24E` |
| sokak | rule | rounded | end | 4/3 | yes | accent | no | `#E85A4F` |
| atelier | rule | **arch** | end | 4/5 | no | accent | no | `#D97706` |
| gallery | numbered | rounded | end | 4/5 | no | accent | no | `#1F2937` |
| meyhane | chapter | circle | end | 4/3 | no | accent | no | `#9A3412` |
| noir | numbered | circle | end | 4/3 | no | accent | no | `#D97706` |

Notes:
- **gridAspect** applies whenever `items = grid`. Every preset has one, because owners can switch any preset to grid. Feature media are always 4/3.
- **priceOverlay** applies only to grid and feature cards that have a photo.
- **suggestedAccent** is never applied automatically. The panel offers it as a one-tap chip, and every value is an existing swatch, so `findSwatch` names it.
- **Gallery order** in the panel (also the roving-focus order) is `MENU_PRESET_ORDER`: classic, modern, sokak, bistro, atelier, gallery, meyhane, elegant, gastronomy, noir, minimal, pulse.

### 4.3 What existing restaurants get with no action

| Theme | Today | After (still recognisably theirs) |
|---|---|---|
| Classic | Accent gradient with a black/35 overlay and white text (unreadable on light accents); accent mono price | A solid accent band with a sheen away from the text colour, and ink or white text chosen by contrast. Logo tile, bordered list cards, thumbs on the left. The price is Inter tabular in `accentText`. |
| Modern | 13 px names and 11 px descriptions; white-on-accent price badge | 15 px names and 14 px descriptions; the 2-column square grid stays; the price chip uses the fill / on-accent pair |
| Elegant | Space Grotesk with synthetic italics, failing muted, clipped centred nav | Newsreader with real italics; ivory paper; readable muted; a scrollable underline nav; hairline rows |
| Gastronomy | Glassy cards, accent text failing on ink, invisible active pill with dark accents | Instrument Serif on warm ink with a glow; hairline rows and circle thumbs; every accent role auto-lightened |
| Minimal | 9 px mono labels, `#A3A3A3` counts | Grotesk; 12 px labels; counts in `muted` (5.13); mono prices kept |
| Bistro | Cream, only the first badge, white pill nav | Fraunces on cream, rounded cards, all badges (2 + "+N" in grid) |
| Pulse | Buaze marketing copy in a customer menu ("MENÜ · PULSE", the slogan, a trailing "."), a 4 px sticky overlap, no hero when the menu is empty | An ink band with numbered sections, mono prices and an ECG glyph in the footer. No Buaze copy inside the restaurant's content. The header always renders. |

Every theme also gains:
- the page colour down to the bottom and under iOS overscroll;
- a per-restaurant `theme-color`;
- one sold-out treatment;
- monogram placeholders and a broken-image fallback;
- eager images above the fold;
- keyboard-operable cards and a focus-trapped sheet;
- a working active-category highlight and `menu_product_view` events for QR visitors.

---

## 5. Owner customisation model

### 5.1 Inputs

| Input | Stored in | Allowed values | Default | Group |
|---|---|---|---|---|
| Stil (preset) | `menuTheme` (family) + `menuDesign.preset` | 12 ids | `menuTheme` | — |
| Vurgu rengi | `menuAccentColor` | `#RRGGBB` (input may be `#RGB`; always stored as uppercase `#RRGGBB`) or `null` | `null` → `primaryColor` | — |
| Zemin | `menuDesign.surface` | §3.1 (8) | preset | style |
| Yazı karakteri | `menuDesign.typeface` | §3.2 (6) | preset | style |
| Ürünler | `menuDesign.items` | `list grid feature text` | preset | style |
| Üst alan | `menuDesign.header` | `banner centered cover compact` | preset | style |
| Kategori menüsü | `menuDesign.nav` | `pills underline` | preset | style |
| Ürün kutusu | `menuDesign.cardStyle` | `cards rows` | preset | style |
| Yoğunluk | `menuDesign.density` | `airy regular compact` | preset | style |
| Köşeler | `menuDesign.corners` | `sharp soft round` | preset | style |
| Fiyat | `menuDesign.price` | `plain accent mono` | preset | style |
| Rozetler | `menuDesign.badges` | `quiet color` | preset | style |
| Slogan | `menuDesign.tagline` | plain text, 1–80 chars after sanitising | none | content |
| Menü logosu | `menuLogoUrl` | unchanged rules | — | — |
| Kapak fotoğrafı | `menuCoverUrl` (+ server-written `menuCoverVersion`) | raster data URL ≤ 520,000 chars, or `null` (no http, no SVG) | `null` | — |

Allergens are not a knob: they always render (safety). `header = cover` with no cover photo renders as `centered`.

### 5.2 Precedence (pure, deterministic; `src/lib/menu-design.ts`)

```
family   = MENU_THEMES.includes(row.menuTheme) ? row.menuTheme : 'classic'
design   = readMenuDesign(row.menuDesign)                              // tolerant, never throws
presetId = design && PRESETS[design.preset].family === family ? design.preset : family   // effectivePresetId()
knobs    = { ...PRESETS[presetId].knobs, ...styleKnobsOf(design) }     // only keys present in design
tagline  = design?.tagline ?? null                                     // content survives a preset mismatch
accent   = normaliseHex(row.menuAccentColor ?? '') ?? normaliseHex(row.primaryColor ?? '') ?? '#1A73E8'
header   = knobs.header === 'cover' && !hasCover ? 'centered' : knobs.header
```

A mismatched preset is still a valid render. This happens when an admin changed `menuTheme`, or when a row was written before a deploy.

### 5.3 Normalisation (client and server use the same function)

`normalizeMenuDesign(family, d)`:
1. If `d` is null, return null.
2. Drop every style knob whose value equals `PRESETS[d.preset].knobs[key]`. Choosing the preset's default is the same as "not overridden".
3. Keep `tagline` only if it is non-empty after `sanitizeTagline`.
4. If `d.preset === family`, no knobs remain and there is no tagline, return `null`.
5. Otherwise return `{ v: 1, preset, ...remaining }` with keys in the canonical order: `v, preset, surface, typeface, items, header, nav, cardStyle, density, corners, price, badges, tagline`.

`designKey(d)` returns `'null'` or `JSON.stringify` of the canonical object. A pure legacy look is always stored as SQL `NULL`, so `themeDiff` never reports a false dirty state.

### 5.4 Studio semantics

- **Picking a preset** sets `menuTheme = PRESETS[id].family` and `menuDesign = normalize({ v: 1, preset: id, tagline: currentTagline })`. It **clears the style knobs and keeps the tagline** (content).
  - If knobs were dropped, an inline note offers **Geri al**. That restores the previous `menuTheme` and `menuDesign` *locally only*; nothing is saved until Uygula.
- **"Bu stilin varsayılanlarına dön"** clears every style knob and keeps the tagline. It is disabled when no knob is overridden.
- **Picking a knob value equal to the preset default** deletes the key, through normalisation.
- **Accent, logo and cover** are never touched by preset switches or resets.

---

## 6. Data model

### 6.1 Prisma (`prisma/schema.prisma`, model `Restaurant`, table `restaurants`)

```prisma
  // Menu design (2026-11): versioned JSON of enumerated choices, read with
  // readMenuDesign (src/lib/menu-design.ts). NULL = the refreshed look of menuTheme.
  menuDesign       Json?    @map("menu_design")
  // Optional menu cover: raster data URL (CLAUDE.md §3), served only via
  // /api/menu/[slug]/img/cover. The version is a content hash written with it,
  // so the public page never loads the blob to build the URL.
  menuCoverUrl     String?  @map("menu_cover_url") @db.Text
  menuCoverVersion String?  @map("menu_cover_version")
```

### 6.2 Migration: `prisma/migrations/20261121090000_menu_design/migration.sql`

```sql
-- Menu design presets + knobs + cover. Additive and nullable: NULL = the legacy
-- look of menu_theme, so existing restaurants need no action.
ALTER TABLE "restaurants" ADD COLUMN "menu_design" JSONB;
ALTER TABLE "restaurants" ADD COLUMN "menu_cover_url" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "menu_cover_version" TEXT;

-- Expand legacy #RGB accents to uppercase #RRGGBB (isValidHexColor accepted #RGB and
-- several routes stored it as-is). Produces values old code already accepts.
UPDATE "restaurants"
SET "menu_accent_color" = upper('#' || repeat(substr("menu_accent_color", 2, 1), 2)
                                    || repeat(substr("menu_accent_color", 3, 1), 2)
                                    || repeat(substr("menu_accent_color", 4, 1), 2))
WHERE "menu_accent_color" ~ '^#[0-9A-Fa-f]{3}$';
```

- The migration is committed and applied by `prisma migrate deploy` (no `db:push`).
- It is safe on the shared preview/production database: old code ignores the new nullable columns.
- Write SQL `NULL` into the JSON column with **`Prisma.DbNull`**, never `Prisma.JsonNull`.

**Why one JSON column:** the knobs are presentation-only and never queried. They map to one atomic, versioned value that fits the one-PATCH Apply flow, and new knobs need no migration and no new `ThemeSync` key. **Why the cover is separate:** a blob of about 0.5 MB must not be stringified on every diff, and it is served by the image route with its own version.

### 6.3 Legacy mapping (no owner action)

| Stored | Rendered as |
|---|---|
| `menuTheme` is one of the 7 ids | That preset's refreshed defaults (§4) |
| `menuTheme` is invalid | `classic` |
| `menuDesign` is null, JSON null, not an object, an array, or `v ≠ 1` | Pure preset |
| `menuDesign` with an unknown or invalid preset | Pure preset (the whole design, tagline included, is ignored) |
| `menuDesign` with an invalid single knob or an unknown key | That knob or key is dropped; the rest applies |
| `menuDesign.preset` from another family | The family's own preset plus knob overrides plus the tagline |
| `menuAccentColor` null or empty | `primaryColor`, normalised; if invalid, `#1A73E8` |
| `menuAccentColor` `#RGB` | Expanded by the migration and by `normaliseHex` on read |
| `menuCoverVersion` null | No cover; `header: cover` renders `centered` |

Unchanged:
- **The QR:** `menuAccentColor ?? primaryColor` through `ensureScannableDark` at 3.0.
- **The legacy `/r/[slug]/menu`** and its `/api/menu/[slug]` JSON.

---

## 7. Pure modules (chunk 1)

### 7.1 `src/lib/menu-design.ts`

This module is pure and client-safe: **no zod, no React, no next/font, no Prisma**. It imports `MENU_THEMES` from `@/lib/validations` and the palette from `./menu-palette`.

```ts
export const MENU_DESIGN_VERSION = 1 as const;
export const MENU_TAGLINE_MAX = 80;
export const MENU_PRESETS = ['classic','modern','elegant','gastronomy','minimal','bistro','pulse',
                             'sokak','atelier','gallery','meyhane','noir'] as const;
export const MENU_PRESET_ORDER: readonly MenuPresetId[] = ['classic','modern','sokak','bistro','atelier','gallery',
                                                           'meyhane','elegant','gastronomy','noir','minimal','pulse'];
export const MENU_SURFACES   = ['white','ivory','cream','stone','sage','ink','night','forest'] as const;
export const MENU_TYPEFACES  = ['grotesk','soft-serif','book-serif','display-serif','bold-sans','classic-serif'] as const;
export const MENU_ITEM_LAYOUTS = ['list','grid','feature','text'] as const;
export const MENU_HEADERS    = ['banner','centered','cover','compact'] as const;
export const MENU_NAVS       = ['pills','underline'] as const;
export const MENU_CARD_STYLES = ['cards','rows'] as const;
export const MENU_DENSITIES  = ['airy','regular','compact'] as const;
export const MENU_CORNERS    = ['sharp','soft','round'] as const;
export const MENU_PRICE_STYLES = ['plain','accent','mono'] as const;
export const MENU_BADGE_STYLES = ['quiet','color'] as const;
export const MENU_KNOB_KEYS = ['surface','typeface','items','header','nav','cardStyle',
                               'density','corners','price','badges'] as const;   // canonical order

export interface MenuKnobs { surface; typeface; items; header; nav; cardStyle; density; corners; price; badges }  // enum-typed
export interface MenuDesign extends Partial<MenuKnobs> { v: 1; preset: MenuPresetId; tagline?: string }

export const SURFACES: Record<MenuSurface, SurfaceDef>;                  // §3.1
export const TYPEFACES: Record<MenuTypeface, TypefaceDef>;               // §3.2 (stacks, weights, sizes, italic flag)
export const DENSITIES: Record<MenuDensity, DensityDef>;                 // §3.3
export const CORNERS: Record<MenuCorners, CornersDef>;                   // §3.4
export const PRESETS: Record<MenuPresetId, PresetDef>;                   // §4.1 + §4.2 (family, knobs, structure, suggestedAccent)
export const MENU_PRESET_LABELS: Record<MenuPresetId, { tr: string; en: string; vibeTr: string; vibeEn: string }>; // §4.1
export const QUIET_BADGE_HUES, COLOR_BADGE_PAIRS;                        // §3.5

export function sanitizeTagline(raw: unknown): string | null;
export function readMenuDesign(raw: unknown): MenuDesign | null;
export function effectivePresetId(menuTheme: string | null | undefined, d: MenuDesign | null): MenuPresetId;
export function normalizeMenuDesign(family: MenuTheme, d: MenuDesign | null): MenuDesign | null;
export function designKey(d: MenuDesign | null): string;
export function countOverrides(d: MenuDesign | null): number;           // style knobs present (admin line)
export function resolveMenuDesign(input: {
  menuTheme: string | null | undefined; menuAccentColor: string | null | undefined;
  primaryColor: string | null | undefined; menuDesign: unknown; hasCover: boolean;
}): ResolvedMenuDesign;
export const STYLE_VALUE_RE: RegExp;                                     // for tests (§7.4)
```

**`sanitizeTagline(raw)`**: if `raw` is not a string, return null. Otherwise, in order:
1. `normalize('NFC')`.
2. Replace `\p{Cc}`, `\p{Cf}`, U+2028 and U+2029 with a space.
3. Collapse whitespace.
4. Trim.

Return null if the result is empty or longer than `MENU_TAGLINE_MAX` (80). The tagline is rendered as a React text node only: never in `dangerouslySetInnerHTML` and never in an attribute other than `title`.

**`readMenuDesign(raw)`** never throws:
- non-object, array, or `v !== 1` → `null` (a future v2 adds an upgrade branch here);
- a missing or unknown `preset` → `null`;
- each knob is copied only if its value is in its enum;
- `tagline` goes through `sanitizeTagline`;
- unknown keys are ignored.

### 7.2 `src/lib/menu-design-schema.ts` (zod 4; routes and tests only, never imported by client code)

```ts
import { z } from 'zod';
import { normaliseHex } from './qr-colors';
import { MENU_PRESETS, MENU_SURFACES, …, MENU_TAGLINE_MAX, sanitizeTagline } from './menu-design';

const tagline = z.string().max(400)
  .transform((s) => sanitizeTagline(s))
  .refine((s): s is string => s !== null, 'invalid_tagline');      // empty after sanitising → reject (send no key instead)

export const MenuDesignWriteSchema = z.strictObject({
  v: z.literal(1),
  preset: z.enum(MENU_PRESETS),
  surface: z.enum(MENU_SURFACES).optional(),
  typeface: z.enum(MENU_TYPEFACES).optional(),
  items: z.enum(MENU_ITEM_LAYOUTS).optional(),
  header: z.enum(MENU_HEADERS).optional(),
  nav: z.enum(MENU_NAVS).optional(),
  cardStyle: z.enum(MENU_CARD_STYLES).optional(),
  density: z.enum(MENU_DENSITIES).optional(),
  corners: z.enum(MENU_CORNERS).optional(),
  price: z.enum(MENU_PRICE_STYLES).optional(),
  badges: z.enum(MENU_BADGE_STYLES).optional(),
  tagline: tagline.optional(),
});

/** #RGB or #RRGGBB in, uppercase #RRGGBB out (Undo of legacy #RGB rows keeps working). */
export const AccentWrite = z.string().transform((s) => normaliseHex(s)).refine((s): s is string => s !== null, 'invalid_hex_color');

export const MENU_COVER_MAX_CHARS = 520_000;            // upload route caps the cover at 380 KB binary ≈ 519k base64
const RASTER_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|avif);base64,/i;
export const CoverWrite = z.union([
  z.null(),
  z.literal('').transform(() => null),
  z.string().max(MENU_COVER_MAX_CHARS).regex(RASTER_DATA_URL, 'IMAGE_FORMAT'),
]);
```

### 7.3 `src/lib/menu-palette.ts`: contrast resolver (pure)

This module imports `contrastRatio` and `normaliseHex` from `@/lib/qr-colors`, and follows the style of `survey-accent.ts`. `qr-colors.ts` is not edited.

```ts
export const ON_DARK = '#141210', WHITE = '#FFFFFF', BLACK = '#000000';
export const TEXT_MIN = 4.5, UI_MIN = 3, FILL_VISIBLE_LIGHT = 1.15, FILL_VISIBLE_DARK = 3, NAV_WORST_MIX = 0.08;

export function mixHex(a: string, b: string, t: number): string   // per-channel sRGB lerp a→b, rounded, uppercase #RRGGBB
export function ensureAll(fg, refs: string[], min, toward): { color; adjusted }
  // first i in 0..50 with min over refs of contrast(mixHex(fg, toward, i/50), ref) >= min;
  // i = 50 is the extreme (black on light surfaces / white on dark), so the function is total.
export function readableOn(fill): string   // contrast(ON_DARK, fill) >= contrast(WHITE, fill) ? ON_DARK : WHITE

export function resolveAccentRoles(accent: string, s: SurfaceDef, bannerTone: 'accent' | 'ink'): AccentRoles
  toward   = s.scheme === 'light' ? BLACK : WHITE
  navWorst = mixHex(s.bg, toward, NAV_WORST_MIX)
  accentText = ensureAll(accent, [s.bg, s.surface], TEXT_MIN, toward)
  accentUi   = ensureAll(accent, [s.bg, s.surface, navWorst], UI_MIN, toward)

  // fill + text on it
  fill = accent; inkPill = false
  light: if contrast(fill, s.bg) < FILL_VISIBLE_LIGHT → fill = s.ink; inkPill = true
  dark:  if contrast(fill, s.bg) < FILL_VISIBLE_DARK  → fill = ensureAll(fill, [s.bg], 3, WHITE).color
  on = inkPill ? (contrast(accent, s.ink) >= TEXT_MIN ? accent : WHITE) : readableOn(fill)
  if contrast(on, fill) < TEXT_MIN:                                   // mid-luminance band, e.g. #A26F33
     dk = first i: contrast(WHITE,   mixHex(fill, BLACK, i/50)) >= TEXT_MIN
     lt = first i: contrast(ON_DARK, mixHex(fill, WHITE, i/50)) >= TEXT_MIN
     (fill, on) = dk.i <= lt.i ? (mix(fill, BLACK, dk.i/50), WHITE) : (mix(fill, WHITE, lt.i/50), ON_DARK)
  accentEdge = contrast(fill, s.bg) >= UI_MIN ? fill : accentUi.color

  accentSoft   = mixHex(accent, s.bg, s.scheme === 'light' ? 0.88 : 0.82)
  onAccentSoft = s.ink
  accentMark   = ensureAll(accent, [accentSoft], UI_MIN, toward).color    // monogram letters are ≥ 24 px (large text)

  bannerTone 'ink' → banner = (s.scheme === 'light' ? ON_DARK : s.surface2), onBanner = readableOn(banner)
  otherwise        → (banner, onBanner) = (fill, on)
  bannerEnd = mixHex(banner, lum(onBanner) > lum(banner) ? BLACK : WHITE, 0.12)   // sheen moves AWAY from the text
  glow  = s.scheme === 'dark' ? mixHex(accentUi.color, s.bg, 0.80) : s.bg        // decorative
  focus = accentUi.color
  adjusted = { text: accentText ≠ accent, ui: accentUi ≠ accent, fill: fill ≠ accent,
               banner: bannerTone === 'accent' && banner ≠ accent }
```

**Verified.** The guarantees below were checked over 7,102 accents:
- the full 16³ grid in steps of 17;
- 3,000 seeded random colours;
- the edge cases `#A26F33`, `#F5F5F5`, `#EAF9B8`, `#777777`, `#808080` and `#123`.

Each accent was run against all 8 surfaces and both banner tones, with **0 failures**. The worst values over that set:

| Guarantee | Floor | Worst value |
|---|---|---|
| `accentText` vs `bg` and `surface` | ≥ 4.5 | 4.50 |
| `accentUi` vs `bg`, `surface` and `navWorst` | ≥ 3 | 3.00 |
| `onAccent` vs `fill` | ≥ 4.5 | 4.50 |
| `accentEdge` vs `bg` | ≥ 3 | 3.00 |
| `onBanner` vs `banner` and `bannerEnd` | ≥ 4.5 | 4.50 |
| `onAccentSoft` vs `accentSoft` | ≥ 4.5 | 9.11 |
| `accentMark` vs `accentSoft` | ≥ 3 | — |

**Where each role is used.** The raw accent is never used as text or as a fill outside these roles.

| Element | Role |
|---|---|
| Price with style "Renkli", section numbers, links | `accentText` |
| Active underline, section rule, masthead rule, splash progress, focus ring | `accentUi` / `focus` |
| Active pill, chef's pick chip, monogram logo tile, price overlay chip | `accentFill` + `onAccent` + `accentEdge` |
| Banner masthead and banner splash | `banner` / `bannerEnd` / `onBanner` |
| Missing-photo monogram | `accentSoft` + `accentMark` |
| Dark-surface masthead glow | `glow` (decorative) |

**Reference outcomes** (these are also fixtures for tests §7.5). Each cell gives text / ui / fill → on.

| Accent | On `white` | On `ink` | On `night` |
|---|---|---|---|
| Lime `#C6F24E` | `#677E29` / `#738C2D` / `#C6F24E` → `#141210` 14.43, edge `#738C2D` | unchanged / unchanged / lime → `#141210` | unchanged |
| Coral `#E85A4F` | `#C84D44` / `#E3584D` / coral → `#141210` 5.35 | unchanged | unchanged |
| Amber `#D97706` | `#B26205` / `#C86D06` / amber → `#141210` 5.87 | unchanged | unchanged |
| Brick `#9A3412` | unchanged → `#FFFFFF` 7.31 | `#B66D54` / `#AA5438` / `#A24425` → `#FFFFFF` | `#B87159` / … |
| Black `#0A0A0A` | unchanged → `#FFFFFF` 19.80 | `#808080` / `#6C6C6C` / `#626262` → `#FFFFFF` 6.10 | `#858585` / `#717171` / `#626262` |
| Charcoal `#1F2937` | unchanged | `#7D838B` / `#676D77` / `#59616B` → `#FFFFFF` | `#7D838B` / … |
| Sky `#0EA5E9` | `#0B7DB1` / `#0C8EC8` / sky → `#141210` 6.74, edge `#0C8EC8` | unchanged | unchanged |
| Blue `#1D4ED8` | unchanged → `#FFFFFF` 6.70 | `#587CE2` / `#3863DD` / `#2252D9` | `#5C80E3` / `#3D67DD` / `#2655DA` |
| Violet `#8B5CF6` | `#8558EC` / unchanged / `#8D5FF6` → `#141210` 4.54 (nudged) | `#9063F6` / unchanged / `#8D5FF6` | `#9266F7` / … |
| Pink `#BE185D` | unchanged → `#FFFFFF` 6.04 | `#D0598A` / `#C52F6D` / pink | `#D0598A` / … |
| Default `#1A73E8` | unchanged → `#FFFFFF` 4.51 | `#2C7EEA` / unchanged / unchanged | `#3181EA` / … |

On **cream**:
- **Lime:** the fill falls back to an ink pill `#241D14`, and the text **stays lime** (`#C6F24E`, 12.86). The band becomes an ink band with lime text.
- **Default blue:** the text becomes `#1768D1`.

### 7.4 `ResolvedMenuDesign` and the style contract

```ts
interface ResolvedMenuDesign {
  presetId: MenuPresetId; family: MenuTheme; scheme: 'light' | 'dark';
  knobs: MenuKnobs;                       // effective
  structure: { header /* effective, cover→centered */; section; thumbShape; thumbSide; gridAspect;
               priceOverlay; bannerTone; showCount };
  tagline: string | null;
  typeface: TypefaceDef;                  // for italic flag etc.
  colors: { bg; surface; surface2; ink; ink2; muted; rule; ruleStrong; accent; accentText; accentUi;
            accentFill; onAccent; accentEdge; accentSoft; onAccentSoft; accentMark;
            banner; bannerEnd; onBanner; glow; focus };
  adjusted: { text: boolean; ui: boolean; fill: boolean; banner: boolean };
  themeColor: string;                     // structure.header === 'banner' ? banner : bg
  style: MenuScopeStyle;                  // the ONLY design object written into the DOM
}
```

`style` is built only from enum tables and the normalised hex output of the resolver. Its keys are a closed TypeScript union.

- **Fonts.** These are the `MenuFontScope` contract:
  - `--font-heading: 'var(--font-menu-heading)'`, `--font-menu-heading` (display stack);
  - families: `--m-font-body`, `--m-font-item`, `--m-font-price`, `--m-font-catdesc`, `--m-catdesc-style`;
  - weights: `--m-fw-display`, `--m-fw-section`, `--m-fw-item`, `--m-fw-price`;
  - display and name sizes: `--m-fs-display`, `--m-lh-display`, `--m-fs-display-lg`, `--m-lh-display-lg`, `--m-track-display`, `--m-fs-name`, `--m-lh-name`, `--m-fs-name-lg`, `--m-lh-name-lg`;
  - section and item sizes: `--m-fs-section`, `--m-lh-section`, `--m-fs-item`, `--m-lh-item`, `--m-fs-item-grid`, `--m-lh-item-grid`, `--m-fs-item-feature`, `--m-lh-item-feature`, `--m-track-item`;
  - description, category description and price sizes: `--m-fs-desc`, `--m-lh-desc`, `--m-fs-catdesc`, `--m-lh-catdesc`, `--m-fs-price`, `--m-lh-price`.
- **Colours:** `--m-bg`, `--m-surface`, `--m-surface-2`, `--m-ink`, `--m-ink-2`, `--m-muted`, `--m-rule`, `--m-rule-strong`, `--m-accent-text`, `--m-accent-ui`, `--m-accent-fill`, `--m-on-accent`, `--m-accent-edge`, `--m-accent-soft`, `--m-on-accent-soft`, `--m-accent-mark`, `--m-banner`, `--m-banner-end`, `--m-on-banner`, `--m-glow`, `--m-focus`.
- **Shape and rhythm:** `--m-row-py`, `--m-section-gap`, `--m-thumb`, `--m-grid-gap`, `--m-clamp`, `--m-masthead-pt`, `--m-masthead-pb`, `--m-nav-h`, `--m-r-img`, `--m-r-card`, `--m-r-pill`, `--m-r-sheet`.
- **Plain property:** `colorScheme: 'light' | 'dark'`.

**`STYLE_VALUE_RE`** (a test asserts every value matches it, or equals one of the `TYPEFACES` stack literals):

```
^(#[0-9A-F]{6}|-?\d+(\.\d+)?(px|em)?|\d+px \d+px \d+px \d+px|999px 999px \d+px \d+px|normal|italic|light|dark|var\(--[a-z0-9-]+\))$
```

No value may contain `;`, `{`, `}`, `<`, `>`, `url(` or `expression`. The resolver is deterministic: it uses no `Date`, no randomness and no locale calls, so SSR and hydration match.

### 7.5 Resolver test cases (`tests/menu-design.test.ts`, `tests/menu-palette.test.ts`)

| # | Input | Expected |
|---|---|---|
| R1 | `classic`, design null, accent null, primary `'#1a73e8'` | presetId `classic`; accent `#1A73E8`. accentText, accentUi and fill all `#1A73E8`; onAccent `#FFFFFF`; banner `#1A73E8`; onBanner `#FFFFFF`. themeColor `#1A73E8`; every `adjusted.*` false; header `banner`; surface `white`. |
| R2 | `classic`, accent `#C6F24E` | accentText `#677E29`, accentUi `#738C2D`, fill `#C6F24E`, onAccent `#141210`, accentEdge `#738C2D`; adjusted.text true, fill false |
| R3 | `bistro` (cream), accent `#C6F24E` | fill `#241D14`, onAccent `#C6F24E`, adjusted.fill true |
| R4 | `gastronomy` (ink), accent `#0A0A0A` | accentText `#808080`, accentUi `#6C6C6C`, fill `#626262`, onAccent `#FFFFFF` |
| R5 | `classic`, accent `#8B5CF6` | fill `#8D5FF6`, onAccent `#141210`, contrast ≥ 4.5 |
| R6 | accent `#abc` vs `#AABBCC` | deep-equal results |
| R7 | accent `'nope'`, primary `'x'` | accent `#1A73E8` |
| R8 | `menuTheme: 'bogus'` | family `classic`, presetId `classic` |
| R9 | `menuTheme: 'modern'`, design `{v:1,preset:'sokak'}` | presetId `sokak`, surface `stone`, items `feature` |
| R10 | `menuTheme: 'classic'`, design `{v:1,preset:'sokak',density:'airy',tagline:'Ev'}` | presetId `classic`; density `airy`; tagline `'Ev'` |
| R11 | `gallery`, hasCover false / true | structure.header `centered` / `cover` |
| R12 | `pulse`, default accent | banner `#141210`, onBanner `#FFFFFF`, themeColor `#141210` |
| R13 | `noir` (night), accent `#1D4ED8` | accentText `#5C80E3` |
| R14 | design `{v:1,preset:'classic',surface:'ink'}` | scheme `dark`, colorScheme `dark`, bg `#0F0E0D` |
| R15 | Fuzz: the §7.3 set × 8 surfaces × 2 banner tones | every invariant in §7.3; every colour matches `^#[0-9A-F]{6}$` |
| R16 | Static tokens | for every surface: ink/ink2 ≥ 4.5 vs bg, surface, surface2 and navWorst; muted ≥ 4.5 vs bg, surface, surface2; ruleStrong ≥ 3. Badge hues meet §3.5. `ink2` vs `surface2` ≥ 4.5. Colour-badge pairs ≥ 4.5. |
| R17 | Any input | `style` values match `STYLE_VALUE_RE` or a stack literal; the result is deep-equal on a repeat call |

---

## 8. API and validation (chunk 1)

### 8.1 Owner `PATCH /api/restaurants/[id]/theme`: rewrite

```ts
const ThemePatch = z.strictObject({
  menuTheme: z.enum(MENU_THEMES).optional(),
  menuAccentColor: z.union([z.null(), AccentWrite]).optional(),
  menuLogoUrl: <unchanged rules: raster data URL ≤ 300,000 | http(s) ≤ 1000 | '' or null → null; SVG rejected>,
  menuDesign: MenuDesignWriteSchema.nullable().optional(),
  menuCoverUrl: CoverWrite.optional(),
}).refine((b) => Object.keys(b).length > 0, 'empty_body');
```

Order of operations:
1. `requireMenuModuleAccess(req, id)`. This is unchanged: a viewer gets 403 `forbidden_role`, a disabled module gets 403 `MENU_MODULE_DISABLED`, and admins bypass.
2. `await rateLimit(`menu-theme:${id}`, 30, 60_000)`. If not allowed, return 429 `{ error: 'RATE_LIMITED' }`. `mapMenuApiError` already maps 429.
3. If `content-length` > 900,000, return 413 `{ error: 'PAYLOAD_TOO_LARGE' }`. The 413 is already mapped.
4. Parse the JSON, then `validateBody(ThemePatch, body)`. Unknown keys get a 400 `validation_error`. This is intentional: `ThemeSync` confirms keys on `r.ok`, so an unpersisted key must fail loudly.
5. If `menuDesign` is present:
   - `family = body.menuTheme ?? (await prisma.restaurant.findUnique({ where:{id}, select:{ menuTheme:true } }))?.menuTheme`, clamped to `MENU_THEMES`.
   - If the design is non-null and `PRESETS[design.preset].family !== family`, return **409 `{ error: 'DESIGN_CONFLICT' }`**.
   - `data.menuDesign = normalizeMenuDesign(family, design) ?? Prisma.DbNull`.
6. If `menuCoverUrl` is present: set `data.menuCoverUrl = v`, and `data.menuCoverVersion = v ? contentVersion(v) : null`. `contentVersion` comes from `src/lib/menu-image-url.ts`.
7. Run `prisma.restaurant.update({ where:{id}, data, select:{ id:true, menuTheme:true, menuAccentColor:true, menuDesign:true, menuCoverVersion:true } })`. **No blobs are echoed.**
8. `await touchMenuUpdated(id)`.
9. Respond with that object.

The stale error copy ("classic, modern, elegant veya gastronomy") goes away.

### 8.2 Admin `PATCH /api/admin/restaurants/[id]/menu-theme`

- Keep `z.enum(MENU_THEMES)`. The admin `THEME_LABEL(S)` maps stay at 7.
- `menuAccentColor`: `AccentWrite.nullable()`, normalised.
- Add `menuDesign: z.null().optional()` and `menuCoverUrl: z.null().optional()`. These are reset and remove only: admins do not design for owners. A null cover also writes `menuCoverVersion: null`, and a null design writes `Prisma.DbNull`.
- **Family consistency:**
  - When the body changes `menuTheme`, read the stored `menuDesign`.
  - If it exists and its preset's family is not the new `menuTheme`, write `normalizeMenuDesign(newTheme, { ...readMenuDesign(stored), preset: newTheme })`, which keeps the owner's knobs and tagline.
  - The render-time guard (§5.2) stays as a defence.
- Keep mirroring the accent and logo into `BrandSettings`, and keep `revalidatePublicMenu`.

### 8.3 `PUT /api/settings/brand`

When mirroring `accentColor` to `menuAccentColor`:
- store `normaliseHex(value)`;
- after the mirror, call `revalidatePublicMenu(slug)` (add `slug` to that route's select).

Nothing else is mirrored: `BrandSettings.accentFont` and `coverImageUrl` are **not** used by menus.

### 8.4 Image route `GET /api/menu/[slug]/img/[itemId]`

Add an `itemId === 'cover'` branch next to `logo`:

```ts
prisma.restaurant.findFirst({ where: publishedRestaurant, select: { menuCoverUrl: true } })
```

The rest of the pipeline is unchanged:
- raster only, `nosniff`;
- 404 is `no-store`;
- http(s) → 302 `no-store`;
- 1-year immutable cache.

Item ids are cuids, so the literal `cover` cannot collide.

### 8.5 `src/lib/menu-api-error.ts`

Add `DESIGN_CONFLICT`:
- TR: "Görünüm başka bir yerden değişti. Sayfayı yenileyip tekrar dene."
- EN: "The design was changed somewhere else. Refresh the page and try again."

### 8.6 Not changed

- `POST /api/restaurants/[id]/menu/upload` (it already supports `cover` at 1600×900 with a 380 KB cap).
- `GET /api/restaurants/[id]` (`include` brings the new columns).
- `GET /api/menu/[slug]` (legacy JSON).
- The QR route.
- `src/lib/validations.ts` (`MENU_THEMES` stays at 7).

---

## 9. Public renderer, file by file (chunk 2)

### 9.1 DOM structure (overlays outside the container)

```tsx
<div data-menu-root data-scheme={d.scheme} lang={locale}
     className={`${MENU_FONT_VARIABLES} group/menu relative flex min-h-full flex-1 flex-col bg-(--m-bg) text-(--m-ink) [font-family:var(--m-font-body)] [font-synthesis:none] antialiased`}
     style={d.style}>                                         {/* = MenuScope; replaces MenuFontScope, same contract */}
  <div ref={canvasRef} data-menu-canvas inert={inertCanvas || undefined}
       className="@container/menu flex flex-1 flex-col">
    <a href="#menu-main" className="sr-only focus:not-sr-only …">{copy.skip}</a>
    <Masthead/> {empty ? <EmptyMenu/> : <><CategoryNav/><main id="menu-main">…sections…</main></>} <MenuFooter/>
  </div>
  {splashOn && <MenuSplash/>}                                 {/* sibling of the container: fixed works */}
  {detailItem && <ProductDetailModal/>}                       {/* sibling; its fixed wrapper is @container/sheet */}
</div>
```

- `container-type` can make the container element the containing block for `position: fixed` descendants. That is why the splash and the sheet are **siblings** of the canvas, never inside it. They still inherit the variables and fonts from `data-menu-root`.
- In PhonePreview, the viewport's `contain: layout paint` keeps confining them to the phone, as today.
- `inertCanvas = (mounted && splashOn) || detailItem !== null`. `mounted` is set in an effect, so **`inert` is never in the SSR HTML**: if JavaScript fails, the menu stays usable after the CSS hides the splash.

### 9.2 `src/components/menu/PublicMenuView.tsx`: orchestrator (rewritten)

- **Exports and types unchanged:**
  - default `PublicMenuView`;
  - `MenuItemView`, `MenuCategoryView` (unchanged);
  - `RestaurantView`, plus `menuDesign?: MenuDesign | null` and `menuCoverUrl?: string | null` (both optional, added by chunk 1).
- **Props:** `{ restaurant, categories, locale = 'tr', disableAnalytics, initialSplash? }`.
- **Filtering is unchanged:** a category shows if `isVisible && items.some(isAvailable)`; items are filtered to `isAvailable` and sorted by `sortOrder`. Rows with `tmp_…` and `__draft__` ids render like any other.
- **`d = useMemo(() => resolveMenuDesign({...}), [menuTheme, menuAccentColor, primaryColor, menuDesign, !!menuCoverUrl])`.**
- **Hook order is an invariant.** Comment it in the code: `useMenuAnalytics` is called **first**, so its source-detection effect runs before the effect below strips `?source=qr`.

  ```ts
  const [splashOn, setSplashOn] = useState(Boolean(initialSplash) && !disableAnalytics);
  useEffect(() => {                    // declared AFTER useMenuAnalytics
    const params = new URLSearchParams(window.location.search);
    if (disableAnalytics || params.get('source') !== 'qr') return;
    params.delete('source');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    if (!initialSplash) setSplashOn(true);                     // client-only mount fallback
  }, [disableAnalytics, initialSplash]);
  ```

  The `splashReady` two-phase render is deleted. The document is **always mounted**, which fixes the dead IntersectionObservers and the missing `menu_product_view` events for QR visitors.
- **Analytics:**
  - `trackMenuView` fires on mount (unchanged).
  - Product views use `useProductViewTracking({ enabled: analyticsEnabled && !splashOn, … })`. Products under the splash are not counted, and the effect re-observes the same nodes when the splash ends.
  - Category click → `trackCategoryClick`. Product click → `setDetailItem` + `trackProductClick`.
  - `disableAnalytics` turns off tracking **and** the splash.
- **Active-category observer.** Unchanged `rootMargin: '-40% 0px -55% 0px'`, but it queries `canvasRef.current.querySelectorAll('[data-cat-id]')`. On a nav click, set the active id at once and ignore observer updates for 900 ms, so a smooth scroll does not flicker the nav through intermediate sections.
- **Delete** the 7 `*Layout` functions, `BadgeChipOnDark`, `Placeholder`, `MenuFontScope`, every `${accent}xx` concatenation and every viewport `sm:` class.

### 9.3 New files in `src/components/menu/`

None of these files may use viewport breakpoints. Use `@sm/menu:`, `@md/menu:`, `@xl/menu:`, `@2xl/menu:` and `@3xl/menu:` only (24, 28, 36, 42 and 48rem), and never `${hex}AA` concatenation.

| File | Contents |
|---|---|
| `menu-fonts.ts` | §10 |
| `menu-labels.ts` | `BADGE_META` (TR/EN label + lucide icon), `ALLERGEN_META` (TR/EN), `knownAllergens(list)` using `Object.prototype.hasOwnProperty.call`, `ALLERGEN_VISIBLE_COUNT = 3`, and the public copy object (§12.2). Shared by cards and the sheet, which removes today's duplicated tables. |
| `parts/MenuDocument.tsx` | Skip link, `Masthead`, `CategoryNav` (only when there are ≥ 2 visible categories), `<main id="menu-main">` with the sections, `EmptyMenu`, `MenuFooter` |
| `parts/Masthead.tsx` | The 4 header variants (§9.4); logo or monogram tile; tagline; meta line |
| `parts/CategoryNav.tsx` | The 2 nav variants (§9.5) |
| `parts/SectionHeader.tsx` | `rule` / `chapter` / `numbered` / `plain` (+ `showCount`) |
| `parts/ItemList.tsx` | `list` + `text` |
| `parts/ItemGrid.tsx` | `grid` + `feature` |
| `parts/ItemMedia.tsx` | Fixed box, `<img>` with eager/lazy rules, monogram underlay, broken-image fallback, sold-out treatment, hairline inner edge |
| `parts/ItemBits.tsx` | `Price`, `Badges`, `AllergenLine`, `SoldOutChip`, `Monogram` |
| `parts/EmptyMenu.tsx`, `parts/MenuFooter.tsx` | §9.7 |

### 9.4 Masthead

| Variant | Spec |
|---|---|
| `banner` (Classic, Pulse) | Full-bleed `linear-gradient(160deg, var(--m-banner), var(--m-banner-end))`, `pt-(--m-masthead-pt) pb-(--m-masthead-pb)`. Logo tile 64 (`rounded-(--m-r-card) bg-(--m-surface)` with a soft shadow) or a monogram tile. Then `.bzm-label` category, `h1.bzm-name`, tagline (`.bzm-tagline`), meta. Every text node uses `text-(--m-on-banner)` at full opacity: no opacity tricks and no translucent chips. |
| `centered` | Centred. Logo 72 circle with a 1 px `--m-rule` ring (omitted when there is no logo), `.bzm-label`, `h1.bzm-display`, tagline, a 40×2 `--m-accent-ui` rule, meta. Dark surfaces add an `aria-hidden` glow: `radial-gradient(120% 60% at 50% 0%, var(--m-glow), transparent 70%)`. |
| `cover` | A full-bleed photo, `aspect-[4/3] @xl/menu:aspect-[16/9] @3xl/menu:aspect-[21/9] max-h-[420px] w-full object-cover`, with `bg-(--m-surface-2)` while loading. It is `loading="eager"` and `fetchPriority="high"`, with `alt=""`. Below it comes the `centered` block, with the logo circle overlapping the photo by 36 px and a 3 px `--m-bg` ring. **No text on the photo.** Without a cover it renders as `centered`. |
| `compact` (Modern, Minimal, Sokak) | Row: a 48 tile (logo, or a monogram in fill / on-accent), `.bzm-label`, `h1.bzm-name`. Then the tagline, the meta, and a 1 px `--m-rule`. |

The **meta line** is one wrapping line: 14 px icons (`MapPin`, `Clock`, `Phone`), 13/20 text in `ink2` (or `on-banner`), separated by `·`, with no `60vw` truncation. The phone number is a `tel:` link with a hit area of at least 44 px. The **logo** has `alt={restaurant.name}`, and its `src` is `restaurant.menuLogoUrl` (public: the `img/logo` route).

### 9.5 Category nav

```
<nav aria-label={copy.navLabel} className="bzm-nav sticky top-0 z-30 h-(--m-nav-h) border-b border-(--m-rule)">
```

- `.bzm-nav` lives in `globals.css`: a solid `--m-bg` first, then, under `@supports` for both `backdrop-filter` and `color-mix`, `color-mix(in srgb, var(--m-bg) 92%, transparent)` with `blur(8px)`.
- The scroller is `overflow-x-auto no-scrollbar`, with an edge-fade mask (`mask-image: linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 24px), transparent)`).
- The row is `flex w-max min-w-full items-center gap-2 px-5 @md/menu:px-6` (`gap-6` for underline), plus `justify-center` for centred mastheads. This **fixes the first pills being unreachable** on Elegant and Gastronomy.
- **Pills.** Base: `relative inline-flex h-9 items-center rounded-(--m-r-pill) px-4 text-[14px] font-medium`, with a `before:absolute before:-inset-y-1 before:inset-x-0` hit area (44 px).
  - Inactive: `text-(--m-ink-2) ring-1 ring-inset ring-(--m-rule)`.
  - Active: `bg-(--m-accent-fill) text-(--m-on-accent) font-semibold shadow-[inset_0_0_0_1px_var(--m-accent-edge)]`.
- **Underline.** Base: `relative inline-flex h-(--m-nav-h) items-center text-[15px] font-medium text-(--m-ink-2)`.
  - Active: `text-(--m-ink)` plus an `after:` 2 px bar in `--m-accent-ui`.
- **Links** keep `<a href="#cat-<id>">` and `aria-current="true"` on the active one.
  - A click calls `onCategoryClick` and sets the active id. The **native anchor jump** stays.
  - Smoothness comes from the page-level `html{scroll-behavior:smooth}` (§9.10), which the global reduced-motion rule forces back to `auto`. The Studio keeps instant jumps.
  - **No `scrollIntoView`** anywhere: it would scroll the Studio page.
- **Horizontal follow.** When `activeId` changes and the link is not fully visible: `scroller.scrollTo({ left: link.offsetLeft - paddingLeft, behavior: reduced ? 'auto' : 'smooth' })`.
- **Sections:** `<section id="cat-<id>" data-cat-id="<id>" className="scroll-mt-[calc(var(--m-nav-h)+16px)]">`, separated by `--m-section-gap`.

### 9.6 Items (DOM contract unchanged)

Each item:

```tsx
<article data-pid={id} ref={(el) => setProductRef(id, el)} onClick={() => onProductClick(item, categoryId)}
         data-sold-out={item.isOutOfStock || undefined}
         className="group relative cursor-pointer has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-(--m-focus) rounded-(--m-r-card)">
  <h3 className="bzm-item …"><button type="button" aria-haspopup="dialog"
      className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
    {item.name}{item.isOutOfStock && <span className="sr-only">, {copy.soldOut}</span>}</button></h3>
  …
</article>
```

- Enter/Space on the button bubbles a single click to the article, so there is exactly one `onProductClick` per activation.
- PhonePreview's `closest('[data-pid]')`, `querySelector('[data-pid=…]')` and its injected outline keep working.

Layouts:
- **`list`:**
  - Grid: `grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-(--m-row-py)`.
  - Text column: a `flex items-baseline gap-3` row with the name (`min-w-0 flex-1`) and `Price shrink-0`; then the description `.bzm-desc mt-1.5 line-clamp-(--m-clamp)`, the badges `mt-2`, and the allergens `mt-2`.
  - Media: `size-(--m-thumb)`; the `arch` shape is `w-(--m-thumb) h-[calc(var(--m-thumb)*1.25)]`. `thumbSide: start` swaps the columns.
  - Media column present iff the category has at least one photo; a missing photo shows a monogram.
- **`text`:** like list without media. A dotted leader sits between the name and the price on every width:

  ```
  aria-hidden mx-2 min-w-4 flex-1 -translate-y-[0.28em] border-b border-dotted border-(--m-rule-strong)
  ```
- **`grid`:**
  - Columns: `grid grid-cols-2 gap-(--m-grid-gap) @2xl/menu:grid-cols-3`.
  - Media: `aspect-[gridAspect] rounded-(--m-r-img) overflow-hidden`; every item gets a box (monogram when there is no photo).
  - Caption: the name (`.bzm-item--grid`, clamp 3); the price on its own line, or the overlay chip; the description `line-clamp-2`; badges (2 + "+N"); allergens (in full).
- **`feature`:** single column, `space-y-8`.
  - Media is `aspect-[4/3] w-full rounded-(--m-r-img)`.
  - Under it: name (`.bzm-item--feature`) and price on one baseline, description `line-clamp-3`, all badges, allergens.
  - An item without a photo becomes a text block with a top hairline.
- **`cardStyle`:**
  - `cards`: each article gets `rounded-(--m-r-card) bg-(--m-surface) ring-1 ring-(--m-rule)` plus a scheme shadow, either `group-data-[scheme=light]/menu:shadow-[0_1px_2px_rgb(0_0_0/0.04)]` or none. List cards add `px-3.5`; grid puts the media flush at the top with a `p-3` caption.
  - `rows`: the container is `divide-y divide-(--m-rule)` with no card chrome. The grid uses a caption without chrome.
- **`priceOverlay`** (grid/feature with a photo): a chip at `bottom-2 right-2` on the media, `rounded-(--m-r-pill) bg-(--m-accent-fill) px-2.5 py-1 text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge),0_4px_12px_-2px_rgb(0_0_0/.25)]`. The in-caption price is then omitted.
- **`Price`** is `.bzm-price` (`white-space: nowrap`, tabular). Colour depends on the price style: `--m-ink` for plain and mono, `--m-accent-text` for accent. It uses `Intl.NumberFormat` exactly as today (`priceLocale`).
- **Sold out** (one treatment everywhere):
  - The media gets `grayscale(1) opacity(.6)`.
  - The name turns `--m-ink-2`. The price is `line-through` in `--m-muted`.
  - The chip `h-6 rounded-(--m-r-pill) bg-(--m-surface-2) px-2 text-[12px] font-semibold text-(--m-ink) ring-1 ring-(--m-rule)` follows the name row.
  - The card stays clickable, because the allergens remain useful.
- **`AllergenLine`** keeps the existing logic and is never clamped or truncated:

  ```html
  <p title="Alerjen: <full list>" class="text-[13px] leading-[19px] text-(--m-ink-2)">
    <span class="font-semibold text-(--m-ink)">Alerjen:</span>
    <span aria-hidden>Gluten, Süt / laktoz, Yumurta +2</span>
    <span class="sr-only"><full list></span>
  </p>
  ```

  Only known allergens are listed, using own-property checks.
- **`ItemMedia`:**
  - Missing photo: a monogram underlay (the first grapheme of the trimmed name, locale-uppercased, in the display face at 40 % of the box, `--m-accent-mark` on `--m-accent-soft`, `aria-hidden`).
  - The `<img>` sits absolutely on top, with `object-cover`, `alt=""` and `decoding="async"`.
  - `onError` hides the image. A mount effect also hides it when `img.complete && img.naturalWidth === 0`. The monogram is already painted, so there is no layout shift.
  - **Eager loading:** the first 2 list thumbs, 2 grid cards or 1 feature image of the first category. The first of them (if there is no cover) gets `fetchPriority="high"`. All others are `lazy`.
  - **Inner hairline:** an `after:` overlay `ring-1 ring-inset ring-black/[.06]`, with `group-data-[scheme=dark]/menu:ring-white/[.08]`.
  - **Hover zoom:** `scale(1.03)` over 600 ms, only under `@media (hover:hover) and (prefers-reduced-motion:no-preference)`.

### 9.7 Empty state and footer

- **Empty state:** the masthead **always** renders (this fixes Pulse). Below it: `pt-[72px]`, centred, a 40×2 `--m-accent-ui` rule, the `.bzm-section` title, and the body text in `ink2` at 14/21. The copy is unchanged and there is no Sparkles icon.
- **Footer:** `mt-(--m-section-gap) border-t border-(--m-rule) pt-6 pb-[max(24px,env(safe-area-inset-bottom))] text-center text-[12px] tracking-[0.08em] text-(--m-muted)` with "Powered by Buaze" (kept). Pulse adds a small ECG glyph in `--m-accent-ui`.

### 9.8 `src/components/menu/ProductDetailModal.tsx` (rewritten; only `PublicMenuView` imports it)

**Props:** `{ item, design: ResolvedMenuDesign, locale, priceLocale, onClose }`.

**Structure**

| Element | Spec |
|---|---|
| Wrapper | `fixed inset-0 z-50 @container/sheet` |
| Backdrop | `absolute inset-0 bg-[rgb(0_0_0/.55)] bzm-fade-in`; a click closes |
| Panel (`role="dialog" aria-modal="true" aria-labelledby={titleId}`) | Moved from today's backdrop wrapper. Narrow: a bottom sheet, `absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-(--m-r-sheet) bg-(--m-surface) text-(--m-ink) pb-[max(24px,env(safe-area-inset-bottom))] bzm-sheet-in`. From `@xl/sheet`: a centred dialog, `w-[min(560px,calc(100%-48px))] rounded-(--m-r-sheet) bzm-pop-in`. |
| Grabber (narrow only) | 36×4, `bg-(--m-rule)` |
| Photo (if any) | A 4:3 block with `alt={item.name}` |
| Close button | 44 px, `bg-(--m-surface) text-(--m-ink)` with a shadow, absolute top-right over the photo or in the header row. This replaces the `-mt-10` float hack. |

**Body**
- `h2#title.bzm-section`.
- `Price` at 20 px.
- The sold-out banner ("Bu ürün şu an tükendi") on `surface2`.
- **All** badges.
- The full description: `whitespace-pre-line .bzm-desc text-(--m-ink)`.
- The allergen block: `rounded-(--m-r-card) bg-(--m-surface-2) p-4`, with an "Alerjen bilgisi" label, 13 px chips (`bg-(--m-surface) ring-1 ring-(--m-rule)`), and the **existing disclaimer text** at 12/18 in `--m-ink-2`.
- A full-width "Kapat" button: `h-12 rounded-(--m-r-card) bg-(--m-surface-2) font-semibold text-(--m-ink)`.

**Behaviour**
- ESC and the backdrop close it, and the body overflow lock stays (all unchanged).
- **New:**
  - initial focus on the close button;
  - a Tab / Shift+Tab trap;
  - focus returns to the opener (the stored `document.activeElement`);
  - the canvas is `inert` while the sheet is open;
  - a dark surface gives a dark sheet.
- The dead `animate-in …` classes are removed.

### 9.9 `src/components/menu/MenuSplash.tsx` (overlay)

**Props:** `{ name, logoUrl, design, locale, onDone }`.

```html
<div data-menu-splash role="status" aria-label="{name} menüsü açılıyor"
     class="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center overscroll-contain touch-none
            {structure.header === 'banner' ? 'bg-(--m-banner) text-(--m-on-banner)' : 'bg-(--m-bg) text-(--m-ink)'}"
     style="animation: bzm-splash-out 280ms cubic-bezier(.2,.8,.2,1) 3000ms forwards">
```

Contents:
- the logo at 96 (`rounded-(--m-r-card)`), or a monogram tile (fill / on-accent);
- `.bzm-label` with the category, then `.bzm-name` with the name, at the typeface's real weight (no `font-extrabold`);
- the progress bar `w-40 h-[2px]`.
  - Track: `bg-current opacity-25`.
  - Fill: the existing `buaze-splash-fill 3000ms linear forwards`. On banner the fill is `bg-current`; on paper it is `bg-(--m-accent-ui)` and the track is `bg-(--m-rule)`.

Timing:
- The duration stays 3000 ms. `onDone` runs after 3280 ms, or after 0 ms under `prefers-reduced-motion`.
- If JavaScript never runs, the CSS animation still hides the overlay at 3.28 s, ending with `visibility: hidden` and `pointer-events: none`.

### 9.10 `src/app/menu/[slug]/page.tsx`

1. `const getMenu = cache(loadMenu)` (from `react`). `loadMenu` switches from `include` to an **explicit `select`** (CLAUDE.md §14.1):
   - **Restaurant:** `id`, `slug`, `name`, `category`, `address`, `phone`, `workingHours`, `primaryColor`, `isActive`, `menuEnabled`, `menuPublished`, `menuTheme`, `menuAccentColor`, `menuLogoUrl`, `menuDesign`, `menuCoverVersion`. **Never `menuCoverUrl`.**
   - **Categories and items:** the fields mapped today plus `updatedAt`, with the same `where` and `orderBy`.
   - The not-found gate is unchanged.
2. `export async function generateViewport({ params })`:
   - calls `getMenu(slug)`;
   - returns `{ ...ROOT_VIEWPORT, themeColor: resolved.themeColor }`, or `ROOT_VIEWPORT` when not found.

   Page and viewport share one query, and `generateMetadata` keeps its own small query, so a request still makes 2 queries, as today.
3. `generateMetadata`:
   - adds `menuCoverVersion: true` to its select;
   - when it is set, `openGraph.images = [{ url: SITE_URL + menuImagePath(slug, 'cover', v), width: 1600, height: 900 }]`.

   `noindex` (`isIndexableMenu`), the canonical `https://www.buaze.com/menu/<slug>` and the not-found metadata are unchanged.
4. `searchParams: Promise<{ lang?: string; source?: string }>`. The locale comes from `?lang` only (unchanged). Pass `initialSplash={source === 'qr'}`.
5. `RestaurantView`:
   - `menuDesign: readMenuDesign(data.menuDesign)`;
   - `menuCoverUrl: data.menuCoverVersion ? menuImagePath(data.slug, 'cover', data.menuCoverVersion) : null`.

   The logo still goes through `publicImageSrc` with `contentVersion`, and item images through `itemImageVersion(updatedAt)`, both unchanged.
6. The canvas colour, from enumerated constants only. `r.colors.bg` must match `/^#[0-9A-F]{6}$/` before it is interpolated, otherwise it is omitted.

   ```tsx
   const r = resolveMenuDesign({ ...data, hasCover: Boolean(data.menuCoverVersion) });
   <style>{`html,body{background-color:${r.colors.bg};color-scheme:${r.scheme}}html{scroll-behavior:smooth}`}</style>
   ```

7. JSON-LD:
   - `Restaurant.image` becomes the logo and the cover (absolute; the cover via `${SITE_URL}${menuImagePath(slug,'cover',v)}`), as an array when both exist.
   - The `Menu` node is unchanged.
   - Never a data URL.

### 9.11 `src/app/menu/[slug]/not-found.tsx`

One line: the wrapper gets `style={{ '--font-heading': 'var(--font-menu-heading)' } as CSSProperties}`, so a menu URL never shows Clash Display.

`error.tsx` is unchanged.

### 9.12 `src/app/globals.css` (static only; no owner input)

1. **Role classes.** These are **unlayered on purpose**: they beat the global `:where(h1…h6)` rule, so they may sit on `h*` elements. **Never combine a role class with Tailwind font utilities on the same element**, because the unlayered class wins.
   - `.bzm-display`, `.bzm-name`, `.bzm-section`, `.bzm-item`, `.bzm-item--grid`, `.bzm-item--feature`, `.bzm-desc`, `.bzm-catdesc`, `.bzm-tagline`, `.bzm-price`, `.bzm-label`.
   - Each reads only `--m-*` and `--font-menu-heading` variables (the Editorial §5.5 definitions, plus the grid/feature/tagline variants).
   - `@container menu (min-width: 42rem)` switches the display and name sizes to their `-lg` tokens.
2. **`.bzm-nav`**: §9.5.
3. **Keyframes:** `bzm-sheet-in` (260 ms, translateY 24px→0, opacity), `bzm-pop-in` (220 ms, scale .98→1), `bzm-fade-in` (180 ms), and `bzm-splash-out` (280 ms opacity→0; the end keyframe sets `visibility:hidden; pointer-events:none`). The utility classes are `.bzm-sheet-in`, `.bzm-pop-in` and `.bzm-fade-in`.
4. **Reduced motion.** Inside a `@media (prefers-reduced-motion: reduce)` block:
   - `.bzm-sheet-in, .bzm-pop-in, .bzm-fade-in { animation: none !important }`;
   - `[data-menu-splash] { display: none !important }`;
   - add `[style*='bzm-splash-out']` to the existing inline-animation blanket.

   The existing `[style*='buaze-splash-fill']` rule and the global `* { transition-duration: .001ms; scroll-behavior: auto }` rule stay untouched.
5. **Image dragging:** `[data-menu-root] img { -webkit-user-drag: none; }`.

### 9.13 Contract checklist (verify in review)

- [ ] `section#cat-<id>[data-cat-id]`; nav `href="#cat-<id>"`.
- [ ] `article[data-pid]`, `ref={setProductRef}`, `onClick` → sheet + `trackProductClick`.
- [ ] `trackMenuView` on mount; `trackCategoryClick`; product views at threshold 0.5; `disableAnalytics` disables tracking and the splash.
- [ ] Source detection before `replaceState`; attribution keeps `qr`.
- [ ] Only one `PublicMenuView` mounted; works as `next/dynamic` with `ssr:false` inside a zoomed, `contain: layout paint` scroller.
- [ ] Allergens on every card, never truncated; the full list in the sheet.
- [ ] `MenuFontScope` contract: `--font-heading: var(--font-menu-heading)` on the scope root, which also wraps the splash and the sheet.
- [ ] No data URL in the public HTML, RSC payload or JSON-LD.
- [ ] Footer attribution "Powered by Buaze" kept.

---

## 10. Fonts (chunk 2)

### 10.1 Allowed families (OFL only)

| Family | Where declared | Loaded as | Italic | Used by |
|---|---|---|---|---|
| Space Grotesk | `src/components/root/fonts.ts` (existing, unchanged) | 400/500/700, `preload:false` | none | `grotesk`, splash fallback |
| Inter | `fonts.ts` (existing) | 400–800 | — | body, prices |
| JetBrains Mono | `fonts.ts` (existing) | 400/500/600, `preload:false` | — | price style `mono` |
| Fraunces | `src/components/menu/menu-fonts.ts` | variable wght + `opsz` | yes | `soft-serif` |
| Newsreader | `menu-fonts.ts` | variable wght + `opsz` | yes | `book-serif` |
| Instrument Serif | `menu-fonts.ts` | `400` | yes | `display-serif` |
| Bricolage Grotesque | `menu-fonts.ts` | variable wght + `opsz` | none | `bold-sans` |
| Playfair Display | `menu-fonts.ts` | variable wght | yes | `classic-serif` |

All of the new families were verified in Next 15.5.15's `font-data.json`: they include `latin-ext`, and the italics and axes are as listed. **Clash Display (ITF licence) is never declared, referenced or selectable in menu scope.**

### 10.2 `src/components/menu/menu-fonts.ts`

Each call must be written out with **literal** options: `next/font` rejects spreads and variables in its options.

```ts
import { Fraunces, Newsreader, Instrument_Serif, Bricolage_Grotesque, Playfair_Display } from 'next/font/google';

// OFL fonts for restaurant menus (customers' content). Clash Display (ITF licence)
// must never be offered here — CLAUDE.md §11. Files download only when a menu uses them.
const fraunces = Fraunces({ subsets: ['latin', 'latin-ext'], style: ['normal', 'italic'], axes: ['opsz'],
  display: 'swap', preload: false, variable: '--font-m-fraunces' });
const newsreader = Newsreader({ subsets: ['latin', 'latin-ext'], style: ['normal', 'italic'], axes: ['opsz'],
  display: 'swap', preload: false, variable: '--font-m-newsreader' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin', 'latin-ext'], weight: '400', style: ['normal', 'italic'],
  display: 'swap', preload: false, variable: '--font-m-instrument' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], axes: ['opsz'],
  display: 'swap', preload: false, variable: '--font-m-bricolage' });
const playfair = Playfair_Display({ subsets: ['latin', 'latin-ext'], style: ['normal', 'italic'],
  display: 'swap', preload: false, variable: '--font-m-playfair' });

export const MENU_FONT_VARIABLES =
  `${fraunces.variable} ${newsreader.variable} ${instrumentSerif.variable} ${bricolage.variable} ${playfair.variable}`;
```

### 10.3 Loading plan

**Where the classes go.** `MENU_FONT_VARIABLES` goes on `data-menu-root`, and on the `DesignPanel` root for the samples. A next/font `.variable` class only defines a custom property on its element, so this works the same under both root layouts (`/menu` and the `[locale]` dashboard preview). It also keeps five families' `@font-face` CSS out of every marketing and admin page: the CSS ships only with the menu chunk and the Studio panel chunk. The brief's "declare in `fonts.ts`" requirement is satisfied by intent: one whitelisted module, OFL only, `preload:false`, `latin-ext`. `fonts.ts` itself is unchanged.

**`--font-menu-heading`.** In `globals.css` it keeps its Space Grotesk default (for `error.tsx` and the QR canvas). The scope overrides it per typeface, and the scope always re-points `--font-heading`.

**Cost.** A public menu downloads at most one extra family:
- the display face, plus its italic only if italic text renders;
- `latin-ext` files only when Turkish glyphs appear;
- `book-serif` also uses Newsreader for the body.

The swap is covered by `display: 'swap'` plus next/font's metric-matched fallback (`adjustFontFallback`, on by default). For QR visitors it happens under the splash.

**Budget gate (QA).** First-view woff2 bytes for a Turkish page with a serif typeface (normal + italic, latin + latin-ext) must be **≤ 150 KB**. If Fraunces, Newsreader or Bricolage exceeds it, drop `axes: ['opsz']` for that family and pin `weight: ['400','500','600']`, without changing any stack.

**First build.** Confirm on the first `next build` that the Studio's `ssr:false` chunk includes the `@font-face` CSS (the font samples render in the right family).

---

## 11. Studio design panel (chunk 3)

In this section, `$C` = `src/app/[locale]/dashboard/restaurants/[id]/menu/_components`.

### 11.1 UX

The panel keeps its title **"Menü görünümü"** and its two presentations:
- **docked** at ≥1024 px, replacing the outline;
- **sheet** below 1024 px, with the 38 dvh preview strip on phones and settings | 280 px preview on tablets.

New **tab bar** (Radix tabs via `@/components/ui` `Tabs`, or `@radix-ui/react-tabs` directly):
- horizontally scrollable on phones;
- sticky at the top of the settings scroller;
- a 6 px dot on any tab that holds unapplied changes;
- the tab state is local and resets to **Stil** on open.

```
Menü görünümü                                                           [×]
[ Stil • ][ Renk ][ Yazı ][ Düzen ][ Marka ]
── Stil ────────────────────────────────────────────────────────────────────
 (i) Menü stilleri yenilendi … [Tamam]          (one-time, localStorage via kit/storage, try/catch)
 12 ThemeCards (radiogroup; 2 cols, 3 at @min-[520px]) — live mini menu with the owner's name + draft accent
 [● Bu stil Kiremit rengiyle güzel görünür · Rengi kullan]                     (suggested accent chip)
 [Düzen ve yazı ayarların bu stile göre sıfırlandı · Geri al]                 (after a switch that dropped knobs)
 [Bu stilin varsayılanlarına dön]                                             (only when knobs are overridden)
── Renk ────────────────────────────────────────────────────────────────────
 Vurgu rengi: AccentPicker (unchanged) + ContrastNote (Seçtiğin ● → Menüde ●)
 Zemin: 8 SurfaceSwatches (radiogroup) · "stil varsayılanı" marker
── Yazı ────────────────────────────────────────────────────────────────────
 6 TypefaceCards (radiogroup, 1 col → 2 at @min-[420px])
── Düzen ───────────────────────────────────────────────────────────────────
 Ürünler [Liste|Izgara|Vitrin|Metin] · Üst alan [Bant|Ortalı|Kapak|Kompakt]
 Kategori menüsü [Hap|Çizgi] · Ürün kutusu [Kartlı|Çizgili] · Yoğunluk [Ferah|Dengeli|Sıkı]
 Köşeler [Keskin|Yumuşak|Yuvarlak] · Fiyat [Sade|Renkli|Daktilo] · Rozetler [Sade|Renkli]
── Marka ───────────────────────────────────────────────────────────────────
 Menü logosu: LogoField (unchanged) · Kapak fotoğrafı: CoverField · Slogan: TaglineField (0/80)
────────────────────────────────────────────────────────────────────────────
 Uygulanmamış değişiklik var · ● Uyguladığın anda müşteriler görür          [Vazgeç] [Uygula]
```

Control details:

| Control | Spec |
|---|---|
| ThemeCard | `role="radio" aria-checked`, the TR/EN name, the vibe (`line-clamp-2`, never truncated), and an "Özelleştirildi" chip when it is selected and has overrides. Selected: a 2 px `#0A0A0A` ring and a check badge (Buaze owner styling, not menu tokens). |
| ThemeThumb | A 132 px schematic **drawn from `resolveMenuDesign`** for that preset with the draft accent (and the draft design when the card is selected). It shows the header variant with the owner's **real restaurant name** (truncated) in the display face, three nav marks, and rows / a 2×2 grid / a feature block / leader rows, all from tokens. `aria-hidden`. New presets need no drawing code. |
| SurfaceSwatch | A 64×44 tile in `bg`, with "Aa" in the current display face in `ink`, a 1 px rule ring and the name (12 px) below it. Roving radiogroup. |
| TypefaceCard | "Aa" at 28 px in the display face, plus the sample "Mercimek çorbası · ₺120" (TR) or "Lentil soup · ₺120" (EN) in the item and price fonts. Inside a `<span>`, never an `h*`. |
| OptionGroup | One generic roving radiogroup for the 8 layout knobs. `h-11 pointer-fine:h-9`; arrows move and select; selected `bg-[#0A0A0A] text-white`. The preset-default option gets a small dot and the accessible suffix "(stil varsayılanı)". Choosing it deletes the override. |
| Üst alan → Kapak without a cover | The option stays enabled. An inline note appears under it, "Kapak için bir fotoğraf ekle…", with an **"Kapak ekle"** button that switches to the Marka tab and focuses CoverField. |
| CoverField | A clone of LogoField at 16:9: pick, drop or paste; an object-URL preview; **Kaldır**. Upload `kind: 'cover'`. Its own sequence guard (the latest pick wins; remove cancels an in-flight upload). After an upload while header ≠ cover, show a **"Kapağı üst alanda göster"** button that sets `header: 'cover'`. |
| TaglineField | A single-line input with `maxLength` 80 and a live counter `n/80`. It keeps the raw text in local state and pushes `sanitizeTagline(raw)` to the draft on change. When the draft changes from outside (discard, undo), it resyncs. Empty removes the key. |
| ContrastNote | Shown when `resolved.adjusted.text \|\| fill \|\| banner` for the draft. `role="note"`, an Info icon, and a two-dot pair `accent → accentText` (or `→ accentFill`). Copy in §12.1. |

The **preview** is the same PhonePreview (the real `PublicMenuView`, `disableAnalytics`, `ssr:false`, in-memory draft). Two small additions:
- the viewport `backgroundColor` = the resolved `bg` (no white edge under dark menus);
- an optional `scrollTopKey?: number` prop. When it changes, the viewport scrolls to the top. DesignPanel bumps it when the header, logo, cover, tagline or surface changes, or when the Marka tab opens.

**Read-only:** controls stay visible but disabled (`canDesign = menuEnabled && !isViewer`). There is no upgrade copy.

### 11.2 Files

| File | Change |
|---|---|
| `$C/menu-theme.ts` | `export const THEME_KEYS = ['menuTheme','menuAccentColor','menuLogoUrl','menuDesign','menuCoverUrl'] as const`. `ThemeValues` gains `menuDesign: MenuDesign \| null` and `menuCoverUrl: string \| null`. **`createThemeSync` builds `confirmedSeq` from `THEME_KEYS`, so all 5 keys start at 0.** This is the trap: without a key, `seq > undefined` is false and Apply visually reverts. `themeDiff`: the design is compared with `designKey(normalizeMenuDesign(applied.menuTheme, applied.menuDesign))` against the same for the draft, and sends the normalised draft design (or `null`); the cover is compared as a string (removal sends `null`); the accent is still compared through `normaliseHex`. `isThemeDirty` follows. Exports used by `tests/menu-theme-sync.test.ts` keep their names. |
| `$C/data/useThemeDraft.ts` | `appliedOf` and the `applied` memo cover all 5 keys (`menuDesign: readMenuDesign(r.menuDesign)`, `menuCoverUrl: r.menuCoverUrl ?? null`). New actions: `setPreset(id)` (returns whether knobs were dropped; remembers the previous menuTheme and menuDesign for `restorePreset()`), `restorePreset()`, `setKnob(key, value)`, `resetKnobs()`, `setTagline(text)`, `setCoverFile(file)`, `removeCover()` and `coverUploading`. `uploading = logoUploading \|\| coverUploading` gates Apply (`logoUploading` stays exported). `runPatch` checks `r.ok` and **parses the JSON body**: settled values = the sent patch with `menuTheme`, `menuAccentColor` and `menuDesign` (via `readMenuDesign`) replaced by the response's canonical values. Apply, undo (PATCHes the previous values of the changed keys), discard and the "clean draft follows applied" effect stay key-generic. |
| `$C/data/menu-api.ts` | The `patchTheme` body type gains `menuDesign?: MenuDesign \| null` and `menuCoverUrl?: string \| null`. Its response type becomes `{ id, menuTheme, menuAccentColor, menuDesign, menuCoverVersion }`. `uploadImage` kind becomes `'item' \| 'logo' \| 'cover'`. |
| `$C/data/usePhotoUpload.ts` | Kind `'cover'`: compress to `{ maxDim: 1600, quality: 0.82 }` (the server still resizes to 1600×900, capped at 380 KB). |
| `$C/data/useMenuData.ts` | `fetchMenuData` maps `menuDesign: readMenuDesign(r.menuDesign)` and `menuCoverUrl: typeof r.menuCoverUrl === 'string' ? r.menuCoverUrl : null`. |
| `$C/menu-types.ts` | `RestaurantShape` makes both fields required: `menuDesign: MenuDesign \| null; menuCoverUrl: string \| null`. |
| `$C/design/DesignPanel.tsx` | Tabs, sections, per-tab dirty dots and the notes from §11.1. Roving order is `MENU_PRESET_ORDER`. The apply bar is unchanged except that it gates on `uploading`. The `sheet` and `docked` presentations, the in-place `alertdialog` leave-confirm, `useConfirmDialog` when docked, and the focus/scroll of the title are all unchanged. `MENU_FONT_VARIABLES` goes on its root. |
| `$C/design/ThemeCard.tsx`, `$C/ThemeThumb.tsx` | Rewritten as token-driven (§11.1). File names and locations are kept (CLAUDE.md §12.1 lists `ThemeThumb.tsx` at the root). |
| `$C/design/SurfacePicker.tsx`, `TypefacePicker.tsx`, `OptionGroup.tsx`, `CoverField.tsx`, `TaglineField.tsx`, `ContrastNote.tsx` | New. |
| `$C/menu-constants.ts` | `THEME_VIBES` is kept as an export, now `Record<MenuPresetId, {tr,en}>`, **derived from `MENU_PRESET_LABELS`**. There is one source of truth, and the 7 legacy ids stay valid. |
| `$C/menu-i18n.ts` | `design.themes` grows to the 12 preset ids (derived from `MENU_PRESET_LABELS`). Add the new keys in §12.1, in TR and EN, with parity. |
| `$C/studio/MenuStudio.tsx` | Minimal: pass `uploading` and `scrollTopKey` through. `previewRestaurant = {...restaurant, ...design.draft}` already carries the new keys. Expect a rebase conflict here: touch only these lines. |
| `$C/preview/PhonePreview.tsx` | Viewport background = resolved `bg`; optional `scrollTopKey`. Nothing else: `onClickCapture`, `scrollPreviewTo` offsets 64/80 and the injected outline are unchanged. |
| `src/app/admin/restaurants/[id]/page.tsx` | Next to the existing theme editor: a read-only line "Stil: {MENU_PRESET_LABELS[effectivePresetId].tr} · {countOverrides} özelleştirme" (or "Stil: … · özelleştirme yok") and a **"Tasarımı sıfırla"** button. The button opens a `ConfirmDialog` and then sends `PATCH …/menu-theme { menuDesign: null }`. `THEME_LABELS` is unchanged. |
| `src/app/admin/restaurants/[id]/menu/page.tsx` | It shows the preset label via `MENU_PRESET_LABELS` and an effective preset id; `THEME_LABEL` stays as the family fallback. |

All other Studio contracts are unchanged:
- the local draft until **Uygula**, then one PATCH with only the changed keys through the `theme` serial queue, with per-field `ThemeSync`;
- the **Geri al** toast;
- the leave-guard on every close path, and `useUnsavedGuard` covering `designDirty` and `design.pending`;
- on phones, Sheet Apply closes the sheet first and then toasts;
- access loss closes the panel and discards the draft;
- every error goes through `mapMenuApiError`;
- the QR and the live menu keep the applied values until Apply.

---

## 12. Copy (TR primary, EN parity)

### 12.1 Studio (`menu-i18n.ts` → `design.*`)

| Key | TR | EN |
|---|---|---|
| `theme` | Stil | Style |
| `themes.*` / vibes | §4.1 (from `MENU_PRESET_LABELS`) | §4.1 |
| `themeCardLabel(name)` | `${name} stili` | `${name} style` |
| `tabs.style / color / type / layout / brand` | Stil / Renk / Yazı / Düzen / Marka | Style / Color / Type / Layout / Brand |
| `tabDirty(name)` | `${name}, uygulanmamış değişiklik var` | `${name}, has unapplied changes` |
| `refreshNote` | Menü stilleri yenilendi: daha okunaklı yazılar, otomatik renk uyumu ve 5 yeni stil. Senin bir şey yapman gerekmiyor. | Menu styles were refreshed: easier reading, automatic color contrast and 5 new styles. Nothing to do on your side. |
| `refreshDismiss` | Tamam | Got it |
| `suggestedAccent(name)` | `Bu stil ${name} rengiyle güzel görünür` | `This style looks great with ${name}` |
| `useSuggested` | Rengi kullan | Use color |
| `knobsReset` | Düzen ve yazı ayarların bu stile göre sıfırlandı. | Your layout and type settings were reset for this style. |
| `restoreKnobs` | Geri al | Undo |
| `resetAll` | Bu stilin varsayılanlarına dön | Back to this style's defaults |
| `presetDefault` | stil varsayılanı | style default |
| `customized` | Özelleştirildi | Customized |
| `surface` | Zemin | Background |
| `surfaces.*` | Beyaz, Fildişi, Krem, Taş, Adaçayı, Mürekkep, Gece mavisi, Orman | White, Ivory, Cream, Stone, Sage, Ink, Night blue, Forest |
| `typeface` | Yazı karakteri | Typeface |
| `typefaces.*` | Çağdaş, Sıcak, Zarif, Dergi, Güçlü, Klasik serif | Contemporary, Warm, Refined, Magazine, Bold, Classic serif |
| `typefaceSample` | Mercimek çorbası | Lentil soup |
| `knobs.items` + values | Ürünler: Liste, Izgara, Vitrin, Metin | Items: List, Grid, Showcase, Text |
| `knobs.header` + values | Üst alan: Bant, Ortalı, Kapak, Kompakt | Header: Band, Centered, Cover, Compact |
| `knobs.nav` + values | Kategori menüsü: Hap, Çizgi | Category menu: Pills, Underline |
| `knobs.cardStyle` + values | Ürün kutusu: Kartlı, Çizgili | Item style: Cards, Lines |
| `knobs.density` + values | Yoğunluk: Ferah, Dengeli, Sıkı | Spacing: Airy, Balanced, Compact |
| `knobs.corners` + values | Köşeler: Keskin, Yumuşak, Yuvarlak | Corners: Sharp, Soft, Round |
| `knobs.price` + values | Fiyat: Sade, Renkli, Daktilo | Price: Plain, Colored, Typewriter |
| `knobs.badges` + values | Rozetler: Sade, Renkli | Badges: Quiet, Colorful |
| `coverNeeded` | Kapak için bir fotoğraf ekle. Eklenene kadar ortalı üst alan görünür. | Add a cover photo. Until then the centered header is shown. |
| `addCover` | Kapak ekle | Add cover |
| `cover` / `uploadCover` / `changeCover` / `removeCover` | Kapak fotoğrafı / Kapak yükle / Kapağı değiştir / Kaldır | Cover photo / Upload cover / Change cover / Remove |
| `coverHint` | Yatay bir fotoğraf seç (en az 1600×900). Menünün en üstünde görünür; kenarları kırpılabilir. | Choose a landscape photo (at least 1600×900). It appears at the top of your menu; edges may be cropped. |
| `showCoverInHeader` | Kapağı üst alanda göster | Show the cover in the header |
| `tagline` | Slogan | Tagline |
| `taglinePlaceholder` | Ör. 1987'den beri odun ateşinde | E.g. Wood-fired since 1987 |
| `taglineHint` | Adının altında görünür. İki dilde de yazdığın gibi gösterilir. | Shown under your name, in both languages exactly as written. |
| `taglineCounter(n)` | `${n}/80` | `${n}/80` |
| `contrastPicked` / `contrastUsed` | Seçtiğin / Menüde | Your pick / On the menu |
| `contrastText(surface, lighter)` | `Bu renk ${surface} zeminde yazı için çok ${lighter ? 'koyu' : 'açık'}. Fiyat ve vurgu yazılarında okunur kalsın diye daha ${lighter ? 'açık' : 'koyu'} bir tonu kullanılıyor.` | `This color is too ${lighter ? 'dark' : 'light'} for text on ${surface}. A ${lighter ? 'lighter' : 'darker'} shade is used for prices and accent text so they stay readable.` |
| `contrastFill` | Düğme ve etiketlerdeki yazı okunsun diye ton hafifçe ayarlandı. | The shade was adjusted slightly so text on buttons and labels stays readable. |
| `accentHint` (replaces the current text) | Renk düğmelerde, çizgilerde ve vurgularda kullanılır. Yazı olarak okunmayacak kadar açık ya da koyuysa menüde ve QR'da otomatik ayarlanır. | Your color is used for buttons, lines and highlights. If it is too light or dark to read as text, the menu and QR adjust it automatically. |
| `closeDirtyBody` (replaces the current text) | Uygulamadan çıkarsan seçtiğin stil, renk, yazı ve görseller kaydedilmez. | If you leave without applying, your style, color, type and image choices won't be saved. |

In `contrastText`, `lighter` = `lum(accentText) > lum(accent)`. The `surface` argument is the localised surface name.

Admin copy is TR only, like the rest of the admin pages:
- "Stil: {ad} · {n} özelleştirme" / "Stil: {ad} · özelleştirme yok"
- "Tasarımı sıfırla"
- Confirm text: "Menü tasarımı stilin varsayılanlarına döner. Vurgu rengi, logo ve kapak değişmez."

### 12.2 Public menu (`src/components/menu/menu-labels.ts`)

| Key | TR | EN |
|---|---|---|
| `skip` | Menüye geç | Skip to menu |
| `navLabel` | Menü kategorileri | Menu categories |
| `soldOut` | Tükendi | Out of stock (unchanged) |
| `soldOutSheet` | Bu ürün şu an tükendi | This item is currently out of stock |
| `itemCount(n)` | `${n} ürün` | `${n} items` |
| `allergen` / `allergenInfo` | Alerjen / Alerjen bilgisi | Allergens / Allergen information |
| `close` | Kapat | Close |
| `splash(name)` | `${name} menüsü açılıyor` | `Opening ${name}'s menu` |
| `emptyTitle` / `emptyBody` / disclaimer / badge and allergen labels | **unchanged existing strings** | unchanged |
| footer | Powered by Buaze | Powered by Buaze |

---

## 13. Tests

### Chunk 1

- `tests/menu-design.test.ts`:
  - `readMenuDesign`: non-objects, arrays, JSON null, `v: 2`, unknown keys, an invalid preset → null, an invalid knob dropped, taglines with newlines, control characters, U+2028 or more than 80 characters; never throws.
  - `normalizeMenuDesign`: the legacy preset with no knobs → null; preset-default knobs dropped; the tagline kept; canonical key order; `designKey` independent of key order.
  - `effectivePresetId`: mismatch rules.
  - `countOverrides`.
  - Parity:
    - every `MENU_THEMES` id is a preset whose family is itself;
    - every preset's family is in `MENU_THEMES`;
    - `MENU_PRESET_ORDER` is a permutation of `MENU_PRESETS`;
    - `MENU_PRESET_LABELS` has TR and EN names and vibes for all presets;
    - every preset knob value is in its enum.
  - R1–R14 and R17 (§7.5).
  - No `TYPEFACES` stack contains `clash` (case-insensitive) or `--font-heading`; every `var(` has a fallback; every stack ends with a generic family.
- `tests/menu-palette.test.ts`:
  - `mixHex` endpoints and rounding.
  - `ensureAll` totality.
  - R15 (the fuzz, seeded LCG, the same set as §7.3) and R16 (static tokens and badges).
  - The swatch reference table as fixtures.
- `tests/menu-design-schema.test.ts`:
  - The strict object rejects unknown keys, a wrong `v`, free strings and an empty tagline.
  - `AccentWrite`: `#abc` → `#AABBCC`, `rgb()` rejected.
  - `CoverWrite`: SVG, http and more than 520,000 characters rejected; `''` → null.
- `tests/menu-api-error.test.ts`: `DESIGN_CONFLICT` is mapped in TR and EN.
- Optional `tests/menu-theme-route.test.ts`, DB-gated on `MENU_TEST_DATABASE_URL` like `menu-restore-route.test.ts`:
  - an unknown key → 400; a viewer → 403;
  - `menuDesign: null` writes SQL NULL;
  - a family mismatch → 409;
  - a cover write sets the version, and the response has no blobs.

### Chunk 2

- `tests/menu-fonts.test.ts` (source level, reading `src/components/menu/menu-fonts.ts` as text): every `next/font/google` call has `preload: false`, `'latin'` and `'latin-ext'`; there is no `localFont`, no `Clash`/`clash`, and no spread (`...`) inside a call; every `--font-m-*` used in `TYPEFACES` is declared there.
- `tests/menu-components-guard.test.ts` (scans `src/components/menu/**/*.tsx`):
  - no viewport breakpoint prefixes `(?<![\w@/-])(sm|md|lg|xl|2xl):`;
  - no `${…}` immediately followed by two hex digits;
  - no `animate-in`;
  - no `--font-heading` other than the scope's `var(--font-menu-heading)` re-point;
  - no `dangerouslySetInnerHTML`.

### Chunk 3

- `tests/menu-theme-sync.test.ts` (extended; same path and exports):
  - `Object.keys(createThemeSync(x).confirmedSeq)` equals `THEME_KEYS`.
  - `themeDiff`: equivalent designs with a different key order → no diff; a knob change → `menuDesign` only; a cross-family preset → `menuTheme` and `menuDesign`; a preset-default override → no diff; cover removal → `{ menuCoverUrl: null }`.
  - `settleThemeSave` confirms `menuDesign`, and an out-of-order old answer never overwrites it.
- `tests/menu-i18n.test.ts`: unchanged; it covers the new keys automatically.

**Every chunk:** `npx tsc --noEmit` and `npm test` are green before commit.

---

## 14. Build chunks and file ownership

Chunk 1 lands first. After it merges into the branch, chunks 2 and 3 can run **in parallel**: they touch disjoint files.

### Chunk 1: data model, resolver, API and tests

**Owns:**
- `prisma/schema.prisma` and `prisma/migrations/20261121090000_menu_design/migration.sql`
- `src/lib/menu-design.ts`, `src/lib/menu-palette.ts`, `src/lib/menu-design-schema.ts` (new)
- `src/lib/menu-api-error.ts`
- `src/app/api/restaurants/[id]/theme/route.ts`
- `src/app/api/admin/restaurants/[id]/menu-theme/route.ts`
- `src/app/api/settings/brand/route.ts`
- `src/app/api/menu/[slug]/img/[itemId]/route.ts`
- `src/components/menu/PublicMenuView.tsx`: **only** the two optional `RestaurantView` fields
- tests: `menu-design`, `menu-palette`, `menu-design-schema`, `menu-api-error`, and the optional `menu-theme-route`

**Done when:**
- the migration applies;
- the tests are green;
- the public menu looks exactly as before (the renderer is untouched);
- old Studio clients still save (a valid subset of the schema).

### Chunk 2: public rendering and fonts

**Owns:**
- `src/components/menu/**`: `PublicMenuView.tsx` (the rest), `ProductDetailModal.tsx`, `MenuSplash.tsx`, `menu-fonts.ts`, `menu-labels.ts`, `parts/*`
- `src/app/menu/[slug]/page.tsx` and `src/app/menu/[slug]/not-found.tsx`
- `src/app/globals.css` (menu block only)
- tests: `menu-fonts`, `menu-components-guard`

**Done when:** every acceptance item in §15.1–§15.4 for the public menu passes, including the visual matrix.

### Chunk 3: Studio design panel and docs

**Owns:**
- `$C/menu-theme.ts`, `$C/data/useThemeDraft.ts`, `$C/data/menu-api.ts`, `$C/data/usePhotoUpload.ts`, `$C/data/useMenuData.ts`, `$C/menu-types.ts`
- `$C/design/*` (DesignPanel, ThemeCard and the new controls), `$C/ThemeThumb.tsx`, `$C/menu-constants.ts`, `$C/menu-i18n.ts`
- `$C/studio/MenuStudio.tsx` (props only) and `$C/preview/PhonePreview.tsx` (bg + `scrollTopKey`)
- `src/app/admin/restaurants/[id]/page.tsx` and `src/app/admin/restaurants/[id]/menu/page.tsx`
- `tests/menu-theme-sync.test.ts`
- **`CLAUDE.md`** (§17 below)

**Done when:** §15.5 passes.

### Expected conflicts

- `MenuStudio.tsx`, with the other session's work: rebase and touch only the props lines.
- `loading.tsx` needs no change: the design panel is not part of the skeleton. Verify before merging.

---

## 15. Acceptance criteria

### 15.1 Functional (public)

- [ ] Every existing restaurant (menuDesign `NULL`) renders its refreshed preset with no owner action. Spot-check one real row per legacy theme on a preview deploy.
- [ ] Every preset × knob value renders without errors. A smoke test renders `PublicMenuView` server-side with `renderToString` for each preset, and once for each value of each knob.
- [ ] `?source=qr`:
  - the splash is in the SSR HTML, with no menu-then-splash flash;
  - the URL is cleaned;
  - the analytics `sourceType` is `qr`;
  - after the splash, the active pill follows scrolling **and** `menu_product_view` events arrive (Network tab).
- [ ] Reduced motion: no splash at all, no animations, instant jumps.
- [ ] `?lang=en`:
  - EN copy;
  - uppercase labels are correct ("CHEF'S PICK", not "PİCK");
  - prices formatted for `en-US`.
- [ ] The cover renders only through `/api/menu/<slug>/img/cover?v=…`. Removing it returns 404 `no-store`, and the menu falls back to the centred header.
- [ ] View source: no `data:image` anywhere in the HTML, RSC or JSON-LD. JSON-LD is valid in the Rich Results Test.
- [ ] The status bar `theme-color` equals the banner colour on banner presets, and `bg` otherwise. There is no white strip under short dark menus or on iOS overscroll.
- [ ] Builder preview at 375 px shows the same layout as a real 375 px phone (container queries).

### 15.2 Accessibility

- [ ] axe / Lighthouse accessibility ≥ 95 on every preset.
- [ ] Keyboard: skip link → nav → each card opens with Enter/Space → the sheet traps focus → ESC closes → focus returns to the card.
- [ ] VoiceOver and TalkBack: card names include the price and the sold-out state; full allergen lists are read.
- [ ] No text under 12 px. Touch targets ≥ 44 px.
- [ ] Contrast spot-checks with DevTools on Lime, Black, Sky and Default on white, cream, ink and night all pass AA.

### 15.3 Safety

- [ ] `rg -i clash src/components/menu src/lib/menu-*` finds nothing (except the warning comment in `menu-fonts.ts`). The computed `font-family` of every `h1`–`h3` on the menu is a whitelisted family.
- [ ] The theme route rejects unknown keys, SVG or http covers, `rgb()` colours and taglines that are empty or over 80 characters after sanitising. A tagline such as `<b>x</b>` is stored as plain text and renders escaped, never as HTML.
- [ ] The `style` attribute on `data-menu-root` contains only custom properties from §7.4 and `color-scheme`.

### 15.4 Performance

- [ ] The `/menu/[slug]` First Load JS in the `next build` route table is ≤ today's figure. Record both numbers in the PR.
- [ ] Font budget ≤ 150 KB (§10.3). CLS < 0.02 under Fast 4G throttling for `classic`, `elegant` and `gallery` (with a cover).
- [ ] The page query never selects `menuCoverUrl`: check the Prisma query log once.

### 15.5 Studio

- [ ] Draft only until Uygula. One PATCH carries only the changed keys. **Geri al** restores them.
- [ ] After Apply, the screen does not revert: the `confirmedSeq` includes the new keys.
- [ ] A preset switch drops knobs and keeps the tagline; the inline **Geri al** restores them locally.
- [ ] Contrast note: appears for Lime on white; disappears for Black on white.
- [ ] Cover: upload, remove and the "Kapağı üst alanda göster" flow all work. Apply is blocked while an upload runs.
- [ ] A viewer sees disabled controls. With the module off, the panel is unavailable with its reason. Access loss mid-session closes the panel and discards the draft.
- [ ] Leave-guard on X, Vazgeç, Esc, backdrop and the header toggle; `useUnsavedGuard` covers the panel.
- [ ] The panel works at 375 px (sheet), at 768 px (tablet split) and at 1440 px (docked).

### 15.6 Visual matrix (owner sign-off on a preview deploy before merge)

**For every one of the 12 presets, at 375 px, 768 px and 1440 px viewport width**, take screenshots of:
- the top of the page (masthead + nav);
- one full category;
- the open product sheet;
- the empty state (once per preset, at 375 px).

**Fixture menu** (seed it on the preview deploy):

| Category | Contents |
|---|---|
| A | 6 items, all with photos |
| B | 5 items, 2 with photos |
| C | 4 items, no photos |
| Content stress | Long Turkish names (`İSKENDER · Şiş · ığüşöç`, 2 lines); one item with 6 badges and 8 allergens; one sold-out item; one 600-character description |
| Nav stress | 14 categories (nav overflow) |
| Restaurant | A logo, a tagline, a cover |

**Accents** per preset:
- the default `#1A73E8`;
- Lime `#C6F24E`;
- Black `#0A0A0A`, on dark presets only.

**Extra checks:**
- On `classic` at 375 px, each surface, each typeface and each item layout once.
- The builder preview at 375 px for 4 presets.
- Pass criteria:
  - nothing overlaps;
  - no horizontal page scroll;
  - the sticky nav sits flush under nothing (no 4 px gap or overlap);
  - italics only appear in serif typefaces;
  - Turkish glyphs render in every face.

---

## 16. Deferred, rejected and risks

**Phase 2 candidates (not in this change):**
- `?w=160|320|720` thumbnail widths on the image route (sharp is already a dependency) plus `srcset`;
- a featured rail;
- a `?lang` toggle in the masthead;
- an EN tagline;
- "Marka kapağını kullan" (copy `BrandSettings.coverImageUrl`);
- a draft-aware full-screen preview;
- an optional owner background colour as a `v: 2` key;
- moving the page to ISR (it is dynamic because it awaits `searchParams`);
- not loading the logo blob for its version.

**Rejected:**
- auto dark mode;
- owner background, card and text hex colours;
- show/hide toggles;
- the image-shape knob;
- growing `MENU_THEMES`;
- the sheet as a dynamic import;
- `scrollIntoView` for category jumps;
- overlays inside the `@container`.

**Risks and mitigations:**

| Risk | Mitigation |
|---|---|
| Every live menu changes look on merge | Each preset keeps its identity (§4.3); the visual matrix gets owner sign-off; a one-time panel note; owners can switch instantly and use Undo |
| `ThemeSync` never confirms the new keys | `THEME_KEYS`-driven `confirmedSeq` plus a test |
| `DbNull` vs `JsonNull` | Always write `Prisma.DbNull`; the reader treats JSON null as null; a route test |
| Font weight on 3G | One family per menu, a budget gate with a concrete fallback, the swap hidden under the splash for QR visitors |
| Container containment vs fixed overlays | Overlays are siblings of the container (§9.1) |
| Admin desynchronises family and preset | The admin route rewrites the design (§8.2); render-time guard (§5.2) |
| `color-mix` / `backdrop-filter` missing | `@supports` with a solid fallback |
| Hydration mismatch | Pure resolver; `inert` only after mount; splash state identical on the server and the client |

---

## 17. CLAUDE.md updates (chunk 3, same change)

- **§3 Depolama:** add rows for `restaurants.menu_cover_url` and `restaurants.menu_design`.
  - `menu_cover_url` (TEXT): a raster data URL ≤ 520,000 characters, served only through `/api/menu/[slug]/img/cover?v=<menu_cover_version>`; the version is a sha1 prefix written with it.
  - `menu_design` (JSONB): versioned enum choices, read with `readMenuDesign`, written only through `MenuDesignWriteSchema`; SQL NULL means the legacy look.
- **§6 Dizin Haritası:** `components/menu/` → "PublicMenuView (tek renderer, 12 stil), parts/, menu-fonts, menu-labels, ProductDetailModal, MenuSplash".
- **§11 Font:** replace the "Space Grotesk istisnası" paragraph:
  - Menus use the OFL whitelist: Space Grotesk, Inter and JetBrains Mono (from `fonts.ts`), plus Fraunces, Newsreader, Instrument Serif, Bricolage Grotesque and Playfair Display (`src/components/menu/menu-fonts.ts`; `preload:false`, `latin` + `latin-ext`, literal options).
  - They are selected by `resolveMenuDesign`, which writes `--font-menu-heading` and re-points `--font-heading` on the menu scope.
  - Clash Display is never in menu scope; this is tested.
- **§12.1 Görünüm:**
  - presets + 10 knobs + tagline + cover, in tabs (Stil / Renk / Yazı / Düzen / Marka);
  - `ThemeSync` has 5 keys (`THEME_KEYS`);
  - a preset switch resets style knobs and keeps the tagline;
  - the contrast note;
  - still a local draft, one PATCH and Geri al.
- **§12.2:** rewrite it:
  - one token-driven renderer, with 12 presets on 7 families (`menuTheme` = family, `menuDesign.preset` = preset);
  - the resolver and the AA guarantee (`menu-palette.ts`);
  - container queries only (guard test);
  - the splash as an overlay;
  - the DOM contract (§9.13).
  - Remove the drift: Elegant never loaded Manrope, and Gastronomy's background was `#0A0A0A`, not `#0E1525`.
- **§12.2.1:** the sheet's dialog semantics (focus trap, `inert`); the splash overlay with SSR `initialSplash`.
- **§13.7:** "PublicMenuView (7 tema)" → "PublicMenuView (12 stil)".
