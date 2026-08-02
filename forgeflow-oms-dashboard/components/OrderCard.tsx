import Link from 'next/link'
import type { Order } from '@/types/api';
import { StatusBadge } from './StatusBadge';

type OrderCardProps = {
    order: Order;
};

export function OrderCard({ order }: OrderCardProps) {
    return (
    <Link
        href={`/orders/${order.id}`}
        className="block rounded-xl border p-5 transition hover:border-gray-400 hover:bg-gray-50"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                <p className="text-sm text-gray-500">Order</p>
                <h2 className="mt-1 font-mono text-sm font-semibold">
                    {order.id}
                </h2>
                </div>

                <StatusBadge status={order.status} />
            </div>

            <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                <div>
                <p className="text-gray-400">Customer</p>
                <p>{order.user?.email ?? order.userId}</p>
                </div>

                <div>
                <p className="text-gray-400">Items</p>
                <p>{order.items.length}</p>
                </div>

                <div>
                <p className="text-gray-400">Total</p>
                <p>{order.totalAmount}</p>
                </div>
            </div>
        </Link>        
    )
}