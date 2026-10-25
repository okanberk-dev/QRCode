// HTML string builders for Pulse mail templates.
// Email clients differ wildly on CSS support; everything here is inline
// styles + table primitives + a small <style> block in layout.ts that
// handles mobile breakpoints. No flex/grid where it can be avoided.

import { PULSE, FONTS, INSTAGRAM_HANDLE, INSTAGRAM_URL, mailAssetUrl } from './tokens';

export function renderLogo(opts: { size?: number; dark?: boolean; accent?: string } = {}): string {
  const size = opts.size ?? 22;
  const dark = !!opts.dark;
  const fg = dark ? PULSE.pure : PULSE.graphite;
  const markSize = Math.round(size * 1.4);
  // PNG, not inline <svg>: Gmail + Outlook strip <svg>, which left the mark
  // as an empty gap next to the wordmark. `accent` is baked into the PNG
  // (lime spark) — the option is kept only so old callers still compile.
  const mark = mailAssetUrl(dark ? 'buaze-mark-light.png' : 'buaze-mark-dark.png');
  return `
    <span style="display:inline-block;line-height:1;vertical-align:middle;white-space:nowrap;">
      <img src="${mark}" width="${markSize}" height="${markSize}" alt="" style="display:inline-block;vertical-align:middle;border:0;outline:none;width:${markSize}px;height:${markSize}px;">
      <span style="font-family:${FONTS.heading};font-weight:600;font-size:${size}px;color:${fg};letter-spacing:-0.03em;line-height:1;margin-left:6px;vertical-align:middle;">buaze</span>
    </span>
  `;
}

export function renderEcgDivider(opts: { color?: string; height?: number } = {}): string {
  const color = opts.color ?? PULSE.lime;
  // `height` is kept for old callers; the PNG keeps its own 600:28 aspect ratio.
  void opts.height;
  // PNG (not inline <svg> — stripped by Gmail/Outlook). Two baked colours:
  // lime (default) and graphite. The 600:28 aspect ratio is preserved; the
  // wrapper clamps the rendered height so the line stays slim on wide shells.
  const asset = color === PULSE.graphite ? 'buaze-ecg-graphite.png' : 'buaze-ecg-lime.png';
  return `
    <img src="${mailAssetUrl(asset)}" width="600" height="28" alt="" class="bz-fluid" style="display:block;width:100%;max-width:100%;height:auto;border:0;outline:none;">
  `;
}

export function renderEyebrow(text: string, color: string = PULSE.n500): string {
  return `<div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.14em;line-height:1.5;color:${color};text-transform:uppercase;font-weight:600;">${text}</div>`;
}

export function renderButton(opts: { href: string; label: string; variant?: 'dark' | 'lime'; size?: 'md' | 'lg' }): string {
  const { href, label } = opts;
  const variant = opts.variant ?? 'dark';
  const size = opts.size ?? 'md';
  const padding = size === 'lg' ? '16px 32px' : '14px 24px';
  const fontSize = size === 'lg' ? 15 : 14;
  const bg = variant === 'lime' ? PULSE.lime : PULSE.graphite;
  const fg = variant === 'lime' ? PULSE.graphite : PULSE.pure;
  return `<a href="${href}" class="bz-btn" style="display:inline-block;background:${bg};color:${fg};padding:${padding};border-radius:10px;font-family:${FONTS.body};font-weight:600;font-size:${fontSize}px;letter-spacing:0;text-decoration:none;line-height:1.2;mso-padding-alt:0;">${label}</a>`;
}

export function renderHeader(opts: { eyebrow?: string; dark?: boolean } = {}): string {
  const dark = !!opts.dark;
  const bg = dark ? PULSE.graphite : PULSE.pure;
  const borderBottom = dark ? '' : `border-bottom:1px solid ${PULSE.n200};`;
  const eyebrowColor = dark ? PULSE.n400 : PULSE.n500;
  // No eyebrow → single logo cell (no empty right cell eating width). With an
  // eyebrow, mobile CSS (.bz-hdr-logo / .bz-hdr-eyebrow) stacks the two so a
  // long eyebrow can never collide with the logo on 320–360px screens.
  const cells = opts.eyebrow
    ? `<td class="bz-hdr-logo" style="padding:28px 36px;" align="left" valign="middle">${renderLogo({ size: 20, dark })}</td>
        <td class="bz-hdr-eyebrow" style="padding:28px 36px 28px 0;" align="right" valign="middle">${renderEyebrow(opts.eyebrow, eyebrowColor)}</td>`
    : `<td class="bz-hdr-only" style="padding:28px 36px;" align="left" valign="middle">${renderLogo({ size: 20, dark })}</td>`;
  return `
    <table role="presentation"${opts.eyebrow ? ' class="stack-row"' : ''} cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${bg};${borderBottom}">
      <tr>
        <!-- §38.198 — Header padding 24px 32px → 28px 36px; logo + eyebrow shell çerçevesine bitişik durmasın. -->
        ${cells}
      </tr>
    </table>
  `;
}

export interface FooterParams {
  unsubscribeUrl?: string;
  unsubText?: string;
  locale?: 'tr' | 'en';
}

export function renderFooter(params: FooterParams = {}): string {
  const isTr = params.locale !== 'en';
  const unsubText = params.unsubText ?? (isTr ? 'Bu maili almak istemiyorsan' : 'If you no longer want this email');
  const unsubLink = isTr ? 'buradan çık' : 'unsubscribe here';
  const links = isTr ? ['buaze.com', 'Yardım', 'Gizlilik'] : ['buaze.com', 'Help', 'Privacy'];
  const linksLabel = isTr ? 'Bağlantılar' : 'Links';
  const followCopy = isTr ? 'Bizi takip et — vakalar, tüyolar, perde arkası.' : 'Follow us — cases, tips, behind the scenes.';
  // §38.198 — Tüzel kişilik (Buaze Bilişim A.Ş.) ve adres satırı kaldırıldı.
  // Henüz şirket kurulmadığı için hukuki disclosure üretmek yanıltıcı; sadece
  // "Buaze" brand name yeterli. Şirket kurulduğunda buraya geri eklenir.
  const tagline = isTr ? 'Her yorum bir nabız.' : 'Every review is a pulse.';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  // §38.197 — /help/page route YOK (CLAUDE.md §22 /help index vs
  // /help/[slug] detail ayrımı). Footer link 35 mail template'inden
  // çağrılıyor → daha önce her birinde dead 404 link rendered.
  const helpHref = `${appUrl}/${isTr ? 'tr' : 'en'}/help`;
  const privacyHref = isTr ? `${appUrl}/tr/gizlilik` : `${appUrl}/en/privacy`;

  const unsubBlock = params.unsubscribeUrl
    ? `${unsubText} <a href="${params.unsubscribeUrl}" style="color:${PULSE.n600};text-decoration:underline;">${unsubLink}</a>.`
    : '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-top:1px solid ${PULSE.n200};">
      <!-- §38.198 — Footer padding yatay 32px → 36px, dikey breathing
           28/18/20/18 → 32/22/24/22 ile shell çerçevesine bitişik
           durmasın. Tagline italic 11px N500. -->
      <tr>
        <td class="bz-ftr" style="padding:32px 36px 14px;">
          ${renderEcgDivider({ color: PULSE.lime, height: 18 })}
        </td>
      </tr>
      <tr>
        <td class="bz-ftr" style="padding:22px 36px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
            <tr>
              <td class="stack-col" valign="top" style="font-family:${FONTS.body};">
                ${renderLogo({ size: 16 })}
                <!-- §38.198 — Adres satırı yerine kısa Pulse tagline.
                     Hukuki disclosure (A.Ş. + Maslak adres) henüz şirket
                     kurulmadığı için kaldırıldı; gelecek scope. -->
                <div style="font-size:11px;color:${PULSE.n500};margin-top:10px;line-height:1.5;font-style:italic;">${tagline}</div>
              </td>
              <td class="stack-col" valign="top" align="right" style="font-family:${FONTS.body};">
                ${renderEyebrow(linksLabel, PULSE.n500)}
                <div style="font-size:12px;color:${PULSE.n700};line-height:1.8;margin-top:10px;">
                  <a href="${appUrl}" style="color:${PULSE.n700};text-decoration:none;border-bottom:1px solid ${PULSE.n300};">${links[0]}</a>
                  <span style="color:${PULSE.n300};margin:0 8px;">·</span>
                  <a href="${helpHref}" style="color:${PULSE.n700};text-decoration:none;border-bottom:1px solid ${PULSE.n300};">${links[1]}</a>
                  <span style="color:${PULSE.n300};margin:0 8px;">·</span>
                  <a href="${privacyHref}" style="color:${PULSE.n700};text-decoration:none;border-bottom:1px solid ${PULSE.n300};">${links[2]}</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="bz-ftr" style="padding:24px 36px 0;font-family:${FONTS.body};">
          <a href="${INSTAGRAM_URL}" style="display:inline-block;padding:10px 14px;background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:999px;text-decoration:none;vertical-align:middle;white-space:nowrap;">
            <img src="${mailAssetUrl('buaze-instagram.png')}" width="16" height="16" alt="" style="display:inline-block;vertical-align:middle;border:0;width:16px;height:16px;">
            <span style="font-family:${FONTS.label};font-size:12px;color:${PULSE.graphite};font-weight:500;margin-left:8px;vertical-align:middle;">${INSTAGRAM_HANDLE}</span>
          </a>
          <span class="bz-follow" style="font-family:${FONTS.body};font-size:11px;line-height:1.5;color:${PULSE.n500};margin-left:10px;vertical-align:middle;">${followCopy}</span>
        </td>
      </tr>
      <tr>
        <td class="bz-ftr" style="padding:22px 36px 32px;">
          <div style="border-top:1px solid ${PULSE.n200};padding-top:16px;font-family:${FONTS.body};font-size:11px;color:${PULSE.n400};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <!-- §38.198 — "Buaze Bilişim" → "Buaze". -->
                <td class="stack-col" align="left">© ${new Date().getFullYear()} Buaze — ${isTr ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}</td>
                <td class="stack-col" align="right">${unsubBlock}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>
  `;
}

export function renderStarRow(rating: number, opts: { size?: number; color?: string } = {}): string {
  const size = opts.size ?? 18;
  const color = opts.color ?? PULSE.graphite;
  const filled = '★'.repeat(Math.max(0, Math.min(5, rating)));
  const empty = '★'.repeat(5 - Math.max(0, Math.min(5, rating)));
  return `<span style="font-size:${size}px;letter-spacing:2px;color:${color};white-space:nowrap;">${filled}<span style="color:${PULSE.n300};">${empty}</span></span>`;
}

export interface StatCell {
  label: string;
  value: string;
  delta?: string;
}

export function renderStatGrid(stats: StatCell[], opts: { dark?: boolean } = {}): string {
  const dark = !!opts.dark;
  const labelColor = dark ? PULSE.n400 : PULSE.n500;
  const valueColor = dark ? PULSE.pure : PULSE.graphite;
  const borderColor = dark ? PULSE.n800 : PULSE.n200;
  const cells = stats.map((s, i) => `
    <td class="stack-col" valign="top" style="padding:0 16px;${i === 0 ? 'padding-left:0;' : ''}${i === stats.length - 1 ? 'padding-right:0;' : `border-right:1px solid ${borderColor};`}width:${Math.floor(100 / stats.length)}%;">
      <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.12em;font-weight:600;color:${labelColor};text-transform:uppercase;">${s.label}</div>
      <div style="font-family:${FONTS.heading};font-size:30px;font-weight:600;letter-spacing:-0.02em;color:${valueColor};line-height:1.05;margin-top:6px;">${s.value}</div>
      ${s.delta ? `<div style="margin-top:6px;font-size:12px;color:${PULSE.lime};font-weight:500;">${s.delta}</div>` : ''}
    </td>
  `).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row"><tr>${cells}</tr></table>`;
}

export function renderH1(text: string, opts: { color?: string; size?: number } = {}): string {
  const size = opts.size ?? 34;
  const color = opts.color ?? PULSE.graphite;
  // Responsive class by size so mobile CSS only ever steps a heading DOWN:
  // display (>=44) → 30px, hero (>=30) → 26px, smaller headings keep their size.
  const cls = size >= 44 ? ' class="bz-h1-lg"' : size >= 30 ? ' class="bz-h1"' : '';
  return `<h1${cls} style="font-family:${FONTS.heading};font-size:${size}px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${color};margin:0;">${text}</h1>`;
}

export function renderH2(text: string, opts: { color?: string } = {}): string {
  const color = opts.color ?? PULSE.graphite;
  return `<h2 class="bz-h2" style="font-family:${FONTS.heading};font-size:22px;font-weight:600;letter-spacing:-0.015em;line-height:1.25;color:${color};margin:0;">${text}</h2>`;
}

export function renderP(text: string, opts: { color?: string; size?: number } = {}): string {
  const size = opts.size ?? 15;
  const color = opts.color ?? PULSE.n600;
  return `<p style="font-family:${FONTS.body};font-size:${size}px;line-height:1.65;color:${color};margin:0;letter-spacing:0;">${text}</p>`;
}

export function spacer(height: number): string {
  return `<div style="height:${height}px;line-height:${height}px;font-size:1px;">&nbsp;</div>`;
}

// ─── Pixel-perfect helpers (Phase 16.1) ─────────────────────────────────
//
// Each helper renders a self-contained HTML chunk that survives Outlook + Gmail
// + iOS Mail. Where mainstream CSS is unsupported (absolute positioning,
// flex-grid) we fall back to <table>-based layouts plus a small @media query
// in layout.ts for the mobile collapse.

export interface BadgeOpts {
  text: string;
  variant?: 'lime-on-dark' | 'dark-on-lime' | 'soft';
  /** Inline = renders as a normal block. Absolute-tr = anchored top-right of
   *  its parent (used for "ÖNERİLEN" plan badge). MSO conditional with
   *  `<v:rect>` provides a comparable shape on Outlook 2007+. */
  position?: 'inline' | 'absolute-tr';
}

export function renderBadge(opts: BadgeOpts): string {
  const { text } = opts;
  const variant = opts.variant ?? 'dark-on-lime';
  const position = opts.position ?? 'inline';

  const colors = variant === 'lime-on-dark'
    ? { bg: PULSE.graphite, fg: PULSE.lime }
    : variant === 'soft'
      ? { bg: PULSE.limeSoft, fg: PULSE.graphite }
      : { bg: PULSE.graphite, fg: PULSE.lime };

  const inner = `<span style="display:inline-block;font-family:${FONTS.label};font-size:10px;letter-spacing:0.12em;background:${colors.bg};color:${colors.fg};padding:4px 10px;border-radius:6px;text-transform:uppercase;font-weight:600;line-height:1.3;">${text}</span>`;

  if (position === 'inline') return inner;

  // Absolute-tr — Outlook (mso) gets a VML rect; everyone else gets the inline span
  // wrapped in a positioned div. On mobile the @media rule in layout.ts unsticks it.
  return `<!--[if mso]>
<div style="mso-margin-top-alt:-12px;text-align:right;">${inner}</div>
<![endif]-->
<!--[if !mso]><!-->
<div class="badge-absolute" style="position:absolute;top:-10px;right:18px;z-index:2;">${inner}</div>
<!--<![endif]-->`;
}

export interface StatusPillOpts {
  text: string;
  dotColor?: string;
  textColor?: string;
  bgColor?: string;
}

export function renderStatusPill(opts: StatusPillOpts): string {
  const dotColor = opts.dotColor ?? PULSE.success;
  const textColor = opts.textColor ?? PULSE.success;
  const bg = opts.bgColor ?? 'transparent';
  // inline-block + vertical-align (NOT inline-flex): Outlook and older Gmail
  // ignore flexbox, which collapsed the dot on top of the label.
  return `<span style="display:inline-block;font-family:${FONTS.label};font-size:11px;font-weight:500;line-height:1.4;color:${textColor};background:${bg};padding:${bg !== 'transparent' ? '4px 10px' : '0'};border-radius:999px;"><span style="display:inline-block;width:6px;height:6px;background:${dotColor};border-radius:50%;vertical-align:middle;margin-right:6px;"></span><span style="vertical-align:middle;">${opts.text}</span></span>`;
}

export interface TwoColCardsParams {
  left: string;
  right: string;
  gap?: number;
}

export function renderTwoColCards(params: TwoColCardsParams): string {
  const gap = params.gap ?? 12;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
    <tr>
      <td class="stack-col col-half" valign="top" style="width:50%;padding-right:${gap / 2}px;">${params.left}</td>
      <td class="stack-col col-half" valign="top" style="width:50%;padding-left:${gap / 2}px;">${params.right}</td>
    </tr>
  </table>`;
}

export interface BarChartOpts {
  values: number[];
  labels: string[];
  peakIndex?: number;
  height?: number;
}

export function renderBarChart(opts: BarChartOpts): string {
  const height = opts.height ?? 140;
  const max = Math.max(...opts.values, 1);
  const peak = opts.peakIndex ?? opts.values.indexOf(max);
  const cells = opts.values.map((v, i) => {
    const pct = Math.max(8, Math.round((v / max) * 100));
    const isPeak = i === peak;
    return `<td valign="bottom" align="center" style="padding:0 4px;width:${Math.floor(100 / opts.values.length)}%;">
      <div style="font-family:${FONTS.label};font-size:11px;color:${isPeak ? PULSE.graphite : PULSE.n400};font-weight:${isPeak ? 600 : 400};margin-bottom:8px;">${v >= 10000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : v}</div>
      <div style="background:${isPeak ? PULSE.lime : PULSE.n200};height:${Math.round((pct / 100) * height)}px;border-radius:4px;width:100%;min-height:8px;line-height:1px;font-size:1px;">&nbsp;</div>
      <div style="font-family:${FONTS.label};font-size:10px;color:${PULSE.n400};letter-spacing:0.1em;margin-top:8px;">${opts.labels[i] ?? ''}</div>
    </td>`;
  }).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bar-chart" style="height:${height + 40}px;"><tr>${cells}</tr></table>`;
}

export interface AvatarCircleOpts {
  initials: string;
  bg?: string;
  fg?: string;
  size?: number;
}

export function renderAvatarCircle(opts: AvatarCircleOpts): string {
  const size = opts.size ?? 36;
  const bg = opts.bg ?? PULSE.limeSoft;
  const fg = opts.fg ?? PULSE.graphite;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:inline-block;text-align:center;line-height:${size}px;font-family:${FONTS.heading};font-weight:500;font-size:${Math.round(size * 0.4)}px;color:${fg};">${escapeHtmlInline((Array.from(String(opts.initials ?? '').trim())[0] ?? '').toUpperCase())}</div>`;
}

export interface QuoteCardOpts {
  stars: number;
  name: string;
  platform?: string;
  text: string;
  warn?: boolean;
}

export function renderQuoteCard(opts: QuoteCardOpts): string {
  const avatarBg = opts.warn ? '#FEF3C7' : PULSE.limeSoft;
  const starColor = opts.warn ? PULSE.warning : PULSE.graphite;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td valign="top" style="width:48px;padding:16px 0;">
        ${renderAvatarCircle({ initials: opts.name, bg: avatarBg, size: 36 })}
      </td>
      <td valign="top" style="padding:16px 0 16px 16px;border-bottom:1px solid ${PULSE.n200};">
        <div style="margin-bottom:4px;">
          <span style="color:${starColor};font-size:13px;letter-spacing:0.05em;white-space:nowrap;">${'★'.repeat(opts.stars)}<span style="color:${PULSE.n300};">${'★'.repeat(5 - opts.stars)}</span></span>
          <span style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};margin-left:10px;">${escapeHtmlInline(opts.name)}${opts.platform ? ` · ${escapeHtmlInline(opts.platform)}` : ''}</span>
        </div>
        <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n700};line-height:1.55;">"${escapeHtmlInline(opts.text)}"</div>
      </td>
    </tr>
  </table>`;
}

export interface TimelineItem {
  label: string;
  body: string;
  status?: 'done' | 'current' | 'pending';
}

export function renderTimeline(items: TimelineItem[]): string {
  const rows = items.map((it, i) => {
    const status = it.status ?? (i === 0 ? 'done' : i === 1 ? 'current' : 'pending');
    const dotColor = status === 'done' ? PULSE.graphite : status === 'current' ? PULSE.lime : PULSE.n300;
    const dotBorder = status === 'current' ? `border:2px solid ${PULSE.graphite};` : '';
    const lineColor = PULSE.n200;
    return `<tr>
      <td valign="top" align="center" style="width:32px;padding:6px 0;">
        <div style="width:12px;height:12px;background:${dotColor};${dotBorder}border-radius:50%;display:inline-block;line-height:1;"></div>
        ${i === items.length - 1 ? '' : `<div style="width:2px;background:${lineColor};height:36px;margin:4px auto 0;"></div>`}
      </td>
      <td valign="top" style="padding:6px 0 6px 16px;">
        <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.12em;color:${status === 'done' ? PULSE.graphite : PULSE.n500};text-transform:uppercase;font-weight:500;">${escapeHtmlInline(it.label)}</div>
        <div style="font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};margin-top:2px;line-height:1.5;">${escapeHtmlInline(it.body)}</div>
      </td>
    </tr>`;
  }).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`;
}

// Local re-export of escape helper to avoid a `./escape` round-trip on every
// call from rendering helpers in this file.
function escapeHtmlInline(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
