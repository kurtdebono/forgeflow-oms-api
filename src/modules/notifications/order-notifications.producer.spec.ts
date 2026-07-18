import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { OrderNotificationsProducer } from './order-notifications.producer';
import { Queue } from 'bullmq';
import {
    OrderEventJobs,
    QueueNames
} from '../../infrastructure/queue/queue.constants';

type QueueMock = jest.Mocked<Pick<Queue, 'add'>>;

describe('OrderNotificationsProducer', () => {
    let producer: OrderNotificationsProducer;
    let queueMock: QueueMock;

    beforeEach(async () => {
        queueMock = {
            add: jest.fn()
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                OrderNotificationsProducer,
                {
                    provide: getQueueToken(QueueNames.ORDER_EVENTS),
                    useValue: queueMock
                }
            ]
        }).compile();

        producer = moduleRef.get(OrderNotificationsProducer);
    });

    it('enqueues an order confirmed notification job', async () => {
        await producer.enqueueOrderConfirmedNotification({
            orderId: 'order-1',
            userId: 'user-1'
        });

        expect(queueMock.add).toHaveBeenCalledWith(
            OrderEventJobs.ORDER_CONFIRMED_NOTIFICATION,
            {
                orderId: 'order-1',
                userId: 'user-1'
            },
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
    });
});