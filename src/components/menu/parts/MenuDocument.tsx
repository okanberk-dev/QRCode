import CategoryNav from './CategoryNav';
import EmptyMenu from './EmptyMenu';
import ItemGrid from './ItemGrid';
import ItemList from './ItemList';
import Masthead from './Masthead';
import MenuFooter from './MenuFooter';
import SectionHeader from './SectionHeader';
import type { MenuRenderContext, MenuSectionData } from './types';

/**
 * The scrollable menu document inside the `@container/menu` canvas: skip
 * link, masthead, sticky nav (≥ 2 categories), sections, footer.
 * Container queries only — never viewport breakpoints (the Studio renders
 * this inside a 375 px phone frame on a wide screen).
 */
export default function MenuDocument({
  ctx, sections, activeId, onNavSelect,
}: {
  ctx: MenuRenderContext;
  sections: MenuSectionData[];
  activeId: string | null;
  onNavSelect: (id: string) => void;
}) {
  const { d, copy } = ctx;
  const layout = d.knobs.items;
  const wide = layout === 'grid';
  const maxWidth = wide ? 'max-w-[1040px]' : 'max-w-[680px]';
  const centeredHeader = d.structure.header === 'centered' || d.structure.header === 'cover';
  const eagerFirst = layout === 'feature' ? 1 : 2;

  return (
    <>
      <a
        href="#menu-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-40 focus:rounded-(--m-r-pill) focus:bg-(--m-surface) focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-semibold focus:text-(--m-ink) focus:shadow-lg focus:outline-2 focus:outline-(--m-focus)"
      >
        {copy.skip}
      </a>
      <Masthead ctx={ctx} maxWidth={maxWidth} />
      {sections.length === 0 ? (
        <EmptyMenu copy={copy} />
      ) : (
        <>
          {sections.length >= 2 && (
            <CategoryNav
              categories={sections.map((s) => ({ id: s.category.id, name: s.category.name }))}
              activeId={activeId}
              variant={d.knobs.nav}
              centered={centeredHeader}
              label={copy.navLabel}
              wide={wide}
              syncHash={!ctx.preview}
              onSelect={onNavSelect}
            />
          )}
          <main
            id="menu-main"
            tabIndex={-1}
            className={`mx-auto flex w-full ${maxWidth} flex-col gap-(--m-section-gap) px-5 pt-10 outline-none @md/menu:px-6`}
          >
            {sections.map(({ category, items, index }) => {
              const titleId = `cat-title-${category.id}`;
              const eagerCount = index === 0 ? eagerFirst : 0;
              return (
                <section
                  key={category.id}
                  id={`cat-${category.id}`}
                  data-cat-id={category.id}
                  aria-labelledby={titleId}
                  tabIndex={-1}
                  className="scroll-mt-[calc(var(--m-nav-h)+16px)] outline-none"
                >
                  <SectionHeader
                    d={d}
                    title={category.name}
                    description={category.description}
                    index={index}
                    count={items.length}
                    copy={copy}
                    titleId={titleId}
                  />
                  {layout === 'list' || layout === 'text' ? (
                    <ItemList ctx={ctx} items={items} categoryId={category.id} layout={layout} eagerCount={eagerCount} />
                  ) : (
                    <ItemGrid ctx={ctx} items={items} categoryId={category.id} layout={layout} eagerCount={eagerCount} />
                  )}
                </section>
              );
            })}
          </main>
        </>
      )}
      <MenuFooter copy={copy} ecg={d.presetId === 'pulse'} />
    </>
  );
}
