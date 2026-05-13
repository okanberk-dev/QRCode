"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AlertBanner } from "@/components/ui";

/**
 * Accept-invite wizard
 * --------------------
 * The previous flow was a single flat card (Name + Phone + Password) that
 * never told the invitee which business they were joining — the user's main
 * complaint ("o işletmeyi tanımlıyor mu bak"). This page is now a 3-step
 * wizard:
 *
 *   Step 1 (overview)  → owner card + role + RESTAURANT NAMES + expiry
 *   Step 2 (account)   → name / phone / password   (new accounts only)
 *   Step 3 (success)   → welcome card + auto-redirect to /dashboard
 *
 * For invitees that already have a Buaze account we skip step 2 entirely
 * (overview → success), because they don't need to set up a password.
 *
 * Error states (invalid_token / expired / revoked / already_accepted) bypass
 * the wizard and render the existing full-page error card.
 */

interface InviteInfo {
  ok: true;
  email: string;
  ownerName: string | null;
  role: string;
  roleLabel: string;
  roleLabelEn: string;
  restaurantNames: string[];
  allLocations: boolean;
  expiresAt: string;
  expired: boolean;
  hasAccount: boolean;
}

interface InviteError {
  ok: false;
  error: "invalid_token" | "expired" | "already_accepted" | "revoked";
}

type WizardStep = "overview" | "account" | "success";

const PHONE_PLACEHOLDER = "+90 5XX XXX XX XX";
const SUCCESS_REDIRECT_MS = 2500;
const SUCCESS_REDIRECT_MS_REDUCED = 500;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function daysUntil(iso: string): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

function AcceptInviteInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";
  const isTr = locale === "tr";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<InviteInfo | InviteError | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crossTenant, setCrossTenant] = useState(false);

  const [step, setStep] = useState<WizardStep>("overview");
  // Cached redirect target from a successful POST — read by the Step 3 timer.
  const [redirectTo, setRedirectTo] = useState<string>(`/${locale}/dashboard`);

  // Step 2 form state (new account only).
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Anchor for screen reader step transition announcements.
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        if (!cancelled) {
          setInfo({ ok: false, error: "invalid_token" });
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/team/accept-invite?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        setInfo(data);
      } catch {
        if (!cancelled) setInfo({ ok: false, error: "invalid_token" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Step 3 success → auto-redirect to dashboard. The manual CTA below is
  // always present so users who don't want to wait can click through.
  useEffect(() => {
    if (step !== "success") return;
    const delay = prefersReducedMotion()
      ? SUCCESS_REDIRECT_MS_REDUCED
      : SUCCESS_REDIRECT_MS;
    const timer = window.setTimeout(() => {
      router.push(redirectTo);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [step, redirectTo, router]);

  const submit = async (payload: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setCrossTenant(false);
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, locale, ...payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data?.error === "cross_tenant_active" || res.status === 409) {
          setCrossTenant(true);
          throw new Error(
            isTr
              ? "Bu e-posta zaten başka bir Buaze işletmesinin ekibinde aktif. Önce mevcut ekipten ayrılman gerekiyor."
              : "This email is already active on another Buaze workspace. Leave that team before accepting this invite.",
          );
        }
        const msg =
          data.error === "weak_password"
            ? isTr
              ? "Şifre en az 8 karakter, harf + rakam içermeli."
              : "Password must be 8+ chars with a letter and a digit."
            : data.error === "name_required"
              ? isTr
                ? "Ad Soyad alanı zorunlu."
                : "Name is required."
              : data.error === "expired"
                ? isTr
                  ? "Davet bağlantısının süresi dolmuş."
                  : "The invite link has expired."
                : data.error === "rate_limited"
                  ? isTr
                    ? "Çok hızlı denedin, biraz bekle."
                    : "Too fast — try again shortly."
                  : isTr
                    ? "Davet kabul edilemedi."
                    : "Could not accept invite.";
        throw new Error(msg);
      }
      // Success → cache redirect target for the Step 3 timer.
      setRedirectTo(
        typeof data.redirectTo === "string"
          ? data.redirectTo
          : `/${locale}/dashboard`,
      );
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : isTr ? "Hata" : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const inviteOk = info && info.ok ? info : null;

  // Display title for the business the invitee is joining. We don't have a
  // workspace name field, so we use the owner's name as the lead identifier
  // and present the restaurants as the concrete locations.
  const workspaceTitle = useMemo(() => {
    if (!inviteOk) return "";
    if (inviteOk.ownerName) return inviteOk.ownerName;
    return isTr ? "Bir Buaze işletmesi" : "A Buaze workspace";
  }, [inviteOk, isTr]);

  const roleLabel = inviteOk
    ? isTr
      ? inviteOk.roleLabel
      : inviteOk.roleLabelEn
    : "";

  const daysLeft = inviteOk ? daysUntil(inviteOk.expiresAt) : 0;

  const advanceFromOverview = () => {
    if (!inviteOk) return;
    if (inviteOk.hasAccount) {
      // Existing account → no form needed, accept and roll to success.
      void submit({});
    } else {
      setStep("account");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[680px] px-5 py-12">
        <div className="flex items-center justify-center gap-2 text-[#737373] text-[13px]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? "Yükleniyor…" : "Loading…"}
        </div>
      </div>
    );
  }

  // ── Error state (invalid / expired / revoked / already accepted) ──────────
  if (info && !info.ok) {
    return (
      <div className="mx-auto max-w-[680px] px-5 sm:px-7 py-8 lg:py-12">
        <div className="bz-card p-6">
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#FEE2E2",
                color: "#991B1B",
              }}
            >
              <X size={20} />
            </div>
            <div>
              <h2 className="bz-h-tight text-[18px]">
                {isTr ? "Davet geçersiz" : "Invalid invite"}
              </h2>
              <p className="text-[13px] text-[#525252] mt-2">
                {info.error === "expired"
                  ? isTr
                    ? "Bu davet bağlantısı süresi dolmuş. İşletme sahibinden yeni bir davet isteyebilirsin."
                    : "This invite has expired. Ask the workspace owner to send a new one."
                  : info.error === "already_accepted"
                    ? isTr
                      ? "Bu davet zaten kabul edilmiş. Hesabınla giriş yapmayı deneyebilirsin."
                      : "This invite has already been accepted. Try signing in."
                    : info.error === "revoked"
                      ? isTr
                        ? "Bu davet iptal edilmiş. İşletme sahibiyle iletişime geç."
                        : "This invite was revoked. Contact the workspace owner."
                      : isTr
                        ? "Bağlantı geçerli değil. Lütfen davet mailindeki doğru bağlantıyı kullan."
                        : "Link is not valid. Use the exact link from the invite email."}
              </p>
              <div className="mt-4 flex gap-2">
                <Link href={`/${locale}/auth/login`} className="bz-btn-primary">
                  {isTr ? "Giriş yap" : "Sign in"}
                </Link>
                <Link href={`/${locale}`} className="bz-btn-ghost">
                  {isTr ? "Ana sayfa" : "Home"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteOk) return null;

  // ── Wizard ────────────────────────────────────────────────────────────────
  const stepIndex =
    step === "overview" ? 1 : step === "account" ? 2 : 3;
  const totalSteps = inviteOk.hasAccount ? 2 : 3;
  const stepLabel = isTr
    ? `${stepIndex}/${totalSteps} ADIM`
    : `STEP ${stepIndex}/${totalSteps}`;

  return (
    <div className="mx-auto max-w-[680px] px-5 sm:px-7 py-8 lg:py-12">
      {/* Live region for screen reader step transitions */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {step === "overview"
          ? isTr
            ? "Davet özeti"
            : "Invite overview"
          : step === "account"
            ? isTr
              ? "Hesap kurulumu adımı"
              : "Account setup step"
            : isTr
              ? "Hoş geldin"
              : "Welcome"}
      </div>

      {/* Wizard chrome — eyebrow + progress */}
      <div className="mb-6 flex items-center gap-3">
        <span className="pulse-eyebrow inline-flex items-center gap-1.5 rounded-full bg-[#EAF9B8] px-2.5 py-1 text-[#0A0A0A]">
          <Sparkles size={11} strokeWidth={2.4} />
          {isTr ? "EKİP DAVETİ" : "TEAM INVITE"}
        </span>
        <span className="pulse-eyebrow text-[#737373]">{stepLabel}</span>
      </div>

      {/* Progress dots — visual cue for where you are in the flow. Uses
          lime fill for completed/active and neutral for upcoming. */}
      <div
        className="mb-6 flex items-center gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={stepIndex}
        aria-label={
          isTr ? "Sihirbaz ilerleme durumu" : "Wizard progress"
        }
      >
        {Array.from({ length: totalSteps }).map((_, i) => {
          const active = i + 1 <= stepIndex;
          return (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                active ? "bg-[#C6F24E]" : "bg-[#EDEDED]"
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {error && (
        <div className="mb-4">
          <AlertBanner
            kind={crossTenant ? "warn" : "danger"}
            onDismiss={() => {
              setError(null);
              setCrossTenant(false);
            }}
          >
            {error}
          </AlertBanner>
        </div>
      )}

      {/* ── Step 1: Overview ──────────────────────────────────────────────── */}
      {step === "overview" && (
        <section className="bz-fade-in space-y-4" aria-labelledby="step1-title">
          <div className="bz-card p-6">
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#EAF9B8",
                  color: "#0A0A0A",
                }}
              >
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  id="step1-title"
                  className="bz-h-tight-2 text-[22px] sm:text-[26px] leading-tight"
                >
                  {isTr ? (
                    <>
                      <strong>{workspaceTitle}</strong> seni Buaze ekibine
                      davet etti
                    </>
                  ) : (
                    <>
                      <strong>{workspaceTitle}</strong> invited you to their
                      Buaze workspace
                    </>
                  )}
                </h1>
                <p className="text-[13px] text-[#525252] mt-2">
                  {isTr
                    ? "Aşağıdaki bilgileri kontrol et, sonra hesabını oluştur."
                    : "Review the details below, then set up your account."}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <dt className="pulse-eyebrow text-[#737373]">
                  {isTr ? "E-POSTA" : "EMAIL"}
                </dt>
                <dd className="bz-mono text-[#0A0A0A] mt-1 break-all">
                  {inviteOk.email}
                </dd>
              </div>
              <div>
                <dt className="pulse-eyebrow text-[#737373]">
                  {isTr ? "ROL" : "ROLE"}
                </dt>
                <dd className="text-[#0A0A0A] mt-1 inline-flex items-center gap-1.5">
                  <Users size={12} strokeWidth={2.2} />
                  <span>{roleLabel}</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="pulse-eyebrow text-[#737373]">
                  {isTr ? "GEÇERLİLİK" : "VALID FOR"}
                </dt>
                <dd className="text-[#0A0A0A] mt-1 inline-flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={2.2} />
                  {daysLeft > 0 ? (
                    <span>
                      {isTr
                        ? `${daysLeft} gün geçerli`
                        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                    </span>
                  ) : (
                    <span className="text-[#B91C1C]">
                      {isTr ? "Bugün son gün" : "Expires today"}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Business identity card — the answer to "o işletmeyi tanımlıyor
              mu?". Restaurant chips with an owner-name label up top so the
              invitee can confirm which workspace they're joining. */}
          <div className="bz-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={14} strokeWidth={2.2} className="text-[#525252]" />
              <h2 className="bz-h-tight text-[15px]">
                {isTr ? "Erişeceğin işletme" : "Workspace you'll join"}
              </h2>
            </div>
            {inviteOk.restaurantNames.length === 0 ? (
              <p className="text-[13px] text-[#525252]">
                {isTr
                  ? "Henüz tanımlı bir konum yok. Sahip ileride konum eklediğinde otomatik erişim alırsın."
                  : "No locations defined yet. Once the owner adds one you'll get access automatically."}
              </p>
            ) : (
              <>
                {inviteOk.allLocations && (
                  <p className="text-[12px] text-[#737373] mb-3">
                    {isTr
                      ? "Tüm konumlara erişimin olacak:"
                      : "You'll have access to all locations:"}
                  </p>
                )}
                <ul
                  className="flex flex-wrap gap-2"
                  aria-label={
                    isTr ? "Erişilecek konumlar" : "Locations you'll access"
                  }
                >
                  {inviteOk.restaurantNames.map((name) => (
                    <li
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-3 py-1.5 text-[12px] text-[#0A0A0A]"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-[#A8D62E]"
                        aria-hidden="true"
                      />
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <Link
              href={`/${locale}`}
              className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {isTr ? "İptal" : "Cancel"}
            </Link>
            <button
              type="button"
              onClick={advanceFromOverview}
              disabled={submitting}
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {inviteOk.hasAccount
                ? isTr
                  ? "Daveti kabul et"
                  : "Accept invite"
                : isTr
                  ? "Devam et"
                  : "Continue"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2: Account setup (new accounts only) ───────────────────── */}
      {step === "account" && (
        <section
          className="bz-fade-in"
          aria-labelledby="step2-title"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit({ name, password, phoneNumber });
            }}
            className="bz-card p-6 space-y-5"
          >
            <div>
              <h2 id="step2-title" className="bz-h-tight-2 text-[22px]">
                {isTr ? "Hesabını oluştur" : "Create your account"}
              </h2>
              <p className="text-[13px] text-[#525252] mt-1.5">
                {isTr
                  ? "Birkaç bilgi alacağız; ek onay adımı yok, direkt panele alınırsın."
                  : "Just a few details — no extra confirmation step, you'll go straight to the panel."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="acc-name"
                className="pulse-eyebrow text-[#737373] block"
              >
                {isTr ? "AD SOYAD" : "FULL NAME"}
              </label>
              <input
                id="acc-name"
                type="text"
                required
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bz-input"
                placeholder={isTr ? "Emre Kaya" : "Emre Kaya"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373] block">
                {isTr ? "E-POSTA" : "EMAIL"}
              </label>
              <input
                type="email"
                value={inviteOk.email}
                readOnly
                className="bz-input bg-[#FAFAFA] text-[#525252] cursor-not-allowed"
                aria-label={isTr ? "Davet edilen e-posta" : "Invited email"}
              />
              <p className="text-[11px] text-[#737373]">
                {isTr
                  ? "Davet bu adrese gönderildi, değiştirilemez."
                  : "This invite was sent to this address; it can't be changed."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="acc-phone"
                className="pulse-eyebrow text-[#737373] block"
              >
                {isTr ? "TELEFON (OPSİYONEL)" : "PHONE (OPTIONAL)"}
              </label>
              <input
                id="acc-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                enterKeyHint="next"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={PHONE_PLACEHOLDER}
                className="bz-input"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="acc-password"
                className="pulse-eyebrow text-[#737373] block"
              >
                {isTr ? "ŞİFRE" : "PASSWORD"}
              </label>
              <div className="relative">
                <input
                  id="acc-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  enterKeyHint="send"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="acc-password-hint"
                  className="bz-input pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center text-[#737373] hover:text-[#0A0A0A]"
                  aria-label={
                    showPassword
                      ? isTr
                        ? "Şifreyi gizle"
                        : "Hide password"
                      : isTr
                        ? "Şifreyi göster"
                        : "Show password"
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p
                id="acc-password-hint"
                className="text-[11px] text-[#737373]"
              >
                {isTr
                  ? "En az 8 karakter, harf ve rakam içermeli."
                  : "At least 8 characters with a letter and a digit."}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("overview")}
                disabled={submitting}
                className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <ArrowLeft size={14} />
                {isTr ? "Geri" : "Back"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {isTr ? "Hesabı oluştur ve katıl" : "Create account & join"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Step 3: Success ─────────────────────────────────────────────── */}
      {step === "success" && (
        <section
          className="bz-fade-in"
          aria-labelledby="step3-title"
          aria-live="polite"
        >
          <div className="bz-card p-8 text-center">
            <div
              className="mx-auto mb-5 flex items-center justify-center pulse-heartbeat"
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "#EAF9B8",
                color: "#0A0A0A",
              }}
              aria-hidden="true"
            >
              <PartyPopper size={28} strokeWidth={2} />
            </div>
            <h2 id="step3-title" className="bz-h-tight-2 text-[26px]">
              {isTr
                ? `Hoş geldin${name ? `, ${firstNameOf(name)}` : ""}!`
                : `Welcome${name ? `, ${firstNameOf(name)}` : ""}!`}
            </h2>
            <p className="mt-3 text-[14px] text-[#525252] max-w-[420px] mx-auto">
              {(() => {
                const list = inviteOk.restaurantNames;
                if (list.length === 0) {
                  return isTr
                    ? `${workspaceTitle} ekibine katıldın.`
                    : `You've joined the ${workspaceTitle} team.`;
                }
                const head = list[0];
                const rest = list.length - 1;
                if (rest === 0) {
                  return isTr
                    ? `${head} işletmesine bağlandın.`
                    : `You're now connected to ${head}.`;
                }
                return isTr
                  ? `${head} ve ${rest} diğer konuma bağlandın.`
                  : `You're now connected to ${head} and ${rest} other ${rest === 1 ? "location" : "locations"}.`;
              })()}
            </p>
            <p className="mt-2 text-[12px] text-[#737373]">
              {isTr
                ? "Panele yönlendiriliyorsun…"
                : "Redirecting to your dashboard…"}
            </p>
            <div className="mt-6 flex items-center justify-center">
              <button
                type="button"
                onClick={() => router.push(redirectTo)}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {isTr ? "Panele git" : "Open dashboard"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[680px] px-5 py-12">
          <div className="flex items-center justify-center gap-2 text-[#737373] text-[13px]">
            <Loader2 size={14} className="animate-spin" />
            Yükleniyor…
          </div>
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}
