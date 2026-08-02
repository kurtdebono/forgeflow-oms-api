import { Queue } from 'bullmq';
export type OrderConfirmedNotificationJob = {
    orderId: string;
    userId: string;
};
export declare class OrderNotificationsProducer {
    private readonly orderEventsQueue;
    constructor(orderEventsQueue: Queue);
    enqueueOrderConfirmedNotification(data: OrderConfirmedNotificationJob): Promise<void>;
}
