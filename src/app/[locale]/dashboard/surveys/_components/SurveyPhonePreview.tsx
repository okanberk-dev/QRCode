'use client';

// Surveys editor — the phone-shaped live preview.
//
// It renders the REAL customer screen (`PublicSurveyView` in `preview` mode: no
// network, no localStorage session, no URL rewrite) fed by the form the owner is
// editing, so the preview can never drift from what customers get.
//
// The customer stylesheet (`survey.css`) normally ships with /s/[slug] only
// (route-scoped, CLAUDE.md §40.11); the dashboard imports the same sheet here —
// without it the preview would be unstyled. The preview mode uses
// `.bz-survey-preview` (no viewport media queries) so it fits the 360x640 frame
// instead of the 780px page frame.
//
// An empty question / title shows a grey-ish placeholder text instead of a
// blank screen.

import dynamic from 'next/dynamic';
import { useDeferredValue, useMemo, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import '@/app/s/[slug]/survey.css';
import type { PublicSurveyData } from '@/app/s/[slug]/PublicSurveyView';
import { deriveSurveyType } from '@/lib/surveys';
import {
  filledOptionTexts,
  type EditorForm,
  type EditorLocale,
} from './survey-editor-state';

// The customer view is only needed once a preview is shown.
const PublicSurveyView = dynamic(() => import('@/app/s/[slug]/PublicSurveyView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-pn-ink" role="status">
      <Loader2 size={22} className="animate-spin text-pn-accent" aria-hidden="true" />
      <span className="sr-only">…</span>
    </div>
  ),
});

export interface PreviewBusiness {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

interface Props {
  locale: EditorLocale;
  form: EditorForm;
  business: PreviewBusiness;
}

function previewSurvey(form: EditorForm, business: PreviewBusiness, locale: EditorLocale): PublicSurveyData {
  const isTr = locale === 'tr';
  const questions = form.questions.map((q, i) => {
    let options: string[] | null = null;
    if (q.type === 'multiple_choice') {
      // Blank rows show as placeholders so the screen keeps its shape.
      options = q.options.map((o, j) => o.text.trim() || (isTr ? `Seçenek ${j + 1}` : `Option ${j + 1}`));
      if (filledOptionTexts(q).length === 0 && options.length === 0) {
        options = [isTr ? 'Seçenek 1' : 'Option 1', isTr ? 'Seçenek 2' : 'Option 2'];
      }
    }
    return {
      id: q.localId,
      text: q.text.trim() || (isTr ? 'Sorunu buraya yaz…' : 'Write your question here…'),
      type: q.type,
      options,
      required: q.required,
      sortOrder: i * 10,
    };
  });
  return {
    id: 'preview',
    slug: 'preview',
    title: form.title.trim() || (isTr ? 'Anket başlığı' : 'Survey title'),
    description: form.description.trim() || null,
    type: deriveSurveyType(questions.length),
    isPublished: true,
    isActive: true,
    accentColor: form.accentColor,
    thankYouMessage: form.thankYouMessage.trim() || null,
    collectContact: form.collectContact,
    couponCode: form.couponCode.trim() || null,
    couponLabel: form.couponLabel.trim() || null,
    restaurantId: business.id,
    restaurant: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      primaryColor: business.primaryColor,
      isActive: true,
    },
    questions,
  };
}

export default function SurveyPhonePreview({ locale, form, business }: Props) {
  const isTr = locale === 'tr';
  // Typing stays snappy; the phone catches up a moment later.
  const deferred = useDeferredValue(form);
  const survey = useMemo(() => previewSurvey(deferred, business, locale), [deferred, business, locale]);
  const [runs, setRuns] = useState(0);
  // A single question skips the intro screen, so remount when that changes.
  const shape = survey.questions.length === 1 ? 'one' : 'many';

  return (
    // 360 px wide at most; on a short screen (laptop) the phone shrinks so the
    // frame and the "restart" button stay clear of the sticky action bar
    // (sticky top 88 + caption 26 + restart row 52 + action bar 69 + gap 8).
    <div className="mx-auto w-full max-w-[clamp(280px,calc((100dvh_-_243px)*9/16),360px)]">
      <div
        className="aspect-[9/16] w-full overflow-hidden rounded-[32px] border-8 border-pn-ink bg-pn-ink"
        data-testid="survey-phone-preview"
      >
        <PublicSurveyView key={`${runs}-${shape}`} survey={survey} preview={{}} />
      </div>
      <div className="mt-2 flex justify-center">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#525252] hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-1"
          onClick={() => setRuns((n) => n + 1)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {isTr ? 'Önizlemeyi baştan başlat' : 'Restart preview'}
        </button>
      </div>
    </div>
  );
}
