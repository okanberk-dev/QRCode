'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

/**
 * Client islands of the "Ritim" marketing design (CLAUDE.md §62). Markup and
 * class names follow the design package one to one (`rt-` prefix); the
 * behaviour follows its main.js. Everything renders on the server first, so
 * the content is in the HTML without JavaScript.
 */

/* ---------- SSS akordeon (.rt-faq) ---------- */
export function RtFaqList({ items, firstOpen = false }: { items: readonly { q: string; a: ReactNode }[]; firstOpen?: boolean }) {
  const [open, setOpen] = useState<number | null>(firstOpen ? 0 : null);
  const id = useId();
  return (
    <div className="rt-faq__list">
      {items.map((item, i) => (
        <div key={i} className="rt-faq__item">
          <h3>
            <button
              type="button"
              className="rt-faq__q"
              aria-expanded={open === i}
              aria-controls={`${id}-a${i}`}
              onClick={() => setOpen((cur) => (cur === i ? null : i))}
            >
              {item.q}
            </button>
          </h3>
          <div className="rt-faq__a" id={`${id}-a${i}`} role="region">
            <div>
              <p>{item.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Segment kontrol + panel (.rt-segmented) ---------- */
export function RtSegmented({
  tabs,
  label,
  align = 'end',
  head,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  label: string;
  align?: 'end' | 'center';
  /** Section heading; the control then sits at its right, as in the design. */
  head?: ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const id = useId();
  const tablist = (
      <div className="rt-segmented" role="tablist" aria-label={label} style={head ? undefined : align === 'center' ? { margin: '0 auto 48px' } : { marginBottom: 32 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${id}-t-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`${id}-p-${t.id}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
  );
  return (
    <>
      {head ? (
        <div className="rt-section-head">
          {head}
          {tablist}
        </div>
      ) : (
        tablist
      )}
      {tabs.map((t) => (
        <div key={t.id} id={`${id}-p-${t.id}`} role="tabpanel" aria-labelledby={`${id}-t-${t.id}`} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </>
  );
}

/* ---------- Yapışkan özellik kaydırıcı (.rt-sticky-feature) ---------- */
export interface StickyItem {
  title: string;
  body: string;
  img: string;
  caption: string;
}
export function RtStickyFeature({ head, items }: { head: ReactNode; items: StickyItem[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(refs.current.indexOf(en.target as HTMLLIElement));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="rt-sticky-feature">
      <div className="rt-sticky-feature__inner">
        <div>
          <div className="rt-sticky-feature__head">{head}</div>
          <ol className="rt-sticky-feature__list">
            {items.map((it, i) => (
              <li
                key={it.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={`rt-sticky-feature__item${active === i ? ' rt-is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                <span>
                  {it.title}
                  <span className="rt-sticky-feature__body">{it.body}</span>
                </span>
                <span className="rt-circle-btn rt-circle-btn--brand" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
        <div className="rt-sticky-feature__media" aria-hidden="true">
          {items.map((it, i) => (
            <div key={it.img} className={`rt-sticky-feature__frame${active === i ? ' rt-is-active' : ''}`}>
              <Image src={it.img} alt="" fill sizes="(max-width: 767px) 100vw, 636px" />
              <p className="rt-sticky-feature__caption">{it.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Hikâye/sektör karuseli (.rt-stories) ---------- */
export interface StorySlide {
  img: string;
  stat: string;
  statSub: string;
  quote: string;
  sign: string;
  by: string;
  href: string;
  linkLabel: string;
}
export function RtStories({ slides, prevLabel, nextLabel }: { slides: StorySlide[]; prevLabel: string; nextLabel: string }) {
  const [idx, setIdx] = useState(0);
  const s = slides[idx];
  const go = (d: number) => setIdx((i) => (i + d + slides.length) % slides.length);
  const strips = [1, 2, 3].map((k) => slides[(idx + k) % slides.length]);
  return (
    <div>
      <div className="rt-stories__rail">
        <div className="rt-story-main">
          <Image src={s.img} alt="" fill sizes="(max-width: 1023px) 100vw, 958px" key={s.img} />
          <Link href={s.href} prefetch={false} className="rt-btn rt-btn--white rt-btn--sm" style={{ alignSelf: 'flex-start' }}>
            {s.linkLabel}
          </Link>
          <p className="rt-story-main__stat">
            {s.stat}
            <span className="rt-script">{s.statSub}</span>
          </p>
        </div>
        {strips.map((st, k) => (
          <button
            key={`${st.img}-${k}`}
            type="button"
            className={`rt-story-strip${k === 2 ? ' rt-story-strip--thin' : ''}`}
            onClick={() => go(k + 1)}
            aria-label={st.sign}
          >
            <Image src={st.img} alt="" fill sizes="52px" />
          </button>
        ))}
      </div>
      <div className="rt-story-quote">
        <div>
          <p>{s.quote}</p>
          <p className="rt-signature">{s.sign}</p>
          <p className="rt-byline">{s.by}</p>
        </div>
        <div className="rt-carousel-nav">
          <button type="button" className="rt-circle-btn rt-circle-btn--brand rt-circle-btn--prev" aria-label={prevLabel} onClick={() => go(-1)} />
          <button type="button" className="rt-circle-btn rt-circle-btn--brand" aria-label={nextLabel} onClick={() => go(1)} />
        </div>
      </div>
    </div>
  );
}

/* ---------- E-posta yakalama (.rt-capture) → kayıt sayfası ---------- */
export function RtCapture({
  locale,
  button,
  placeholder,
  label,
}: {
  locale: 'tr' | 'en';
  button: string;
  placeholder: string;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = ref.current;
    if (!input) return;
    const v = input.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      input.setCustomValidity(locale === 'tr' ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid e-mail address.');
      input.reportValidity();
      return;
    }
    window.location.href = `/${locale}/auth/register?email=${encodeURIComponent(v)}`;
  };
  return (
    <form className="rt-capture" onSubmit={onSubmit} noValidate action={`/${locale}/auth/register`} method="get">
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name="email"
        type="email"
        placeholder={placeholder}
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        onInput={(e) => e.currentTarget.setCustomValidity('')}
      />
      <button type="submit" className="rt-btn rt-btn--primary">
        {button}
      </button>
    </form>
  );
}

/* ---------- Dikey sekmeler + görsel (.rt-tabs-media) ---------- */
export interface VTab {
  title: string;
  body: string;
  img: string;
  href?: string;
  linkLabel?: string;
}
export function RtVTabs({ tabs, mediaFirst = true, footer }: { tabs: VTab[]; mediaFirst?: boolean; footer?: ReactNode }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const media = (
    <div className="rt-tabs-media__img">
      {tabs.map((t, i) => (
        <Image key={t.img + i} src={t.img} alt="" fill sizes="(max-width: 1023px) 100vw, 590px" className={active === i ? 'rt-is-active' : ''} />
      ))}
    </div>
  );
  const list = (
    <div>
      <div className="rt-vtabs" role="tablist" aria-orientation="vertical">
        {tabs.map((t, i) => (
          <div key={t.title} className="rt-vtab">
            <button
              type="button"
              role="tab"
              className="rt-vtab__btn"
              id={`${id}-t${i}`}
              aria-selected={active === i}
              aria-controls={`${id}-p${i}`}
              onClick={() => setActive(i)}
            >
              {t.title}
            </button>
            <div className="rt-vtab__panel" id={`${id}-p${i}`} role="tabpanel" aria-labelledby={`${id}-t${i}`}>
              <div>
                <p>{t.body}</p>
                {t.href && (
                  <Link href={t.href} prefetch={false} className="rt-link-arrow">
                    {t.linkLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
  return <div className="rt-tabs-media">{mediaFirst ? <>{media}{list}</> : <>{list}{media}</>}</div>;
}
