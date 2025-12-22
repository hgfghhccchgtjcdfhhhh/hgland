'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FolderOpen, Sparkles, Code2, Layout, Settings, LogOut } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-2xl font-bold text-white">hgland</span>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-white font-medium">Dashboard</Link>
                <Link href="/dashboard/projects" className="text-slate-400 hover:text-white">Projects</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Welcome, {user?.fullName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
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
            <p className="text-slate-400 mt-1">Create and manage your AI-powered websites</p>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-6">
              <FolderOpen className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">Get started by creating your first website</p>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
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
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Layout className="w-6 h-6 text-white" />
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    project.status === 'published' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-slate-400 text-sm line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700">
                  <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                    <Code2 className="w-4 h-4" /> Edit
                  </button>
                  <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30">
            <Sparkles className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">AI Generation</h3>
            <p className="text-slate-400 text-sm">
              Describe your website and let our AI build it for you in seconds.
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-blue-500/30">
            <Layout className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Visual Editor</h3>
            <p className="text-slate-400 text-sm">
              Drag and drop components to customize your website visually.
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl p-6 border border-green-500/30">
            <Code2 className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Code Editor</h3>
            <p className="text-slate-400 text-sm">
              Full access to edit the underlying code for complete control.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
