import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages, projects } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, session.userId)));

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { role, content } = await request.json();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, session.userId)));

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const [message] = await db
    .insert(chatMessages)
    .values({
      projectId: id,
      role,
      content,
    })
    .returning();

  return NextResponse.json({ message });
}
