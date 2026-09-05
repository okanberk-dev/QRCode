'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import {
  getRecaptchaToken,
  preloadRecaptcha,
  prefetchRecaptchaToken,
  takeRecaptchaToken,
} from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { AlertBanner } from '@/components/ui';

interface LoginFormProps {
  locale: Locale;
  t: {
    auth_email: string;
    auth_password: string;
    auth_login_btn: string;
    auth_login_loading: string;
    auth_no_account: string;
    auth_register_link: string;
    auth_forgot: string;
  };
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 1 1-3.3-12.9l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/>
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3A19.4 19.4 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z"/>
    </svg>
  );
}

export default function LoginForm({ locale, t }: LoginFormProps) {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get('email')?.trim() ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // `?email=` query param ile gelen kullanıcılarda (örn. davet linki sonrası
  // session expire, password reset sonrası) email otomatik doldurulur.
  // Kullanıcı yine değiştirebilir — sadece pre-fill, readonly değil.
  const [form, setForm] = useState({ email: prefilledEmail, password: '', rememberMe: false });

  // 2FA challenge state — login route twoFactorEnabled=true ise needs2FA döner.
  // challengeToken (5dk JWT) ve email hatırla, 6 haneli kod girişi göster.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string>('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const finalizeGoogleSignIn = async (idToken: string) => {
    // Token was prefetched the moment the Google popup opened (see
    // handleGoogleSignIn) — by now it is usually already resolved, so this
    // no longer adds a script-load + execute round-trip after the popup.
    const recaptchaToken = await takeRecaptchaToken('auth_google');
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, recaptchaToken, locale }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || (locale === 'tr' ? 'Google ile giriş yapılamadı.' : 'Google sign-in failed.'));
      setLoading(false);
      return;
    }
    const needsOnboarding = data.isNewUser || data.onboardingCompleted === false;
    const redirectPath = needsOnboarding
      ? `/${locale}/onboarding`
      : (searchParams.get('redirect') || `/${locale}/dashboard`);
    window.location.href = redirectPath;
  };

  useEffect(() => {
    let cancelled = false;
    // Warm both third-party SDKs while the user is still reading the form so
    // the first click / submit doesn't pay their download + handshake cost.
    preloadRecaptcha();
    (async () => {
      try {
        const { consumeGoogleRedirectIdToken, isGoogleRedirectPending, preloadGoogleSignIn } =
          await import('@/lib/firebase-client');
        preloadGoogleSignIn();
        const wasGoogleRedirectPending = isGoogleRedirectPending();
        if (wasGoogleRedirectPending) setLoading(true);
        const idToken = await consumeGoogleRedirectIdToken();
        if (cancelled) return;
        if (!idToken) {
          if (wasGoogleRedirectPending) setLoading(false);
          return;
        }
        await finalizeGoogleSignIn(idToken);
      } catch (err) {
        console.error('[google-redirect-result]', err);
        const { getFirebaseErrorMessage } = await import('@/lib/firebase-client');
        setError(getFirebaseErrorMessage(err, locale));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const { startGoogleSignIn } = await import('@/lib/firebase-client');
      // Run the reCAPTCHA execute concurrently with the Google popup instead
      // of after it — the two are independent network round-trips.
      prefetchRecaptchaToken('auth_google');
      const result = await startGoogleSignIn();
      if (result.status === 'unconfigured') {
        setNotice(
          locale === 'tr'
            ? 'Google ile giriş henüz aktif değil. Lütfen e-posta ile devam edin.'
            : 'Google sign-in is not active yet. Please continue with email.'
        );
        setLoading(false);
        return;
      }
      if (result.status === 'idToken') {
        await finalizeGoogleSignIn(result.idToken);
        return;
      }
      // status === 'redirecting' — browser navigates away; result handled by
      // the mount effect on return.
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // User dismissed the popup — not an error, just reset UI.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      console.error('[google-signin]', err);
      const { getFirebaseErrorMessage } = await import('@/lib/firebase-client');
      setError(getFirebaseErrorMessage(err, locale));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('auth_login');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken, locale }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.trialExpired) {
          setError(
            locale === 'tr'
              ? 'Ücretsiz deneme süreniz sona ermiştir. Devam etmek için plan yükseltin.'
              : 'Your free trial has expired. Please upgrade to continue.'
          );
          setLoading(false);
          return;
        }
        if (data.error === 'email_not_verified' && data.email) {
          // §22 — Davet akışında oluşan team_member hesabı, mail onayı henüz
          // gelmemiş. Kullanıcıyı check-email sayfasına yönlendir; orada
          // "Tekrar gönder" butonuyla yeni mail isteyebilir.
          window.location.href = `/${locale}/auth/check-email?email=${encodeURIComponent(String(data.email))}`;
          return;
        }
        setError(data.error || (locale === 'tr' ? 'Giriş yapılamadı.' : 'Login failed.'));
        setLoading(false);
        return;
      }

      // 2FA challenge — şifre doğru ama hesapta 2FA aktif. ChallengeToken sakla,
      // UI 6 haneli kod input'una geçer; cookie hâlâ set EDİLMEDİ.
      if (data.needs2FA && typeof data.challengeToken === 'string') {
        setChallengeToken(data.challengeToken);
        setChallengeEmail(data.email || form.email);
        setLoading(false);
        return;
      }

      const redirectPath = searchParams.get('redirect') || `/${locale}/dashboard`;
      window.location.href = redirectPath;
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: twoFactorCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Doğrulama başarısız.' : 'Verification failed.'));
        setLoading(false);
        return;
      }
      const redirectPath = searchParams.get('redirect') || `/${locale}/dashboard`;
      window.location.href = redirectPath;
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
      setLoading(false);
    }
  };

  const cancelTwoFactor = () => {
    setChallengeToken(null);
    setTwoFactorCode('');
    setError('');
    setLoading(false);
  };

  // 2FA challenge state'inde Google + email/password formu gizle, sadece 6 haneli
  // kod prompt'u render et. Geri al butonu form state'i temizler.
  if (challengeToken) {
    return (
      <form onSubmit={handle2FASubmit} className="flex flex-col gap-3.5">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}
        <div className="rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-[13px] text-[#525252]">
          {locale === 'tr' ? 'İki adımlı doğrulama aktif.' : 'Two-step verification is active.'}{' '}
          {locale === 'tr'
            ? 'Authenticator uygulamandaki 6 haneli kodu (veya yedek kod) gir.'
            : 'Enter the 6-digit code from your authenticator app (or a backup code).'}
          {challengeEmail && (
            <div className="mt-1 bz-mono text-[11px] text-[#737373]">{challengeEmail}</div>
          )}
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 12))}
          placeholder="000000"
          className="bz-input bz-mono"
          style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 18 }}
          maxLength={12}
          required
        />
        <button
          type="submit"
          disabled={loading || twoFactorCode.length < 6}
          className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full min-h-[48px]"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {locale === 'tr' ? 'Doğrula ve giriş yap' : 'Verify and sign in'}
        </button>
        <button
          type="button"
          onClick={cancelTwoFactor}
          className="text-[12px] text-[#737373] hover:text-[#0A0A0A] transition-colors self-center"
        >
          {locale === 'tr' ? '← Şifre adımına dön' : '← Back to password'}
        </button>
        <RecaptchaNotice locale={locale} />
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {notice && !error && <AlertBanner kind="lime">{notice}</AlertBanner>}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex items-center gap-2.5 w-full min-h-[48px] px-4 py-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[14px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon size={16} />
        {locale === 'tr' ? 'Google ile devam et' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-2.5 my-1 text-[#A3A3A3]">
        <div className="flex-1 h-px bg-[#EDEDED]" />
        <span className="pulse-eyebrow text-[#A3A3A3]">{locale === 'tr' ? 'YA DA' : 'OR'}</span>
        <div className="flex-1 h-px bg-[#EDEDED]" />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-email" className="pulse-eyebrow text-[#737373] block">
          {t.auth_email}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="min-h-[48px] w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          placeholder="emre@arkbistro.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="pulse-eyebrow text-[#737373] block">
            {t.auth_password}
          </label>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="text-[11px] text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            {locale === 'tr' ? 'Unuttum?' : 'Forgot?'}
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            enterKeyHint="send"
            // Pre-fill (`?email=`) durumunda kullanıcı doğrudan şifre yazsın
            // — email zaten dolu, focus password'e atılır.
            autoFocus={!!prefilledEmail}
            value={form.password}
            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
            className="min-h-[48px] w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
            placeholder="••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-[#737373] hover:text-[#0A0A0A] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          id="rememberMe"
          checked={form.rememberMe}
          onChange={(e) => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
          className="w-4 h-4 rounded border border-[#D4D4D4] focus:ring-2 focus:ring-[#C6F24E] accent-[#0A0A0A]"
        />
        <span className="text-[13px] text-[#525252]">
          {locale === 'tr' ? 'Beni hatırla' : 'Remember me'}
        </span>
      </label>

      <button
        type="submit"
        id="login-submit-btn"
        disabled={loading}
        className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading ? t.auth_login_loading : (locale === 'tr' ? 'Giriş yap' : 'Sign in')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <RecaptchaNotice locale={locale} className="text-center px-1" />

      <p className="text-center text-[13px] text-[#737373] mt-2">
        {locale === 'tr' ? 'Hesabın yok mu?' : "Don't have an account?"}{' '}
        <Link href={`/${locale}/auth/register`} className="text-[#0A0A0A] font-semibold hover:text-[#A8D62E] transition-colors">
          {locale === 'tr' ? 'Kayıt ol' : 'Sign up'}
        </Link>
      </p>
    </form>
  );
}
