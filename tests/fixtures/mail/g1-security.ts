// g1 — security & account mails (forgot-password, password-changed,
// new-device-login, verify-email, data-export-confirmation,
// account-deletion-scheduled, account-deletion-canceled).
import { renderForgotPassword } from '../../../src/lib/email/templates/forgot-password';
import { renderPasswordChanged } from '../../../src/lib/email/templates/password-changed';
import { renderNewDeviceLogin } from '../../../src/lib/email/templates/new-device-login';
import { renderVerifyEmail } from '../../../src/lib/email/templates/verify-email';
import { renderDataExportConfirmation } from '../../../src/lib/email/templates/data-export-confirmation';
import { renderAccountDeletionScheduled } from '../../../src/lib/email/templates/account-deletion-scheduled';
import { renderAccountDeletionCanceled } from '../../../src/lib/email/templates/account-deletion-canceled';
import { APP_URL, LONG_EMAIL, LONG_NAME, LONG_URL, LONG_WORD, type MailFixture } from './_env';

const WHEN = new Date('2026-10-12T14:32:00+03:00');
const IP = '88.241.17.203';
const DEVICE = 'Chrome 120 · macOS';
const LONG_DEVICE = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ${LONG_WORD}`;
const LONG_IP = '2a02:ff0:1234:5678:9abc:def0:1234:5678';
const RESET_URL = `${APP_URL}/tr/auth/reset-password?token=9c2f4a8ebd71pulse4f1a`;
const VERIFY_URL = `${APP_URL}/tr/auth/verify-email?token=7be31c09d4a85pulse21aa`;
const ACCOUNT = 'mert.yilmaz@kahvedukkani.com.tr';

export const FIXTURES_G1: MailFixture[] = [
  // ── forgot-password ──────────────────────────────────────────────────
  {
    id: 'forgot-password',
    template: 'forgot-password',
    render: (l) =>
      renderForgotPassword(
        { code: '482916', resetUrl: RESET_URL, firstName: 'Mert', ip: IP, device: DEVICE, account: ACCOUNT },
        l,
      ),
  },
  {
    id: 'forgot-password:minimal',
    template: 'forgot-password',
    render: (l) => renderForgotPassword({ code: '073528', resetUrl: RESET_URL }, l),
  },
  {
    id: 'forgot-password:stress',
    template: 'forgot-password',
    stress: true,
    render: (l) =>
      renderForgotPassword(
        {
          code: '482916',
          resetUrl: LONG_URL.replace('/dashboard/restaurants', '/auth/reset-password'),
          firstName: LONG_NAME,
          ip: LONG_IP,
          device: LONG_DEVICE,
          account: LONG_EMAIL,
        },
        l,
      ),
  },

  // ── password-changed ─────────────────────────────────────────────────
  {
    id: 'password-changed',
    template: 'password-changed',
    render: (l) =>
      renderPasswordChanged(
        { firstName: 'Ayşe', resetUrl: RESET_URL, ip: IP, device: DEVICE, account: ACCOUNT, changedAt: WHEN },
        l,
      ),
  },
  {
    id: 'password-changed:minimal',
    template: 'password-changed',
    render: (l) => renderPasswordChanged({ resetUrl: RESET_URL, changedAt: WHEN }, l),
  },
  {
    id: 'password-changed:stress',
    template: 'password-changed',
    stress: true,
    render: (l) =>
      renderPasswordChanged(
        {
          firstName: LONG_NAME,
          resetUrl: LONG_URL,
          ip: LONG_IP,
          device: LONG_DEVICE,
          account: LONG_EMAIL,
          changedAt: WHEN,
        },
        l,
      ),
  },

  // ── new-device-login ─────────────────────────────────────────────────
  {
    id: 'new-device-login',
    template: 'new-device-login',
    render: (l) =>
      renderNewDeviceLogin(
        {
          firstName: 'Deniz',
          accountEmail: ACCOUNT,
          device: 'Chrome 120',
          location: '88.241.x.x',
          loggedInAt: WHEN,
          resetUrl: RESET_URL,
        },
        l,
      ),
  },
  {
    id: 'new-device-login:unknown',
    template: 'new-device-login',
    render: (l) =>
      renderNewDeviceLogin(
        {
          accountEmail: ACCOUNT,
          device: l === 'en' ? 'Unknown browser' : 'Bilinmeyen tarayıcı',
          location: '—',
          loggedInAt: WHEN,
          resetUrl: RESET_URL,
        },
        l,
      ),
  },
  {
    id: 'new-device-login:stress',
    template: 'new-device-login',
    stress: true,
    render: (l) =>
      renderNewDeviceLogin(
        {
          firstName: LONG_NAME,
          accountEmail: LONG_EMAIL,
          device: LONG_DEVICE,
          location: LONG_IP,
          loggedInAt: WHEN,
          resetUrl: LONG_URL,
        },
        l,
      ),
  },

  // ── verify-email ─────────────────────────────────────────────────────
  {
    id: 'verify-email',
    template: 'verify-email',
    render: (l) => renderVerifyEmail({ firstName: 'Zeynep', verifyUrl: VERIFY_URL }, l),
  },
  {
    id: 'verify-email:noname',
    template: 'verify-email',
    render: (l) => renderVerifyEmail({ verifyUrl: VERIFY_URL }, l),
  },
  {
    id: 'verify-email:stress',
    template: 'verify-email',
    stress: true,
    render: (l) =>
      renderVerifyEmail(
        { firstName: LONG_NAME, verifyUrl: LONG_URL.replace('/dashboard/restaurants', '/auth/verify-email') },
        l,
      ),
  },

  // ── data-export-confirmation ─────────────────────────────────────────
  {
    id: 'data-export-confirmation',
    template: 'data-export-confirmation',
    render: (l) =>
      renderDataExportConfirmation(
        { firstName: 'Can', accountEmail: ACCOUNT, ip: IP, device: DEVICE, exportedAt: WHEN },
        l,
      ),
  },
  {
    id: 'data-export-confirmation:minimal',
    template: 'data-export-confirmation',
    render: (l) => renderDataExportConfirmation({ accountEmail: ACCOUNT, exportedAt: WHEN }, l),
  },
  {
    id: 'data-export-confirmation:stress',
    template: 'data-export-confirmation',
    stress: true,
    render: (l) =>
      renderDataExportConfirmation(
        { firstName: LONG_NAME, accountEmail: LONG_EMAIL, ip: LONG_IP, device: LONG_DEVICE, exportedAt: WHEN },
        l,
      ),
  },

  // ── account-deletion-scheduled ───────────────────────────────────────
  {
    id: 'account-deletion-scheduled',
    template: 'account-deletion-scheduled',
    render: (l) =>
      renderAccountDeletionScheduled(
        {
          firstName: 'Elif',
          accountEmail: ACCOUNT,
          scheduledFor: new Date('2026-11-11T03:00:00+03:00'),
          daysRemaining: 30,
          cancelUrl: `${APP_URL}/api/account/delete/cancel?token=3f9a1c7e5b2d8046pulse9a1c`,
        },
        l,
      ),
  },
  {
    id: 'account-deletion-scheduled:lastday',
    template: 'account-deletion-scheduled',
    render: (l) =>
      renderAccountDeletionScheduled(
        {
          accountEmail: ACCOUNT,
          scheduledFor: new Date('2026-10-13T03:00:00+03:00'),
          daysRemaining: 1,
          cancelUrl: `${APP_URL}/api/account/delete/cancel?token=3f9a1c7e5b2d8046pulse9a1c`,
        },
        l,
      ),
  },
  {
    id: 'account-deletion-scheduled:stress',
    template: 'account-deletion-scheduled',
    stress: true,
    render: (l) =>
      renderAccountDeletionScheduled(
        {
          firstName: LONG_NAME,
          accountEmail: LONG_EMAIL,
          scheduledFor: new Date('2026-11-11T03:00:00+03:00'),
          daysRemaining: 30,
          cancelUrl: LONG_URL,
        },
        l,
      ),
  },

  // ── account-deletion-canceled ────────────────────────────────────────
  {
    id: 'account-deletion-canceled',
    template: 'account-deletion-canceled',
    render: (l) =>
      renderAccountDeletionCanceled(
        { firstName: 'Elif', accountEmail: ACCOUNT, dashboardUrl: `${APP_URL}/tr/dashboard` },
        l,
      ),
  },
  {
    id: 'account-deletion-canceled:stress',
    template: 'account-deletion-canceled',
    stress: true,
    render: (l) =>
      renderAccountDeletionCanceled(
        { firstName: LONG_NAME, accountEmail: LONG_EMAIL, dashboardUrl: LONG_URL },
        l,
      ),
  },
];
