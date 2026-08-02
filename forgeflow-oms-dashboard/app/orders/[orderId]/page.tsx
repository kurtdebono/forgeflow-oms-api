'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { useOrderDetails } from '@/hooks/useOrderDetails';

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const {
    order,
    analyses,
    isLoading,
    error,
    isGenerating,
    generateAnalysis,
  } = useOrderDetails(orderId);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/orders" className="text-sm text-gray-500 hover:underline">
              ← Back to orders
            </Link>
            <h1 className="mt-2 text-3xl font-bold">Order details</h1>
          </div>

          {order && <StatusBadge status={order.status} />}
        </div>

        {isLoading && (
          <div className="rounded-xl border p-5 text-gray-600">
            Loading order...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && order && (
          <>
            <section className="rounded-xl border p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="mt-1 break-all font-mono text-sm">
                    {order.id}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="mt-1 text-sm">
                    {order.user?.email ?? order.userId}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="mt-1 text-sm font-semibold">
                    {order.totalAmount}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold">Items</h2>

                <div className="mt-3 overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Unit price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-3">
                            {item.product?.name ?? item.productId}
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">{item.unitPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <AnalysisPanel
              analyses={analyses}
              isGenerating={isGenerating}
              onGenerate={generateAnalysis}
            />
          </>
        )}
      </div>
    </main>
  );
}