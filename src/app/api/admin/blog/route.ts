import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - list all posts
export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('[API blog GET]', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

// POST - create new post
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, locale, title, description, content, date, readTime, author, coverImage } = body;

    if (!slug || !locale || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const post = await prisma.blogPost.create({
      data: { slug, locale, title, description, content, date, readTime, author, coverImage },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A post with this slug+locale already exists' }, { status: 409 });
    }
    console.error('[API blog POST]', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}
