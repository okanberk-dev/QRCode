// Phase 7 — field-level diff between two MailTemplateRevision content
// snapshots. Used by the admin history modal so an operator can see
// "what changed in this revision" without scrolling through two JSON
// blobs and squinting.
//
// Field-level (not character-level) is the right granularity here: copy
// fields are independent strings, so showing "subject was X, now Y" is
// more actionable than a Levenshtein-style char diff. Avoids the
// jsdiff dep too (CLAUDE.md §7 — minimum dependencies).

export type DiffEntry =
  | { kind: 'added'; path: string; value: string }
  | { kind: 'removed'; path: string; value: string }
  | { kind: 'changed'; path: string; before: string; after: string };

export interface ContentDiff {
  entries: DiffEntry[];
  /** Number of fields that match — useful for "12 alan değişmedi" hint. */
  unchangedCount: number;
}

/**
 * Walk both content objects and emit a structured diff. Supports flat
 * `{key: string}` (8 templates) and nested `{variant: {key: string}}`
 * (form-confirmation). Non-string values are skipped — the API cleaner
 * already drops them, but defensive in case a corrupted revision is
 * round-tripped.
 */
export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): ContentDiff {
  const entries: DiffEntry[] = [];
  let unchanged = 0;
  const a = (before ?? {}) as Record<string, unknown>;
  const b = (after ?? {}) as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const av = a[key];
    const bv = b[key];

    // Both nested objects (form-confirmation variant) → recurse one
    // level. We don't go deeper because the schema only nests once.
    const aNested = av !== null && typeof av === 'object' && !Array.isArray(av);
    const bNested = bv !== null && typeof bv === 'object' && !Array.isArray(bv);
    if (aNested || bNested) {
      const innerA = (aNested ? av : {}) as Record<string, unknown>;
      const innerB = (bNested ? bv : {}) as Record<string, unknown>;
      const innerKeys = new Set([...Object.keys(innerA), ...Object.keys(innerB)]);
      for (const ik of innerKeys) {
        const iav = innerA[ik];
        const ibv = innerB[ik];
        const path = `${key}.${ik}`;
        if (typeof iav === 'string' && typeof ibv === 'string') {
          if (iav === ibv) unchanged += 1;
          else entries.push({ kind: 'changed', path, before: iav, after: ibv });
        } else if (typeof ibv === 'string') {
          entries.push({ kind: 'added', path, value: ibv });
        } else if (typeof iav === 'string') {
          entries.push({ kind: 'removed', path, value: iav });
        }
      }
      continue;
    }

    // Flat string field comparison.
    if (typeof av === 'string' && typeof bv === 'string') {
      if (av === bv) unchanged += 1;
      else entries.push({ kind: 'changed', path: key, before: av, after: bv });
    } else if (typeof bv === 'string') {
      entries.push({ kind: 'added', path: key, value: bv });
    } else if (typeof av === 'string') {
      entries.push({ kind: 'removed', path: key, value: av });
    }
  }

  // Stable sort: changed first, then added, then removed; alphabetical
  // by path within each group. Helps the eye scan to "what was edited"
  // before "what was added/removed".
  const order: Record<DiffEntry['kind'], number> = { changed: 0, added: 1, removed: 2 };
  entries.sort((x, y) => {
    if (order[x.kind] !== order[y.kind]) return order[x.kind] - order[y.kind];
    return x.path.localeCompare(y.path);
  });

  return { entries, unchangedCount: unchanged };
}
