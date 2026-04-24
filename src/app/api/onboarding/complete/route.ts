import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { sendMail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor || actor.source !== 'user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* optional */
  }
  const dataJson: Prisma.InputJsonValue | undefined =
    body && typeof body === 'object' ? (body as Prisma.InputJsonValue) : undefined;

  const row = await prisma.onboardingProgress.upsert({
    where: { userId: actor.id },
    create: {
      userId: actor.id,
      step: 5,
      ...(dataJson === undefined ? {} : { data: dataJson }),
      completedAt: new Date(),
    },
    update: {
      completedAt: new Date(),
      ...(dataJson === undefined ? {} : { data: dataJson }),
    },
  });

  if (actor.email) {
    const bodyObj = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const bizName = typeof bodyObj.bizName === 'string' ? bodyObj.bizName : null;
    const greetingBiz = bizName ? ` · ${bizName}` : '';
    sendMail({
      to: actor.email,
      subject: 'Buaze kurulumu tamamlandı — panele hoş geldiniz',
      text: `Merhaba${greetingBiz},\n\nBuaze kurulumu tamamlandı. Panelden QR'larınızı indirebilir, yorumlarınızı izleyebilirsiniz.\n\nhttps://buaze.com/tr/dashboard`,
      html: `<p>Merhaba${greetingBiz ? ` <strong>${escape(bizName!)}</strong>` : ''},</p><p>Buaze kurulumu tamamlandı. Panelden QR'larınızı indirebilir, yorumlarınızı izleyebilirsiniz.</p><p><a href="https://buaze.com/tr/dashboard">Panele git →</a></p>`,
    }).catch((err) => {
      console.error('[onboarding/complete] welcome mail failed', err);
    });
  }

  return NextResponse.json({
    step: row.step,
    completedAt: row.completedAt,
  });
}

function escape(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
