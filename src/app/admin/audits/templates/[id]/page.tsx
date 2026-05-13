// CLAUDE.md §42 — Admin Denetim Merkezi template detail + question builder.
//
// Server entry → AdminTemplateDetailClient'a forward. Loading skeleton +
// not-found handling client tarafta (fetch-on-mount paterni, sayfa
// hydration sonrası canlanır).

import AdminTemplateDetailClient from './AdminTemplateDetailClient';

export default async function AdminAuditTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminTemplateDetailClient templateId={id} />;
}
