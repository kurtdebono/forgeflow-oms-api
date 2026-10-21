import Link from 'next/link';
import { OrdersView } from '@/components/OrdersView';
import { parsePageParam } from '@/lib/pagination';

type OrdersPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

const HEADING_ID = 'orders-heading';

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { page } = await searchParams;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              ForgeFlow OMS
            </p>
            <h1 id={HEADING_ID} className="text-3xl font-bold">
              Orders
            </h1>
            <p className="mt-2 text-gray-600">
              Review customer orders and generate AI-assisted operational analysis.
            </p>
          </div>

          <Link href="/" className="rounded-lg border px-4 py-2 text-sm">
            Home
          </Link>
        </div>

        <OrdersView page={parsePageParam(page)} headingId={HEADING_ID} />
      </div>
    </main>
  );
}
