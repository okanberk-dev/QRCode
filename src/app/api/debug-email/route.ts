import { NextResponse } from 'next/server';

// Temporary diagnostic endpoint - DELETE after debugging
export async function GET() {
  // List ALL env var names (not values) to find the issue
  const allEnvKeys = Object.keys(process.env).sort();
  
  // Filter for relevant ones
  const relevantKeys = allEnvKeys.filter(key => 
    key.includes('RESEND') || 
    key.includes('SMTP') || 
    key.includes('EMAIL') || 
    key.includes('MAIL') ||
    key.includes('API_KEY') ||
    key.includes('DATABASE') ||
    key.includes('NEXT_PUBLIC')
  );

  // Check each key with its first few chars
  const envSnapshot: Record<string, string> = {};
  for (const key of relevantKeys) {
    const val = process.env[key] || '';
    envSnapshot[key] = val ? `${val.substring(0, 6)}... (len=${val.length})` : 'EMPTY';
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendKeyTrimmed = resendKey?.trim();

  return NextResponse.json({
    totalEnvVars: allEnvKeys.length,
    relevantEnvVars: envSnapshot,
    resendKeyRaw: resendKey === undefined ? 'UNDEFINED' : resendKey === '' ? 'EMPTY_STRING' : `EXISTS (len=${resendKey.length})`,
    resendKeyTrimmed: resendKeyTrimmed === undefined ? 'UNDEFINED' : resendKeyTrimmed === '' ? 'EMPTY_STRING' : `EXISTS (len=${resendKeyTrimmed.length})`,
    // Check if maybe it's under a different name
    possibleResendKeys: allEnvKeys.filter(k => k.toLowerCase().includes('resend')),
  });
}
