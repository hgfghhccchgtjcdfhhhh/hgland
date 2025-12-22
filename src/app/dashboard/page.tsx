'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FolderOpen, Sparkles, Code2, Layout, Settings, LogOut, Waves } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, projectsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/projects'),
        ]);

        if (!userRes.ok) {
          router.push('/auth/login');
          return;
        }

        const userData = await userRes.json();
        const projectsData = await projectsRes.json();

        setUser(userData.user);
        setProjects(projectsData.projects || []);
      } catch {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950">
      <nav className="bg-cyan-900/30 border-b border-cyan-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Waves className="w-7 h-7 text-cyan-400" />
                <span className="text-2xl font-bold text-white">hgland</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-white font-medium">Dashboard</Link>
                <Link href="/dashboard/projects" className="text-cyan-300/60 hover:text-white">Projects</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-cyan-300/60">Welcome, {user?.fullName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-cyan-300/60 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Projects</h1>
            <p className="text-cyan-300/60 mt-1">Create and manage your AI-powered websites</p>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-5 h-5" />
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-800/30 mb-6">
              <FolderOpen className="w-10 h-10 text-cyan-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-cyan-300/60 mb-6">Get started by creating your first website</p>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/25"
            >
              <Sparkles className="w-5 h-5" />
              Create with AI
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="bg-cyan-900/30 rounded-xl p-6 border border-cyan-700/30 hover:border-cyan-500/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <Layout className="w-6 h-6 text-white" />
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    project.status === 'published' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-cyan-300/60 text-sm line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-cyan-800/30">
                  <button className="flex items-center gap-1 text-sm text-cyan-400 hover:text-white">
                    <Code2 className="w-4 h-4" /> Edit
                  </button>
                  <button className="flex items-center gap-1 text-sm text-cyan-400 hover:text-white">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-cyan-600/20 to-teal-600/20 rounded-xl p-6 border border-cyan-500/30">
            <Sparkles className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">AI Generation</h3>
            <p className="text-cyan-300/60 text-sm">
              Describe your website and let our AI build it for you in seconds.
            </p>
          </div>
          <div className="bg-gradient-to-br from-teal-600/20 to-emerald-600/20 rounded-xl p-6 border border-teal-500/30">
            <Layout className="w-8 h-8 text-teal-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Visual Editor</h3>
            <p className="text-teal-300/60 text-sm">
              Drag and drop components to customize your website visually.
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 rounded-xl p-6 border border-emerald-500/30">
            <Code2 className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Code Editor</h3>
            <p className="text-emerald-300/60 text-sm">
              Full access to edit the underlying code for complete control.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
