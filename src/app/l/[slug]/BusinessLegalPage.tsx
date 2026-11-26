// A business's own loyalty legal text (CLAUDE.md §61): membership terms or
// privacy notice with the business as data controller. Same renderer as
// the site's legal pages, framed by the business's customer panel colours.
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { renderLegalContentWithToc } from '@/lib/legal/render';
import { loadLoyaltyLegal } from '@/lib/legal/loyalty-legal';
import type { PublicLoyaltyProgram } from '@/lib/loyalty-server';
import { readLoyaltyPortal } from '@/lib/loyalty-portal';
import { portalStyle } from '@/components/loyalty/LoyaltyPortalFrame';

export default async function BusinessLegalPage({
  program,
  locale,
  docKey,
}: {
  program: PublicLoyaltyProgram;
  locale: 'tr' | 'en';
  docKey: 'sadakat-uyelik-kosullari' | 'sadakat-aydinlatma';
}) {
  const portal = readLoyaltyPortal(program.portal);
  const r = program.restaurant;
  const doc = await loadLoyaltyLegal(docKey, locale, {
    name: r.name,
    address: [r.address, r.city].filter(Boolean).join(', ') || null,
    phone: r.phone,
    portal,
  });
  const { blocks } = renderLegalContentWithToc(doc.content, locale);
  const tr = locale === 'tr';
  // The legal text stays on a light page for readability, whatever the theme.
  const style = portalStyle({ ...portal, theme: portal.theme === 'dark' ? 'brand' : portal.theme }, program.accentColor);
  return (
    <div style={style} className="min-h-dvh">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6 sm:px-6">
        <Link
          href={`/l/${program.slug}${tr ? '' : '?lang=en'}`}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium"
          style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface)' }}
        >
          <ChevronLeft size={15} aria-hidden /> {r.name}
        </Link>
        <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">{doc.title}</h1>
        {doc.description && (
          <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--p-muted)' }}>
            {doc.description}
          </p>
        )}
        <article className="prose-legal mt-8 rounded-[24px] border bg-white p-5 sm:p-8" style={{ borderColor: 'var(--p-border)' }}>
          {blocks}
        </article>
        <p className="mt-6 text-center text-[12px]" style={{ color: 'var(--p-muted)' }}>
          {tr ? 'Bu metin Buaze altyapısında, işletmenin bilgileriyle hazırlanmıştır.' : 'Prepared on Buaze with the business’s details.'}
        </p>
      </div>
    </div>
  );
}
