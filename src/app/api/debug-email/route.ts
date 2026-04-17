import { NextResponse } from 'next/server';

// Temporary diagnostic endpoint - DELETE after debugging
export async function GET() {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  
  const diagnostics = {
    hasResendKey: !!resendKey && resendKey !== "",
    keyPrefix: resendKey ? resendKey.substring(0, 8) + "..." : "NOT SET",
    keyLength: resendKey?.length || 0,
    // Check for common env var issues
    hasSmtpUser: !!process.env.SMTP_USER,
    hasSmtpPass: !!process.env.SMTP_PASS,
    nodeEnv: process.env.NODE_ENV,
    // Test send
    testResult: null as any,
  };

  // Try a test send
  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Buaze <hello@buaze.com>",
          to: "okanberk16@gmail.com",
          subject: "Vercel Diagnostik Test ✅",
          html: "<h1>Vercel'den test maili başarılı!</h1>",
          text: "Vercel'den test maili başarılı!",
        }),
      });
      const body = await response.text();
      diagnostics.testResult = {
        status: response.status,
        ok: response.ok,
        body,
      };
    } catch (err: any) {
      diagnostics.testResult = { error: err.message };
    }
  }

  return NextResponse.json(diagnostics);
}
