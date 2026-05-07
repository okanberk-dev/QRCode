/**
 * Stage 31b §38.108 — İYS (İleti Yönetim Sistemi) entegrasyonu placeholder.
 *
 * Türkiye'de ticari elektronik ileti gönderen her gerçek/tüzel kişi
 * 6563 sayılı ETK m.6 + İYS Yönetmeliği gereği:
 *   1. İYS portalında (iys.org.tr) gönderici olarak kayıtlı olmalı,
 *   2. Her gönderim öncesi alıcının "izin durumu"nu İYS API'sinden
 *      sorgulamak ve "izin yok"sa göndermemek,
 *   3. Gönderim sonrası gönderim kaydını İYS'ye iletmek
 *      (kanıt amacıyla 1 yıl saklanır)
 *   4. Mail/SMS footer'ında İYS takip ID'sini sergilemek
 *
 * Bu modül **placeholder**: operatör İYS API credentials sağlandığında
 * gerçek HTTPS POST + auth + retry pipeline'ı buraya bağlanır
 * (CLAUDE.md §38.108 — gelecek scope, ayrı PR). Şu an:
 *   - reportToIys() console.warn + iysId null döner
 *   - Mail send pipeline (email-customer-campaign.ts) iysId placeholder
 *     null değerini CustomerEmailCampaign.iysId field'ına yazmaya devam
 *     eder (Stage 31b schema migration ile DB hazır)
 *   - Mail template footer'ı (Stage 31c PR3) "İYS Takip ID: —" render eder
 *
 * Gelecek entegrasyon adımları (operator runbook):
 *   1. iys.org.tr → "Gönderici Üyelik" başvurusu
 *   2. Vergi levhası + Mersis no + iletişim bilgileri (Restaurant.businessIdNumber
 *      / mersisNumber / physicalAddress field'ları schema'da hazır)
 *   3. API key + signing certificate al (Vercel env: IYS_BRAND_CODE +
 *      IYS_API_KEY + IYS_API_SECRET)
 *   4. Bu helper'ın stub kısmını gerçek fetch + signature + retry ile
 *      değiştir; chain reportToIys → record consent ID → DB upsert
 */

import * as Sentry from '@sentry/nextjs';

export type IysChannelCode = 'E_MARKETING' | 'SMS' | 'CALL';
export type IysMessageType = 'TICARI' | 'BILGILENDIRME';

export interface ReportToIysParams {
  /** Buaze internal CustomerEmailCampaign.id */
  campaignId: string;
  recipientEmail: string;
  channelCode: IysChannelCode;
  messageType: IysMessageType;
}

export interface ReportToIysResult {
  /** İYS gönderim takip UUID (operatör credentials yokken null) */
  iysId: string | null;
  /** Operatör için debug — placeholder vs real call ayrımı */
  source: 'placeholder' | 'iys-api';
}

/**
 * İYS gönderim raporu. Operatör credentials yoksa fail-safe placeholder
 * (iysId null + Sentry warning level). Gerçek entegrasyon için bu
 * fonksiyonun gövdesi genişletilir; çağrı taraflarının (mail send pipeline)
 * imzayla çalışması intact kalır.
 */
export async function reportToIys(params: ReportToIysParams): Promise<ReportToIysResult> {
  const credentialsSet =
    typeof process.env.IYS_BRAND_CODE === 'string' &&
    typeof process.env.IYS_API_KEY === 'string' &&
    typeof process.env.IYS_API_SECRET === 'string';

  if (!credentialsSet) {
    // Operatör henüz İYS portal kaydını tamamlamadı; placeholder mode.
    // Çağrı taraflarındaki side-effect'leri kırmamak için iysId null döner.
    // Sentry warn — production deploy sonrası operatör görünürlük için.
    console.warn('[iys] placeholder mode — credentials not set', {
      campaignId: params.campaignId,
      channelCode: params.channelCode,
    });
    Sentry.captureMessage('iys:placeholder_mode', {
      level: 'warning',
      tags: { kind: 'iys', mode: 'placeholder' },
      extra: {
        campaignId: params.campaignId,
        channelCode: params.channelCode,
        messageType: params.messageType,
      },
    });
    return { iysId: null, source: 'placeholder' };
  }

  // Stage 31b §38.108 — Gerçek İYS API entegrasyonu burada implement edilir.
  // Mevcut state: credentials set olsa bile placeholder döner (yapılandırma
  // pipeline hazırlanmadan API çağrısı atılmaz). Ayrı PR scope.
  console.warn('[iys] credentials set but pipeline not implemented yet', {
    campaignId: params.campaignId,
  });
  return { iysId: null, source: 'placeholder' };
}

/**
 * Stage 31c PR3 mail template footer'ında "İYS Takip ID: ..." render
 * için locale-aware fallback. iysId null → `—` (em-dash) gösterilir.
 */
export function formatIysIdForFooter(iysId: string | null): string {
  if (!iysId) return '—';
  return iysId;
}
