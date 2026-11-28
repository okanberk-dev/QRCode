/**
 * Meta description for search results: at most `max` characters, cut at a
 * word boundary with an ellipsis. Legal documents put the full company name
 * into their summary, which pushed some descriptions past 170 characters;
 * the page body still shows the full text.
 */
export function metaDescription(text: string | null | undefined, max = 160): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}
