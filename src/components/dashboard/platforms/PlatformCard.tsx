import type { ReactNode } from 'react';

/**
 * Pano card for the platform-links screens (Fintora "Portfolio Breakdown"
 * card): borderless white card, 24px corners, a header with an optional
 * round icon, an 18–20px medium title, a grey one-line description and a
 * right-hand action slot (pill or ↗ circle). On phones the action slot drops
 * under the title at full width.
 */
export function PlatformCard({
  title,
  titleId,
  description,
  icon,
  actions,
  children,
  as: Tag = 'section',
  headingLevel = 2,
  className = '',
}: {
  title?: ReactNode;
  /** Id on the heading; also wires `aria-labelledby` on a `<section>`. */
  titleId?: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  as?: 'section' | 'div';
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const hasHeader = Boolean(title || description || actions);
  return (
    <Tag
      aria-labelledby={Tag === 'section' && title && titleId ? titleId : undefined}
      className={`bz-card min-w-0 p-5 sm:p-6 ${className}`}
    >
      {hasHeader && (
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 ${children ? 'mb-4 sm:mb-5' : ''}`}>
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon && (
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pn-canvas text-pn-ink"
              >
                {icon}
              </span>
            )}
            <div className={`min-w-0 flex-1 ${icon ? 'pt-0.5' : ''}`}>
              {title && (
                <Heading
                  id={titleId}
                  className="text-[18px] font-medium leading-6 tracking-[-0.01em] text-pn-ink sm:text-[20px] sm:leading-[26px]"
                >
                  {title}
                </Heading>
              )}
              {description && (
                <p className="mt-1 text-[13px] leading-[1.5] text-[#737373]">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** Grey breakdown-row list (8px apart). */
export const PLATFORM_ROW_LIST = 'space-y-2';

/**
 * Round 40px control that reads on both row colours: white on the grey rows
 * (desktop / tablet) and grey on the white rows phones get (pano.css <640).
 */
export const ROW_CIRCLE =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-[background-color,color,transform] duration-200 max-sm:bg-[#F6F6F6]';

export default PlatformCard;
