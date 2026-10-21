import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import {
  OrderStatus,
  OutboxEventStatus,
  Prisma,
  UserRole,
  IdempotencyRecord,
  Product,
} from '@prisma/client';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OutboxEventTypes } from '../outbox/outbox.constants';
import { LoginResponse } from '../auth/dto/login-response.dto';
import { OrderWithDetails } from './orders.repository';

describe('Auth / Products / Orders e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Server;

  beforeAll(async () => {
    config({
      path: '.env.test',
      override: true,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany();
    await prisma.idempotencyRecord.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  let userSequence = 0;

  async function createUserAndLogin(role: UserRole) {
    userSequence += 1;
    const email = `${role.toLowerCase()}-${userSequence}@example.com`;
    const password = 'Password123!';

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
      },
    });

    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const loginResponse: LoginResponse = response.body as LoginResponse;

    return {
      id: user.id,
      email,
      accessToken: loginResponse.accessToken,
      refreshToken: loginResponse.refreshToken,
    };
  }

  it('protects product creation by role', async () => {
    const customer = await createUserAndLogin(UserRole.CUSTOMER);
    const admin = await createUserAndLogin(UserRole.ADMIN);

    const product = {
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: 50,
      isActive: true,
    };

    await request(httpServer).post('/products').send(product);

    await request(httpServer)
      .post('/products')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send(product)
      .expect(403);

    const adminResponse = await request(httpServer)
      .post('/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(product)
      .expect(201);

    const adminResponseBody: Product = adminResponse.body as Product;

    expect(adminResponseBody).toEqual(
      expect.objectContaining({
        id: expect.any(String) as string,
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        isActive: true,
      }),
    );

    expect(adminResponseBody.price.toString()).toBe('50');
  });

  it('allows public product reads', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Mouse',
        description: 'Wireless mouse',
        price: new Prisma.Decimal(25),
        isActive: true,
      },
    });

    const listResponse = await request(httpServer).get('/products').expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: product.id,
          name: 'Mouse',
        }),
      ]),
    );

    const detailResponse = await request(httpServer)
      .get(`/products/${product.id}`)
      .expect(200);

    expect(detailResponse.body).toEqual(
      expect.objectContaining({
        id: product.id,
        name: 'Mouse',
      }),
    );
  });

  it('protects inventory endpoints by admin role', async () => {
    const customer = await createUserAndLogin(UserRole.CUSTOMER);
    const admin = await createUserAndLogin(UserRole.ADMIN);

    const product = await prisma.product.create({
      data: {
        name: 'Monitor',
        description: '4K Monitor',
        price: new Prisma.Decimal(300),
        isActive: true,
      },
    });

    await request(httpServer)
      .post('/inventory')
      .send({
        productId: product.id,
        availableQuantity: 10,
      })
      .expect(401);

    await request(httpServer)
      .post('/inventory')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        productId: product.id,
        availableQuantity: 10,
      })
      .expect(403);

    await request(httpServer)
      .post('/inventory')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        productId: product.id,
        availableQuantity: 10,
      })
      .expect(201);

    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId: product.id,
      },
    });

    expect(inventory.availableQuantity).toBe(10);
    expect(inventory.reservedQuantity).toBe(0);
  });

  it('allows a customer to create an order and an admin to confirm it', async () => {
    const customer = await createUserAndLogin(UserRole.CUSTOMER);
    const admin = await createUserAndLogin(UserRole.ADMIN);

    const product = await prisma.product.create({
      data: {
        name: 'Desk',
        description: 'Standing Desk',
        price: new Prisma.Decimal(200),
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        availableQuantity: 10,
        reservedQuantity: 0,
      },
    });

    const createOrderResponse = await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .set('Idempotency-Key', 'abc-123')
      .send({
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      })
      .expect(201);

    const createOrderResponseBody: OrderWithDetails =
      createOrderResponse.body as OrderWithDetails;

    expect(createOrderResponseBody.status).toBe(OrderStatus.PENDING);
    expect(createOrderResponseBody.totalAmount.toString()).toBe('400');

    const inventoryAfterCreate = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId: product.id,
      },
    });

    expect(inventoryAfterCreate.availableQuantity).toBe(8);
    expect(inventoryAfterCreate.reservedQuantity).toBe(2);

    await request(httpServer)
      .post(`/orders/${createOrderResponseBody.id}/confirm`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(403);

    const confirmResponse = await request(httpServer)
      .post(`/orders/${createOrderResponseBody.id}/confirm`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    const confirmResponseBody: OrderWithDetails =
      confirmResponse.body as OrderWithDetails;

    expect(confirmResponseBody.status).toBe(OrderStatus.CONFIRMED);

    const inventoryAfterConfirm = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId: product.id,
      },
    });

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        eventType: OutboxEventTypes.ORDER_CONFIRMED,
      },
    });

    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].status).toBe(OutboxEventStatus.PENDING);
    expect(outboxEvents[0].payload).toEqual({
      orderId: createOrderResponseBody.id,
      userId: customer.id,
    });

    expect(inventoryAfterConfirm.availableQuantity).toBe(8);
    expect(inventoryAfterConfirm.reservedQuantity).toBe(0);
  });

  it('requires Idempotency-Key when creating an order', async () => {
    const customer = await createUserAndLogin(UserRole.CUSTOMER);

    await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        items: [
          {
            productId: 'some-product-id',
            quantity: 1,
          },
        ],
      })
      .expect(400);
  });

  it('does not create duplicate orders when he same Idempotency-Key is retried', async () => {
    const customer = await createUserAndLogin(UserRole.CUSTOMER);

    const product = await prisma.product.create({
      data: {
        name: 'Mouse',
        description: 'Wireless mouse',
        price: 25,
        isActive: true,
        inventory: {
          create: {
            availableQuantity: 10,
            reservedQuantity: 0,
          },
        },
      },
    });

    const body = {
      items: [
        {
          productId: product.id,
          quantity: 2,
        },
      ],
    };

    const idempotencyKey = 'retry-order-key-1';

    const firstResponse = await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);
    const firstResponseBody: OrderWithDetails =
      firstResponse.body as OrderWithDetails;

    const secondResponse = await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);

    const secondResponseBody: OrderWithDetails =
      secondResponse.body as OrderWithDetails;

    expect(secondResponseBody.id).toBe(firstResponseBody.id);

    const orders = await prisma.order.findMany({
      where: {
        userId: customer.id,
      },
    });

    expect(orders).toHaveLength(1);

    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId: product.id,
      },
    });

    expect(inventory.availableQuantity).toBe(8);
    expect(inventory.reservedQuantity).toBe(2);

    const idempotencyRecords: IdempotencyRecord[] =
      await prisma.idempotencyRecord.findMany({
        where: {
          userId: customer.id,
          operation: 'CREATE_ORDER',
          key: idempotencyKey,
        },
      });

    expect(idempotencyRecords).toHaveLength(1);
    expect(idempotencyRecords[0].orderId).toBe(firstResponseBody.id);
    expect(idempotencyRecords[0].status).toBe('COMPLETED');
  });

  it('rejects same Idempotency-Key with different request body', async () => {
    const customer = await createUserAndLogin(UserRole.CUSTOMER);

    const product = await prisma.product.create({
      data: {
        name: 'Mouse',
        description: 'Wireless mouse',
        price: 25,
        isActive: true,
        inventory: {
          create: {
            availableQuantity: 10,
            reservedQuantity: 0,
          },
        },
      },
    });

    const idempotencyKey = 'same-key-different-body';

    await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
      })
      .expect(201);

    await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      })
      .expect(409);

    const orders = await prisma.order.findMany({
      where: {
        userId: customer.id,
      },
    });

    expect(orders).toHaveLength(1);

    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId: product.id,
      },
    });

    expect(inventory.availableQuantity).toBe(9);
    expect(inventory.reservedQuantity).toBe(1);
  });

  describe('order read access control', () => {
    const credentialFields = /passwordHash|refreshTokenHash/;
    const publicUserKeys = ['createdAt', 'email', 'id', 'role', 'updatedAt'];

    async function createOrderFor(userId: string) {
      const product = await prisma.product.create({
        data: {
          name: 'Lamp',
          description: 'Desk lamp',
          price: new Prisma.Decimal(30),
          isActive: true,
        },
      });

      return prisma.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount: new Prisma.Decimal(30),
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: new Prisma.Decimal(30),
            },
          },
        },
      });
    }

    function expectNoCredentialFields(response: request.Response) {
      expect(response.text).not.toMatch(credentialFields);
    }

    it('returns only public user fields from GET /orders (AC1)', async () => {
      const customer = await createUserAndLogin(UserRole.CUSTOMER);
      const admin = await createUserAndLogin(UserRole.ADMIN);
      await createOrderFor(customer.id);

      const response = await request(httpServer)
        .get('/orders')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);

      const orders = response.body as OrderWithDetails[];

      expect(orders).toHaveLength(1);
      for (const order of orders) {
        expect(Object.keys(order.user).sort()).toEqual(publicUserKeys);
      }
      expectNoCredentialFields(response);
    });

    it('lets a customer read their own order (AC2)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const order = await createOrderFor(owner.id);

      const response = await request(httpServer)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const body = response.body as OrderWithDetails;

      expect(body.id).toBe(order.id);
      expect(Object.keys(body.user).sort()).toEqual(publicUserKeys);
      expectNoCredentialFields(response);
    });

    it('forbids a customer from reading another user`s order (AC3)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const otherCustomer = await createUserAndLogin(UserRole.CUSTOMER);
      const order = await createOrderFor(owner.id);

      const response = await request(httpServer)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${otherCustomer.accessToken}`)
        .expect(403);

      expect(response.text).not.toContain(owner.email);
      expect(response.body).not.toHaveProperty('items');
    });

    it('lets an admin read any user`s order (AC4)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const admin = await createUserAndLogin(UserRole.ADMIN);
      const order = await createOrderFor(owner.id);

      const response = await request(httpServer)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);

      const body = response.body as OrderWithDetails;

      expect(body.id).toBe(order.id);
      expect(body.user.email).toBe(owner.email);
      expectNoCredentialFields(response);
    });

    it('returns 404 for a missing order to any role (AC5)', async () => {
      const customer = await createUserAndLogin(UserRole.CUSTOMER);
      const admin = await createUserAndLogin(UserRole.ADMIN);
      const missingOrderId = '00000000-0000-4000-8000-000000000000';

      for (const user of [customer, admin]) {
        await request(httpServer)
          .get(`/orders/${missingOrderId}`)
          .set('Authorization', `Bearer ${user.accessToken}`)
          .expect(404);
      }
    });

    it('lets a customer list their own orders by user id (AC6)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const otherCustomer = await createUserAndLogin(UserRole.CUSTOMER);
      const ownOrder = await createOrderFor(owner.id);
      await createOrderFor(otherCustomer.id);

      const response = await request(httpServer)
        .get(`/orders/user/${owner.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const orders = response.body as OrderWithDetails[];

      expect(orders.map((order) => order.id)).toEqual([ownOrder.id]);
      expectNoCredentialFields(response);
    });

    it('forbids a customer from listing another user`s orders, existing or not (AC7)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const otherCustomer = await createUserAndLogin(UserRole.CUSTOMER);
      await createOrderFor(owner.id);
      const missingUserId = '00000000-0000-4000-8000-000000000000';

      for (const userId of [owner.id, missingUserId]) {
        await request(httpServer)
          .get(`/orders/user/${userId}`)
          .set('Authorization', `Bearer ${otherCustomer.accessToken}`)
          .expect(403);
      }
    });

    it('lets an admin list any user`s orders (AC8)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const admin = await createUserAndLogin(UserRole.ADMIN);
      const order = await createOrderFor(owner.id);

      const response = await request(httpServer)
        .get(`/orders/user/${owner.id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);

      const orders = response.body as OrderWithDetails[];

      expect(orders.map((o) => o.id)).toEqual([order.id]);
      expectNoCredentialFields(response);
    });

    it('requires a valid JWT for both read endpoints (AC9)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const order = await createOrderFor(owner.id);

      for (const path of [`/orders/${order.id}`, `/orders/user/${owner.id}`]) {
        await request(httpServer).get(path).expect(401);

        await request(httpServer)
          .get(path)
          .set('Authorization', 'Bearer not-a-valid-token')
          .expect(401);
      }
    });

    it('never returns credential fields from any order read endpoint (R4)', async () => {
      const owner = await createUserAndLogin(UserRole.CUSTOMER);
      const admin = await createUserAndLogin(UserRole.ADMIN);
      const order = await createOrderFor(owner.id);

      const reads = [
        { path: '/orders', token: admin.accessToken },
        { path: '/orders/my', token: owner.accessToken },
        { path: `/orders/${order.id}`, token: owner.accessToken },
        { path: `/orders/user/${owner.id}`, token: owner.accessToken },
      ];

      for (const { path, token } of reads) {
        const response = await request(httpServer)
          .get(path)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.text).toContain(owner.email);
        expectNoCredentialFields(response);
      }
    });
  });
});
