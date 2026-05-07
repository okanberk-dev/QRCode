// Stage 29 §38.105 — Owner notification mail senders (campaign moderation).
//
// Admin approve/reject endpoint'leri tetikler. Ops mail (hello@buaze.com)
// ve admin in-app feed ayrı kanallar; bu helper owner mailbox'una bildirim
// gönderir. Pulse template paterni (CLAUDE.md §21).
//
// Fire-and-forget — caller endpoint flow'u bloklanmaz (mail send fail
// durumda console.error log + Sentry capture warning level mevcut Resend
// helper'ında).

import { sendResendEmail } from '../email-internal';
import { renderOwnerCampaignApproved } from './templates/owner-campaign-approved';
import { renderOwnerCampaignRejected } from './templates/owner-campaign-rejected';

export interface SendOwnerCampaignApprovedParams {
  to: string;
  ownerName?: string | null;
  restaurantName: string;
  subject: string;
  sentCount: number;
  failedCount: number;
  dashboardUrl: string;
  locale?: 'tr' | 'en';
}

export async function sendOwnerCampaignApprovedMail(
  params: SendOwnerCampaignApprovedParams,
): Promise<boolean> {
  try {
    const rendered = await renderOwnerCampaignApproved(
      {
        ownerName: params.ownerName,
        restaurantName: params.restaurantName,
        subject: params.subject,
        sentCount: params.sentCount,
        failedCount: params.failedCount,
        dashboardUrl: params.dashboardUrl,
      },
      params.locale ?? 'tr',
    );
    return await sendResendEmail({
      to: params.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (err) {
    console.error('[owner-campaign-notify] approved mail dispatch failed:', err);
    return false;
  }
}

export interface SendOwnerCampaignRejectedParams {
  to: string;
  ownerName?: string | null;
  restaurantName: string;
  subject: string;
  reviewerNote: string;
  dashboardUrl: string;
  locale?: 'tr' | 'en';
}

export async function sendOwnerCampaignRejectedMail(
  params: SendOwnerCampaignRejectedParams,
): Promise<boolean> {
  try {
    const rendered = await renderOwnerCampaignRejected(
      {
        ownerName: params.ownerName,
        restaurantName: params.restaurantName,
        subject: params.subject,
        reviewerNote: params.reviewerNote,
        dashboardUrl: params.dashboardUrl,
      },
      params.locale ?? 'tr',
    );
    return await sendResendEmail({
      to: params.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (err) {
    console.error('[owner-campaign-notify] rejected mail dispatch failed:', err);
    return false;
  }
}
