import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userProjects = await db.select().from(projects).where(eq(projects.userId, session.userId));
  
  return NextResponse.json({ projects: userProjects });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    const [project] = await db.insert(projects).values({
      userId: session.userId,
      name: data.name,
      description: data.description,
      pages: JSON.stringify([{ id: 'home', name: 'Home', path: '/', content: [] }]),
      siteConfig: JSON.stringify({ title: data.name, description: data.description }),
    }).returning();

    return NextResponse.json({ project });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
