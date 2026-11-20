'use client';

import { useCallback, useRef, useState } from 'react';
import { createSerialQueue, type SerialQueue } from '../menu-queue';

/**
 * Per-key serial write queue for the page (spec §5.3) plus the number of
 * requests queued or in flight (`pending`: SaveIndicator "Kaydediliyor…" and
 * the leave guard).
 */
export function useSerialQueue(): { enqueue: SerialQueue; pending: number } {
  const queue = useRef<SerialQueue | null>(null);
  if (!queue.current) queue.current = createSerialQueue();
  const [pending, setPending] = useState(0);

  const enqueue = useCallback(<T,>(key: string, task: () => Promise<T>): Promise<T> => {
    setPending((n) => n + 1);
    const done = () => setPending((n) => Math.max(0, n - 1));
    return queue.current!(key, task).then(
      (value) => {
        done();
        return value;
      },
      (reason) => {
        done();
        throw reason;
      },
    );
  }, []) as SerialQueue;

  return { enqueue, pending };
}
