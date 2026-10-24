// Prisma-free RBAC constants (see rbac.ts). Imported by the admin
// permission matrix client page — never import server-only modules here.

// Resource enum — DB'de string olarak saklanır (migration drift sıfır).
// Yeni resource eklerken sadece bu array genişletilir; helper otomatik
// type-narrow yapar (literal union).
export const RESOURCES = [
  'reviews',
  'members',
  'users',
  'customers',
  'plans',
  'site_settings',
  'mail_templates',
  'announcements',
  'blog',
  'analytics',
  'audit_logs',
  // Stage A4 §38.96 — admin impersonation flow ("Owner gibi gör"). 'write'
  // action gerekli (start session); 'read' yok — superadmin OR grant'lı
  // manager bu yetkiyle owner panel'ine geçebilir.
  'impersonation',
] as const;

export const ACTIONS = ['read', 'write', 'delete'] as const;

export type AdminResource = (typeof RESOURCES)[number];
export type AdminAction = (typeof ACTIONS)[number];

// Permission preset bundles — UI'da "Read-only analyst" / "Reviews moderator"
// gibi tek-tıklamalı grant'lar için. Yeni preset eklerken bu sabite ekle;
// UI dinamik render eder.
export const PERMISSION_PRESETS: Record<
  string,
  {
    label: string;
    labelEn: string;
    description: string;
    grants: Array<{ resource: AdminResource; action: AdminAction }>;
  }
> = {
  read_only_analyst: {
    label: 'Salt-okunur analist',
    labelEn: 'Read-only analyst',
    description:
      'Tüm verileri okuma erişimi (yorumlar, müşteriler, analitik, audit log) — değişiklik yapamaz.',
    grants: [
      { resource: 'reviews', action: 'read' },
      { resource: 'customers', action: 'read' },
      { resource: 'analytics', action: 'read' },
      { resource: 'audit_logs', action: 'read' },
      { resource: 'members', action: 'read' },
    ],
  },
  reviews_moderator: {
    label: 'Yorum moderatörü',
    labelEn: 'Reviews moderator',
    description:
      'Yorumları okuma + yanıtlama (yazma) erişimi; silme veya başka tablo dokunma yok.',
    grants: [
      { resource: 'reviews', action: 'read' },
      { resource: 'reviews', action: 'write' },
      { resource: 'customers', action: 'read' },
    ],
  },
  content_editor: {
    label: 'İçerik editörü',
    labelEn: 'Content editor',
    description: 'Blog + duyuru + mail template edit erişimi.',
    grants: [
      { resource: 'blog', action: 'read' },
      { resource: 'blog', action: 'write' },
      { resource: 'announcements', action: 'read' },
      { resource: 'announcements', action: 'write' },
      { resource: 'mail_templates', action: 'read' },
      { resource: 'mail_templates', action: 'write' },
    ],
  },
};
