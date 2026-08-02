type StatusBadgeProps = {
    status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const className =
        status === 'CONFIRMED'
        ? 'border-green-300 bg-green-50 text-green-700'
        : status === 'CANCELLED' || status === 'FAILED'
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-yellow-300 bg-yellopw-50 text-yellow-700';

    return (
        <span 
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
            >
                {status}
            </span>
    );
}