'use client';

/**
 * <RenderTemplate> — registry-aware template renderer wrapper.
 *
 * Two roles:
 *   1. **Visible preview** (`mode="inline"`) — drop into a card / modal to
 *      show the picked template at its native size. Caller scales via CSS
 *      (e.g. `transform: scale(0.4)`).
 *   2. **Off-screen capture** (`mode="capture"`) — positions the template
 *      at `-9999px` so html-to-image can rasterise it without the
 *      template flashing on the user's screen. `ref` exposes the wrapper
 *      div so download helpers know which DOM node to snapshot.
 *
 * The dimensions and inline styles of each template are authored in the
 * template files themselves (CLAUDE.md §23.7 wave decision — print
 * artefact = inline style, panel chrome = bz-* tokens). This wrapper just
 * picks the component and forwards the props.
 */

import { forwardRef } from 'react';
import { getTemplate } from './templates/registry';
import type { TemplateBusiness } from './templates/types';

export interface RenderTemplateProps {
  templateId: string | null | undefined;
  qrPayload: string;
  business: TemplateBusiness;
  /** `inline` keeps the template in document flow; `capture` ships it
   *  off-screen so html-to-image can snapshot it without a flash. */
  mode?: 'inline' | 'capture';
}

export const RenderTemplate = forwardRef<HTMLDivElement, RenderTemplateProps>(
  function RenderTemplate({ templateId, qrPayload, business, mode = 'inline' }, ref) {
    const { Component } = getTemplate(templateId);

    const captureStyle =
      mode === 'capture'
        ? ({
            position: 'fixed',
            top: -9999,
            left: -9999,
            // Don't apply pointer-events:none — html-to-image needs to
            // measure layout, and pointer-events doesn't influence
            // bounding-rect anyway. Off-screen is enough.
            zIndex: -1,
          } as const)
        : undefined;

    return (
      <div ref={ref} style={captureStyle} aria-hidden={mode === 'capture' ? 'true' : undefined}>
        <Component qrPayload={qrPayload} business={business} />
      </div>
    );
  },
);

export default RenderTemplate;
