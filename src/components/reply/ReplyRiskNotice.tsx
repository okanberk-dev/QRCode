'use client';

// Live risk preview under every reply composer (CLAUDE.md §48).
//
// Runs the same deterministic rules the server runs before a reply is stored
// or e-mailed (`checkReplyRisk`). A blocked draft disables Send in the
// composer; the server is still the final gate (it also knows the business's
// saved links and runs AI moderation).

import { useMemo } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  checkReplyRisk,
  isReplyRiskKind,
  replyLinkWarning,
  replyRiskMessages,
  type ReplyRiskKind,
  type ReplyRiskResult,
} from '@/lib/reply-risk';

const EMPTY: ReplyRiskResult = { blocked: false, issues: [], warnings: [] };

/** Client preview: links are a warning here, the server enforces them. */
export function useReplyRisk(text: string): ReplyRiskResult {
  return useMemo(() => (text.trim() ? checkReplyRisk(text, { linksAsWarning: true }) : EMPTY), [text]);
}

/** Issue list from a 422 / CONTENT_BLOCKED response body (unknown keys dropped). */
export function issuesFromBody(body: unknown): ReplyRiskKind[] {
  if (typeof body !== 'object' || body === null) return [];
  const issues = (body as { issues?: unknown }).issues;
  return Array.isArray(issues) ? issues.filter(isReplyRiskKind) : [];
}

/** "Bu yanıt gönderilemez: …" sentence for a blocked send. */
export function blockedReplyMessage(issues: readonly ReplyRiskKind[], locale: 'tr' | 'en'): string {
  const lead = locale === 'tr' ? 'Bu yanıt gönderilemez.' : "This reply can't be sent.";
  const lines = replyRiskMessages(issues, locale);
  if (lines.length === 0) {
    return locale === 'tr'
      ? `${lead} Riskli bir ifade içeriyor; lütfen metni düzenleyin.`
      : `${lead} It contains risky content; please edit it.`;
  }
  return `${lead} ${lines.join(' ')}`;
}

export function ReplyRiskNotice({
  risk,
  locale,
  tone = 'light',
  className = '',
}: {
  risk: ReplyRiskResult;
  locale: 'tr' | 'en';
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const isTr = locale === 'tr';
  if (risk.blocked) {
    const lines = replyRiskMessages(risk.issues, locale);
    // A link is checked on send (the server knows the business's saved
    // addresses) — mention it here too so the owner fixes everything at once.
    if (risk.warnings.includes('link')) lines.push(replyLinkWarning(locale));
    return (
      <div
        role="alert"
        className={`rounded-[20px] border px-3 py-2.5 text-[13px] leading-[1.5] ${
          tone === 'dark'
            ? 'border-[#F87171]/40 bg-[#7F1D1D]/40 text-[#FECACA]'
            : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
        } ${className}`}
      >
        <p className="flex items-center gap-1.5 font-medium">
          <ShieldAlert size={14} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
          {isTr ? 'Bu yanıt gönderilemez' : "This reply can't be sent"}
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className={`mt-1.5 ${tone === 'dark' ? 'text-[#FECACA]/80' : 'text-[#B91C1C]/80'}`}>
          {isTr
            ? 'Yanıtlar Buaze üzerinden gider; bu kurallar hem sizi hem Buaze’yi korur.'
            : 'Replies are sent through Buaze; these rules protect you and Buaze.'}
        </p>
      </div>
    );
  }
  if (risk.warnings.includes('link')) {
    return (
      <p
        role="status"
        className={`flex items-start gap-1.5 rounded-[20px] border px-3 py-2 text-[12px] leading-[1.5] ${
          tone === 'dark'
            ? 'border-[#FDE68A]/40 bg-[#78350F]/30 text-[#FDE68A]'
            : 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
        } ${className}`}
      >
        <AlertTriangle size={13} strokeWidth={2.2} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{replyLinkWarning(locale)}</span>
      </p>
    );
  }
  return null;
}
