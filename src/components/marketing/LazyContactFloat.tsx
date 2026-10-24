'use client';

import dynamic from 'next/dynamic';

// ContactFloat renders nothing until its client-side auth probe resolves, so
// a client-only load is visually identical and keeps the ~880-line widget
// out of the first bundle of every [locale] page.
const ContactFloat = dynamic(
  () => import('./ContactFloat').then((m) => m.ContactFloat),
  { ssr: false },
);

export default function LazyContactFloat({ locale }: { locale: string }) {
  return <ContactFloat locale={locale} />;
}
