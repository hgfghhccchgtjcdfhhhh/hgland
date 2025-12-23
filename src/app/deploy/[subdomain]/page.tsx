'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface DeployedFile {
  id: string;
  name: string;
  path: string;
  content?: string;
  type: 'file' | 'folder';
  children?: DeployedFile[];
}

export default function DeployedSitePage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeployment() {
      try {
        const res = await fetch(`/api/deploy/serve?subdomain=${subdomain}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load site');
        }
        const data = await res.json();
        setHtml(data.html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load site');
      } finally {
        setLoading(false);
      }
    }
    loadDeployment();
  }, [subdomain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400">Loading your site...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Site Not Found</h1>
          <p className="text-cyan-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      className="w-full h-screen border-0"
      title="Deployed Site"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
