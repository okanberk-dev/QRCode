/**
 * Marketing media slots (CLAUDE.md §62).
 *
 * Photos: licensed Unsplash stock from the design package, recompressed into
 * public/images/site/ (list and licence: docs/design/MARKETING_IMAGES.md).
 * Replace a photo by saving a new file under the same name.
 *
 * Videos: the design has video positions (hero background, closing panel).
 * They are empty until you add your own file: put an .mp4 under
 * public/videos/ and set its path here. While a slot is null the photo is
 * shown. Do not use another company's videos or photos.
 */
export const SITE_VIDEOS: { hero: string | null; closing: string | null } = {
  hero: null,
  closing: null,
};

export const img = (name: string) => `/images/site/${name}.jpg`;
