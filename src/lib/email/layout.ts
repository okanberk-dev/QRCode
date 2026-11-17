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

// The head carries two <style> blocks on purpose. Gmail drops a whole block
// when it hits CSS it can't parse (an @import, an attribute or pseudo-class
// selector, an id selector on older builds) or when the block passes 8192
// characters. So:
//   CORE_CSS        — only element/class/descendant selectors and one
//                     max-width media query: the phone layout (stacked
//                     columns, full-width buttons, smaller type, tighter
//                     padding). Gmail keeps it.
//   CLIENT_FIX_CSS  — Apple / iOS / Gmail-iOS fixes that use attribute, id,
//                     sibling and child selectors. If a client throws this
//                     block away, nothing about the layout changes.
// The web font loads through the <link> above only (Gmail strips @import and
// ignores web fonts anyway; Apple Mail honours <link>). No CSS comments in the
// output: they count toward Gmail's 8192-character limit.
//
// Mobile overrides, by class:
//   bz-outer / bz-shell     outer gutter 16/8, shell radius 12
//   bz-hdr-*                header logo and eyebrow on separate rows
//   bz-pad / bz-pad-tight   content padding 28/22 and 22/22 (§38.198)
//   bz-ftr                  footer side padding 22
//   stack-col / col-half    two-column rows collapse to one column
//   badge-absolute          trial-ending "recommended" badge goes static
//   bz-h1 / bz-h1-lg / bz-h2, bz-price-mobile, bz-roi-*   type scale steps down
//   bz-btn                  full-width CTA, 48px+ touch target
const CORE_CSS = [
  'html,body{margin:0;padding:0;width:100%;}',
  'body,table,td,p,a,h1,h2,h3{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}',
  'table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}',
  'img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;line-height:100%;}',
  `a{color:${PULSE.graphite};}`,
  // overflow-wrap:anywhere (not break-word): only 'anywhere' lowers a table
  // cell's min-content width, so an unbroken token can't stretch the table.
  'td,th,p,div,span,a,h1,h2,h3,li{overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word;}',
  '.bz-break{word-break:break-all;overflow-wrap:anywhere;}',
  '@media only screen and (max-width:600px){',
  'html,body{width:100% !important;min-width:100% !important;}',
  'td.bz-outer{padding:16px 8px !important;}',
  'table.bz-shell{width:100% !important;max-width:100% !important;border-radius:12px !important;}',
  'td.bz-hdr-logo{display:block !important;width:100% !important;box-sizing:border-box !important;padding:20px 22px 6px !important;text-align:left !important;}',
  'td.bz-hdr-eyebrow{display:block !important;width:100% !important;box-sizing:border-box !important;padding:0 22px 18px !important;text-align:left !important;}',
  'td.bz-hdr-only{padding:20px 22px !important;}',
  'td.bz-pad{padding:28px 22px !important;}',
  'td.bz-pad-tight{padding:22px 22px !important;}',
  'td.bz-ftr{padding-left:22px !important;padding-right:22px !important;}',
  'td.stack-col{display:block !important;width:100% !important;padding:8px 0 !important;border-right:none !important;text-align:left !important;}',
  'td.col-half{width:100% !important;display:block !important;padding:6px 0 !important;}',
  '.badge-absolute{position:static !important;display:inline-block !important;margin:0 0 8px 0 !important;top:auto !important;right:auto !important;}',
  'h1.bz-h1{font-size:26px !important;line-height:1.18 !important;}',
  'h1.bz-h1-lg{font-size:30px !important;line-height:1.12 !important;}',
  'h2.bz-h2{font-size:20px !important;line-height:1.25 !important;}',
  '.bz-price-mobile{font-size:24px !important;line-height:1 !important;}',
  '.bz-hide-mobile{display:none !important;}',
  '.bz-show-mobile{display:block !important;max-height:none !important;overflow:visible !important;}',
  'a.bz-btn{display:block !important;width:auto !important;box-sizing:border-box !important;text-align:center !important;margin:0 0 10px 0 !important;padding:15px 20px !important;}',
  'img.bz-fluid{width:100% !important;height:auto !important;}',
  '.bz-follow{display:block !important;margin:10px 0 0 0 !important;}',
  '.bz-code{font-size:22px !important;letter-spacing:0.14em !important;}',
  'h1.bz-roi-h1{font-size:24px !important;line-height:1.15 !important;}',
  '.bz-roi-bignum{font-size:32px !important;line-height:1 !important;}',
  '.bz-roi-bignum-sm{font-size:26px !important;line-height:1.05 !important;}',
  '.bz-roi-kpi-val{font-size:16px !important;}',
  '.bz-roi-kpi-cell{padding:11px !important;}',
  '.bz-roi-card{padding:18px !important;}',
  '}',
].join('\n');

const CLIENT_FIX_CSS = [
  'body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}',
  'a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important;}',
  'u + #body a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit;}',
  '@media only screen and (max-width:600px){',
  'table.stack-row,table.stack-row > tbody,table.stack-row > tbody > tr{display:block !important;width:100% !important;}',
  '}',
].join('\n');

// Mobile-first email skeleton. Table-based, fluid up to 640px, MSO-aware,
// Poppins via <link> with a geometric system-sans fallback so Gmail /
// Outlook (which ignore web fonts) degrade gracefully.
//
// Fluid-by-default: the shell is `width:100%;max-width:640px` INLINE, so a
// client that strips <style> (Gmail with a non-Google account, some webmails)
// still never overflows a phone. Outlook desktop ignores max-width, so it gets
// a fixed 640px "ghost table" through MSO conditional comments.
//
// The <style> blocks (see CORE_CSS / CLIENT_FIX_CSS above) add the word-wrap
// safety net and the phone layout. Anything important is ALSO inline-styled
// because some clients (Gmail app on non-Google accounts) drop <style>.
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
${CORE_CSS}
</style>
<style>
${CLIENT_FIX_CSS}
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
