import Link from 'next/link';
import { Sparkles, Layout, Code2, Zap, Globe, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <span className="text-2xl font-bold text-white">hgland</span>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="pt-40 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Powered by AI
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build Websites with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> AI Magic</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              hgland is an AI-powered website builder that creates stunning websites from a simple description. 
              Go from idea to live website in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Start Building Free
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 border border-slate-600 hover:border-slate-500 text-white font-semibold rounded-xl transition-colors"
              >
                View Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-4">Three Ways to Build</h2>
            <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
              Choose how you want to create. Mix and match methods on the same project.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-purple-500/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">AI Generation</h3>
                <p className="text-slate-400">
                  Describe your website in plain English and watch as our AI builds it for you in real-time.
                </p>
              </div>
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-blue-500/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <Layout className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Visual Editor</h3>
                <p className="text-slate-400">
                  Drag and drop components to build your perfect layout. No coding required.
                </p>
              </div>
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-green-500/50 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mb-6">
                  <Code2 className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Code Editor</h3>
                <p className="text-slate-400">
                  Full access to the underlying code. Edit HTML, CSS, and JavaScript directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-slate-800/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Everything You Need</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: 'One-Click Deploy', desc: 'Publish your website instantly with a single click' },
                { icon: Globe, title: 'Custom Domains', desc: 'Connect your own domain with automatic SSL' },
                { icon: Shield, title: 'SEO Optimized', desc: 'Built-in SEO tools, sitemaps, and meta tags' },
                { icon: Layout, title: 'Responsive Design', desc: 'Looks great on desktop, tablet, and mobile' },
                { icon: Code2, title: 'Version History', desc: 'Track changes and rollback when needed' },
                { icon: Sparkles, title: 'AI Assistance', desc: 'Get help anytime with our AI assistant' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Build?</h2>
            <p className="text-xl text-slate-400 mb-10">
              Join thousands of creators building amazing websites with hgland.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-slate-400">© 2024 hgland. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
