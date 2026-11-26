import type { Metadata } from 'next';
import { renderAccountPage, type AccountSearchParams } from './_components/auth-page';

// Buaze customer account home (CLAUDE.md §61): signed out → sign in, signed in → "Kartlarım".
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Buaze hesabım', robots: { index: false, follow: false } };

export default function AccountPage({ searchParams }: { searchParams: AccountSearchParams }) {
  return renderAccountPage(searchParams, 'login');
}
