export interface QrSignatureInput {
  restaurantId: string;
  tableNumber?: string | null;
  platform?: string | null;
  serviceType?: string | null;
  type?: string | null;
}

export interface DedupeQrInput extends QrSignatureInput {
  createdAt: string | Date;
}

function normalizeKeyPart(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : fallback;
}

export function getQrSignature(input: QrSignatureInput) {
  return [
    input.restaurantId,
    normalizeKeyPart(input.type, 'feedback'),
    normalizeKeyPart(input.serviceType, 'default'),
    normalizeKeyPart(input.platform, 'general'),
    normalizeKeyPart(input.tableNumber, 'no-table'),
  ].join(':');
}

export function dedupeQrRows<T extends DedupeQrInput>(rows: T[]) {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const seen = new Set<string>();

  return sorted.filter((row) => {
    const signature = getQrSignature(row);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
