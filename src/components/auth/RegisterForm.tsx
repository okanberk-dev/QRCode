'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { AlertBanner } from '@/components/ui';

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

interface RegisterFormProps {
  locale: Locale;
  t: {
    auth_register_title: string;
    auth_register_subtitle: string;
    auth_trial_badge: string;
    auth_no_cc: string;
    auth_name: string;
    auth_email: string;
    auth_password: string;
    auth_kvkk_consent: string;
    auth_terms_consent_1: string;
    auth_terms_consent_2: string;
    auth_terms_consent_3: string;
    auth_terms_consent_4: string;
    auth_terms_consent_5: string;
    auth_register_btn: string;
    auth_register_loading: string;
    auth_has_account: string;
    auth_login_link: string;
    feedback_kvkk_text?: string;
  };
}

export default function RegisterForm({ locale, t }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Davet maili'nden gelen kullanıcı için: email + inviteToken query parametreleriyle
  // formu pre-fill et (Faz 4 § auto-activate akışı). Token register handler'a
  // body'de geçer; başarılı kayıttan sonra TeamMember status invited→active.
  const inviteToken = searchParams.get('inviteToken') ?? '';
  const inviteEmail = searchParams.get('email') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: inviteEmail, businessName: '', password: '', website: '' });

  // Stage 31b §38.108 — KVKK §10 + 6502 sayılı TKHK m.4 uyumlu üyelik onayı
  // checkbox UI. Eski davranış (`recordConsentBatch` implicit log atıyordu —
  // CLAUDE.md §21.27) UI'da görünür değildi → "kullanıcı görmediği belgelere
  // onay vermiş sayılıyor" hukuki ihlal. 3 zorunlu (kullanım şartları +
  // gizlilik politikası + KVKK aydınlatma) + 1 opsiyonel (ticari ileti / ETK
  // m.6 default OFF — KVKK Açık Rıza + GDPR Art.7).
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentKvkk, setConsentKvkk] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  // §45 — Yanıt/içerik sorumluluğu onayı. Ayrı zorunlu checkbox: kullanıcı
  // Buaze üzerinden göndereceği tüm yanıt/mesaj içeriğinden bizzat sorumlu
  // olduğunu ve tehdit/hakaret/iftira/yasa dışı ifade içermeyeceğini kabul
  // eder. Backing document: Kabul Edilebilir Kullanım Politikası (mevcut,
  // seeded legal doc — yeni içerik yazılmadı, mevcut kapsamlı belge reuse
  // edildi).
  const [consentContentResponsibility, setConsentContentResponsibility] = useState(false);
  const allRequiredConsentsGiven =
    consentTerms && consentPrivacy && consentKvkk && consentContentResponsibility;

  // Email query'si ile gelmişse field'ı locked tut + bilgilendirici notice göster.
  useEffect(() => {
    if (inviteEmail && !form.email) {
      setForm((prev) => ({ ...prev, email: inviteEmail }));
    }
    if (inviteToken && !notice) {
      setNotice(
        locale === 'tr'
          ? 'Bu adres bir Buaze ekibine davet edildi. Hesabını oluşturduğunda davet otomatik kabul edilir.'
          : 'This email was invited to a Buaze team. The invite is auto-accepted on register.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteEmail, inviteToken]);

  const finalizeGoogleSignUp = async (idToken: string) => {
    const recaptchaToken = await getRecaptchaToken('auth_google');
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, recaptchaToken, locale }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || (locale === 'tr' ? 'Google ile kayıt başarısız oldu.' : 'Google sign-up failed.'));
      setLoading(false);
      return;
    }
    const target = data.onboardingCompleted && !data.isNewUser
      ? `/${locale}/dashboard`
      : `/${locale}/onboarding`;
    router.push(target);
    router.refresh();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { consumeGoogleRedirectIdToken, isGoogleRedirectPending } =
          await import('@/lib/firebase-client');
        const wasGoogleRedirectPending = isGoogleRedirectPending();
        if (wasGoogleRedirectPending) setLoading(true);
        const idToken = await consumeGoogleRedirectIdToken();
        if (cancelled) return;
        if (!idToken) {
          if (wasGoogleRedirectPending) setLoading(false);
          return;
        }
        await finalizeGoogleSignUp(idToken);
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

  const handleGoogleSignUp = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const { startGoogleSignIn } = await import('@/lib/firebase-client');
      const result = await startGoogleSignIn();
      if (result.status === 'unconfigured') {
        setNotice(
          locale === 'tr'
            ? 'Google ile kayıt henüz aktif değil. Lütfen e-posta ile devam edin.'
            : 'Google sign-up is not active yet. Please continue with email.'
        );
        setLoading(false);
        return;
      }
      if (result.status === 'idToken') {
        await finalizeGoogleSignUp(result.idToken);
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
      console.error('[google-signup]', err);
      const { getFirebaseErrorMessage } = await import('@/lib/firebase-client');
      setError(getFirebaseErrorMessage(err, locale));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    // Stage 31b §38.108 — UI gate (defense-in-depth; native `required` attr
    // de aynı submit'i bloklar; aksi halde server-side fail-soft fallback).
    if (!allRequiredConsentsGiven) {
      setError(
        locale === 'tr'
          ? 'Devam etmek için Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni ve İçerik Sorumluluğu onaylarını işaretle.'
          : 'You must accept Terms of Service, Privacy Policy, KVKK Privacy Notice and Content Responsibility to continue.',
      );
      return;
    }
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('auth_register');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          recaptchaToken,
          locale,
          // Stage 31b §38.108 — opsiyonel ETK m.6 ticari ileti opt-in.
          // Default false (KVKK Açık Rıza + GDPR Art.7); kullanıcı checkbox
          // ile bilinçli olarak işaretlerse server `recordConsent` log atar.
          marketingConsent: consentMarketing,
          // §45 — server her durumda `kabul-edilebilir-kullanim` onayını
          // log'lar (defense-in-depth); bu flag'in kendisi sadece client-side
          // gate için kullanılıyor, sunucu ekstra bir input beklemiyor.

          // Faz 4 § auto-activate — register handler'ı email match + token
          // valid ise TeamMember status'ünü 'active' yapar.
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'));
        setLoading(false);
        return;
      }

      // Davet üzerinden geliyorsa onboarding'i atla, doğrudan dashboard'a.
      // Davet maili'ndeki workspace'in bir parçasısın artık — yeni işletme
      // kurulum akışına ihtiyaç yok.
      const target = data.invitedAccepted ? `/${locale}/dashboard` : `/${locale}/onboarding`;
      router.push(target);
      router.refresh();
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: locale === 'tr' ? 'AD SOYAD' : 'FULL NAME', placeholder: 'Emre Kaya', type: 'text', autoComplete: 'name', required: true },
    { key: 'email' as const, label: locale === 'tr' ? 'İŞ E-POSTASI' : 'WORK EMAIL', placeholder: 'emre@arkbistro.com', type: 'email', autoComplete: 'email', required: true },
    { key: 'businessName' as const, label: locale === 'tr' ? 'İŞLETME ADI' : 'BUSINESS NAME', placeholder: 'Ark Bistro', type: 'text', autoComplete: 'organization', required: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {notice && !error && <AlertBanner kind="lime">{notice}</AlertBanner>}

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="flex items-center gap-2.5 w-full min-h-[46px] px-4 py-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[14px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon size={16} />
        {locale === 'tr' ? 'Google ile kayıt ol' : 'Sign up with Google'}
      </button>

      <div className="flex items-center gap-2.5 my-1 text-[#A3A3A3]">
        <div className="flex-1 h-px bg-[#EDEDED]" />
        <span className="pulse-eyebrow text-[#A3A3A3]">{locale === 'tr' ? 'YA DA' : 'OR'}</span>
        <div className="flex-1 h-px bg-[#EDEDED]" />
      </div>

      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label htmlFor={`reg-${f.key}`} className="pulse-eyebrow text-[#737373] block">
            {f.label}
          </label>
          <input
            id={`reg-${f.key}`}
            type={f.type}
            required={f.required}
            autoComplete={f.autoComplete}
            inputMode={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : undefined}
            autoCapitalize={f.type === 'email' ? 'off' : f.key === 'name' ? 'words' : undefined}
            autoCorrect={f.type === 'email' ? 'off' : undefined}
            spellCheck={f.type === 'email' ? false : undefined}
            enterKeyHint="next"
            value={form[f.key]}
            onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="min-h-[46px] w-full px-3.5 py-3 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="pulse-eyebrow text-[#737373] block">
          {locale === 'tr' ? 'ŞİFRE' : 'PASSWORD'}
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            enterKeyHint="send"
            value={form.password}
            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
            className="min-h-[46px] w-full px-3.5 py-3 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
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

      {/* Honeypot field - invisible to humans */}
      <div className="opacity-0 absolute -z-10 pointer-events-none" aria-hidden="true">
        <label htmlFor="reg-website">Website</label>
        <input
          id="reg-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
        />
      </div>

      {/* Stage 31b §38.108 — KVKK §10 + 6502 sayılı TKHK m.4 uyumlu 4
          checkbox UI. 3 zorunlu (Kullanım Şartları + Gizlilik Politikası +
          KVKK Aydınlatma Metni) + 1 opsiyonel (ticari ileti / ETK m.6 — default
          OFF, KVKK Açık Rıza). Submit native `required` + JS gate
          `allRequiredConsentsGiven` ile gate (defense-in-depth). */}
      <fieldset className="space-y-2.5 mt-1.5 border-t border-[#EDEDED] pt-3">
        <legend className="sr-only">
          {locale === 'tr' ? 'Yasal Onaylar' : 'Legal Consents'}
        </legend>

        <label htmlFor="reg-consent-terms" className="flex items-start gap-2.5 cursor-pointer text-[12.5px] leading-relaxed text-[#525252]">
          <input
            id="reg-consent-terms"
            type="checkbox"
            required
            checked={consentTerms}
            onChange={(e) => setConsentTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] text-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E] focus:ring-offset-1"
          />
          <span>
            {locale === 'tr' ? (
              <>
                <Link href={`/${locale}/terms`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  Kullanım Şartları
                </Link>
                &apos;nı okudum ve onaylıyorum.
              </>
            ) : (
              <>
                I have read and agree to the{' '}
                <Link href={`/${locale}/terms`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  Terms of Service
                </Link>
                .
              </>
            )}
          </span>
        </label>

        <label htmlFor="reg-consent-privacy" className="flex items-start gap-2.5 cursor-pointer text-[12.5px] leading-relaxed text-[#525252]">
          <input
            id="reg-consent-privacy"
            type="checkbox"
            required
            checked={consentPrivacy}
            onChange={(e) => setConsentPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] text-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E] focus:ring-offset-1"
          />
          <span>
            {locale === 'tr' ? (
              <>
                <Link href={`/${locale}/privacy`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  Gizlilik Politikası
                </Link>
                &apos;nı okudum ve onaylıyorum.
              </>
            ) : (
              <>
                I have read and agree to the{' '}
                <Link href={`/${locale}/privacy`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>
                .
              </>
            )}
          </span>
        </label>

        <label htmlFor="reg-consent-kvkk" className="flex items-start gap-2.5 cursor-pointer text-[12.5px] leading-relaxed text-[#525252]">
          <input
            id="reg-consent-kvkk"
            type="checkbox"
            required
            checked={consentKvkk}
            onChange={(e) => setConsentKvkk(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] text-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E] focus:ring-offset-1"
          />
          <span>
            {locale === 'tr' ? (
              <>
                <Link href={`/${locale}/legal/kvkk-aydinlatma`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  KVKK Aydınlatma Metni
                </Link>
                &apos;ni okudum ve kişisel verilerimin işlenmesine ilişkin bilgilendirildim.
              </>
            ) : (
              <>
                I have read the{' '}
                <Link href={`/${locale}/legal/kvkk-aydinlatma`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  KVKK Privacy Notice
                </Link>{' '}
                and understand how my personal data is processed.
              </>
            )}
          </span>
        </label>

        <label htmlFor="reg-consent-content" className="flex items-start gap-2.5 cursor-pointer text-[12.5px] leading-relaxed text-[#525252]">
          <input
            id="reg-consent-content"
            type="checkbox"
            required
            checked={consentContentResponsibility}
            onChange={(e) => setConsentContentResponsibility(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] text-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E] focus:ring-offset-1"
          />
          <span>
            {locale === 'tr' ? (
              <>
                Buaze üzerinden gönderdiğim tüm yanıt ve mesajların içeriğinden bizzat
                sorumlu olduğumu; bu içeriklerin tehdit, hakaret, iftira veya yasa dışı
                bir ifade içermeyeceğini kabul ederim (
                <Link href={`/${locale}/kabul-edilebilir-kullanim`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  Kabul Edilebilir Kullanım Politikası
                </Link>
                ).
              </>
            ) : (
              <>
                I confirm I am solely responsible for the content of every reply and
                message I send through Buaze, and that it will not contain a threat,
                insult, defamation, or unlawful statement (
                <Link href={`/${locale}/kabul-edilebilir-kullanim`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  Acceptable Use Policy
                </Link>
                ).
              </>
            )}
          </span>
        </label>

                <label htmlFor="reg-consent-marketing" className="flex items-start gap-2.5 cursor-pointer text-[12.5px] leading-relaxed text-[#525252] pt-1.5 border-t border-[#F5F5F5]">
          <input
            id="reg-consent-marketing"
            type="checkbox"
            checked={consentMarketing}
            onChange={(e) => setConsentMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] text-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E] focus:ring-offset-1"
          />
          <span>
            {locale === 'tr' ? (
              <>
                Buaze&apos;den ürün güncellemeleri, kampanya ve özel teklif içeren ticari iletiler (e-posta, SMS) almak istiyorum. Bu onayı{' '}
                <Link href={`/${locale}/legal/ticari-ileti`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  iletişim tercihleri
                </Link>{' '}
                sayfasından dilediğimde geri alabilirim. <span className="text-[#A3A3A3]">(İsteğe bağlı)</span>
              </>
            ) : (
              <>
                I would like to receive product updates, campaigns and special offers from Buaze (email, SMS). I can withdraw this consent anytime via the{' '}
                <Link href={`/${locale}/legal/ticari-ileti`} target="_blank" rel="noopener" className="text-[#0A0A0A] font-semibold underline-offset-2 hover:underline">
                  communication preferences
                </Link>{' '}
                page. <span className="text-[#A3A3A3]">(Optional)</span>
              </>
            )}
          </span>
        </label>
      </fieldset>

      <button
        type="submit"
        id="register-submit-btn"
        disabled={loading || !allRequiredConsentsGiven}
        className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading
          ? t.auth_register_loading
          : (locale === 'tr' ? 'Ücretsiz başla' : 'Start free')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <RecaptchaNotice locale={locale} className="text-center px-1" />

      <p className="text-center text-[13px] text-[#737373] mt-1">
        {locale === 'tr' ? 'Hesabın var mı?' : 'Already have an account?'}{' '}
        <Link href={`/${locale}/auth/login`} className="text-[#0A0A0A] font-semibold hover:text-[#A8D62E] transition-colors">
          {locale === 'tr' ? 'Giriş yap' : 'Sign in'}
        </Link>
      </p>
    </form>
  );
}
