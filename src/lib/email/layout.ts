import { PULSE, FONTS } from './tokens';
import { renderHeader, renderFooter, type FooterParams } from './components';

export interface PulseLayoutParams {
  subject: string;
  preheader?: string;
  content: string;
  eyebrow?: string;
  darkHeader?: boolean;
  footer?: FooterParams;
}

// Mobile-first email skeleton. Table-based, max-width 640px, MSO-aware,
// Google Fonts with system fallback so Outlook downgrades gracefully.
//
// The single <style> block holds:
//   - @media (max-width:600px) — 2-column rows collapse to 1 col
//     (any <td class="stack-col"> goes full width)
//   - .stack-row table {} so any nested grid grids stack as well
//   - Hidden preheader + dark mode tweaks
//
// Anything important should also be inline-styled because Gmail strips
// <style> blocks in clipped views.
export function pulseLayout(params: PulseLayoutParams): string {
  const { subject, preheader = '', content, eyebrow, darkHeader = false, footer = {} } = params;
  return `<!DOCTYPE html>
<html lang="${footer.locale === 'en' ? 'en' : 'tr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${subject}</title>
<!--[if mso]>
<style type="text/css">
  body, table, td { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
body, table, td, p, a, h1, h2 { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; max-width:100%; height:auto; }
a { color:${PULSE.graphite}; }
@media only screen and (max-width: 600px) {
  table.bz-shell { width:100% !important; }
  td.bz-pad { padding:24px 20px !important; }
  td.bz-pad-tight { padding:18px 20px !important; }
  td.stack-col { display:block !important; width:100% !important; padding:8px 0 !important; border-right:none !important; text-align:left !important; }
  td.col-half { width:100% !important; display:block !important; padding:6px 0 !important; }
  table.stack-row, table.stack-row > tbody, table.stack-row > tbody > tr { display:block !important; width:100% !important; }
  table.grid-4 td.cell { display:inline-block !important; width:50% !important; box-sizing:border-box; }
  .badge-absolute { position:static !important; display:inline-block !important; margin:0 0 8px 0 !important; top:auto !important; right:auto !important; }
  table.bar-chart td { padding:0 2px !important; }
  h1.bz-h1 { font-size:32px !important; line-height:1.1 !important; }
  h1.bz-h1-lg { font-size:36px !important; line-height:1.1 !important; }
  .bz-hide-mobile { display:none !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${PULSE.n100};font-family:${FONTS.body};color:${PULSE.graphite};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PULSE.n100};opacity:0;">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n100};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" class="bz-shell" cellpadding="0" cellspacing="0" border="0" width="640" style="width:640px;max-width:640px;background:${PULSE.pure};border-radius:14px;overflow:hidden;">
        <tr><td>${renderHeader({ eyebrow, dark: darkHeader })}</td></tr>
        <tr><td>${content}</td></tr>
        <tr><td>${renderFooter(footer)}</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
