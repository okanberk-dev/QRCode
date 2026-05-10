export interface AdminNotificationReadProjection {
  adminId: string | null;
  readAt: Date | string | null;
  reads?: Array<{ readAt: Date | string | null }>;
}

export function resolveAdminNotificationReadAt(
  notification: AdminNotificationReadProjection,
): Date | string | null {
  if (notification.adminId === null) {
    return notification.reads?.[0]?.readAt ?? null;
  }
  return notification.readAt ?? null;
}

export function serializeAdminNotificationReadAt(
  notification: AdminNotificationReadProjection,
): string | null {
  const readAt = resolveAdminNotificationReadAt(notification);
  if (!readAt) return null;
  return readAt instanceof Date ? readAt.toISOString() : readAt;
}

export function isAdminNotificationUnread(notification: AdminNotificationReadProjection) {
  return resolveAdminNotificationReadAt(notification) === null;
}
