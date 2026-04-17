import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT - update existing post
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { slug, locale, title, description, content, date, readTime, author, coverImage, isActive } = body;

    const post = await prisma.blogPost.update({
      where: { id },
      data: { slug, locale, title, description, content, date, readTime, author, coverImage, isActive },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    console.error('[API blog PUT]', error);
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

// DELETE - remove post
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    console.error('[API blog DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}
