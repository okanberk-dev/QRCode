import type { Metadata } from 'next';

// Token / session surfaces: never indexable. robots.txt already blocks the path,
// but a Disallow alone lets the URL be listed without Google ever seeing noindex.
// `absolute` also stops the root title template from doubling the brand.
export const metadata: Metadata = {
  title: { absolute: 'Buaze' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
