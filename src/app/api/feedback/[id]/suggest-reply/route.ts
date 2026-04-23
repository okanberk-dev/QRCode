// SCAFFOLDED: AI Co-Pilot reply suggestion. Replace the body with an LLM
// call (Anthropic/OpenAI) once the user wires up an API key. Until then
// a deterministic template is returned so the UI stays functional.
import { buildReplyTemplate } from '@/lib/scaffolding';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { locale?: 'tr' | 'en'; rating?: number; name?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';
  const rating = typeof body.rating === 'number' ? body.rating : 5;
  const name = typeof body.name === 'string' ? body.name : null;

  const suggestion = buildReplyTemplate({ name, rating, locale });
  return Response.json({
    feedbackId: id,
    suggestion,
    source: 'template', // replace with 'llm' when wired
  });
}
