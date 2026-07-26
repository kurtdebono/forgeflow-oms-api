import { Test } from '@nestjs/testing';
import { OutboxEventStatus } from '@prisma/client';
import { OutboxPublisher } from './outbox.publisher';
import { OutboxService } from './outbox.service';
import { OutboxEventTypes } from './outbox.constants';
import { OrderNotificationsProducer } from '../notifications/order-notifications.producer';

type OutboxServiceMock = jest.Mocked<
    Pick<OutboxService, 'findPending' | 'markPublished' | 'markFailed'>
>;

type OrderNotificationsProducerMock = jest.Mocked<
    Pick<OrderNotificationsProducer, 'enqueueOrderConfirmedNotification'>
>;

describe('OutboxPublisher', () => {
    let publisher: OutboxPublisher;
    let outboxServiceMock: OutboxServiceMock;
    let orderNotificationsProducerMock: OrderNotificationsProducerMock;

    beforeEach(async () => {
        outboxServiceMock = {
            findPending: jest.fn(),
            markPublished: jest.fn(),
            markFailed: jest.fn()
        };

        orderNotificationsProducerMock = {
            enqueueOrderConfirmedNotification: jest.fn()
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                OutboxPublisher,
                {
                    provide: OutboxService,
                    useValue: outboxServiceMock
                },
                {
                    provide: OrderNotificationsProducer,
                    useValue: orderNotificationsProducerMock
                }
            ]
        }).compile();

        publisher = moduleRef.get(OutboxPublisher);
    });

    it('publishes pending PRDER_CONFIRMED events and marks them as published', async () => {
        outboxServiceMock.findPending.mockResolvedValue([
            {
                id: 'event-1',
                eventType: OutboxEventTypes.ORDER_CONFIRMED,
                payload: {
                    orderId: 'order-1',
                    userId: 'user-1'
                },
                status: OutboxEventStatus.PENDING,
                attempts: 0,
                lastError: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedAt: null
            }
        ]);

        await publisher.publishPendingEvents();

        expect(outboxServiceMock.findPending).toHaveBeenCalledWith(20);

        expect(
            orderNotificationsProducerMock.enqueueOrderConfirmedNotification
        ).toHaveBeenCalledWith({
            orderId: 'order-1',
            userId: 'user-1'
        });

        expect(outboxServiceMock.markPublished).toHaveBeenCalledWith('event-1');

        expect(outboxServiceMock.markFailed).not.toHaveBeenCalled();
    });

    it('marks eveont as failed when event type is not handled', async () => {
        outboxServiceMock.findPending.mockResolvedValue([
            {
                id: 'event-1',
                eventType: 'UNKNOWN_EVENT',
                payload: {},
                status: OutboxEventStatus.PENDING,
                attempts: 0,
                lastError: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedAt: null
            }
        ]);

        await publisher.publishPendingEvents();
        
        expect(
            orderNotificationsProducerMock.enqueueOrderConfirmedNotification
        ).not.toHaveBeenCalled();

        expect(outboxServiceMock.markPublished).not.toHaveBeenCalled();

        expect(outboxServiceMock.markFailed).toHaveBeenCalledWith(
            'event-1',
            'Unhandled outbox event type: UNKNOWN_EVENT'
        );
    });

    it('marks event as failed when publishiung throws', async () => {
        outboxServiceMock.findPending.mockResolvedValue([
            {
                id: 'event-1',
                eventType: OutboxEventTypes.ORDER_CONFIRMED,
                payload: {
                    orderId: 'order-1',
                    userId: 'user-1'
                },
                status: OutboxEventStatus.PENDING,
                attempts: 0,
                lastError: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedAt: null
            }
        ]);

        orderNotificationsProducerMock.enqueueOrderConfirmedNotification.mockRejectedValue(new Error('Redis unavailable'));

        await publisher.publishPendingEvents();

        expect(outboxServiceMock.markPublished).not.toHaveBeenCalled();

        expect(outboxServiceMock.markFailed).toHaveBeenCalledWith(
            'event-1',
            'Redis unavailable'
        );
    });
});