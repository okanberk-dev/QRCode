// Stage 98 — Public survey page (CLAUDE.md §42).
// SSR fetches survey + restaurant via Prisma. Client component handles
// step-by-step (or single) form rendering + submit. Pulse design system,
// matches /r/[slug] visual language.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SURVEY_PUBLIC_SELECT } from '@/lib/surveys';
import PublicSurveyView from './PublicSurveyView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const survey = await prisma.survey.findUnique({
    where: { slug },
    select: { title: true, isPublished: true, isActive: true, restaurant: { select: { name: true } } },
  });
  if (!survey || !survey.isPublished || !survey.isActive) {
    return { title: 'Buaze' };
  }
  return {
    title: `${survey.title} — ${survey.restaurant.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicSurveyPage({ params }: PageProps) {
  const { slug } = await params;
  const survey = await prisma.survey.findUnique({
    where: { slug },
    select: SURVEY_PUBLIC_SELECT,
  });

  if (
    !survey ||
    !survey.isActive ||
    !survey.isPublished ||
    !survey.restaurant.isActive
  ) {
    notFound();
  }

  // Serialize questions options field (Prisma Json → string[]) and
  // narrow free-form `type` strings to the client component's union.
  const narrowedType: 'single' | 'multi_step' =
    survey.type === 'single' ? 'single' : 'multi_step';
  const serialized = {
    ...survey,
    type: narrowedType,
    questions: survey.questions.map((q) => ({
      ...q,
      type: q.type as
        | 'rating'
        | 'nps'
        | 'short_text'
        | 'long_text'
        | 'multiple_choice',
      options: (q.options as string[] | null) ?? null,
    })),
  };

  return <PublicSurveyView survey={serialized} />;
}
