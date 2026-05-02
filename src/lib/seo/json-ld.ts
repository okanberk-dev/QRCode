// Safe JSON-LD serializer for inline `<script type="application/ld+json">`
// blocks (CLAUDE.md §37 render-XSS sweep, 2026-05).
//
// Plain `JSON.stringify(value)` is NOT safe inside an HTML <script> block:
// the DOM parser doesn't honour JSON's string-escape rules, it scans the
// raw bytes for `</script` to decide where the script tag ends. So
// embedding any user-controlled string that happens to contain a literal
// `</script>` (or `<!--`, or `-->`) breaks out of the script element and
// can drop arbitrary HTML — a stored XSS sink even when the data is
// produced by `JSON.stringify` because that function never escapes `<`.
//
// Mitigation: replace the parser-relevant byte sequences with their
// JavaScript Unicode escapes. The output is still valid JSON (the parser
// resolves `<` back to `<` at runtime), so `JSON.parse` of an inline
// `<script>` block keeps working.
//
// Reference: OWASP "Output Encoding" rule 3.2 (HTML script block).
//
// ## Usage
//
// ```tsx
// import { jsonLdString } from '@/lib/seo/json-ld';
//
// <script
//   type="application/ld+json"
//   dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
// />
// ```
//
// New JSON-LD blocks MUST use this helper; lint review on every PR
// (CLAUDE.md §37.2 disipline).

export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    // `<` outside a string literal lets `</script>` escape the tag.
    // `<` survives JSON.parse and renders identically.
    .replace(/</g, '\\u003c')
    // Defence-in-depth — `-->` ends an HTML comment block. JSON-LD blocks
    // are never wrapped in comments today but a future inline-comment
    // wrapper would otherwise be a fresh sink.
    .replace(/-->/g, '--\\u003e')
    // U+2028 / U+2029 are line separators that legacy JS parsers treat as
    // newlines inside string literals; modern parsers don't, but JSON-LD
    // blocks should still be byte-stable across parser quirks.
    .replace(/ /g, '\\u2028')
    .replace(/ /g, '\\u2029');
}
