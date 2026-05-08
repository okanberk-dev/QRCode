'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APComposerCard (~145 satır).
 *
 * Customer-side review composer: header (eyebrow + italic title) +
 * APStarInput + tag chips toggle + textarea + cancel/submit row.
 *
 * Mevcut Buaze counterpart: `/r/[slug]/page.tsx` zaten Stage 49+52+59
 * ile bu paterni daha zengin ve compliance-disipline (KVKK + reCAPTCHA +
 * honeypot) ile implement etti — bu primitive ondan farklı concern:
 * generic standalone composer (NPS survey, internal team feedback,
 * onboarding feedback). Public review surface'ı dokunulmaz.
 *
 * Pulse §11 hex map:
 *  - card: APCard padding=0, max-w-420
 *  - header: 16/18 padding + bottom border + italic Space Grotesk title
 *  - body: 16/18 padding + 14 gap (stars centered + tags + textarea)
 *  - tag chip toggle: graphite (selected) / white border (unselected)
 *  - textarea: 12 padding + 10 radius + #FAFAFA bg + 60 min-height
 *  - actions: 12/18 padding + cancel ghost + submit primary
 *
 * Generic: caller controls stars + tags + text state. Submit button
 * disabled until stars > 0.
 *
 * A11y: APStarInput primitive zaten radiogroup; tag toggle button
 * `aria-pressed`; textarea labeled.
 */

import { type ReactNode, useId } from 'react';
import { APButton } from './APButton';
import { APCard } from './APCard';
import { APStarInput } from './APStarInput';

export interface APComposerTag {
  key: string;
  label: ReactNode;
}

export interface APComposerCardProps {
  /** Eyebrow label (mono uppercase) */
  eyebrow: ReactNode;
  /** Hero title (italic Space Grotesk) */
  title: ReactNode;
  /** Stars value (0-5, controlled) */
  stars: number;
  onStarsChange: (next: number) => void;
  /** Tag options */
  tags?: APComposerTag[];
  /** Selected tag keys (controlled) */
  selectedTags?: Record<string, boolean>;
  onTagsChange?: (next: Record<string, boolean>) => void;
  /** Textarea value (controlled) */
  text?: string;
  onTextChange?: (next: string) => void;
  textPlaceholder?: string;
  textLabel?: string;
  tagsLabel?: string;
  starsHint?: string;
  cancelLabel?: ReactNode;
  submitLabel?: ReactNode;
  onCancel?: () => void;
  onSubmit?: () => void;
  className?: string;
}

export function APComposerCard({
  eyebrow,
  title,
  stars,
  onStarsChange,
  tags = [],
  selectedTags = {},
  onTagsChange,
  text = '',
  onTextChange,
  textPlaceholder = 'Bir kaç kelime yazın (opsiyonel)…',
  textLabel = 'Yorum',
  tagsLabel = 'NE BEĞENDİN?',
  starsHint = 'PUAN VERİN',
  cancelLabel = 'VAZGEÇ',
  submitLabel = 'GÖNDER',
  onCancel,
  onSubmit,
  className = '',
}: APComposerCardProps) {
  const textId = useId();

  return (
    <APCard padding={0} className={`max-w-[420px] overflow-hidden ${className}`}>
      <div
        className="px-[18px] pt-4 pb-3.5"
        style={{ borderBottom: '1px solid rgba(10,10,10,0.06)' }}
      >
        <span
          className="block text-[9px] uppercase tracking-[0.18em] text-[#737373]"
          style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
        >
          {eyebrow}
        </span>
        <h4
          className="mt-1 text-[22px] font-normal tracking-[-0.01em]"
          style={{
            fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
            fontStyle: 'italic',
          }}
        >
          {title}
        </h4>
      </div>
      <div className="flex flex-col gap-3.5 px-[18px] pt-4 pb-2">
        <div className="flex flex-col items-center gap-2">
          <APStarInput value={stars} onChange={onStarsChange} size={32} />
          <span
            aria-live="polite"
            className="text-[9px] uppercase tracking-[0.18em] text-[#737373]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {stars === 0 ? starsHint : `${stars}/5`}
          </span>
        </div>
        {tags.length > 0 ? (
          <div>
            <span
              className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[#737373]"
              style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
            >
              {tagsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = !!selectedTags[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      onTagsChange && onTagsChange({ ...selectedTags, [t.key]: !on })
                    }
                    className="cursor-pointer transition-all duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: on ? '#0A0A0A' : '#fff',
                      color: on ? '#fff' : '#0A0A0A',
                      border: `1px solid ${on ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {on ? <span className="mr-1 text-[#C6F24E]">✓</span> : null}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div>
          <label htmlFor={textId} className="sr-only">
            {textLabel}
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(e) => onTextChange && onTextChange(e.target.value)}
            placeholder={textPlaceholder}
            className="block w-full resize-none border text-[13px] leading-[1.5] text-[#0A0A0A] placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
            style={{
              padding: 12,
              background: '#FAFAFA',
              borderRadius: 10,
              borderColor: 'rgba(10,10,10,0.06)',
              minHeight: 60,
              fontFamily: 'var(--font-body), var(--font-inter), system-ui, sans-serif',
            }}
          />
        </div>
      </div>
      <div className="flex gap-2 px-[18px] pt-3 pb-[18px]">
        <APButton variant="ghost" size="md" onClick={onCancel}>
          {cancelLabel}
        </APButton>
        <APButton
          variant="primary"
          size="md"
          full
          disabled={stars === 0}
          onClick={onSubmit}
        >
          {submitLabel}
        </APButton>
      </div>
    </APCard>
  );
}
