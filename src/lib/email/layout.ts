import { PULSE, FONTS, MAIL_FONT_CSS_URL } from './tokens';
import { renderHeader, renderFooter, type FooterParams } from './components';

// Idempotent HTML escape for the two raw interpolation points below (<title>,
// hidden preheader). Callers pass plain text (it is also the mail Subject
// header) but several already escape it: a '&' that already starts an entity
// is left alone, so escaping twice never produces '&amp;amp;'.
function escapeHtmlOnce(value: string): string {
  return value
    .replace(/&(?!(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface PulseLayoutParams {
  subject: string;
  preheader?: string;
  content: string;
  eyebrow?: string;
  darkHeader?: boolean;
  footer?: FooterParams;
}

// Mobile-first email skeleton. Table-based, fluid up to 640px, MSO-aware,
// Poppins via <link>/@import with a geometric system-sans fallback so Gmail /
// Outlook (which ignore web fonts) degrade gracefully.
//
// Fluid-by-default: the shell is `width:100%;max-width:640px` INLINE, so a
// client that strips <style> (Gmail with a non-Google account, some webmails)
// still never overflows a phone. Outlook desktop ignores max-width, so it gets
// a fixed 640px "ghost table" through MSO conditional comments.
//
// The single <style> block holds:
//   - base: word-wrapping safety net (long URLs/tokens never push the shell
//     wider than the viewport) + Apple/iOS text-size lock
//   - @media (max-width:600px): 2-column rows collapse to 1 col (any
//     <td class="stack-col"> goes full width), CTA buttons go full width,
//     header stacks, type scale steps down
//
// Anything important is ALSO inline-styled because Gmail strips <style> blocks
// in clipped views.
export function pulseLayout(params: PulseLayoutParams): string {
  const { subject, preheader = '', content, eyebrow, darkHeader = false, footer = {} } = params;
  // Zero-width filler after the preheader so the inbox preview line doesn't
  // pull the first body words in after it.
  const preheaderFiller = '&#8204;&nbsp;'.repeat(40);
  return `<!DOCTYPE html>
<html lang="${footer.locale === 'en' ? 'en' : 'tr'}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtmlOnce(subject)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style type="text/css">
  body, table, td, a, p, div, span, h1, h2, h3 { font-family: 'Segoe UI', Arial, sans-serif !important; }
</style>
<![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${MAIL_FONT_CSS_URL}" rel="stylesheet" type="text/css">
<style>
@import url('${MAIL_FONT_CSS_URL}');
html, body { margin:0; padding:0; width:100%; }
body, table, td, p, a, h1, h2, h3 { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
body { -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; max-width:100%; height:auto; line-height:100%; }
a { color:${PULSE.graphite}; }
/* Safety net: no long URL / token / unbroken word may widen the shell past the viewport. */
/* overflow-wrap:anywhere (not break-word): only 'anywhere' lowers a table cell's min-content
   width, so an unbroken token can't stretch the whole table past the viewport. */
td, th, p, div, span, a, h1, h2, h3, li { overflow-wrap:anywhere; word-wrap:break-word; word-break:break-word; }
.bz-break { word-break:break-all; overflow-wrap:anywhere; }
a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important; }
u + #body a { color:inherit; text-decoration:none; font-size:inherit; font-family:inherit; font-weight:inherit; line-height:inherit; }
@media only screen and (max-width: 600px) {
  html, body { width:100% !important; min-width:100% !important; }
  td.bz-outer { padding:16px 8px !important; }
  table.bz-shell { width:100% !important; max-width:100% !important; border-radius:12px !important; }
  /* Header: logo on its own row, eyebrow below it (a long eyebrow next to the
     logo used to collide at 320-360px). */
  td.bz-hdr-logo { display:block !important; width:100% !important; box-sizing:border-box !important; padding:20px 22px 6px !important; text-align:left !important; }
  td.bz-hdr-eyebrow { display:block !important; width:100% !important; box-sizing:border-box !important; padding:0 22px 18px !important; text-align:left !important; }
  td.bz-hdr-only { padding:20px 22px !important; }
  /* §38.198 — Mobile içerik shell çerçevesine bitişik durmasın:
     bz-pad 24/20 → 28/22, bz-pad-tight 18/20 → 22/22. */
  td.bz-pad { padding:28px 22px !important; }
  td.bz-pad-tight { padding:22px 22px !important; }
  td.bz-ftr, td.bz-pad-x { padding-left:22px !important; padding-right:22px !important; }
  td.stack-col { display:block !important; width:100% !important; padding:8px 0 !important; border-right:none !important; text-align:left !important; }
  td.col-half { width:100% !important; display:block !important; padding:6px 0 !important; }
  table.stack-row, table.stack-row > tbody, table.stack-row > tbody > tr { display:block !important; width:100% !important; }
  table.grid-4 td.cell { display:inline-block !important; width:50% !important; box-sizing:border-box; }
  .badge-absolute { position:static !important; display:inline-block !important; margin:0 0 8px 0 !important; top:auto !important; right:auto !important; }
  /* §38.197 — Bar chart label squish guard. 7-bar weekly-report'da 320px
     viewport'ta cell ~45px; default 11/10px label çakışıyordu. Mobile'da
     10/9px ile rahat sığar, hâlâ okunabilir. iOS auto-zoom tetiklenmez
     (bar chart number/label form input değil, span). */
  table.bar-chart td { padding:0 2px !important; }
  table.bar-chart td > div:first-child { font-size:10px !important; }
  table.bar-chart td > div:last-child { font-size:9px !important; letter-spacing:0.05em !important; }
  /* Type scale. Poppins runs ~8% wider than the previous heading/body pair,
     so display sizes step down harder on phones. */
  h1.bz-h1 { font-size:26px !important; line-height:1.18 !important; }
  h1.bz-h1-lg { font-size:30px !important; line-height:1.12 !important; }
  h2.bz-h2 { font-size:20px !important; line-height:1.25 !important; }
  /* trial-ending plan price + similar bold display numbers in cards */
  .bz-price-mobile { font-size:24px !important; line-height:1 !important; }
  .bz-hide-mobile { display:none !important; }
  .bz-show-mobile { display:block !important; max-height:none !important; overflow:visible !important; }
  /* CTA buttons: full-width, centered, comfortable 48px+ touch target. */
  a.bz-btn { display:block !important; width:auto !important; box-sizing:border-box !important; text-align:center !important; margin:0 0 10px 0 !important; padding:15px 20px !important; }
  img.bz-fluid { width:100% !important; height:auto !important; }
  .bz-follow { display:block !important; margin:10px 0 0 0 !important; }
  .bz-code { font-size:22px !important; letter-spacing:0.14em !important; }

  /* ROI templates — mobile-only sizing.
     Inline base size'lar fallback (Gmail clipping); class'lar mobile override.
     Hero h1 30→24, big number 42→32 (320-375px viewport'ta sığsın). */
  h1.bz-roi-h1 { font-size:24px !important; line-height:1.15 !important; }
  .bz-roi-bignum { font-size:32px !important; line-height:1 !important; }
  .bz-roi-bignum-sm { font-size:26px !important; line-height:1.05 !important; }
  .bz-roi-kpi-val { font-size:16px !important; }
  .bz-roi-kpi-cell { padding:11px !important; }
  .bz-roi-card { padding:18px !important; }
}
</style>
</head>
<body id="body" style="margin:0;padding:0;background:${PULSE.n100};font-family:${FONTS.body};color:${PULSE.graphite};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PULSE.n100};opacity:0;">${escapeHtmlOnce(preheader)}${preheaderFiller}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${PULSE.n100};">
  <tr>
    <!-- §38.198 — Outer viewport→shell padding 24/12 → 32/16. Desktop'ta
         shell çevresinde N100 zemin biraz daha cömert görünür; mobilde
         .bz-outer 16/8'e iner (Poppins geniş — içerik alanı ~260px'in
         altına düşmesin). -->
    <td align="center" class="bz-outer" style="padding:32px 16px;">
      <!--[if mso]><table role="presentation" width="640" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" class="bz-shell" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:640px;background:${PULSE.pure};border-radius:14px;overflow:hidden;">
        <tr><td>${renderHeader({ eyebrow, dark: darkHeader })}</td></tr>
        <tr><td>${content}</td></tr>
        <tr><td>${renderFooter(footer)}</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}
