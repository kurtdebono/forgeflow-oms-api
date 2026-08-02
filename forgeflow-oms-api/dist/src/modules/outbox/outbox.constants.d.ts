export declare const OutboxEventTypes: {
    readonly ORDER_CONFIRMED: "ORDER_CONFIRMED";
};
export type OutboxEventType = (typeof OutboxEventTypes)[keyof typeof OutboxEventTypes];
