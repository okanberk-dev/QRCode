import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// Admin per-invoice update + delete (Faz 4). Owner-side cannot reach this
// path; gated by superadmin role check + ownership check (invoice.userId
// must match the [id] in the URL).

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

async function requireOwnedInvoice(userId: string, invoiceId: string) {
  const invoice = await prisma.billingInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: 'invoice_not_found' as const, status: 404 };
  if (invoice.userId !== userId) return { error: 'invoice_not_found' as const, status: 404 };
  return { invoice };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id: userId, invoiceId } = await params;

  const owned = await requireOwnedInvoice(userId, invoiceId);
  if ('error' in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }
  const before = owned.invoice;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.amount !== undefined) {
    const a = validateAmount(body.amount);
    if (a === 'invalid') return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    data.amount = a;
  }

  if (body.currency !== undefined) {
    if (typeof body.currency !== 'string' || !VALID_CURRENCIES.has(body.currency)) {
      return NextResponse.json({ error: 'invalid_currency' }, { status: 400 });
    }
    data.currency = body.currency;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    data.status = body.status;
  }

  if (body.issuedAt !== undefined) {
    if (body.issuedAt === null || body.issuedAt === '') {
      // null disallowed — invoice always has issue date; admin must pass valid date
      return NextResponse.json({ error: 'invalid_issued_at' }, { status: 400 });
    }
    if (typeof body.issuedAt !== 'string') {
      return NextResponse.json({ error: 'invalid_issued_at' }, { status: 400 });
    }
    const d = new Date(body.issuedAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'invalid_issued_at' }, { status: 400 });
    }
    data.issuedAt = d;
  }

  if (body.description !== undefined) {
    const desc = trimOrNull(body.description, 200);
    if (desc === 'invalid') return NextResponse.json({ error: 'invalid_description' }, { status: 400 });
    data.description = desc;
  }

  if (body.adminNotes !== undefined) {
    const notes = trimOrNull(body.adminNotes, 2000);
    if (notes === 'invalid') return NextResponse.json({ error: 'invalid_admin_notes' }, { status: 400 });
    data.adminNotes = notes;
  }

  if (body.pdfUrl !== undefined) {
    const url = validatePdfUrl(body.pdfUrl);
    if (url === 'invalid') return NextResponse.json({ error: 'invalid_pdf_url' }, { status: 400 });
    data.pdfUrl = url;
  }

  if (body.invoiceNumber !== undefined) {
    const num = trimOrNull(body.invoiceNumber, 40);
    if (num === 'invalid') return NextResponse.json({ error: 'invalid_invoice_number' }, { status: 400 });
    data.invoiceNumber = num;
  }

  try {
    const [invoice] = await prisma.$transaction([
      prisma.billingInvoice.update({ where: { id: invoiceId }, data }),
      prisma.adminAuditLog.create({
        data: {
          actorId: adminId,
          actorSource: 'admin',
          action: 'admin.invoice.update',
          targetId: userId,
          payload: {
            invoiceId,
            before: {
              invoiceNumber: before.invoiceNumber,
              amount: Number(before.amount),
              currency: before.currency,
              status: before.status,
              issuedAt: before.issuedAt.toISOString(),
            },
            changes: Object.keys(data),
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
      return NextResponse.json({ error: 'invoice_number_taken' }, { status: 409 });
    }
    console.error('[InvoicePatch]', err);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id: userId, invoiceId } = await params;

  const owned = await requireOwnedInvoice(userId, invoiceId);
  if ('error' in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  await prisma.$transaction([
    prisma.billingInvoice.delete({ where: { id: invoiceId } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.invoice.delete',
        targetId: userId,
        payload: {
          invoiceId,
          invoiceNumber: owned.invoice.invoiceNumber,
          amount: Number(owned.invoice.amount),
          currency: owned.invoice.currency,
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
