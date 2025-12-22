'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Code2, Layout, Sparkles, Settings, Globe, Play, Loader2, Send, Waves } from 'lucide-react';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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

  async function handleAIChat() {
    if (!aiPrompt.trim() || !project) return;
    
    const userMessage = aiPrompt.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiPrompt('');
    setGenerating(true);

    const isGenerateRequest = /\b(generate|create|build|make|add|design)\b.*\b(website|page|section|component|html|code)\b/i.test(userMessage);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessage, 
          projectId: project.id,
          mode: isGenerateRequest ? 'generate' : 'chat'
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();
      
      if (data.type === 'chat') {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else if (data.generated?.pages) {
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
        
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I've generated your website! Check the Code tab to see the result. The site includes: ${data.generated.pages.map((p: PageContent) => p.name).join(', ')}.`
        }]);
      }
    } catch (err) {
      console.error('AI error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`
      }]);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950 flex flex-col">
      <nav className="bg-cyan-900/30 border-b border-cyan-800/50 flex-shrink-0 backdrop-blur-sm">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-cyan-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="h-6 w-px bg-cyan-700" />
              <Waves className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">{project.name}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                project.status === 'published' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {project.status}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-cyan-300 hover:text-white transition-colors">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-cyan-300 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 text-cyan-300 hover:text-white transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-medium rounded-lg transition-colors">
                <Globe className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-cyan-900/20 border-r border-cyan-800/30 flex flex-col items-center py-4 gap-2">
          <button
            onClick={() => setActiveTab('visual')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'visual' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' : 'text-cyan-400 hover:bg-cyan-800/50'
            }`}
            title="Visual Editor"
          >
            <Layout className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'code' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' : 'text-cyan-400 hover:bg-cyan-800/50'
            }`}
            title="Code Editor"
          >
            <Code2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'ai' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' : 'text-cyan-400 hover:bg-cyan-800/50'
            }`}
            title="AI Assistant (GPT-5.1 Codex Max)"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex">
          {activeTab === 'visual' && (
            <div className="flex-1 flex">
              <div className="w-64 bg-cyan-900/20 border-r border-cyan-800/30 p-4">
                <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-4">Components</h3>
                <div className="space-y-2">
                  {['Header', 'Hero Section', 'Features', 'Gallery', 'Testimonials', 'Contact Form', 'Footer'].map((comp) => (
                    <div
                      key={comp}
                      draggable
                      className="px-3 py-2 bg-cyan-800/30 rounded-lg text-white text-sm cursor-grab hover:bg-cyan-700/40 transition-colors border border-cyan-700/30"
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
              <div className="w-48 bg-cyan-900/20 border-r border-cyan-800/30 p-4">
                <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-4">Pages</h3>
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
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white'
                            : 'text-cyan-200 hover:bg-cyan-800/50'
                        }`}
                      >
                        {page.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-1.5 rounded text-sm text-white bg-gradient-to-r from-cyan-500 to-teal-500">
                      index.html
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full bg-slate-950 text-cyan-400 font-mono text-sm p-4 rounded-lg border border-cyan-800/50 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    spellCheck={false}
                  />
                </div>
              </div>
              <div className="w-1/3 border-l border-cyan-800/30 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-cyan-400">Preview</h3>
                  <button className="flex items-center gap-1 text-xs text-cyan-400">
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
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="max-w-md text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-cyan-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">hgland Agent</h2>
                      <p className="text-cyan-300 mb-2">Powered by GPT-5.1 Codex Max</p>
                      <p className="text-cyan-400/60 text-sm">
                        Chat with me! Ask questions, get help planning your website, or ask me to generate code when you're ready.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' 
                            : 'bg-cyan-900/40 border border-cyan-800/50 text-cyan-100'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {generating && (
                      <div className="flex justify-start">
                        <div className="bg-cyan-900/40 border border-cyan-800/50 px-4 py-3 rounded-2xl flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span className="text-cyan-300">Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-cyan-800/30">
                <div className="max-w-3xl mx-auto">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 justify-center">
                      {[
                        'Hi! What can you help me with?',
                        'Generate a landing page for my startup',
                        'What makes a good website?',
                        'Help me plan my portfolio site',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setAiPrompt(suggestion)}
                          className="px-3 py-1.5 bg-cyan-800/30 border border-cyan-700/30 rounded-full text-sm text-cyan-300 hover:text-white hover:bg-cyan-700/40 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAIChat()}
                      disabled={generating}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 bg-cyan-900/30 border border-cyan-800/50 rounded-xl text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    />
                    <button
                      onClick={handleAIChat}
                      disabled={generating || !aiPrompt.trim()}
                      className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
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
