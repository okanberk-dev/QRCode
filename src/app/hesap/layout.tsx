import type { Metadata, Viewport } from 'next';
import RootHtml from '@/components/root/RootHtml';
import { buildBaseMetadata, ROOT_VIEWPORT } from '@/lib/root-metadata';

// Root layout for the Buaze customer account (/hesap, CLAUDE.md §61, §52).
// The pages set <html lang> to "en" on the client for English readers.
export const viewport: Viewport = ROOT_VIEWPORT;

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildBaseMetadata();
  return { ...base, robots: { index: false, follow: false } };
}

export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="tr">{children}</RootHtml>;
}
