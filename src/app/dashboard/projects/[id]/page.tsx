'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Code2, Layout, Sparkles, Settings, Globe, Play } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pages: string | null;
  siteConfig: string | null;
}

type EditorTab = 'visual' | 'code' | 'ai';

export default function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EditorTab>('visual');
  const [code, setCode] = useState('<div class="container">\n  <h1>Welcome to my website</h1>\n  <p>Start building your site!</p>\n</div>');
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
          router.push('/dashboard');
          return;
        }
        const data = await res.json();
        setProject(data.project);
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <nav className="bg-slate-800/80 border-b border-slate-700 flex-shrink-0">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <span className="text-white font-medium">{project.name}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                project.status === 'published' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {project.status}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white transition-colors">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white transition-colors">
                <Save className="w-4 h-4" />
                Save
              </button>
              <button className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                <Globe className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-slate-800/50 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
          <button
            onClick={() => setActiveTab('visual')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'visual' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
            title="Visual Editor"
          >
            <Layout className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'code' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
            title="Code Editor"
          >
            <Code2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'ai' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
            title="AI Assistant"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex">
          {activeTab === 'visual' && (
            <div className="flex-1 flex">
              <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Components</h3>
                <div className="space-y-2">
                  {['Header', 'Hero Section', 'Features', 'Gallery', 'Testimonials', 'Contact Form', 'Footer'].map((comp) => (
                    <div
                      key={comp}
                      draggable
                      className="px-3 py-2 bg-slate-700/50 rounded-lg text-white text-sm cursor-grab hover:bg-slate-700 transition-colors"
                    >
                      {comp}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="bg-white rounded-lg h-full flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <Layout className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Visual Editor Canvas</p>
                    <p className="text-sm">Drag components here to build your page</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="flex-1 flex">
              <div className="w-48 bg-slate-800/30 border-r border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Files</h3>
                <div className="space-y-1">
                  {['index.html', 'styles.css', 'script.js', 'about.html', 'contact.html'].map((file) => (
                    <div
                      key={file}
                      className="px-3 py-1.5 rounded text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full bg-slate-950 text-green-400 font-mono text-sm p-4 rounded-lg border border-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    spellCheck={false}
                  />
                </div>
              </div>
              <div className="w-1/3 border-l border-slate-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-400">Preview</h3>
                  <button className="flex items-center gap-1 text-xs text-purple-400">
                    <Play className="w-3 h-3" /> Run
                  </button>
                </div>
                <div className="bg-white rounded-lg h-64 p-4">
                  <div dangerouslySetInnerHTML={{ __html: code }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col p-6">
              <div className="flex-1 flex items-center justify-center">
                <div className="max-w-2xl w-full text-center">
                  <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">AI Assistant</h2>
                  <p className="text-slate-400 mb-8">
                    Describe what you want to add or change, and the AI will help you build it.
                  </p>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Example: Add a hero section with a gradient background and a call-to-action button"
                      className="w-full h-32 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none"
                    />
                    <div className="flex justify-end pt-2 border-t border-slate-700">
                      <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {[
                      'Add a navigation bar',
                      'Create a contact form',
                      'Add a footer with links',
                      'Make it mobile responsive',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setAiPrompt(suggestion)}
                        className="px-3 py-1.5 bg-slate-800 rounded-full text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
