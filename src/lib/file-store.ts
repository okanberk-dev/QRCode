/**
 * Small public files (site logo, favicon, share images) stored in Postgres
 * (CLAUDE.md §55). Replaces Supabase Storage: there are only a handful of
 * files, so keeping them in the database means every database backup holds
 * them too, with no extra service to run or back up.
 *
 * Paths carry a timestamp (`site/logo-1776886785992.webp`), so a stored file
 * never changes and GET /files/[...path] serves it as immutable.
 */
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';

/** Public URL prefix of stored files (outside /api, so crawlers may fetch share images). */
export const FILES_URL_PATH = '/files/';

/** Raster images only: uploads are converted by sharp, SVG is never stored. */
export const STORED_FILE_TYPES = new Set(['image/png', 'image/webp', 'image/jpeg', 'image/x-icon']);

export const MAX_STORED_FILE_BYTES = 2 * 1024 * 1024;

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$/;

/** `site/logo-1.webp` style paths: no empty, `.` or `..` segments, no odd characters. */
export function isSafeFilePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0 || path.length > 300) return false;
  const segments = path.split('/');
  if (segments.length > 5) return false;
  return segments.every((s) => SEGMENT.test(s) && s !== '.' && s !== '..');
}

export function publicFileUrl(path: string, siteUrl: string = SITE_URL): string {
  return `${siteUrl.replace(/\/$/, '')}${FILES_URL_PATH}${path}`;
}

export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Stores (or replaces) a file and returns its absolute public URL. */
export async function saveFile(path: string, data: Buffer, contentType: string): Promise<string> {
  if (!isSafeFilePath(path)) throw new Error('invalid_file_path');
  if (!STORED_FILE_TYPES.has(contentType)) throw new Error('unsupported_file_type');
  if (data.length === 0 || data.length > MAX_STORED_FILE_BYTES) throw new Error('file_too_large');
  const sha256 = sha256Hex(data);
  // Prisma 6 types Bytes as Uint8Array<ArrayBuffer>; copy out of Node's pool.
  const bytes = new Uint8Array(data);
  await prisma.storedFile.upsert({
    where: { path },
    create: { path, contentType, size: bytes.length, sha256, data: bytes },
    update: { contentType, size: bytes.length, sha256, data: bytes },
  });
  return publicFileUrl(path);
}
