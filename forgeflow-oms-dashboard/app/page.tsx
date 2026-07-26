import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">
            ForgeFlow OMS
          </p>
          <h1 className="text-4xl font-bold">
            Operations Dashboard
          </h1>
          <p className="mt-3 text-gray-600">
            Review orders, generate AI-assisted operational analysis and inspect
            priority, risk and recommended actions.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Login
          </Link>

          <Link
            href="/orders"
            className="rounded-lg border px-4 py-2"
          >
            View Orders
          </Link>
        </div>
      </div>
    </main>
  );
}