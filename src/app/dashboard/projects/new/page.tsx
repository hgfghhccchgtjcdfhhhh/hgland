'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Wand2, Loader2, Waves } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<'choose' | 'ai' | 'manual'>('choose');
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');

  async function createProject(name: string, description: string, useAI: boolean = false) {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      const { project } = await res.json();

      if (useAI) {
        setGenerationStatus('Generating website with GPT-5.2 Codex...');
        
        const aiRes = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: description, projectId: project.id, mode: 'generate' }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          
          if (aiData.generated) {
            await fetch(`/api/projects/${project.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pages: JSON.stringify(aiData.generated.pages),
                siteConfig: JSON.stringify(aiData.generated.siteConfig),
              }),
            });
          }
        }
      }

      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create project');
    } finally {
      setLoading(false);
      setGenerationStatus('');
    }
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createProject(
      formData.get('name') as string,
      formData.get('description') as string,
      false
    );
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    await createProject(
      aiPrompt.slice(0, 50) + (aiPrompt.length > 50 ? '...' : ''),
      aiPrompt,
      true
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-slate-950">
      <nav className="bg-cyan-900/30 border-b border-cyan-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-cyan-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {step === 'choose' && (
          <>
            <div className="text-center mb-12">
              <Waves className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-4">Create a New Website</h1>
              <p className="text-cyan-300/60">Choose how you want to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setStep('ai')}
                className="bg-gradient-to-br from-cyan-600/30 to-teal-600/30 rounded-2xl p-8 border border-cyan-500/50 hover:border-cyan-400 transition-all text-left group"
              >
                <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Generate with AI</h2>
                <p className="text-cyan-300/60">
                  Describe your website and let hgland Agent (GPT-5.2 Codex) build it for you automatically.
                </p>
              </button>

              <button
                onClick={() => setStep('manual')}
                className="bg-cyan-900/30 rounded-2xl p-8 border border-cyan-700/30 hover:border-cyan-500/50 transition-all text-left group"
              >
                <div className="w-16 h-16 rounded-xl bg-cyan-800/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Wand2 className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Start from Scratch</h2>
                <p className="text-cyan-300/60">
                  Create a blank project and build your website using the visual editor or code.
                </p>
              </button>
            </div>
          </>
        )}

        {step === 'ai' && (
          <>
            <button
              onClick={() => setStep('choose')}
              className="flex items-center gap-2 text-cyan-300 hover:text-white mb-8"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Describe Your Website</h1>
              <p className="text-cyan-300/60">Powered by hgland Agent (GPT-5.2 Codex)</p>
            </div>

            <div className="bg-cyan-900/30 rounded-2xl p-6 border border-cyan-700/30">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={loading}
                placeholder="Example: A modern portfolio website for a photographer with a gallery, about page, and contact form. Use dark theme with elegant typography."
                className="w-full h-40 px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none disabled:opacity-50"
              />
              
              {generationStatus && (
                <div className="flex items-center gap-3 mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300">{generationStatus}</span>
                </div>
              )}
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleAIGenerate}
                  disabled={loading || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-cyan-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Website
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                'Landing page for a SaaS startup',
                'Restaurant website with menu',
                'Personal blog with dark theme',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setAiPrompt(suggestion)}
                  disabled={loading}
                  className="text-left p-4 bg-cyan-800/20 rounded-lg border border-cyan-700/30 hover:border-cyan-500/50 text-cyan-300/60 hover:text-white transition-colors text-sm disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'manual' && (
          <>
            <button
              onClick={() => setStep('choose')}
              className="flex items-center gap-2 text-cyan-300 hover:text-white mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Create New Project</h1>
              <p className="text-cyan-300/60">Start with a blank canvas</p>
            </div>

            <form onSubmit={handleManualSubmit} className="bg-cyan-900/30 rounded-2xl p-6 border border-cyan-700/30">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Project Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="My Awesome Website"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">Description (optional)</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                    placeholder="A brief description of your website"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-cyan-500/25"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
