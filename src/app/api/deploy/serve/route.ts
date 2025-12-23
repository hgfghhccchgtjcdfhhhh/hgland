import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

interface DeployedFile {
  id: string;
  name: string;
  path: string;
  content?: string;
  type: 'file' | 'folder';
  children?: DeployedFile[];
}

function getAllFiles(items: DeployedFile[]): DeployedFile[] {
  const result: DeployedFile[] = [];
  for (const item of items) {
    if (item.type === 'file') {
      result.push(item);
    }
    if (item.children) {
      result.push(...getAllFiles(item.children));
    }
  }
  return result;
}

function buildDeployedHTML(files: DeployedFile[]): string {
  const allFiles = getAllFiles(files);
  
  const htmlFile = allFiles.find(f => f.name.endsWith('.html'));
  const cssFiles = allFiles.filter(f => f.name.endsWith('.css'));
  const jsFiles = allFiles.filter(f => f.name.endsWith('.js') && !f.name.includes('server'));

  let html = htmlFile?.content || `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website</title>
</head>
<body>
  <h1>Welcome</h1>
</body>
</html>`;

  const combinedCSS = cssFiles.map(f => f.content || '').join('\n');
  const combinedJS = jsFiles.map(f => f.content || '').join('\n');

  if (combinedCSS && !html.includes('<style>')) {
    html = html.replace('</head>', `<style>${combinedCSS}</style></head>`);
  }

  if (combinedJS && !html.includes('<script>')) {
    html = html.replace('</body>', `<script>${combinedJS}</script></body>`);
  }

  return html;
}

export async function GET(request: NextRequest) {
  try {
    const subdomain = request.nextUrl.searchParams.get('subdomain');
    const path = request.nextUrl.searchParams.get('path') || '/';

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
    }

    const deployment = await db.select().from(deployments)
      .where(eq(deployments.subdomain, subdomain))
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    if (deployment.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const files = deployment[0].deployedFiles as DeployedFile[] | null;
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files deployed' }, { status: 404 });
    }

    const allFiles = getAllFiles(files);

    if (path !== '/') {
      const requestedFile = allFiles.find(f => 
        f.path === path || 
        f.path === `/${path}` || 
        f.name === path ||
        f.path.endsWith(`${path}.html`) ||
        f.path.endsWith(`${path}/index.html`)
      );

      if (requestedFile && requestedFile.content) {
        if (requestedFile.name.endsWith('.html')) {
          const html = buildDeployedHTML([requestedFile, ...allFiles.filter(f => f.name.endsWith('.css') || f.name.endsWith('.js'))]);
          return NextResponse.json({ html });
        }
        return NextResponse.json({ content: requestedFile.content, type: requestedFile.name.split('.').pop() });
      }
    }

    const html = buildDeployedHTML(files);
    return NextResponse.json({ html });
  } catch (error) {
    console.error('Serve error:', error);
    return NextResponse.json({ error: 'Failed to serve site' }, { status: 500 });
  }
}
