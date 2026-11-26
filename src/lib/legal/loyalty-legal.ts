/**
 * Loyalty and customer-account legal texts (CLAUDE.md §60, §61) rendered with
 * the business as data controller. The admin-editable documents carry
 * {{ISLETME_ADI}} / {{ISLETME_ADRESI}} / {{ISLETME_ILETISIM}}; a business's
 * /l/<slug>/kosullar and /aydinlatma pages fill them with that business's
 * details (Müşteri paneli → Yasal bilgiler), the general pages with a
 * neutral phrase.
 */
import { loadActiveLegalDocumentRendered, type LegalDocumentSnapshot } from '@/lib/legal/loader';
import type { LegalDocumentKey, LegalLocale } from '@/lib/legal/keys';
import { substituteLegalVariables } from '@/lib/legal/variables';
import type { LoyaltyPortal } from '@/lib/loyalty-portal';

export const LOYALTY_LEGAL_KEYS = [
  'sadakat-uyelik-kosullari',
  'sadakat-aydinlatma',
  'musteri-hesabi-kosullari',
  'musteri-hesabi-aydinlatma',
  'sadakat-isletme-eki',
] as const satisfies readonly LegalDocumentKey[];

export interface LegalBusinessInfo {
  name: string;
  address: string | null;
  phone: string | null;
  portal: Pick<LoyaltyPortal, 'legalName' | 'legalAddress' | 'legalEmail'>;
}

export function businessLegalVars(b: LegalBusinessInfo, locale: LegalLocale): Record<string, string> {
  const tr = locale !== 'en';
  const contact = [b.portal.legalEmail, b.phone].filter(Boolean).join(' · ');
  return {
    ISLETME_ADI: b.portal.legalName || b.name,
    ISLETME_ADRESI: b.portal.legalAddress || b.address || (tr ? 'İşletmenin adresi' : 'the business’s address'),
    ISLETME_ILETISIM: contact || (tr ? 'işletmenin kasası ve iletişim bilgileri' : 'the business’s counter and contact details'),
  };
}

export function genericBusinessVars(locale: LegalLocale): Record<string, string> {
  const tr = locale !== 'en';
  return {
    ISLETME_ADI: tr ? 'Programın sahibi işletme' : 'The business that runs the programme',
    ISLETME_ADRESI: tr ? 'işletmenin katılım sayfasında yazılı adres' : 'the address shown on the business’s join page',
    ISLETME_ILETISIM: tr ? 'işletmenin katılım sayfasında yazılı iletişim bilgileri' : 'the contact details on the business’s join page',
  };
}

export async function loadLoyaltyLegal(
  key: LegalDocumentKey,
  locale: LegalLocale,
  business?: LegalBusinessInfo | null,
): Promise<LegalDocumentSnapshot> {
  const doc = await loadActiveLegalDocumentRendered(key, locale);
  const vars = business ? businessLegalVars(business, locale) : genericBusinessVars(locale);
  return {
    ...doc,
    title: substituteLegalVariables(doc.title, vars),
    description: substituteLegalVariables(doc.description, vars),
    content: substituteLegalVariables(doc.content, vars),
  };
}
