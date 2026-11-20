import { getCompanyLegalInfo } from '@/lib/legal/variables';
import { SUPPORT_EMAIL } from '@/lib/company-constants';
import { COMPANY_ENTITY } from '@/lib/legal/company-entity';

/**
 * One source for the company facts every public surface prints: the footer
 * `<address>`, /contact, /press, /about and the Organization JSON-LD
 * (NAP parity, CLAUDE.md §19.1.2 + §47). The legal name and street address
 * come from admin → Hukuki metinler → Değişkenler (COMPANY_NAME /
 * COMPANY_ADDRESS), whose defaults are the operating company
 * (`COMPANY_ENTITY`, NextGen Yazılım Ltd. Şti.). Registry numbers (MERSİS,
 * tax office / number, phone) are published only while the admin-set legal
 * name still matches that company, so an edited name never sits next to
 * another company's numbers. Server-only (reads the DB); client components
 * import the constants from '@/lib/company-constants'.
 */

export { SUPPORT_EMAIL, SUPPORT_HOURS, ORGANIZATION_ID, WEBSITE_ID } from '@/lib/company-constants';

export interface CompanyRegistry {
  mersisNo: string;
  taxOffice: string;
  taxNo: string;
  phone: string;
  phoneE164: string;
}

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
  /** Registry facts of the operating company, or null when the name differs. */
  registry: CompanyRegistry | null;
}

export async function getCompanyFacts(): Promise<CompanyFacts> {
  const legal = await getCompanyLegalInfo();
  const address = legal.address;
  const isOperatingCompany = legal.name === COMPANY_ENTITY.legalName;
  const isEntityAddress = address === COMPANY_ENTITY.addressLine;
  return {
    brandName: 'Buaze',
    legalName: legal.name,
    address,
    addressDisplay: address
      ? { tr: address, en: address }
      : { tr: 'İstanbul, Türkiye', en: 'Istanbul, Türkiye' },
    supportEmail: SUPPORT_EMAIL,
    postalAddress: isEntityAddress
      ? {
          '@type': 'PostalAddress',
          streetAddress: COMPANY_ENTITY.address.street,
          postalCode: COMPANY_ENTITY.address.postalCode,
          addressLocality: COMPANY_ENTITY.address.district,
          addressRegion: COMPANY_ENTITY.address.city,
          addressCountry: COMPANY_ENTITY.address.countryCode,
        }
      : address
        ? { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'TR' }
        : { '@type': 'PostalAddress', addressLocality: 'İstanbul', addressCountry: 'TR' },
    registry: isOperatingCompany
      ? {
          mersisNo: COMPANY_ENTITY.mersisNo,
          taxOffice: COMPANY_ENTITY.taxOffice,
          taxNo: COMPANY_ENTITY.taxNo,
          phone: COMPANY_ENTITY.phone,
          phoneE164: COMPANY_ENTITY.phoneE164,
        }
      : null,
  };
}
