// Herkese açık denetim linki açık değilse (spec §3.8, D7).
//
// `page.tsx` her başarısızlıkta `notFound()` çağırır (HTTP 404 korunur; var
// olmayan ve duraklatılmış token'lar ayırt edilemez, CLAUDE.md §13.5). Eskiden
// kullanıcı Next'in genel 404'ünü görüyordu; bu kart dili `Accept-Language`
// başlığından okur ve ne yapacağını söyler.

import { headers } from 'next/headers';
import { detectLocaleFromAcceptLanguage } from '@/lib/translations';
import PublicNoticeCard, { notOpenCopy } from './PublicNoticeCard';

export default async function AuditNotOpen() {
  const h = await headers();
  const locale = detectLocaleFromAcceptLanguage(h.get('accept-language'));
  const copy = notOpenCopy(locale);
  return <PublicNoticeCard title={copy.title} body={copy.body} />;
}
