const ALLOWED_TAGS = new Set([
  'p',
  'h2',
  'h3',
  'strong',
  'b',
  'em',
  'i',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'br',
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeHref(value: string | null) {
  if (!value) return '';
  const href = value.trim();
  if (/^(https?:\/\/|mailto:|\/)/i.test(href)) {
    return href;
  }
  return '';
}

function normalizeLegacyHtml(input: string) {
  return input
    .replace(/<\s*div\b[^>]*>/gi, '<p>')
    .replace(/<\s*\/\s*div\s*>/gi, '</p>')
    .replace(/<\s*span\b[^>]*>/gi, '')
    .replace(/<\s*\/\s*span\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|svg|canvas)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

export function sanitizeBlogContent(input: string) {
  const normalized = normalizeLegacyHtml(input || '');

  return normalized
    .replace(/<\s*(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, closing: string, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return '';
      }
      if (closing) {
        return tag === 'br' ? '' : `</${tag}>`;
      }
      if (tag === 'br') return '<br>';
      if (tag === 'a') {
        const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
        const href = sanitizeHref(hrefMatch?.[1] ?? null);
        return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">` : '<a>';
      }
      return `<${tag}>`;
    })
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToBlogContent(input: string) {
  const blocks = input
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean);

  return blocks
    .map(block => {
      if (block.startsWith('>')) {
        return `<blockquote>${escapeHtml(block.replace(/^>\s?/, ''))}</blockquote>`;
      }
      if (block.startsWith('## ')) {
        return `<h2>${escapeHtml(block.slice(3))}</h2>`;
      }
      if (block.startsWith('### ')) {
        return `<h3>${escapeHtml(block.slice(4))}</h3>`;
      }
      return `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n\n');
}
