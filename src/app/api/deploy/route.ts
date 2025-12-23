import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, deployments, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'hgland-secret-key-2024');

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, subdomain, customDomain } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, userId))
    ).limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const proj = project[0];

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const username = user[0]?.username || 'user';

    const finalSubdomain = subdomain || `${username}-${proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const existingDeployments = await db.select().from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    const newVersion = existingDeployments.length > 0 
      ? String(parseInt(existingDeployments[0].version || '1') + 1)
      : '1';

    const deployUrl = `/deploy/${finalSubdomain}`;

    const [deployment] = await db.insert(deployments).values({
      projectId,
      status: 'deployed',
      url: deployUrl,
      subdomain: finalSubdomain,
      customDomain: customDomain || null,
      domainVerified: !customDomain,
      sslEnabled: true,
      deployedFiles: proj.files,
      version: newVersion,
    }).returning();

    await db.update(projects).set({ 
      status: 'published',
      updatedAt: new Date()
    }).where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        url: deployUrl,
        fullUrl: `${request.nextUrl.origin}${deployUrl}`,
        subdomain: finalSubdomain,
        customDomain,
        version: newVersion,
        status: 'deployed'
      }
    });
  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json({ error: 'Deployment failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, userId))
    ).limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectDeployments = await db.select().from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.createdAt));

    return NextResponse.json({ deployments: projectDeployments });
  } catch (error) {
    console.error('Get deployments error:', error);
    return NextResponse.json({ error: 'Failed to get deployments' }, { status: 500 });
  }
}
