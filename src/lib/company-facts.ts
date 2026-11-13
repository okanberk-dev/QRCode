import { getCompanyLegalInfo } from '@/lib/legal/variables';
import { SUPPORT_EMAIL } from '@/lib/company-constants';

/**
 * One source for the company facts every public surface prints: the footer
 * `<address>`, /contact, /press, /about and the Organization JSON-LD
 * (NAP parity, CLAUDE.md §19.1.2 + §47). The legal name and street address
 * come from admin → Hukuki metinler → Değişkenler (COMPANY_NAME /
 * COMPANY_ADDRESS); until they are filled in, only the brand name and the
 * city are published — never an unregistered legal entity or an
 * unconfirmed office. Server-only (reads the DB); client components import
 * the constants from '@/lib/company-constants'.
 */

export { SUPPORT_EMAIL, SUPPORT_HOURS, ORGANIZATION_ID, WEBSITE_ID } from '@/lib/company-constants';

export interface CompanyFacts {
  brandName: 'Buaze';
  /** Registered legal name, or null while not configured. */
  legalName: string | null;
  /** Street address as entered by the admin, or null while not configured. */
  address: string | null;
  /** What to print: the configured address, otherwise just the city. */
  addressDisplay: { tr: string; en: string };
  supportEmail: string;
  /** schema.org PostalAddress for JSON-LD (same facts as addressDisplay). */
  postalAddress: Record<string, string>;
}

export async function getCompanyFacts(): Promise<CompanyFacts> {
  const legal = await getCompanyLegalInfo();
  const address = legal.address;
  return {
    brandName: 'Buaze',
    legalName: legal.name,
    address,
    addressDisplay: address
      ? { tr: address, en: address }
      : { tr: 'İstanbul, Türkiye', en: 'Istanbul, Türkiye' },
    supportEmail: SUPPORT_EMAIL,
    postalAddress: address
      ? { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'TR' }
      : { '@type': 'PostalAddress', addressLocality: 'İstanbul', addressCountry: 'TR' },
  };
}
