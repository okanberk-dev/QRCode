import type { Metadata, Viewport } from 'next';
import RootHtml from '@/components/root/RootHtml';
import { buildBaseMetadata, ROOT_VIEWPORT } from '@/lib/root-metadata';

// Root layout for the loyalty join and card pages (/l/...). One root layout
// per top-level segment (CLAUDE.md §52); the pages switch <html lang> to
// "en" on the client when the customer reads them in English.
export const viewport: Viewport = ROOT_VIEWPORT;

export function generateMetadata(): Promise<Metadata> {
  return buildBaseMetadata();
}

export default function LoyaltyRootLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="tr">{children}</RootHtml>;
}
