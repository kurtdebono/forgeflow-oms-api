import {
    BadRequestException,
    ForbiddenException,
    NotFoundException
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ProductService } from '../products/product.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { OutboxService } from '../outbox/outbox.service';
import { OutboxEventTypes } from '../outbox/outbox.constants';

type OrdersRepositoryMock = jest.Mocked<
    Pick<
        OrdersRepository,
        'create' | 'findByUserId' | 'findById' | 'tryUpdateStatus'
    >
>;

type ProductServiceMock = jest.Mocked<
    Pick<
        ProductService,
        'findById'
    >
>;

type InventoryServiceMock = jest.Mocked<
    Pick<
        InventoryService,
        'reserveStock' | 'consumeReservedStock' | 'releaseReservedStock'
    >
>;

type IdempotencyServiceMock = jest.Mocked<
    Pick<
        IdempotencyService,
        'checkExisting' | 'claim' | 'complete' | 'createRequestHash'
    >
>;

type OutboxServiceMock = jest.Mocked<
    Pick<
        OutboxService,
        'createEvent'
    >
>;


type PrismaServiceMock = {
    $transaction: jest.MockedFunction<
        <T>(
            callback: (tx: Prisma.TransactionClient) => Promise<T> | T
        ) => Promise <T>
    >
};

describe('OrdersService', () => {
    let ordersService: OrdersService;

    const tx = {} as Prisma.TransactionClient;

    let ordersRepositoryMock: OrdersRepositoryMock;
    let productServiceMock: ProductServiceMock;
    let inventoryServiceMock: InventoryServiceMock;
    let prismaServiceMock: PrismaServiceMock;    
    let idempotencyServiceMock: IdempotencyServiceMock;
    let outboxServiceMock: OutboxServiceMock;

    beforeEach(async () => {
        ordersRepositoryMock = {
            create: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            tryUpdateStatus: jest.fn()
        };

        productServiceMock = {
            findById: jest.fn()
        };

        inventoryServiceMock = {
            reserveStock: jest.fn(),
            consumeReservedStock: jest.fn(),
            releaseReservedStock: jest.fn()
        };

        idempotencyServiceMock = {            
            createRequestHash: jest.fn(),
            complete: jest.fn(),
            claim: jest.fn(),
            checkExisting: jest.fn()
        };

        outboxServiceMock = {
            createEvent: jest.fn()
        };

        prismaServiceMock = {
            $transaction: jest.fn(async <T>(callback) => callback(tx) )
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: OrdersRepository,
                    useValue: ordersRepositoryMock
                },
                {
                    provide: ProductService,
                    useValue: productServiceMock
                },
                {
                    provide: InventoryService,
                    useValue: inventoryServiceMock
                },
                {
                    provide: IdempotencyService,
                    useValue: idempotencyServiceMock
                },
                {
                    provide: OutboxService,
                    useValue: outboxServiceMock
                },
                {
                    provide: PrismaService,
                    useValue: prismaServiceMock
                }                
            ]
        }).compile();

        ordersService = moduleRef.get(OrdersService);
    });

    it('creates an order, reserves stock and calculates the total amount', async () => {
        const userId = 'user-1';
        const productId = 'product-1';

        const product: any = {
            id: productId,
            name: 'Keyboard',
            description: 'Mechanical keyboard',
            price: new Prisma.Decimal(50),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const createdOrder: any = {
            id: 'order-1',
            userId,
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(100),
            items: [
                {
                    id: 'order-item-1',
                    productId,
                    quantity: 2,
                    unitPrice: new Prisma.Decimal(50)
                }
            ]
        };

        productServiceMock.findById.mockResolvedValue(product);
        inventoryServiceMock.reserveStock.mockResolvedValue({ count: 1 });
        ordersRepositoryMock.create.mockResolvedValue(createdOrder);

        idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

        idempotencyServiceMock.checkExisting.mockResolvedValue({
            exists: false
        });

        idempotencyServiceMock.claim.mockResolvedValue({
            claimed: true,
            recordId: 'idempotency-record-1'
        });

        idempotencyServiceMock.complete.mockResolvedValue(undefined);

        const createOrderDto = {

            items: [
                {
                    productId,
                    quantity: 2
                }
            ]
        };

        const result = await ordersService.create(userId, createOrderDto, 'idempotency-key-1');

        expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
        expect(productServiceMock.findById).toHaveBeenCalledWith(productId, tx);
        expect(ordersRepositoryMock.create).toHaveBeenCalledTimes(1);

        const [orderCreateData, transactionClient] = ordersRepositoryMock.create.mock.calls[0];

        expect(transactionClient).toBe(tx);

        expect(idempotencyServiceMock.complete).toHaveBeenCalledWith({
            recordId: 'idempotency-record-1',
            orderId: result.id,
            tx
        });

        expect(orderCreateData.user).toEqual({
            connect: {
                id: userId
            }
        });

        expect(orderCreateData.status).toBe(OrderStatus.PENDING);
        expect(orderCreateData.totalAmount.toString()).toBe('100');

        expect(orderCreateData.items.create).toHaveLength(1);
        expect(orderCreateData.items.create[0]).toEqual(
            expect.objectContaining({
                quantity: 2,
                unitPrice: product.price,
                product: {
                    connect: {
                        id: productId
                    }
                }
            })
        );

        expect(result).toBe(createdOrder);
    });

    it('does not create an order for an inactive product', async () => {
        const userId = 'user-1';
        const productId = 'product-1';

        productServiceMock.findById.mockResolvedValue({
            id: productId,
            name: 'Keyboard',
            description: 'Mechanical keyboard',
            price: new Prisma.Decimal(50),
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

        idempotencyServiceMock.checkExisting.mockResolvedValue({
            exists: false
        });

        idempotencyServiceMock.claim.mockResolvedValue({
            claimed: true,
            recordId: 'idempotency-record-1'
        });

        idempotencyServiceMock.complete.mockResolvedValue(undefined);

        await expect(
            ordersService.create(userId, {
                items: [
                    {
                        productId,
                        quantity: 1
                    }
                ]
            }, 'idempotency-key-1')
        ).rejects.toThrow(BadRequestException);

        expect(idempotencyServiceMock.complete).not.toHaveBeenCalled();

        expect(inventoryServiceMock.reserveStock).not.toHaveBeenCalled();
        expect(ordersRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('does not create an order when stock reservation fails', async () => {
        const userId = 'user-1';
        const productId = 'product-1';

        productServiceMock.findById.mockResolvedValue({
            id: productId,
            name: 'Keyboard',
            description: 'Mechanical keyboard',
            price: new Prisma.Decimal(50),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

        idempotencyServiceMock.checkExisting.mockResolvedValue({
            exists: false
        });

        idempotencyServiceMock.claim.mockResolvedValue({
            claimed: true,
            recordId: 'idempotency-record-1'
        });

        idempotencyServiceMock.complete.mockResolvedValue(undefined);

        inventoryServiceMock.reserveStock.mockRejectedValue(
            new BadRequestException('Insufficient Stock.')
        );

        await expect(
            ordersService.create(userId, {
                items: [
                    {
                        productId,
                        quantity: 10
                    }
                ]
            }, 'idempotency-key-1')
        ).rejects.toThrow(BadRequestException);

        expect(idempotencyServiceMock.complete).not.toHaveBeenCalled();
    });

    it('confirms a pending order and consumes reserved stock', async () => {
        const orderId = 'order-1';
        const productId = 'product-1';

        const pendingOrder: any = {
            id: orderId,
            userId: 'user-1',
            status: OrderStatus.PENDING,
            items: [
                {
                    id: 'items-1',
                    productId,
                    quantity: 2
                }
            ]
        };

        const confirmedOrder = {
            ...pendingOrder,
            status: OrderStatus.CONFIRMED
        };

        ordersRepositoryMock.findById
            .mockResolvedValueOnce(pendingOrder)
            .mockResolvedValueOnce(confirmedOrder)

        inventoryServiceMock.consumeReservedStock.mockResolvedValue({
            count: 1
        });

        ordersRepositoryMock.tryUpdateStatus.mockResolvedValue({
            count: 1
        });

        const result = await ordersService.confirm(orderId);

        expect(ordersRepositoryMock.findById).toHaveBeenCalledWith(orderId, tx);

        expect(inventoryServiceMock.consumeReservedStock).toHaveBeenCalledWith(
            {
                productId,
                quantity: 2
            },
            tx
        );

        expect(ordersRepositoryMock.tryUpdateStatus).toHaveBeenCalledWith(
            orderId,
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            tx
        );

        expect(outboxServiceMock.createEvent).toHaveBeenCalledWith(
            {
                eventType: OutboxEventTypes.ORDER_CONFIRMED,
                payload: {
                    orderId,
                    userId: 'user-1'
                }
            },
            tx
        );

        expect(result).toBe(confirmedOrder);
    });

    it('does not confirm an order that is not pending', async () => {
        const orderId = 'order-1';

        ordersRepositoryMock.findById.mockResolvedValue({
            id: orderId,
            userId: 'user-1',
            status: OrderStatus.CONFIRMED,
            items: [],
            user: undefined
        });

        await expect(ordersService.confirm(orderId)).rejects.toThrow(
            BadRequestException
        );

        expect(inventoryServiceMock.consumeReservedStock).not.toHaveBeenCalled();
        expect(ordersRepositoryMock.tryUpdateStatus).not.toHaveBeenCalled();
    });

    it('cancels a pending order and releases reserved stock', async () => {
        const orderId = 'order-1';
        const userId = 'user-1';
        const productId = 'product-1';

        const pendingOrder:any = {
            id: orderId,
            userId,
            status: OrderStatus.PENDING,
            items: [
                {
                    id: 'item-1',
                    productId,
                    quantity: 2
                }
            ]
        };

        const cancelledOrder = {
            ...pendingOrder,
            status: OrderStatus.CANCELLED
        };

        ordersRepositoryMock.findById
            .mockResolvedValueOnce(pendingOrder)
            .mockResolvedValueOnce(cancelledOrder);

        inventoryServiceMock.releaseReservedStock.mockResolvedValue({
            count: 1
        });

        ordersRepositoryMock.tryUpdateStatus.mockResolvedValue({
            count: 1
        });

        const result = await ordersService.cancel(orderId, {
            userId,
            role: UserRole.CUSTOMER
        });

        expect(inventoryServiceMock.releaseReservedStock).toHaveBeenCalledWith(
            {
                productId,
                quantity: 2
            },
            tx
        );

        expect(ordersRepositoryMock.tryUpdateStatus).toHaveBeenCalledWith(
            orderId,
            OrderStatus.PENDING,
            OrderStatus.CANCELLED,
            tx
        );

        expect(result).toBe(cancelledOrder);
    });

    it('does not allow a customer to cancel another user`s order', async () => {
        const orderId = 'order-1';

        ordersRepositoryMock.findById.mockResolvedValue({
            id: orderId,
            userId: 'owner-user-id',
            status: OrderStatus.PENDING,
            items: []
        });

        await expect(
            ordersService.cancel(orderId, {
                userId: 'different-user-id',
                role: UserRole.CUSTOMER
            })
        ).rejects.toThrow(ForbiddenException);

        expect(inventoryServiceMock.releaseReservedStock).not.toHaveBeenCalled();
        expect(ordersRepositoryMock.tryUpdateStatus).not.toHaveBeenCalled();
    });

    it('allows an admin to cancel any pending order', async () => {
        const orderId = 'order-1';

        const pendingOrder: any = {
            id: orderId,
            userId: 'owner-user-id',
            status: OrderStatus.PENDING,
            items: []
        };

        const cancelledOrder = {
            ...pendingOrder,
            status: OrderStatus.CANCELLED
        };

        ordersRepositoryMock.findById
            .mockResolvedValueOnce(pendingOrder)
            .mockResolvedValueOnce(cancelledOrder);

        ordersRepositoryMock.tryUpdateStatus.mockResolvedValue({
            count: 1
        });

        const result = await ordersService.cancel(orderId, {
            userId: 'admin-user-id',
            role: UserRole.ADMIN
        });

        expect(ordersRepositoryMock.tryUpdateStatus).toHaveBeenCalledWith(
            orderId,
            OrderStatus.PENDING,
            OrderStatus.CANCELLED,
            tx
        );

        expect(result).toBe(cancelledOrder);
    });

    it('throws NotFoundExcception when confirming a missing order', async () => {
        ordersRepositoryMock.findById.mockResolvedValue(null);

        await expect(ordersService.confirm('missing-order-id')).rejects.toThrow(
            NotFoundException
        );

        expect(inventoryServiceMock.consumeReservedStock).not.toHaveBeenCalled();
        expect(ordersRepositoryMock.tryUpdateStatus).not.toHaveBeenCalled();
    });

    it('does not enqueue a notification when confirmation fails', async () => {
        const orderId = 'order-1';

        ordersRepositoryMock.findById.mockResolvedValue({
            id: orderId,
            userId: 'user-1',
            status: OrderStatus.CONFIRMED,
            items: []
        });

        await expect(ordersService.confirm(orderId)).rejects.toThrow(BadRequestException);

        expect(outboxServiceMock.createEvent).not.toHaveBeenCalled();
    });

    it('returns existing order when idempotency key was already completed', async () => {
        const existingOrder = {
            id: 'order-1',
            userId: 'user-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(50),
            items: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

        idempotencyServiceMock.checkExisting.mockResolvedValue({
            exists: true,
            orderId: existingOrder.id
        });

        ordersRepositoryMock.findById.mockResolvedValue(existingOrder);

        const result = await ordersService.create(
            'user-1',
            {
                items: [
                    {
                        productId: 'product-1',
                        quantity: 1
                    }
                ]
            },
            'idempotency-key-1'
        );

        expect(result).toBe(existingOrder);

        expect(prismaServiceMock.$transaction).not.toHaveBeenCalled();
        expect(productServiceMock.findById).not.toHaveBeenCalled();
        expect(inventoryServiceMock.reserveStock).not.toHaveBeenCalled();
        expect(ordersRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('returns existing order when idempotency claim is lost due to duplicate key', async () => {
        const existingOrder = {
            id: 'order-1',
            userId: 'user-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(50),
            items: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

        idempotencyServiceMock.checkExisting.mockResolvedValueOnce({
            exists: false
        }).mockResolvedValueOnce({
            exists: true,
            orderId: existingOrder.id
        });

        idempotencyServiceMock.claim.mockResolvedValue({
            claimed: false,
            reason: 'DUPLICATE_KEY'
        });

        ordersRepositoryMock.findById.mockResolvedValue(existingOrder);

        prismaServiceMock.$transaction.mockImplementation(async (callback) => {
            return callback(tx);
        });

        const result = await ordersService.create(
            'user-1',
            {
                items: [
                    {
                        productId: 'product-1',
                        quantity: 1
                    }
                ]
            },
            'idempotency-key-1'
        );

        expect(result).toBe(existingOrder);

        expect(idempotencyServiceMock.claim).toHaveBeenCalled();
        expect(ordersRepositoryMock.create).not.toHaveBeenCalled();
        expect(inventoryServiceMock.reserveStock).not.toHaveBeenCalled();
    });

    it('does not create an outbox event when confirmation fails', async () => {
        const orderId = 'order-1';

        ordersRepositoryMock.findById.mockResolvedValue({
            id: orderId,
            userId: 'user-1',
            status: OrderStatus.CONFIRMED,
            items: []
        });

        await expect(ordersService.confirm(orderId)).rejects.toThrow(
            BadRequestException
        );

        expect(outboxServiceMock.createEvent).not.toHaveBeenCalled();
    });
});