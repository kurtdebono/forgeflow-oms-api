import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { LoginResponse } from '../auth/dto/login-response.dto';

// QA regression/security tests for the orders read-access fix.
describe('Orders access control (QA) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Server;
  let sequence = 0;
  const credentialFields = /passwordHash|refreshTokenHash/;

  beforeAll(async () => {
    config({ path: '.env.test', override: true });
    const moduleFixture = await Test.createTestingModule({
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
    await prisma.orderAnalysis.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(role: UserRole) {
    sequence += 1;
    const email = `qa-${role.toLowerCase()}-${sequence}@example.com`;
    const password = 'Password123!';
    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 10), role },
    });
    const res = await request(httpServer)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    return {
      id: user.id,
      email,
      token: (res.body as LoginResponse).accessToken,
    };
  }

  async function seedOrder(userId: string) {
    const product = await prisma.product.create({
      data: {
        name: 'Lamp',
        description: 'Desk lamp',
        price: new Prisma.Decimal(30),
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
    const order = await prisma.order.create({
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
    return { order, product };
  }

  it('forbids a customer from GET /orders (admin only)', async () => {
    const customer = await login(UserRole.CUSTOMER);
    await request(httpServer)
      .get('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(403);
  });

  it('does not expose another user`s order via /orders/my', async () => {
    const a = await login(UserRole.CUSTOMER);
    const b = await login(UserRole.CUSTOMER);
    await seedOrder(a.id);
    const res = await request(httpServer)
      .get('/orders/my')
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);
    expect(res.body).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it('forbids customers from the intelligence endpoints on any order', async () => {
    const owner = await login(UserRole.CUSTOMER);
    const { order } = await seedOrder(owner.id);
    for (const method of ['get', 'post'] as const) {
      await request(httpServer)
        [method](`/orders/${order.id}/intelligence/analysis`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(403);
    }
  });

  it('forbids a customer from confirming and from cancelling another user`s order, without changing it', async () => {
    const owner = await login(UserRole.CUSTOMER);
    const other = await login(UserRole.CUSTOMER);
    const { order } = await seedOrder(owner.id);
    await request(httpServer)
      .post(`/orders/${order.id}/confirm`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);
    await request(httpServer)
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe(OrderStatus.PENDING);
  });

  it('never returns credential fields from create, confirm and cancel responses', async () => {
    const customer = await login(UserRole.CUSTOMER);
    const admin = await login(UserRole.ADMIN);
    const { product } = await seedOrder(customer.id);

    const created = await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('Idempotency-Key', 'qa-key-1')
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);
    expect(created.text).not.toMatch(credentialFields);

    const id = (created.body as { id: string }).id;
    const confirmed = await request(httpServer)
      .post(`/orders/${id}/confirm`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(201);
    expect(confirmed.text).not.toMatch(credentialFields);

    const second = await request(httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('Idempotency-Key', 'qa-key-2')
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);
    const cancelled = await request(httpServer)
      .post(`/orders/${(second.body as { id: string }).id}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(201);
    expect(cancelled.text).not.toMatch(credentialFields);
  });

  it('returns 404 (not 500) for non-UUID ids and never leaks data', async () => {
    const customer = await login(UserRole.CUSTOMER);
    const admin = await login(UserRole.ADMIN);
    for (const user of [customer, admin]) {
      for (const id of ['not-a-uuid', "1'%20OR%20'1'='1", 'user']) {
        await request(httpServer)
          .get(`/orders/${id}`)
          .set('Authorization', `Bearer ${user.token}`)
          .expect(404);
      }
    }
  });

  it('gives a customer 403 for non-UUID or differently-cased user ids and an admin an empty list', async () => {
    const customer = await login(UserRole.CUSTOMER);
    const admin = await login(UserRole.ADMIN);
    for (const id of [
      'not-a-uuid',
      customer.id.toUpperCase(),
      `${customer.id}%20`,
    ]) {
      await request(httpServer)
        .get(`/orders/user/${id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(403);
    }
    const res = await request(httpServer)
      .get('/orders/user/not-a-uuid')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(res.body).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  // Unknown query params are rejected outright (400) since pagination added a strict query DTO.
  it('does not let query parameters widen /orders/user/:userId or /orders/my (rejected with 400)', async () => {
    const owner = await login(UserRole.CUSTOMER);
    const other = await login(UserRole.CUSTOMER);
    await seedOrder(other.id);
    for (const path of [
      `/orders/user/${owner.id}?userId=${other.id}`,
      `/orders/my?userId=${other.id}`,
    ]) {
      const res = await request(httpServer)
        .get(path)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(400);
      expect(res.text).not.toContain('Lamp');
    }
  });

  it('does not leak order contents in the 403 body for GET /orders/:id', async () => {
    const owner = await login(UserRole.CUSTOMER);
    const other = await login(UserRole.CUSTOMER);
    const { order, product } = await seedOrder(owner.id);
    const res = await request(httpServer)
      .get(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);
    expect(res.text).not.toContain(owner.email);
    expect(res.text).not.toContain(product.id);
    expect(res.text).not.toContain(order.userId);
  });
});
