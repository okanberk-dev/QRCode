// Denetim Merkezi — paylaşım linki (AuditAssignment) durum kuralları.
//
// Spec §2 A2 / §6.7 / §6.8. Rotalar (public GET + submit) ve testler aynı
// saf fonksiyonları kullanır — "tek kullanımlık mı, tekrar kullanılabilir mi"
// kararı tek yerde.
//
//   • recurrence 'once'                       → TEK KULLANIMLIK link
//   • recurrence 'daily' | 'weekly' | 'monthly' → SÜREKLİ (tekrar kullanılabilir) link
//
// UI'da "Tek seferlik olsun" kapalıyken (varsayılan: kontrol listesi) link
// `daily` oluşturulur; API varsayılanı geriye dönük uyum için 'once' kalır.

import type { AuditAssignmentStatus, AuditRecurrence } from './types';

export interface AssignmentStateInput {
  status: AuditAssignmentStatus | string;
  recurrence: AuditRecurrence | string;
}

/** İlk yanıttan sonra kapanan link (status 'completed' + recurrence 'once'). */
export function isUsedUp(a: AssignmentStateInput): boolean {
  return a.status === 'completed' && a.recurrence === 'once';
}

/** Her yanıttan sonra yeniden kullanılabilen link (recurrence 'once' değil). */
export function isReusable(recurrence: AuditRecurrence | string | null | undefined): boolean {
  return recurrence !== 'once';
}

/**
 * Bir yanıt kaydedildikten sonra atamanın yeni durumu: tek seferlik →
 * 'completed'; sürekli → 'pending' (bir sonraki yanıta hazır).
 */
export function nextAssignmentStatus(
  recurrence: AuditRecurrence | string | null | undefined,
): 'completed' | 'pending' {
  return recurrence === 'once' ? 'completed' : 'pending';
}

export interface SubmissionGateInput extends AssignmentStateInput {
  tokenRevoked?: boolean | null;
}

/**
 * Public submit bu atamaya yeni bir yanıt kabul edebilir mi? İptal edilmiş
 * (cancelled / token iptal) ve kullanılmış tek-seferlik linkler hayır.
 * (Şablonun yayında / aktif olması ayrı bir kontrol — rota 404 döner.)
 */
export function canAcceptSubmission(a: SubmissionGateInput): boolean {
  if (a.tokenRevoked) return false;
  if (a.status === 'cancelled') return false;
  return !isUsedUp(a);
}
