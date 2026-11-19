import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Crown,
  FileEdit,
  Globe,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Mail,
  Megaphone,
  QrCode,
  ScrollText,
  Settings,
  Store,
  Tag,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { AdminAction, AdminResource } from '@/lib/rbac-constants';

/**
 * Single source of truth for the admin panel navigation. The sidebar, the
 * mobile bottom bar and the Cmd+K palette all read this list — they used to
 * keep three hand-synced copies, which drifted (the bottom bar had no entry
 * for `staff`, the palette and the bottom bar were Turkish-only).
 *
 * Only roles that can hold an admin session are listed (`isAdminRole` in
 * src/lib/auth.ts). Business owners use the owner panel under
 * `/[locale]/dashboard`; they never see this navigation.
 */
export type AdminNavRole = 'superadmin' | 'manager' | 'staff';
export type AdminNavLocale = 'tr' | 'en';
export type AdminNavPermission = `${AdminResource}:${AdminAction}`;

type Label = Record<AdminNavLocale, string>;

export interface AdminNavLeaf {
  href: string;
  icon: LucideIcon;
  label: Label;
  /** Roles that can see the page at all. */
  roles: readonly AdminNavRole[];
  /**
   * Grant a `staff` admin needs. Staff sees a leaf without one only when
   * `roles` lists staff explicitly (dashboard, profile).
   */
  permission?: AdminNavPermission;
  /** Extra search terms for the command palette (both languages). */
  keywords?: readonly string[];
  /** Hidden in production builds. */
  devOnly?: boolean;
}

export interface AdminNavGroup {
  id: string;
  icon: LucideIcon;
  label: Label;
  children: readonly AdminNavLeaf[];
}

export type AdminNavEntry =
  | ({ type: 'item' } & AdminNavLeaf)
  | ({ type: 'group' } & AdminNavGroup);

const ALL: readonly AdminNavRole[] = ['superadmin', 'manager', 'staff'];
const OPERATORS: readonly AdminNavRole[] = ['superadmin', 'manager'];
const SUPER: readonly AdminNavRole[] = ['superadmin'];
const SUPER_STAFF: readonly AdminNavRole[] = ['superadmin', 'staff'];

export const ADMIN_NAV: readonly AdminNavEntry[] = [
  {
    type: 'item',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    label: { tr: 'Dashboard', en: 'Dashboard' },
    // Platform-wide figures (MRR, plans, every business). A manager is
    // scoped to one business, so it is not offered there; staff needs the
    // analytics grant, like the BI API.
    roles: SUPER_STAFF,
    permission: 'analytics:read',
    keywords: ['ana sayfa', 'home', 'genel görünüm', 'overview'],
  },
  {
    type: 'group',
    id: 'operations',
    icon: Inbox,
    label: { tr: 'Operasyon', en: 'Operations' },
    children: [
      {
        href: '/admin/reviews',
        icon: Inbox,
        label: { tr: 'Yorumlar', en: 'Reviews' },
        roles: ALL,
        permission: 'reviews:read',
        keywords: ['feedback', 'review', 'puan', 'rating'],
      },
      {
        href: '/admin/analytics',
        icon: BarChart3,
        label: { tr: 'Analitik', en: 'Analytics' },
        roles: ALL,
        permission: 'analytics:read',
        keywords: ['rapor', 'reports', 'istatistik', 'stats'],
      },
      {
        href: '/admin/qr',
        icon: QrCode,
        label: { tr: 'QR Kodlar', en: 'QR Codes' },
        roles: OPERATORS,
        keywords: ['qr', 'kod', 'code'],
      },
      {
        href: '/admin/restaurants',
        icon: Store,
        label: { tr: 'İşletmeler', en: 'Businesses' },
        roles: SUPER,
        keywords: ['restoran', 'restaurant', 'business', 'franchise', 'şube'],
      },
      {
        href: '/admin/audits/templates',
        icon: ClipboardCheck,
        label: { tr: 'Denetim Şablonları', en: 'Audit Templates' },
        roles: SUPER,
        keywords: ['audit', 'checklist', 'denetim'],
      },
      {
        href: '/admin/audits/categories',
        icon: Tag,
        label: { tr: 'Denetim Kategorileri', en: 'Audit Categories' },
        roles: SUPER,
        keywords: ['audit', 'kategori', 'category'],
      },
      {
        href: '/admin/audits/stats',
        icon: BarChart3,
        label: { tr: 'Denetim İstatistikleri', en: 'Audit Stats' },
        roles: SUPER,
        keywords: ['audit', 'istatistik', 'stats'],
      },
    ],
  },
  {
    type: 'group',
    id: 'accounts',
    icon: Crown,
    label: { tr: 'Hesaplar', en: 'Accounts' },
    children: [
      {
        href: '/admin/members',
        icon: Crown,
        label: { tr: 'İşletme Sahipleri', en: 'Business Owners' },
        roles: SUPER_STAFF,
        permission: 'members:read',
        keywords: ['owner', 'members', 'sahip', 'üye'],
      },
      {
        href: '/admin/users',
        icon: Users,
        label: { tr: 'Yöneticiler', en: 'Admins' },
        roles: SUPER_STAFF,
        permission: 'users:read',
        keywords: ['admin users', 'staff', 'yönetici', 'personel'],
      },
      {
        href: '/admin/customers',
        icon: UsersRound,
        label: { tr: 'Müşteriler', en: 'Customers' },
        roles: SUPER_STAFF,
        permission: 'customers:read',
        keywords: ['customer', 'müşteri', 'crm'],
      },
      {
        href: '/admin/plans',
        icon: CreditCard,
        label: { tr: 'Abonelikler', en: 'Subscriptions' },
        roles: SUPER_STAFF,
        permission: 'plans:read',
        keywords: ['plans', 'paket', 'fiyat', 'tier', 'pricing'],
      },
    ],
  },
  {
    type: 'group',
    id: 'content',
    icon: BookOpen,
    label: { tr: 'İçerik', en: 'Content' },
    children: [
      {
        href: '/admin/blog',
        icon: BookOpen,
        label: { tr: 'Blog', en: 'Blog' },
        roles: SUPER_STAFF,
        permission: 'blog:read',
        keywords: ['yazı', 'post', 'content', 'içerik'],
      },
      {
        href: '/admin/announcements',
        icon: Megaphone,
        label: { tr: 'Duyurular', en: 'Announcements' },
        roles: SUPER_STAFF,
        permission: 'announcements:read',
        keywords: ['banner', 'duyuru'],
      },
      {
        href: '/admin/legal-documents',
        icon: ScrollText,
        label: { tr: 'Hukuki Metinler', en: 'Legal Documents' },
        roles: SUPER,
        keywords: ['legal', 'kvkk', 'gizlilik', 'privacy', 'terms'],
      },
      {
        href: '/admin/site-settings',
        icon: Settings,
        label: { tr: 'Site Ayarları', en: 'Site Settings' },
        roles: SUPER_STAFF,
        permission: 'site_settings:read',
        keywords: ['settings', 'ayar', 'site config', 'logo'],
      },
    ],
  },
  {
    type: 'group',
    id: 'mail',
    icon: Mail,
    label: { tr: 'Mail', en: 'Mail' },
    children: [
      {
        href: '/admin/newsletters',
        icon: Mail,
        label: { tr: 'Bülten Aboneleri', en: 'Newsletter' },
        roles: SUPER_STAFF,
        permission: 'mail_templates:read',
        keywords: ['newsletter', 'subscribers', 'abone'],
      },
      {
        href: '/admin/newsletters/campaigns',
        icon: Megaphone,
        label: { tr: 'Bülten Kampanyaları', en: 'Newsletter Campaigns' },
        roles: SUPER_STAFF,
        permission: 'mail_templates:read',
        keywords: ['newsletter campaigns', 'bülten'],
      },
      {
        href: '/admin/mail-templates',
        icon: FileEdit,
        label: { tr: 'Mail İçerikleri', en: 'Mail Templates' },
        roles: SUPER_STAFF,
        permission: 'mail_templates:read',
        keywords: ['mail templates', 'email content', 'şablon'],
      },
      {
        href: '/admin/dev/lifecycle-emails',
        icon: Mail,
        label: { tr: 'Yaşam Döngüsü', en: 'Lifecycle' },
        roles: SUPER,
        keywords: ['lifecycle', 'otomatik mail'],
      },
      {
        href: '/admin/dev/mail-preview',
        icon: Mail,
        label: { tr: 'Mail Önizleme (dev)', en: 'Mail Preview (dev)' },
        roles: SUPER,
        devOnly: true,
        keywords: ['preview', 'önizleme'],
      },
    ],
  },
  {
    type: 'group',
    id: 'system',
    icon: KeyRound,
    label: { tr: 'Sistem', en: 'System' },
    children: [
      {
        href: '/admin/api',
        icon: KeyRound,
        label: { tr: 'API & Webhook', en: 'API & Webhooks' },
        roles: SUPER,
        keywords: ['api', 'webhooks', 'anahtar', 'key'],
      },
      {
        href: '/admin/audit-logs',
        icon: ScrollText,
        label: { tr: 'Denetim Kaydı', en: 'Audit Log' },
        roles: SUPER,
        keywords: ['audit log', 'history', 'activity', 'kayıt', 'geçmiş'],
      },
      {
        href: '/admin/google',
        icon: Globe,
        label: { tr: 'Google Entegrasyonları', en: 'Google Integrations' },
        roles: SUPER,
        keywords: ['google', 'business profile', 'entegrasyon', 'integration'],
      },
    ],
  },
  {
    type: 'item',
    href: '/admin/profile',
    icon: User,
    label: { tr: 'Profilim', en: 'Profile' },
    roles: ALL,
    keywords: ['profile', 'hesap', 'account', 'şifre', 'password', 'dil', 'language'],
  },
];

/**
 * Pages offered in the mobile bottom bar, in priority order. The bar shows
 * the first {@link ADMIN_MOBILE_NAV_SLOTS} the admin is allowed to open, so a
 * staff admin gets the pages their grants unlock instead of an empty bar.
 */
const MOBILE_PRIORITY: readonly string[] = [
  '/admin/dashboard',
  '/admin/restaurants',
  '/admin/reviews',
  '/admin/qr',
  '/admin/analytics',
  '/admin/members',
  '/admin/customers',
  '/admin/blog',
  '/admin/profile',
];
export const ADMIN_MOBILE_NAV_SLOTS = 5;

export function toAdminNavRole(value: unknown): AdminNavRole {
  return value === 'superadmin' || value === 'staff' ? value : 'manager';
}

export function isAdminNavLeafVisible(
  leaf: AdminNavLeaf,
  role: AdminNavRole,
  permissions: ReadonlySet<string>,
): boolean {
  if (leaf.devOnly && process.env.NODE_ENV === 'production') return false;
  if (!leaf.roles.includes(role)) return false;
  if (role !== 'staff' || !leaf.permission) return true;
  return permissions.has(leaf.permission);
}

/** Navigation tree for one admin: hidden leaves dropped, empty groups removed. */
export function getAdminNav(
  role: AdminNavRole,
  permissions: ReadonlySet<string>,
): AdminNavEntry[] {
  const out: AdminNavEntry[] = [];
  for (const entry of ADMIN_NAV) {
    if (entry.type === 'item') {
      if (isAdminNavLeafVisible(entry, role, permissions)) out.push(entry);
      continue;
    }
    const children = entry.children.filter((child) =>
      isAdminNavLeafVisible(child, role, permissions),
    );
    if (children.length > 0) out.push({ ...entry, children });
  }
  return out;
}

/** Every page the admin can open, in sidebar order. */
export function getAdminNavLeaves(
  role: AdminNavRole,
  permissions: ReadonlySet<string>,
): AdminNavLeaf[] {
  return getAdminNav(role, permissions).flatMap((entry) =>
    entry.type === 'item' ? [entry] : [...entry.children],
  );
}

export function getAdminMobileNav(
  role: AdminNavRole,
  permissions: ReadonlySet<string>,
): AdminNavLeaf[] {
  const byHref = new Map(getAdminNavLeaves(role, permissions).map((leaf) => [leaf.href, leaf]));
  const picked: AdminNavLeaf[] = [];
  for (const href of MOBILE_PRIORITY) {
    const leaf = byHref.get(href);
    if (leaf) picked.push(leaf);
    if (picked.length === ADMIN_MOBILE_NAV_SLOTS) break;
  }
  return picked;
}

/**
 * The one entry that should be highlighted for a path: the longest visible
 * href that matches. A plain prefix test lit up both `/admin/newsletters` and
 * `/admin/newsletters/campaigns`.
 */
export function getActiveAdminHref(
  pathname: string | null | undefined,
  hrefs: readonly string[],
): string | null {
  if (!pathname) return null;
  const matches = hrefs.filter((href) => pathname === href || pathname.startsWith(href + '/'));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

const ROLE_LABELS: Record<AdminNavRole, Label> = {
  superadmin: { tr: 'Superadmin', en: 'Superadmin' },
  manager: { tr: 'Yönetici', en: 'Manager' },
  staff: { tr: 'Görevli', en: 'Staff' },
};

/** Display name of an admin role — same wording on every admin page. */
export function adminRoleLabel(role: unknown, locale: AdminNavLocale): string {
  return ROLE_LABELS[toAdminNavRole(role)][locale];
}
