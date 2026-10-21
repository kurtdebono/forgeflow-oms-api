import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { OrdersRepository, OrderWithDetails } from './orders.repository';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ProductService } from '../products/product.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { OutboxService } from '../outbox/outbox.service';
import { OutboxEventTypes } from '../outbox/outbox.constants';

type OrdersRepositoryMock = jest.Mocked<
  Pick<OrdersRepository, 'create' | 'findPage' | 'findById' | 'tryUpdateStatus'>
>;

type ProductServiceMock = jest.Mocked<Pick<ProductService, 'findById'>>;

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

type OutboxServiceMock = jest.Mocked<Pick<OutboxService, 'createEvent'>>;

type PrismaServiceMock = {
  $transaction: jest.MockedFunction<
    <T>(
      callback: (tx: Prisma.TransactionClient) => Promise<T> | T,
    ) => Promise<T>
  >;
};

type InventoryWithProduct = Prisma.InventoryGetPayload<{
  include: {
    product: true;
  };
}>;

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
      findPage: jest.fn(),
      tryUpdateStatus: jest.fn(),
    };

    productServiceMock = {
      findById: jest.fn(),
    };

    inventoryServiceMock = {
      reserveStock: jest.fn(),
      consumeReservedStock: jest.fn(),
      releaseReservedStock: jest.fn(),
    };

    idempotencyServiceMock = {
      createRequestHash: jest.fn(),
      complete: jest.fn(),
      claim: jest.fn(),
      checkExisting: jest.fn(),
    };

    outboxServiceMock = {
      createEvent: jest.fn(),
    };

    type TransactionFn = <T>(
      callback: (tx: Prisma.TransactionClient) => T | Promise<T>,
    ) => Promise<T>;

    const transactionMock: TransactionFn = async <T>(
      callback: (tx: Prisma.TransactionClient) => T | Promise<T>,
    ): Promise<T> => {
      return callback(tx);
    };

    prismaServiceMock = {
      $transaction: jest.fn(
        transactionMock,
      ) as jest.MockedFunction<TransactionFn>,
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: ordersRepositoryMock,
        },
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
        {
          provide: InventoryService,
          useValue: inventoryServiceMock,
        },
        {
          provide: IdempotencyService,
          useValue: idempotencyServiceMock,
        },
        {
          provide: OutboxService,
          useValue: outboxServiceMock,
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    ordersService = moduleRef.get(OrdersService);
  });

  it('creates an order, reserves stock and calculates the total amount', async () => {
    const userId = 'user-1';
    const productId = 'product-1';
    const orderId = 'order-1';

    const product = {
      id: productId,
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: new Prisma.Decimal(50),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdOrder = {
      id: 'order-1',
      userId,
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'order-item-1',
          productId,
          orderId,
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          createdAt: new Date(),
          product,
        },
      ],
      user: {
        id: userId,
        email: 'test@sample.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const inventory = {
      id: 'inventory-1',
      productId,
      availableQuantity: 10,
      reservedQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      product,
    } satisfies InventoryWithProduct;

    productServiceMock.findById.mockResolvedValue(product);
    inventoryServiceMock.reserveStock.mockResolvedValue(inventory);
    ordersRepositoryMock.create.mockResolvedValue(createdOrder);

    idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

    idempotencyServiceMock.checkExisting.mockResolvedValue({
      exists: false,
    });

    idempotencyServiceMock.claim.mockResolvedValue({
      claimed: true,
      recordId: 'idempotency-record-1',
    });

    idempotencyServiceMock.complete.mockResolvedValue(undefined);

    const createOrderDto = {
      items: [
        {
          productId,
          quantity: 2,
        },
      ],
    };

    const result = await ordersService.create(
      userId,
      createOrderDto,
      'idempotency-key-1',
    );

    expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
    expect(productServiceMock.findById).toHaveBeenCalledWith(productId, tx);
    expect(ordersRepositoryMock.create).toHaveBeenCalledTimes(1);

    const [orderCreateData, transactionClient] =
      ordersRepositoryMock.create.mock.calls[0];

    expect(transactionClient).toBe(tx);

    expect(idempotencyServiceMock.complete).toHaveBeenCalledWith({
      recordId: 'idempotency-record-1',
      orderId: result.id,
      tx,
    });

    expect(orderCreateData.user).toEqual({
      connect: {
        id: userId,
      },
    });

    expect(orderCreateData.status).toBe(OrderStatus.PENDING);
    if (orderCreateData.totalAmount instanceof Prisma.Decimal) {
      expect(orderCreateData.totalAmount.toString()).toBe('100');
    }

    const itemsCreate = orderCreateData?.items?.create;

    if (!Array.isArray(itemsCreate)) {
      throw new Error('Expected order items to be created using an array.');
    }

    expect(itemsCreate).toHaveLength(1);
    expect(itemsCreate[0]).toEqual(
      expect.objectContaining({
        quantity: 2,
        unitPrice: product.price,
        product: {
          connect: {
            id: productId,
          },
        },
      }),
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
      updatedAt: new Date(),
    });

    idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

    idempotencyServiceMock.checkExisting.mockResolvedValue({
      exists: false,
    });

    idempotencyServiceMock.claim.mockResolvedValue({
      claimed: true,
      recordId: 'idempotency-record-1',
    });

    idempotencyServiceMock.complete.mockResolvedValue(undefined);

    await expect(
      ordersService.create(
        userId,
        {
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
        },
        'idempotency-key-1',
      ),
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
      updatedAt: new Date(),
    });

    idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

    idempotencyServiceMock.checkExisting.mockResolvedValue({
      exists: false,
    });

    idempotencyServiceMock.claim.mockResolvedValue({
      claimed: true,
      recordId: 'idempotency-record-1',
    });

    idempotencyServiceMock.complete.mockResolvedValue(undefined);

    inventoryServiceMock.reserveStock.mockRejectedValue(
      new BadRequestException('Insufficient Stock.'),
    );

    await expect(
      ordersService.create(
        userId,
        {
          items: [
            {
              productId,
              quantity: 10,
            },
          ],
        },
        'idempotency-key-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(idempotencyServiceMock.complete).not.toHaveBeenCalled();
  });

  it('confirms a pending order and consumes reserved stock', async () => {
    const orderId = 'order-1';
    const productId = 'product-1';
    const userId = 'user-1';

    const pendingOrder = {
      id: orderId,
      userId,
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'items-1',
          orderId,
          productId,
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          createdAt: new Date(),
          product: {
            id: productId,
            name: 'Keyboard',
            description: 'Mechanical Keyboard',
            price: new Prisma.Decimal(50),
            updatedAt: new Date(),
            createdAt: new Date(),
            isActive: true,
          },
        },
      ],
      user: {
        id: userId,
        role: UserRole.ADMIN,
        email: 'test@sample.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const confirmedOrder = {
      ...pendingOrder,
      status: OrderStatus.CONFIRMED,
    };

    ordersRepositoryMock.findById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(confirmedOrder);

    inventoryServiceMock.consumeReservedStock.mockResolvedValue({
      count: 1,
    });

    ordersRepositoryMock.tryUpdateStatus.mockResolvedValue({
      count: 1,
    });

    const result = await ordersService.confirm(orderId);

    expect(ordersRepositoryMock.findById).toHaveBeenCalledWith(orderId, tx);

    expect(inventoryServiceMock.consumeReservedStock).toHaveBeenCalledWith(
      {
        productId,
        quantity: 2,
      },
      tx,
    );

    expect(ordersRepositoryMock.tryUpdateStatus).toHaveBeenCalledWith(
      orderId,
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      tx,
    );

    expect(outboxServiceMock.createEvent).toHaveBeenCalledWith(
      {
        eventType: OutboxEventTypes.ORDER_CONFIRMED,
        payload: {
          orderId,
          userId: 'user-1',
        },
      },
      tx,
    );

    expect(result).toBe(confirmedOrder);
  });

  it('does not confirm an order that is not pending', async () => {
    const orderId = 'order-1';

    ordersRepositoryMock.findById.mockResolvedValue({
      id: orderId,
      userId: 'user-1',
      status: OrderStatus.CONFIRMED,
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      user: {
        id: 'user-1',
        role: UserRole.ADMIN,
        email: 'test@sample.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(ordersService.confirm(orderId)).rejects.toThrow(
      BadRequestException,
    );

    expect(inventoryServiceMock.consumeReservedStock).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.tryUpdateStatus).not.toHaveBeenCalled();
  });

  it('cancels a pending order and releases reserved stock', async () => {
    const orderId = 'order-1';
    const userId = 'user-1';
    const productId = 'product-1';

    const pendingOrder = {
      id: orderId,
      userId,
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item-1',
          orderId,
          productId,
          quantity: 2,
          unitPrice: new Prisma.Decimal(50),
          createdAt: new Date(),
          product: {
            id: productId,
            name: 'Keyboard',
            description: 'Mechanical Keyboard',
            price: new Prisma.Decimal(50),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      user: {
        id: userId,
        role: UserRole.ADMIN,
        email: 'test@sample.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } satisfies OrderWithDetails;

    const cancelledOrder = {
      ...pendingOrder,
      status: OrderStatus.CANCELLED,
    } satisfies OrderWithDetails;

    ordersRepositoryMock.findById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(cancelledOrder);

    inventoryServiceMock.releaseReservedStock.mockResolvedValue({
      count: 1,
    });

    ordersRepositoryMock.tryUpdateStatus.mockResolvedValue({
      count: 1,
    });

    const result = await ordersService.cancel(orderId, {
      userId,
      role: UserRole.CUSTOMER,
    });

    expect(inventoryServiceMock.releaseReservedStock).toHaveBeenCalledWith(
      {
        productId,
        quantity: 2,
      },
      tx,
    );

    expect(ordersRepositoryMock.tryUpdateStatus).toHaveBeenCalledWith(
      orderId,
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
      tx,
    );

    expect(result).toBe(cancelledOrder);
  });

  it('does not allow a customer to cancel another user`s order', async () => {
    const orderId = 'order-1';

    ordersRepositoryMock.findById.mockResolvedValue({
      id: orderId,
      userId: 'owner-user-id',
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      user: {
        id: 'user-1',
        email: 'test@sample.com',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(
      ordersService.cancel(orderId, {
        userId: 'different-user-id',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(inventoryServiceMock.releaseReservedStock).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.tryUpdateStatus).not.toHaveBeenCalled();
  });

  it('allows an admin to cancel any pending order', async () => {
    const orderId = 'order-1';

    const pendingOrder = {
      id: orderId,
      userId: 'owner-user-id',
      status: OrderStatus.PENDING,
      items: [],
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'owner-user-id',
        role: UserRole.ADMIN,
        email: 'test@sample.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } satisfies OrderWithDetails;

    const cancelledOrder = {
      ...pendingOrder,
      status: OrderStatus.CANCELLED,
    };

    ordersRepositoryMock.findById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(cancelledOrder);

    ordersRepositoryMock.tryUpdateStatus.mockResolvedValue({
      count: 1,
    });

    const result = await ordersService.cancel(orderId, {
      userId: 'admin-user-id',
      role: UserRole.ADMIN,
    });

    expect(ordersRepositoryMock.tryUpdateStatus).toHaveBeenCalledWith(
      orderId,
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
      tx,
    );

    expect(result).toBe(cancelledOrder);
  });

  it('throws NotFoundExcception when confirming a missing order', async () => {
    ordersRepositoryMock.findById.mockResolvedValue(null);

    await expect(ordersService.confirm('missing-order-id')).rejects.toThrow(
      NotFoundException,
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
      totalAmount: new Prisma.Decimal(100),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        email: 'test@sample.com',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(ordersService.confirm(orderId)).rejects.toThrow(
      BadRequestException,
    );

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
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        role: UserRole.ADMIN,
        email: 'test@sample.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

    idempotencyServiceMock.checkExisting.mockResolvedValue({
      exists: true,
      orderId: existingOrder.id,
    });

    ordersRepositoryMock.findById.mockResolvedValue(existingOrder);

    const result = await ordersService.create(
      'user-1',
      {
        items: [
          {
            productId: 'product-1',
            quantity: 1,
          },
        ],
      },
      'idempotency-key-1',
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
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        role: UserRole.ADMIN,
        email: 'test@sample.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    idempotencyServiceMock.createRequestHash.mockReturnValue('request-hash-1');

    idempotencyServiceMock.checkExisting
      .mockResolvedValueOnce({
        exists: false,
      })
      .mockResolvedValueOnce({
        exists: true,
        orderId: existingOrder.id,
      });

    idempotencyServiceMock.claim.mockResolvedValue({
      claimed: false,
      reason: 'DUPLICATE_KEY',
    });

    ordersRepositoryMock.findById.mockResolvedValue(existingOrder);

    prismaServiceMock.$transaction.mockImplementation(async (callback) => {
      return await callback(tx);
    });

    const result = await ordersService.create(
      'user-1',
      {
        items: [
          {
            productId: 'product-1',
            quantity: 1,
          },
        ],
      },
      'idempotency-key-1',
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
      totalAmount: new Prisma.Decimal(100),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        email: 'test@sample.com',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(ordersService.confirm(orderId)).rejects.toThrow(
      BadRequestException,
    );

    expect(outboxServiceMock.createEvent).not.toHaveBeenCalled();
  });

  describe('read access control', () => {
    const ownerId = 'owner-user-id';
    const otherCustomerId = 'other-customer-id';
    const adminId = 'admin-user-id';

    const ownedOrder = {
      id: 'order-1',
      userId: ownerId,
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal(100),
      items: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      user: {
        id: ownerId,
        email: 'owner@sample.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    } satisfies OrderWithDetails;

    describe('findByIdForActor', () => {
      it('returns the order to the customer who owns it', async () => {
        ordersRepositoryMock.findById.mockResolvedValue(ownedOrder);

        const result = await ordersService.findByIdForActor(ownedOrder.id, {
          userId: ownerId,
          role: UserRole.CUSTOMER,
        });

        expect(result).toBe(ownedOrder);
      });

      it('forbids a customer from reading another user`s order', async () => {
        ordersRepositoryMock.findById.mockResolvedValue(ownedOrder);

        await expect(
          ordersService.findByIdForActor(ownedOrder.id, {
            userId: otherCustomerId,
            role: UserRole.CUSTOMER,
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('returns any user`s order to an admin', async () => {
        ordersRepositoryMock.findById.mockResolvedValue(ownedOrder);

        const result = await ordersService.findByIdForActor(ownedOrder.id, {
          userId: adminId,
          role: UserRole.ADMIN,
        });

        expect(result).toBe(ownedOrder);
      });

      it.each([UserRole.CUSTOMER, UserRole.ADMIN])(
        'throws NotFoundException for a missing order (%s)',
        async (role) => {
          ordersRepositoryMock.findById.mockResolvedValue(null);

          await expect(
            ordersService.findByIdForActor('missing-order-id', {
              userId: ownerId,
              role,
            }),
          ).rejects.toThrow(NotFoundException);
        },
      );
    });

    describe('findByUserIdForActor', () => {
      const pageRequest = { page: 2, limit: 10 };

      it('returns a page of a customer`s own orders', async () => {
        ordersRepositoryMock.findPage.mockResolvedValue({
          items: [ownedOrder],
          total: 11,
        });

        const result = await ordersService.findByUserIdForActor(
          ownerId,
          { userId: ownerId, role: UserRole.CUSTOMER },
          pageRequest,
        );

        expect(result).toEqual({
          data: [ownedOrder],
          meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
        });
        expect(ordersRepositoryMock.findPage).toHaveBeenCalledWith(
          { userId: ownerId },
          pageRequest,
        );
      });

      it('forbids a customer from listing another user`s orders without listing or counting them (AC6)', async () => {
        await expect(
          ordersService.findByUserIdForActor(
            ownerId,
            { userId: otherCustomerId, role: UserRole.CUSTOMER },
            { page: 1, limit: 10 },
          ),
        ).rejects.toThrow(ForbiddenException);

        expect(ordersRepositoryMock.findPage).not.toHaveBeenCalled();
      });

      it('returns a page of any user`s orders to an admin', async () => {
        ordersRepositoryMock.findPage.mockResolvedValue({
          items: [ownedOrder],
          total: 1,
        });

        const result = await ordersService.findByUserIdForActor(
          ownerId,
          { userId: adminId, role: UserRole.ADMIN },
          pageRequest,
        );

        expect(result.data).toEqual([ownedOrder]);
        expect(ordersRepositoryMock.findPage).toHaveBeenCalledWith(
          { userId: ownerId },
          pageRequest,
        );
      });
    });

    describe('list endpoints', () => {
      it('get returns a page of all orders with meta', async () => {
        ordersRepositoryMock.findPage.mockResolvedValue({
          items: [ownedOrder],
          total: 28,
        });

        const result = await ordersService.get({ page: 1, limit: 20 });

        expect(result).toEqual({
          data: [ownedOrder],
          meta: { page: 1, limit: 20, total: 28, totalPages: 2 },
        });
        expect(ordersRepositoryMock.findPage).toHaveBeenCalledWith(
          {},
          { page: 1, limit: 20 },
        );
      });

      it('findByUserId returns a page of that user`s orders, empty when they have none', async () => {
        ordersRepositoryMock.findPage.mockResolvedValue({
          items: [],
          total: 0,
        });

        const result = await ordersService.findByUserId(ownerId, {
          page: 3,
          limit: 20,
        });

        expect(result).toEqual({
          data: [],
          meta: { page: 3, limit: 20, total: 0, totalPages: 0 },
        });
        expect(ordersRepositoryMock.findPage).toHaveBeenCalledWith(
          { userId: ownerId },
          { page: 3, limit: 20 },
        );
      });
    });
  });
});
