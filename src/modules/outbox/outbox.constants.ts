export const OutboxEventTypes = {
    ORDER_CONFIRMED: 'ORDER_CONFIRMED'
} as const;

export type OutboxEventType = 
    (typeof OutboxEventTypes)[keyof typeof OutboxEventTypes];