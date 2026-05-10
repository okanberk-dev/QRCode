import { getSectorPlatforms } from '@/lib/sector-platforms';

export function isValidBusinessSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function getCreateBusinessPlatformIds(category: string): string[] {
  return Array.from(getSectorPlatforms(category));
}

