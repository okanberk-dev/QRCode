'use client';

import { useEffect } from 'react';

/**
 * A photo dropped anywhere outside a drop zone would make the browser open the
 * file and leave the builder (spec §5.6). Drop zones carry `data-dropzone`
 * (row, row photo, photo field, logo field). dnd-kit uses pointer events, so
 * dragging rows is not affected.
 */
export function useFileDropGuard(): void {
  useEffect(() => {
    const outsideZone = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return false;
      const target = e.target instanceof Element ? e.target : null;
      return !target?.closest('[data-dropzone]');
    };
    const onDragOver = (e: DragEvent) => {
      if (!outsideZone(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    };
    const onDrop = (e: DragEvent) => {
      if (outsideZone(e)) e.preventDefault();
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}
