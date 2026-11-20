'use client';

import { useCallback } from 'react';
import { compressImage } from '@/lib/client-image';
import { mapMenuApiError } from '@/lib/menu-api-error';
import { getMenuCopy } from '../menu-i18n';
import { menuApi } from './menu-api';

/** The stored data URL, or a sentence the owner can read. */
export type PhotoUploadResult = { ok: true; url: string } | { ok: false; message: string };

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Image pipeline shared by row photos, the item panel and the design logo
 * field (must-keep #13): `image/*` check → `compressImage` in the browser →
 * > 5 MB refused → `POST …/menu/upload` (`{ file, kind }`) → data URL. Known
 * failures keep their own sentence (too large, can't be processed, no
 * permission, too many requests); anything else — a dropped connection
 * included — is the photo-specific "Yüklenemedi. Tekrar dene.".
 *
 * Object-URL previews and the "only the latest upload writes" sequence guard
 * live with the component that shows the photo (`RowPhoto`, `PhotoField`).
 */
export function usePhotoUpload(restaurantId: string, isTr: boolean) {
  return useCallback(
    async (file: File, kind: 'item' | 'logo' | 'cover'): Promise<PhotoUploadResult> => {
      const failed = getMenuCopy(isTr ? 'tr' : 'en').photo.failed;
      if (!file.type.startsWith('image/')) {
        return { ok: false, message: mapMenuApiError({ code: 'IMAGE_UNPROCESSABLE' }, isTr) };
      }
      const generic = mapMenuApiError(null, isTr);
      const sentence = (message: string, network: boolean) => (network || message === generic ? failed : message);
      try {
        const compressed = await compressImage(
          file,
          // The server still resizes the cover to 1600×900 and caps it at 380 KB.
          kind === 'item'
            ? { maxDim: 960, quality: 0.8 }
            : kind === 'cover'
              ? { maxDim: 1600, quality: 0.82 }
              : { maxDim: 1024, quality: 0.85 },
        );
        if (compressed.size > MAX_BYTES) {
          return { ok: false, message: mapMenuApiError({ status: 413, code: 'IMAGE_TOO_LARGE' }, isTr) };
        }
        const r = await menuApi(restaurantId, isTr).uploadImage(compressed, kind);
        if (!r.ok) return { ok: false, message: sentence(r.message, r.status === 0) };
        const url = r.data?.url;
        return url ? { ok: true, url } : { ok: false, message: failed };
      } catch (e) {
        return { ok: false, message: sentence(mapMenuApiError(e as Error, isTr), true) };
      }
    },
    [restaurantId, isTr],
  );
}

/** Is this a file the pipeline accepts at all (for drop / paste handlers)? */
export const isImageFile = (file: File | null | undefined): file is File => Boolean(file && file.type.startsWith('image/'));
