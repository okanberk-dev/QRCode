import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// Admin per-user invoice CRUD (list + create) — Faz 4 of billing flow.
// PayNKolay dönüşünde (CLAUDE.md §44) ödeme doğrulanınca
// otomatik tablo'ya yazar; admin manual override (enterprise/legacy/refund)
// hybrid §44.5 paterniyle bu endpoint üzerinden korunur.
//
// Privacy: adminNotes alanı sadece admin endpoint'lerinde okunur/yazılır;
// owner-side /api/billing/invoices response'da YER ALMAZ.

export const dynamic = 'force-dynamic';

const VALID_STATUS = new Set(['paid', 'pending', 'failed', 'refunded']);
const VALID_CURRENCIES = new Set(['TRY', 'USD', 'EUR', 'GBP']);

function trimOrNull(value: unknown, max: number): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const t = value.trim();
  if (!t) return null;
  if (t.length > max) return 'invalid';
  return t;
}

function validateAmount(value: unknown): number | 'invalid' {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return 'invalid';
  if (n < 0 || n > 9_999_999.99) return 'invalid';
  return Math.round(n * 100) / 100;
}

function validatePdfUrl(value: unknown): string | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const raw = value.trim();
  if (!raw) return null;
  if (raw.length > 1000) return 'invalid';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid';
    return raw;
  } catch {
    return 'invalid';
  }
}

async function generateInvoiceNumber(userId: string, issuedAt: Date): Promise<string> {
  const year = issuedAt.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  // Per-user year-scoped sequence. Two admins editing concurrently could
  // collide on the same number; @@unique([invoiceNumber]) constraint catches
  // duplicates and the caller can retry. Real volume is well below the race
  // window — manual ops typically <10 invoices/year/user.
  const count = await prisma.billingInvoice.count({
    where: {
      userId,
      issuedAt: { gte: yearStart, lt: yearEnd },
    },
  });
  const seq = String(count + 1).padStart(2, '0');
  return `INV-${year}-${seq}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const invoices = await prisma.billingInvoice.findMany({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({
    data: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      pdfUrl: inv.pdfUrl,
      description: inv.description,
      adminNotes: inv.adminNotes,
      issuedAt: inv.issuedAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // ── Validate ──
  const amount = validateAmount(body.amount);
  if (amount === 'invalid') {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  const currency = typeof body.currency === 'string' && VALID_CURRENCIES.has(body.currency)
    ? body.currency
    : 'TRY';

  const status = typeof body.status === 'string' && VALID_STATUS.has(body.status)
    ? body.status
    : 'paid';

  let issuedAt: Date;
  if (body.issuedAt === null || body.issuedAt === undefined || body.issuedAt === '') {
    issuedAt = new Date();
  } else if (typeof body.issuedAt === 'string') {
    const d = new Date(body.issuedAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'invalid_issued_at' }, { status: 400 });
    }
    issuedAt = d;
  } else {
    return NextResponse.json({ error: 'invalid_issued_at' }, { status: 400 });
  }

  const description = trimOrNull(body.description, 200);
  if (description === 'invalid') return NextResponse.json({ error: 'invalid_description' }, { status: 400 });

  const adminNotes = trimOrNull(body.adminNotes, 2000);
  if (adminNotes === 'invalid') return NextResponse.json({ error: 'invalid_admin_notes' }, { status: 400 });

  const pdfUrl = validatePdfUrl(body.pdfUrl);
  if (pdfUrl === 'invalid') return NextResponse.json({ error: 'invalid_pdf_url' }, { status: 400 });

  let invoiceNumber = trimOrNull(body.invoiceNumber, 40);
  if (invoiceNumber === 'invalid') return NextResponse.json({ error: 'invalid_invoice_number' }, { status: 400 });
  if (!invoiceNumber) {
    invoiceNumber = await generateInvoiceNumber(userId, issuedAt);
  }

  // ── Create + audit (single transaction) ──
  try {
    const [invoice] = await prisma.$transaction([
      prisma.billingInvoice.create({
        data: {
          userId,
          invoiceNumber,
          amount,
          currency,
          status,
          issuedAt,
          description,
          adminNotes,
          pdfUrl,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          actorId: adminId,
          actorSource: 'admin',
          action: 'admin.invoice.create',
          targetId: userId,
          payload: {
            invoiceNumber,
            amount,
            currency,
            status,
            issuedAt: issuedAt.toISOString(),
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        status: invoice.status,
        pdfUrl: invoice.pdfUrl,
        description: invoice.description,
        adminNotes: invoice.adminNotes,
        issuedAt: invoice.issuedAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      // Unique violation on invoiceNumber — concurrent admin edits or admin
      // typed an existing manual number. Tell the operator to pick another.
      return NextResponse.json({ error: 'invoice_number_taken' }, { status: 409 });
    }
    console.error('[InvoiceCreate]', err);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
