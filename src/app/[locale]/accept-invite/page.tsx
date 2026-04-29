"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, ShieldCheck, X } from "lucide-react";
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

function AcceptInviteInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<InviteInfo | InviteError | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const accept = async () => {
    if (accepting) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/${locale}/dashboard`);
        return;
      }
      if (data.needsAccount && data.redirectTo) {
        router.push(`/${locale}${data.redirectTo}`);
        return;
      }
      throw new Error(data.error || "Davet kabul edilemedi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[680px] px-5 py-12">
        <div className="flex items-center justify-center gap-2 text-[#737373] text-[13px]">
          <Loader2 size={14} className="animate-spin" />
          Yükleniyor…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] px-5 sm:px-7 py-8 lg:py-12">
      <PageHeader
        eyebrow="EKİP DAVETİ"
        eyebrowColor="#C6F24E"
        title="Buaze hesabına davet edildin"
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
              <h2 className="bz-h-tight text-[18px]">Davet geçersiz</h2>
              <p className="text-[13px] text-[#525252] mt-2">
                {info.error === "expired"
                  ? "Bu davet bağlantısı süresi dolmuş. İşletme sahibinden yeni bir davet isteyebilirsin."
                  : info.error === "already_accepted"
                    ? "Bu davet zaten kabul edilmiş. Hesabınla giriş yapmayı deneyebilirsin."
                    : info.error === "revoked"
                      ? "Bu davet iptal edilmiş. İşletme sahibiyle iletişime geç."
                      : "Bağlantı geçerli değil. Lütfen davet maili'ndeki doğru bağlantıyı kullan."}
              </p>
              <div className="mt-4 flex gap-2">
                <Link href={`/${locale}/auth/login`} className="bz-btn-primary">
                  Giriş yap
                </Link>
                <Link href={`/${locale}`} className="bz-btn-ghost">
                  Ana sayfa
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
                <h2 className="bz-h-tight text-[18px]">Davet geçerli</h2>
                <p className="text-[13px] text-[#737373] mt-0.5">
                  {info.ownerName
                    ? `${info.ownerName} seni ekibine davet etti.`
                    : "Buaze hesabına davet edildin."}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] text-[#737373] uppercase bz-mono">
                  E-posta
                </dt>
                <dd className="bz-mono text-[#0A0A0A] mt-0.5">{info.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#737373] uppercase bz-mono">
                  Rol
                </dt>
                <dd className="text-[#0A0A0A] mt-0.5">{info.roleLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] text-[#737373] uppercase bz-mono">
                  Geçerlilik
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
                <strong className="text-[#0A0A0A]">{info.email}</strong> ile zaten
                Buaze hesabın var. Daveti kabul ettiğinde bu workspace'e erişimin
                aktifleşir.
              </p>
              <button
                type="button"
                onClick={accept}
                disabled={accepting}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                {accepting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Daveti kabul et
              </button>
            </div>
          ) : (
            <div className="bz-card p-6">
              <p className="text-[13px] text-[#525252] mb-4">
                Daveti kabul etmek için önce <strong>{info.email}</strong> ile
                bir Buaze hesabı oluşturman gerekiyor. Hesap oluştuktan sonra
                bu sayfaya tekrar gelmen yeterli.
              </p>
              <Link
                href={`/${locale}/auth/register?email=${encodeURIComponent(info.email)}&inviteToken=${encodeURIComponent(token)}`}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                Hesap oluştur
              </Link>
            </div>
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
