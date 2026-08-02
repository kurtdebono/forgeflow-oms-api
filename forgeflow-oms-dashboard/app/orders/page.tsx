'use client';

import Link from 'next/link';
import { getOrders } from '@/lib/api';
import type { Order } from '@/types/api';
import { OrderCard } from '@/components/OrderCard';
import { useAsyncData } from '../../hooks/useAsyncData';

export function useOrders() {
  return useAsyncData<Order[]>(getOrders, []);
}

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              ForgeFlow OMS
            </p>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="mt-2 text-gray-600">
              Review customer orders and generate AI-assisted operational analysis.
            </p>
          </div>

          <Link href="/" className="rounded-lg border px-4 py-2 text-sm">
            Home
          </Link>
        </div>

        {isLoading && (
          <div className="rounded-xl border p-5 text-gray-600">
            Loading orders...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!orders || orders?.length === 0 && (
          <div className="rounded-xl border p-5 text-gray-600">
            No orders found.
          </div>
        )}

        <div className="space-y-4">
          {orders?.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </main>
  );
}