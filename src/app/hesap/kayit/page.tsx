import type { Metadata } from 'next';
import { renderAccountPage, type AccountSearchParams } from '../_components/auth-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Hesap oluştur · Buaze hesabım', robots: { index: false, follow: false } };

export default function AccountRegisterPage({ searchParams }: { searchParams: AccountSearchParams }) {
  return renderAccountPage(searchParams, 'register');
}
