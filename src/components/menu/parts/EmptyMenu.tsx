import type { MenuCopy } from '../menu-labels';

/** Empty menu: the masthead still renders above this. Copy unchanged. */
export default function EmptyMenu({ copy }: { copy: MenuCopy }) {
  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-center px-5 pt-[72px] pb-10 text-center @md/menu:px-6">
      <span aria-hidden className="block h-0.5 w-10 rounded-full bg-(--m-accent-ui)" />
      <h2 className="bzm-section mt-6">{copy.emptyTitle}</h2>
      <p className="mt-3 max-w-[36ch] text-[14px] leading-[21px] text-(--m-ink-2)">{copy.emptyBody}</p>
    </div>
  );
}
