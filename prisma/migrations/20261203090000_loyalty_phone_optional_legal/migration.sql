-- Loyalty legal texts: the phone number is optional (2026-11-28, CLAUDE.md
-- §61). Data only: published copies that still carry the old wording get the
-- new sentence; admin edits stay as they are.
UPDATE "legal_documents"
SET "content" = replace(replace(replace(replace("content",
  '- Üye olmak için ad, soyad ve cep telefonu numarası gerekir; e-posta ve doğum günü isteğe bağlıdır.',
  '- Üye olmak için ad ve soyad yeterlidir; telefon numarası, e-posta ve doğum günü isteğe bağlıdır. Üye Google hesabıyla katılırsa kart ücretsiz Buaze müşteri hesabına bağlanır.'),
  '- Joining requires first name, last name and mobile number; e-mail and birthday are optional.',
  '- A first and last name are enough to join; phone number, e-mail and birthday are optional. A member who joins with Google gets the card in a free Buaze customer account.'),
  '- **İletişim:** cep telefonu numarası, (verdiyseniz) e-posta adresi',
  '- **İletişim:** (verdiyseniz) cep telefonu numarası ve e-posta adresi'),
  '- Contact: mobile number, e-mail (if given)',
  '- Contact: mobile number and e-mail (if given)')
WHERE "key" IN ('sadakat-uyelik-kosullari', 'sadakat-aydinlatma');

UPDATE "legal_documents"
SET "content" = replace(replace(replace(replace(replace("content",
  'Ad, soyad ve e-posta zorunludur; telefon numarası sadakat kartı açmak için gerekir.',
  'Ad, soyad ve e-posta zorunludur; telefon numarası isteğe bağlıdır.'),
  'First name, last name and e-mail are required; a phone number is needed to open a loyalty card.',
  'First name, last name and e-mail are required; a phone number is optional.'),
  'ad, soyad, telefon, (verdiyseniz) e-posta ve doğum günü bilgileriniz',
  'ad, soyad, e-posta ve (verdiyseniz) telefon ve doğum günü bilgileriniz'),
  'your name, phone, e-mail (if given) and birthday (if given) are shared',
  'your name, e-mail, and phone and birthday (if given) are shared'),
  '- **İletişim:** e-posta adresi, telefon numarası',
  '- **İletişim:** e-posta adresi, (verdiyseniz) telefon numarası')
WHERE "key" IN ('musteri-hesabi-kosullari', 'musteri-hesabi-aydinlatma');
