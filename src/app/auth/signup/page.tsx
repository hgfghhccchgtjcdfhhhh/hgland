'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Waves } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'),
      phone: formData.get('phone') || undefined,
      password: formData.get('password'),
      fullName: formData.get('fullName'),
      username: formData.get('username'),
      birthDate: formData.get('birthDate'),
    };

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Signup failed');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-teal-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Waves className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">hgland</h1>
          </div>
          <p className="text-cyan-300/60">AI-Powered Website Builder</p>
        </div>

        <div className="bg-cyan-900/30 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-cyan-700/30">
          <h2 className="text-2xl font-semibold text-white mb-6">Create your account</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">Birth Date</label>
              <input
                type="date"
                name="birthDate"
                required
                className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-cyan-800/30 border border-cyan-700/50 rounded-lg text-white placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-cyan-500/25"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-cyan-300/60">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
