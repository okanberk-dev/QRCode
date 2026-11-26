'use client';
// Sets <html lang> for English readers of a "tr" root layout (§52).
import { useEffect } from 'react';

export default function HtmlLang({ locale }: { locale: 'tr' | 'en' }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
