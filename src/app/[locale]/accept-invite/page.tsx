"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { AlertBanner, PageHeader } from "@/components/ui";

interface InviteInfo {
  ok: true;
  email: string;
  ownerName: string | null;
  roleLabel: string;
  expiresAt: string;
  expired: boolean;
  hasAccount: boolean;
}

interface InviteError {
  ok: false;
  error: "invalid_token" | "expired" | "already_accepted" | "revoked";
}

const PHONE_PLACEHOLDER = "+90 5XX XXX XX XX";

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

  // §22 self-contained form: hesap yoksa /register'a redirect değil, burada
  // toplanır. Hesap varsa form gizli, sadece "Daveti kabul et" butonu var.
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const submit = async (
    payload: Record<string, unknown>,
    onSuccessRedirect: (data: { redirectTo?: string }) => string,
  ) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, locale, ...payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
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
      router.push(onSuccessRedirect(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : isTr ? "Hata" : "Error");
      setSubmitting(false);
    }
  };

  const acceptExisting = () =>
    submit({}, (data) => data.redirectTo || `/${locale}/dashboard`);

  const submitNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      { name, password, phoneNumber },
      // Backend `issueLoginSession` cookie set eder + `redirectTo: /dashboard`
      // döner. E-posta onayı atlanır (davet token'ı verification görevi
      // görür). Fallback yine /dashboard — kullanıcı artık `check-email`
      // sayfasına atılmaz.
      (data) => data.redirectTo || `/${locale}/dashboard`,
    );
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

  return (
    <div className="mx-auto max-w-[680px] px-5 sm:px-7 py-8 lg:py-12">
      <PageHeader
        eyebrow={isTr ? "EKİP DAVETİ" : "TEAM INVITE"}
        eyebrowColor="#C6F24E"
        title={isTr ? "Buaze hesabına davet edildin" : "You've been invited to Buaze"}
      />

      {info && !info.ok && (
        <div className="mt-6 bz-card p-6">
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
                        ? "Bağlantı geçerli değil. Lütfen davet maili'ndeki doğru bağlantıyı kullan."
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
      )}

      {info && info.ok && (
        <div className="mt-6 space-y-4">
          {error && (
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          )}

          <div className="bz-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#EAF9B8",
                  color: "#0A0A0A",
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="bz-h-tight text-[18px]">
                  {isTr ? "Davet geçerli" : "Invite valid"}
                </h2>
                <p className="text-[13px] text-[#737373] mt-0.5">
                  {info.ownerName
                    ? isTr
                      ? `${info.ownerName} seni ekibine davet etti.`
                      : `${info.ownerName} invited you to their team.`
                    : isTr
                      ? "Buaze hesabına davet edildin."
                      : "You've been invited to a Buaze workspace."}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[#737373] uppercase bz-mono">
                  {isTr ? "E-posta" : "Email"}
                </dt>
                <dd className="bz-mono text-[#0A0A0A] mt-0.5">{info.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#737373] uppercase bz-mono">
                  {isTr ? "Rol" : "Role"}
                </dt>
                <dd className="text-[#0A0A0A] mt-0.5">{info.roleLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] text-[#737373] uppercase bz-mono">
                  {isTr ? "Geçerlilik" : "Valid until"}
                </dt>
                <dd className="text-[#0A0A0A] mt-0.5 inline-flex items-center gap-1.5">
                  <Clock size={12} />
                  {new Date(info.expiresAt).toLocaleString(
                    locale === "tr" ? "tr-TR" : "en-US",
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {info.hasAccount ? (
            <div className="bz-card p-6">
              <p className="text-[13px] text-[#525252] mb-4">
                {isTr ? (
                  <>
                    <strong className="text-[#0A0A0A]">{info.email}</strong> ile
                    zaten Buaze hesabın var. Daveti kabul ettiğinde bu workspace'e
                    erişimin aktifleşir.
                  </>
                ) : (
                  <>
                    You already have a Buaze account at{" "}
                    <strong className="text-[#0A0A0A]">{info.email}</strong>.
                    Accepting this invite activates your access to this workspace.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={acceptExisting}
                disabled={submitting}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {isTr ? "Daveti kabul et" : "Accept invite"}
              </button>
            </div>
          ) : (
            <form onSubmit={submitNewAccount} className="bz-card p-6 space-y-4">
              <div>
                <h3 className="bz-h-tight text-[16px]">
                  {isTr ? "Hesabını oluştur" : "Create your account"}
                </h3>
                <p className="text-[13px] text-[#525252] mt-1.5">
                  {isTr
                    ? "Birkaç bilgi alacağız. Hesabını oluşturduğunda doğrudan panele alınırsın — ekstra onay adımı yok."
                    : "Just a few details. Once your account is ready, you'll go straight to the panel — no extra confirmation step."}
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
                  value={info.email}
                  readOnly
                  className="bz-input bg-[#FAFAFA] text-[#525252] cursor-not-allowed"
                  aria-label={isTr ? "Davet edilen e-posta" : "Invited email"}
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <p className="text-[11px] text-[#737373]">
                  {isTr
                    ? "En az 8 karakter, harf ve rakam içermeli."
                    : "At least 8 characters with a letter and a digit."}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {isTr ? "Hesabı oluştur ve panele gir" : "Create account and continue"}
              </button>
            </form>
          )}
        </div>
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
