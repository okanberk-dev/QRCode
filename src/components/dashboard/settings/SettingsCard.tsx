import { ReactNode } from "react";

interface SettingsCardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Right-aligned slot in the card header (badges, mini-actions). */
  actions?: ReactNode;
  /** Optional `bz-card-soft` background instead of pure white. */
  variant?: "default" | "soft";
  children: ReactNode;
  className?: string;
  /** Footer slot rendered after children (used for inline form actions). */
  footer?: ReactNode;
}

/**
 * Card wrapper used inside `<SettingsSection>` to group related controls.
 *
 * Layout: `bz-card` (or `bz-card-soft`) + optional header (icon + title +
 * description + actions) + body slot + optional footer with top divider.
 */
export function SettingsCard({
  title,
  description,
  icon,
  actions,
  variant = "default",
  children,
  className = "",
  footer,
}: SettingsCardProps) {
  const cardClass = variant === "soft" ? "bz-card-soft" : "bz-card";
  return (
    <div className={`${cardClass} ${className}`} style={{ padding: 0 }}>
      {(title || description || actions) && (
        <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
          {icon && (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="bz-h-tight text-[18px] sm:text-[20px] text-pn-ink">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[13px] leading-[1.55] text-[#737373] mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0 ml-3">{actions}</div>}
        </header>
      )}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1">{children}</div>
      {footer && (
        <footer
          className="px-5 sm:px-6 py-4"
          style={{ borderTop: "1px solid #EBEBEB" }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

export default SettingsCard;
