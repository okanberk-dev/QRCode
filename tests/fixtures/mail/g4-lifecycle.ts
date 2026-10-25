import { renderWelcome } from '../../../src/lib/email/templates/welcome';
import { APP_URL, LONG_WORD, type MailFixture } from './_env';

export const FIXTURES_G4: MailFixture[] = [
  {
    id: 'welcome',
    template: 'welcome',
    render: (locale) => renderWelcome({ firstName: 'Mert', dashboardUrl: `${APP_URL}/tr/dashboard` }, locale),
  },
  {
    id: 'welcome:stress',
    template: 'welcome',
    stress: true,
    render: (locale) =>
      renderWelcome({ firstName: LONG_WORD, dashboardUrl: `${APP_URL}/tr/dashboard?next=${LONG_WORD}` }, locale),
  },
];
