'use client';

import { ChevronRight, MessageSquareText } from 'lucide-react';
import { listQuickReplyTemplates, type QuickReplyKey } from '@/lib/quick-reply-templates';
import { Eyebrow } from '@/components/ui';

// Phase 8c+ §38.33 — Google Yorumları sağ rail "HIZLI YANIT ŞABLONLARI"
// section. Tasarım kaynağı: .design-owner-2026/project/page-google.jsx
// line 235-252 (4 template list).
//
// Static 4 şablon (kullanıcı kararı, CLAUDE.md §38.33). Click → caller
// composer textarea'ya prefill yapar (onSelect callback). Compact UI.

export interface QuickReplyTemplatesProps {
  /** Click → composer textarea'ya prefill için template key. */
  onSelect: (key: QuickReplyKey) => void;
  isTr?: boolean;
  className?: string;
}

const TONE_DOT_COLOR: Record<string, string> = {
  warm: '#16A34A',
  apologetic: '#DC2626',
  formal: '#737373',
};

export function QuickReplyTemplates({
  onSelect,
  isTr = true,
  className = '',
}: QuickReplyTemplatesProps) {
  const templates = listQuickReplyTemplates(isTr ? 'tr' : 'en');

  return (
    <section className={`bz-card p-4 sm:p-5 ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <Eyebrow>{isTr ? 'HIZLI YANIT ŞABLONLARI' : 'QUICK REPLY TEMPLATES'}</Eyebrow>
      </header>
      <ul className="flex flex-col">
        {templates.map((template, idx) => {
          const dotColor = TONE_DOT_COLOR[template.tone] ?? '#737373';
          return (
            <li key={template.key}>
              <button
                type="button"
                onClick={() => onSelect(template.key)}
                className={`w-full flex items-center gap-2.5 py-2.5 -mx-2 px-2 rounded-md text-left transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 ${
                  idx < templates.length - 1 ? 'border-b border-[#F2F2F2]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md bg-[#FAFAFA] text-[#0A0A0A]"
                >
                  <MessageSquareText size={13} strokeWidth={2} />
                </span>
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-[#0A0A0A] truncate">
                    {template.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: dotColor }}
                  />
                </span>
                <ChevronRight
                  size={12}
                  strokeWidth={2}
                  className="shrink-0 text-[#A3A3A3]"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default QuickReplyTemplates;
