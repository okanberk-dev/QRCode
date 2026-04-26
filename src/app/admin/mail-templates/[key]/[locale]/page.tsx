import { notFound } from 'next/navigation';
import MailTemplateEditor from '@/components/admin/MailTemplateEditor';

const SUPPORTED_KEYS = new Set(['welcome', 'newsletter', 'trial-ending']);
const SUPPORTED_LOCALES = new Set(['tr', 'en']);

export default async function EditMailTemplatePage({
  params,
}: {
  params: Promise<{ key: string; locale: string }>;
}) {
  const { key, locale } = await params;
  if (!SUPPORTED_KEYS.has(key) || !SUPPORTED_LOCALES.has(locale)) {
    notFound();
  }
  return <MailTemplateEditor templateKey={key} locale={locale} />;
}
