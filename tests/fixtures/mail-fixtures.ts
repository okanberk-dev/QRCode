// Aggregates every mail render fixture. Each group lives in its own file so
// parallel authors never edit the same file.
import { prepareMailRender, type MailFixture } from './mail/_env';
import { FIXTURES_G1 } from './mail/g1-security';
import { FIXTURES_G2 } from './mail/g2-feedback';
import { FIXTURES_G3 } from './mail/g3-reports';
import { FIXTURES_G4 } from './mail/g4-lifecycle';
import { FIXTURES_G5A } from './mail/g5a-team-newsletter';
import { FIXTURES_G5B } from './mail/g5b-forms';
import { FIXTURES_G6 } from './mail/g6-roi';
import { FIXTURES_G7 } from './mail/g7-designless';
import { FIXTURES_G7B } from './mail/g7b-landing';

export type { MailFixture } from './mail/_env';
export { prepareMailRender };

export const MAIL_FIXTURES: MailFixture[] = [
  ...FIXTURES_G1,
  ...FIXTURES_G2,
  ...FIXTURES_G3,
  ...FIXTURES_G4,
  ...FIXTURES_G5A,
  ...FIXTURES_G5B,
  ...FIXTURES_G6,
  ...FIXTURES_G7,
  ...FIXTURES_G7B,
];
