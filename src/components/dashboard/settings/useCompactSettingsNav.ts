"use client";

import { useSyncExternalStore } from "react";

/**
 * Settings hub breakpoint — below `md` (≤767px) sections render as an
 * accordion instead of tab panels.
 *
 * `useSyncExternalStore` instead of `useState(false)` + `useEffect`: the old
 * pattern rendered the desktop tree, then flipped a state flag after mount,
 * which remounted every section (and re-ran their fetches) on phones. The
 * server snapshot is still `false` (no viewport on the server), so callers
 * must keep their tree shape identical across both values — layout switches
 * are done with responsive CSS; this hook only drives JS-only decisions
 * (lazy mounting, skipping duplicate widgets).
 */
const COMPACT_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(COMPACT_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useCompactSettingsNav(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useCompactSettingsNav;
