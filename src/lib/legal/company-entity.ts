/**
 * The legal entity that operates Buaze (owner decision, 2026-11-20).
 *
 * Buaze is a brand of NextGen Yazılım Ltd. Şti., the same company that runs
 * L'Affogato. These facts are copied from L'Affogato's verified source
 * (laffogato repo `src/lib/legal/entity.ts`, checked there against the tax
 * certificate). Keep both repos in step when the company's details change.
 *
 * Client-safe: no DB access, no secrets — everything here is public
 * registry information that Turkish law requires on the website, in
 * contracts and in commercial e-mails.
 *
 * How it is used:
 * - defaults of the legal-text variables (COMPANY_NAME, COMPANY_ADDRESS,
 *   COMPANY_TAX_ID, COMPANY_PHONE) in `src/lib/legal/variables.ts`; the live
 *   values sit in the `legal_variables` table (admin → Hukuki metinler →
 *   Değişkenler) and were set to these by migration
 *   `20261120090000_company_entity_nextgen`;
 * - registry facts on the footer, /about, /press and in the Organization
 *   JSON-LD (`getCompanyFacts`), shown only while the admin-set legal name
 *   still matches `legalName`, so an edited name never sits next to another
 *   company's numbers;
 * - the sender identity line in every e-mail footer (6563 sayılı Kanun,
 *   ticari elektronik ileti: hizmet sağlayıcının tanınmasını sağlayan
 *   bilgiler).
 */
export const COMPANY_ENTITY = {
  /** Registered trade name, exactly as on the tax certificate. */
  legalName: 'NEXTGEN YAZILIM EĞİTİM İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
  /** Short form for tight places (e-mail footer, copyright line). */
  shortName: 'NextGen Yazılım Ltd. Şti.',
  address: {
    street: 'Postane Mah. Atatürk Cad. No: 28 İç Kapı No: 1',
    postalCode: '34940',
    district: 'Tuzla',
    city: 'İstanbul',
    country: 'Türkiye',
    countryCode: 'TR',
  },
  /** One-line address used in legal texts, the footer and e-mails. */
  addressLine: 'Postane Mah. Atatürk Cad. No: 28 İç Kapı No: 1, 34940 Tuzla / İstanbul',
  taxOffice: 'Tuzla Vergi Dairesi',
  taxNo: '6312110904',
  mersisNo: '0734069467300012',
  phone: '+90 536 429 09 19',
  phoneE164: '+905364290919',
  /** Main activity on the tax certificate: 621000 Bilgisayar programlama faaliyetleri. */
  naceCode: '621000',
} as const;

/** "MERSİS 0734… · Tuzla Vergi Dairesi 6312…" — the COMPANY_TAX_ID value. */
export const COMPANY_TAX_LINE = `MERSİS ${COMPANY_ENTITY.mersisNo} · ${COMPANY_ENTITY.taxOffice} ${COMPANY_ENTITY.taxNo}`;
