import type { Metadata } from 'next';
import { renderAccountPage, type AccountSearchParams } from '../_components/auth-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Giriş yap · Buaze hesabım', robots: { index: false, follow: false } };

export default function AccountLoginPage({ searchParams }: { searchParams: AccountSearchParams }) {
  return renderAccountPage(searchParams, 'login');
}
