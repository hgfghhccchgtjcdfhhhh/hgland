import Link from 'next/link';
import { Sparkles, Layout, Code2, Zap, Globe, Shield, Waves } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-teal-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-cyan-400/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-teal-500/10 to-transparent" />
      </div>
      
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <Waves className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold text-white">hgland</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-cyan-200 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/25"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="pt-40 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Powered by GPT-5.2 Codex Max
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build Websites with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"> AI Magic</span>
            </h1>
            <p className="text-xl text-cyan-100/70 mb-10 max-w-2xl mx-auto">
              hgland is an AI-powered website builder that creates stunning websites from a simple description. 
              Go from idea to live website in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-xl shadow-cyan-500/30"
              >
                <Waves className="w-5 h-5" />
                Start Building Free
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 border border-cyan-500/50 hover:border-cyan-400 text-white font-semibold rounded-xl transition-colors backdrop-blur-sm"
              >
                View Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-4">Three Ways to Build</h2>
            <p className="text-cyan-200/60 text-center mb-12 max-w-2xl mx-auto">
              Choose how you want to create. Mix and match methods on the same project.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-b from-cyan-900/40 to-teal-900/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/20 hover:border-cyan-400/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">AI Generation</h3>
                <p className="text-cyan-200/60">
                  Describe your website in plain English and watch as our AI builds it for you in real-time.
                </p>
              </div>
              <div className="bg-gradient-to-b from-teal-900/40 to-emerald-900/20 backdrop-blur-sm rounded-2xl p-8 border border-teal-500/20 hover:border-teal-400/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-500/30 flex items-center justify-center mb-6">
                  <Layout className="w-7 h-7 text-teal-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Visual Editor</h3>
                <p className="text-teal-200/60">
                  Drag and drop components to build your perfect layout. No coding required.
                </p>
              </div>
              <div className="bg-gradient-to-b from-emerald-900/40 to-green-900/20 backdrop-blur-sm rounded-2xl p-8 border border-emerald-500/20 hover:border-emerald-400/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/30 to-green-500/30 flex items-center justify-center mb-6">
                  <Code2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Code Editor</h3>
                <p className="text-emerald-200/60">
                  Full access to the underlying code. Edit HTML, CSS, and JavaScript directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-r from-cyan-900/20 via-teal-900/30 to-cyan-900/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Everything You Need</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: 'One-Click Deploy', desc: 'Publish your website instantly with a single click', color: 'cyan' },
                { icon: Globe, title: 'Custom Domains', desc: 'Connect your own domain with automatic SSL', color: 'teal' },
                { icon: Shield, title: 'SEO Optimized', desc: 'Built-in SEO tools, sitemaps, and meta tags', color: 'emerald' },
                { icon: Layout, title: 'Responsive Design', desc: 'Looks great on desktop, tablet, and mobile', color: 'cyan' },
                { icon: Code2, title: 'Version History', desc: 'Track changes and rollback when needed', color: 'teal' },
                { icon: Sparkles, title: 'AI Assistance', desc: 'Get help anytime with our AI assistant', color: 'emerald' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-4 p-4">
                  <div className={`w-10 h-10 rounded-lg bg-${feature.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className={`w-5 h-5 text-${feature.color}-400`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-cyan-200/50 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Build?</h2>
            <p className="text-xl text-cyan-200/60 mb-10">
              Join thousands of creators building amazing websites with hgland.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-xl shadow-cyan-500/30"
            >
              <Waves className="w-5 h-5" />
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-cyan-800/30 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-cyan-300/50">© 2024 hgland. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-cyan-300/50 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-cyan-300/50 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-cyan-300/50 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
