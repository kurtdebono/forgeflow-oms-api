import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    OrderEventJobs,
    QueueNames
} from '../../infrastructure/queue/queue.constants';
import { OrderConfirmedNotificationJob } from './order-notifications.producer';

@Processor(QueueNames.ORDER_EVENTS)
export class OrderNotificationsProcessor extends WorkerHost {
    private readonly logger = new Logger(OrderNotificationsProcessor.name)

    async process(job: Job<OrderConfirmedNotificationJob>) {
        switch (job.name) {
            case OrderEventJobs.ORDER_CONFIRMED_NOTIFICATION:
                return this.handleOrderConfirmedNotification(job);
            default:
                this.logger.warn(`Unhandled job type: ${job.name}`);
                return;
        }
    }

    private async handleOrderConfirmedNotification(
        job: Job<OrderConfirmedNotificationJob>
    ) {
        const { orderId, userId } = job.data;

        this.logger.log(
            `Simulating order confirmation notification. orderId=${orderId}, userId=${userId}`,            
        );

        return {
            notified: true,
            orderId,
            userId
        }
    }
}