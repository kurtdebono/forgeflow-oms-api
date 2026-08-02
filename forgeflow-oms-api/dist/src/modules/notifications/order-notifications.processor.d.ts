import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OrderConfirmedNotificationJob } from './order-notifications.producer';
export declare class OrderNotificationsProcessor extends WorkerHost {
    private readonly logger;
    process(job: Job<OrderConfirmedNotificationJob>): Promise<{
        notified: boolean;
        orderId: string;
        userId: string;
    } | undefined>;
    private handleOrderConfirmedNotification;
}
