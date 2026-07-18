import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    OrderEventJobs,
    QueueNames
} from '../../infrastructure/queue/queue.constants';

export type OrderConfirmedNotificationJob = {
    orderId: string;
    userId: string;
};

@Injectable()
export class OrderNotificationsProducer {
    constructor(
        @InjectQueue(QueueNames.ORDER_EVENTS)
        private readonly orderEventsQueue: Queue
    ) {}

    async enqueueOrderConfirmedNotification(
        data: OrderConfirmedNotificationJob
    ) {
        debugger
        await this.orderEventsQueue.add(
            OrderEventJobs.ORDER_CONFIRMED_NOTIFICATION,
            data,
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        )
    }
}