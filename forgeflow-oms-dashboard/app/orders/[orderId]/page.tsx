'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  generateOrderAnalysis,
  getOrder,
  getOrderAnalysis,
} from '@/lib/api';
import type { Order, OrderAnalysis } from '@/types/api';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { StatusBadge } from '@/components/StatusBadge';

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [analyses, setAnalyses] = useState<OrderAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrderDetails() {
    setIsLoading(true);
    setError(null);

    try {
      const [orderResult, analysesResult] = await Promise.all([
        getOrder(orderId),
        getOrderAnalysis(orderId),
      ]);

      setOrder(orderResult);
      setAnalyses(analysesResult);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to load order.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateAnalysis() {
    setIsGenerating(true);
    setError(null);

    try {
      const analysis = await generateOrderAnalysis(orderId);
      setAnalyses((current) => [analysis, ...current]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to generate analysis.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    void loadOrderDetails();
  }, [orderId]);

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
                  <p className="mt-1 break-all font-mono text-sm">{order.id}</p>
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
              onGenerate={handleGenerateAnalysis}
            />
          </>
        )}
      </div>
    </main>
  );
}