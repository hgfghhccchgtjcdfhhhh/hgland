'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Code2, Layout, Sparkles, Settings, Globe, Play, Loader2 } from 'lucide-react';

interface PageContent {
  name: string;
  path: string;
  html: string;
}

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
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('code');
  const [code, setCode] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [currentPage, setCurrentPage] = useState<PageContent | null>(null);
  const [pages, setPages] = useState<PageContent[]>([]);

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
        
        if (data.project.pages) {
          try {
            const parsedPages = JSON.parse(data.project.pages);
            if (Array.isArray(parsedPages) && parsedPages.length > 0) {
              setPages(parsedPages);
              setCurrentPage(parsedPages[0]);
              setCode(parsedPages[0].html || '');
            }
          } catch {
            setCode('<div class="container">\n  <h1>Welcome to my website</h1>\n  <p>Start building your site!</p>\n</div>');
          }
        } else {
          setCode('<div class="container">\n  <h1>Welcome to my website</h1>\n  <p>Start building your site!</p>\n</div>');
        }
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id, router]);

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    try {
      const updatedPages = pages.map(p => 
        p.path === currentPage?.path ? { ...p, html: code } : p
      );
      
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: JSON.stringify(updatedPages.length > 0 ? updatedPages : [{ name: 'Home', path: '/', html: code }]),
        }),
      });
      
      setPages(updatedPages.length > 0 ? updatedPages : [{ name: 'Home', path: '/', html: code }]);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim() || !project) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, projectId: project.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      
      if (data.generated?.pages) {
        setPages(data.generated.pages);
        setCurrentPage(data.generated.pages[0]);
        setCode(data.generated.pages[0].html || '');
        
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pages: JSON.stringify(data.generated.pages),
            siteConfig: JSON.stringify(data.generated.siteConfig),
          }),
        });
      }
      
      setAiPrompt('');
      setActiveTab('code');
    } catch (err) {
      console.error('AI generation error:', err);
      alert(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  }

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
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
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
            title="AI Assistant (GPT-5.1 Codex Max)"
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
                <div className="bg-white rounded-lg h-full overflow-auto">
                  {code ? (
                    <div dangerouslySetInnerHTML={{ __html: code }} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <Layout className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Visual Editor Canvas</p>
                        <p className="text-sm">Drag components here to build your page</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="flex-1 flex">
              <div className="w-48 bg-slate-800/30 border-r border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Pages</h3>
                <div className="space-y-1">
                  {pages.length > 0 ? (
                    pages.map((page) => (
                      <div
                        key={page.path}
                        onClick={() => {
                          setCurrentPage(page);
                          setCode(page.html || '');
                        }}
                        className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                          currentPage?.path === page.path
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        {page.name}
                      </div>
                    ))
                  ) : (
                    ['index.html'].map((file) => (
                      <div
                        key={file}
                        className="px-3 py-1.5 rounded text-sm text-slate-300 bg-purple-600 cursor-pointer"
                      >
                        {file}
                      </div>
                    ))
                  )}
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
              <div className="w-1/3 border-l border-slate-700 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-400">Preview</h3>
                  <button className="flex items-center gap-1 text-xs text-purple-400">
                    <Play className="w-3 h-3" /> Run
                  </button>
                </div>
                <div className="bg-white rounded-lg flex-1 overflow-auto p-4">
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
                  <h2 className="text-2xl font-bold text-white mb-2">hgland Agent</h2>
                  <p className="text-slate-400 mb-2">Powered by GPT-5.1 Codex Max</p>
                  <p className="text-slate-500 text-sm mb-8">
                    Describe what you want to add or change, and the AI will generate it for you.
                  </p>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={generating}
                      placeholder="Example: Add a hero section with a gradient background and a call-to-action button"
                      className="w-full h-32 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none disabled:opacity-50"
                    />
                    {generating && (
                      <div className="flex items-center gap-3 mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        <span className="text-purple-300">Generating with GPT-5.1 Codex Max...</span>
                      </div>
                    )}
                    <div className="flex justify-end pt-2 border-t border-slate-700">
                      <button 
                        onClick={handleAIGenerate}
                        disabled={generating || !aiPrompt.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate
                          </>
                        )}
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
                        disabled={generating}
                        className="px-3 py-1.5 bg-slate-800 rounded-full text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
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
