import {
  Compass,
  CreditCard,
  Link2,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { HelpCategoryIcon as HelpCategoryIconKey } from '@/lib/help-categories';

const ICONS: Record<HelpCategoryIconKey, LucideIcon> = {
  'getting-started': Compass,
  qr: QrCode,
  reviews: MessageSquareText,
  links: Link2,
  team: Users,
  billing: CreditCard,
  security: ShieldCheck,
};

/** Decorative category icon (lucide). Works in server and client components. */
export default function HelpCategoryIcon({
  icon,
  size = 20,
  className,
}: {
  icon: HelpCategoryIconKey;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Compass;
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden="true" />;
}
