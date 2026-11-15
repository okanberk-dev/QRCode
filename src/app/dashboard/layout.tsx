import type { Metadata, Viewport } from 'next';
import RootHtml from '@/components/root/RootHtml';
import { buildBaseMetadata, ROOT_VIEWPORT } from '@/lib/root-metadata';

// Root layout for the locale-less /dashboard/* redirect shim. The app has one root layout
// per top-level segment so /en pages can be served with lang="en"
// (see src/components/root/RootHtml.tsx).
export const viewport: Viewport = ROOT_VIEWPORT;

export function generateMetadata(): Promise<Metadata> {
  return buildBaseMetadata();
}

export default function DashboardShimRootLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="tr">{children}</RootHtml>;
}
