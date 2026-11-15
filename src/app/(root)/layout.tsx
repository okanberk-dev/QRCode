import type { Metadata, Viewport } from 'next';
import RootHtml from '@/components/root/RootHtml';
import { buildBaseMetadata, ROOT_VIEWPORT } from '@/lib/root-metadata';

// Root layout for `/`, which only redirects to /tr or /en (the edge
// middleware normally answers first). One root layout per top-level segment
// lets /en pages be served with lang="en" (src/components/root/RootHtml.tsx).
export const viewport: Viewport = ROOT_VIEWPORT;

export function generateMetadata(): Promise<Metadata> {
  return buildBaseMetadata();
}

export default function LocaleRedirectRootLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="tr">{children}</RootHtml>;
}
