import type { OrderAnalysis } from '@/types/api';

type PriorityProps = {
  priority: OrderAnalysis['priority'];
};

export function Priority({ priority }: PriorityProps) {
  const className =
    priority === 'HIGH'
      ? 'border-red-300 bg-red-50 text-red-700'
      : priority === 'MEDIUM'
        ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
        : 'border-green-300 bg-green-50 text-green-700';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {priority}
    </span>
  );
}