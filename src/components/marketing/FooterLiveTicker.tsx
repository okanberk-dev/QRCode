'use client';

/**
 * Removed from the footer (Stage 172): the fake "CANLI / LIVE" activity feed
 * is gone and nothing imports this module any more. It is kept as an empty
 * stub only because deleting a client module while the webpack dev server is
 * running leaves a stale client entry that fails every page until a restart.
 * Delete this file together with the next dev-server restart.
 */
export default function FooterLiveTicker() {
  return null;
}
