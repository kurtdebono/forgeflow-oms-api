'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { saveAccessToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      saveAccessToken(result.accessToken);
      router.push('/orders');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Login failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-md space-y-5 rounded-xl border p-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Dashboard Login</h1>
          <p className="mt-1 text-sm text-gray-600">
            Use an admin account from your ForgeFlow API seed data.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}