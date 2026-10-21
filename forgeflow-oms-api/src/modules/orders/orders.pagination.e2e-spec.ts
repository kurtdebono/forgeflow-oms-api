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
import { OrdersRepository, OrderWithDetails } from './orders.repository';
import { Paginated } from './pagination';

type Page = Paginated<OrderWithDetails>;
type TestUser = { id: string; token: string };

const validationErrorBody = {
  statusCode: 400,
  error: 'Bad Request',
  message: expect.arrayContaining([expect.any(String)]) as string[],
};

describe('Orders pagination e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Server;
  let sequence = 0;
  const baseTime = new Date('2026-01-01T00:00:00Z').getTime();

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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(role: UserRole): Promise<TestUser> {
    sequence += 1;
    const email = `pagination-${role.toLowerCase()}-${sequence}@example.com`;
    const password = 'Password123!';
    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 10), role },
    });
    const res = await request(httpServer)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    return { id: user.id, token: (res.body as LoginResponse).accessToken };
  }

  // Each order gets its own createdAt unless one is given, so the expected order is known.
  async function seedOrders(
    userId: string,
    count: number,
    createdAt?: (index: number) => Date,
  ) {
    const offset = await prisma.order.count();
    await prisma.order.createMany({
      data: Array.from({ length: count }, (_, index) => ({
        userId,
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal(10),
        createdAt:
          createdAt?.(index) ?? new Date(baseTime + (offset + index) * 1000),
      })),
    });
  }

  // ADMIN, CUSTOMER A with 25 orders, CUSTOMER B with 3 orders (28 total).
  async function seedStandardDataset() {
    const admin = await login(UserRole.ADMIN);
    const a = await login(UserRole.CUSTOMER);
    const b = await login(UserRole.CUSTOMER);
    await seedOrders(a.id, 25);
    await seedOrders(b.id, 3);
    return { admin, a, b };
  }

  async function getPage(path: string, user: TestUser, status = 200) {
    const res = await request(httpServer)
      .get(path)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(status);
    return res.body as Page;
  }

  it('returns the first 20 of all orders with meta by default (AC1)', async () => {
    const { admin } = await seedStandardDataset();

    const page = await getPage('/orders', admin);

    expect(page.data).toHaveLength(20);
    expect(page.meta).toEqual({ page: 1, limit: 20, total: 28, totalPages: 2 });
  });

  it('returns the remaining orders on the last page (AC2)', async () => {
    const { admin } = await seedStandardDataset();

    const page = await getPage('/orders?page=2&limit=20', admin);

    expect(page.data).toHaveLength(8);
    expect(page.meta).toEqual({ page: 2, limit: 20, total: 28, totalPages: 2 });
  });

  it('pages a customer`s own orders on /orders/my (AC3)', async () => {
    const { a } = await seedStandardDataset();

    const page = await getPage('/orders/my?limit=10&page=3', a);

    expect(page.data).toHaveLength(5);
    expect(page.data.every((order) => order.userId === a.id)).toBe(true);
    expect(page.meta).toEqual({ page: 3, limit: 10, total: 25, totalPages: 3 });
  });

  it('pages any user`s orders for an admin on /orders/user/:userId (AC4)', async () => {
    const { admin, b } = await seedStandardDataset();

    const page = await getPage(`/orders/user/${b.id}?limit=2`, admin);

    expect(page.data).toHaveLength(2);
    expect(page.data.every((order) => order.userId === b.id)).toBe(true);
    expect(page.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('pages a customer`s own orders on /orders/user/:userId (AC5)', async () => {
    const { a } = await seedStandardDataset();

    const page = await getPage(`/orders/user/${a.id}?page=1`, a);

    expect(page.data.every((order) => order.userId === a.id)).toBe(true);
    expect(page.meta.total).toBe(25);
  });

  it('forbids a customer from paging another user`s orders without querying them (AC6)', async () => {
    const { a, b } = await seedStandardDataset();
    const findPage = jest.spyOn(app.get(OrdersRepository), 'findPage');

    await getPage(`/orders/user/${b.id}?page=1&limit=10`, a, 403);

    expect(findPage).not.toHaveBeenCalled();
  });

  it('keeps role and authentication checks on all three endpoints (AC7)', async () => {
    const { a } = await seedStandardDataset();

    await getPage('/orders?page=1', a, 403);

    for (const path of [
      '/orders?page=1',
      '/orders/my?page=1',
      `/orders/user/${a.id}?page=1`,
    ]) {
      await request(httpServer).get(path).expect(401);
      await request(httpServer)
        .get(path)
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);
    }
  });

  it('checks the role before validating the query, and the query before ownership (R7)', async () => {
    const { a, b } = await seedStandardDataset();

    await getPage('/orders?page=abc', a, 403);
    await getPage(`/orders/user/${b.id}?page=abc`, a, 400);
  });

  it.each([
    'page=0',
    'page=-1',
    'page=abc',
    'page=',
    'page=1.5',
    'page=2147483648',
    'limit=0',
    'limit=-5',
    'limit=101',
    'limit=abc',
    'limit=2.5',
    'page=1&page=2',
    'foo=1',
    'page=0x10',
    'page=1e1',
    'page=%201',
    'page[]=1',
  ])(
    'rejects GET /orders?%s with the standard 400 body and no query (AC8)',
    async (query) => {
      const admin = await login(UserRole.ADMIN);
      const findPage = jest.spyOn(app.get(OrdersRepository), 'findPage');

      const res = await request(httpServer)
        .get(`/orders?${query}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(400);

      expect(res.body).toEqual(validationErrorBody);
      expect(findPage).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid params on /orders/my and /orders/user/:userId too (AC8)', async () => {
    const admin = await login(UserRole.ADMIN);
    const customer = await login(UserRole.CUSTOMER);
    const findPage = jest.spyOn(app.get(OrdersRepository), 'findPage');

    for (const [path, user] of [
      ['/orders/my?limit=101', customer],
      ['/orders/my?page=0', admin],
      [`/orders/user/${customer.id}?page=abc`, customer],
      [`/orders/user/${customer.id}?limit=1.5`, admin],
    ] as const) {
      const res = await request(httpServer)
        .get(path)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(400);
      expect(res.body).toEqual(validationErrorBody);
    }
    expect(findPage).not.toHaveBeenCalled();
  });

  it('accepts the limit bounds 1 and 100 (AC9)', async () => {
    const { admin } = await seedStandardDataset();

    const largest = await getPage('/orders?limit=100', admin);
    const smallest = await getPage('/orders?limit=1', admin);

    expect(largest.meta.limit).toBe(100);
    expect(largest.data).toHaveLength(28);
    expect(smallest.meta.limit).toBe(1);
    expect(smallest.data).toHaveLength(1);
  });

  it('returns an empty page with real meta past the last page (AC10)', async () => {
    const { admin } = await seedStandardDataset();

    const page = await getPage('/orders?page=99', admin);

    expect(page).toEqual({
      data: [],
      meta: { page: 99, limit: 20, total: 28, totalPages: 2 },
    });
  });

  it('handles the largest allowed offset without a server error (AC10)', async () => {
    const { admin } = await seedStandardDataset();

    const page = await getPage('/orders?page=2147483647&limit=100', admin);

    expect(page).toEqual({
      data: [],
      meta: { page: 2147483647, limit: 100, total: 28, totalPages: 1 },
    });
  });

  it('returns an empty page with zero totals for a customer with no orders (AC11)', async () => {
    await seedStandardDataset();
    const c = await login(UserRole.CUSTOMER);

    for (const page of [1, 3]) {
      const query = page === 1 ? '' : `?page=${page}`;
      expect(await getPage(`/orders/my${query}`, c)).toEqual({
        data: [],
        meta: { page, limit: 20, total: 0, totalPages: 0 },
      });
    }
  });

  it('returns every order exactly once, by createdAt then id, when timestamps tie (AC12)', async () => {
    const admin = await login(UserRole.ADMIN);
    const customer = await login(UserRole.CUSTOMER);
    const sameTime = new Date(baseTime);
    await seedOrders(customer.id, 30, () => sameTime);

    const ids: string[] = [];
    for (let page = 1; page <= 4; page += 1) {
      const result = await getPage(`/orders?page=${page}&limit=8`, admin);
      ids.push(...result.data.map((order) => order.id));
    }

    const expected = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Order" ORDER BY "createdAt" DESC, id DESC`;
    expect(new Set(ids).size).toBe(30);
    expect(ids).toEqual(expected.map((row) => row.id));
  });

  it('lists the newest order first and the oldest last (AC13)', async () => {
    const { admin } = await seedStandardDataset();
    const newest = await prisma.order.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    const oldest = await prisma.order.findFirstOrThrow({
      orderBy: { createdAt: 'asc' },
    });

    const first = await getPage('/orders?page=1', admin);
    const last = await getPage('/orders?page=2', admin);

    expect(first.data[0].id).toBe(newest.id);
    expect(last.data[last.data.length - 1].id).toBe(oldest.id);
  });

  it('never returns credential fields from any paginated list (AC14)', async () => {
    const { admin, a } = await seedStandardDataset();

    for (const [path, user] of [
      ['/orders', admin],
      ['/orders?page=2', admin],
      ['/orders/my', a],
      ['/orders/my?page=2&limit=10', a],
      [`/orders/user/${a.id}`, a],
      [`/orders/user/${a.id}?page=2`, admin],
    ] as const) {
      const res = await request(httpServer)
        .get(path)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      expect((res.body as Page).data.length).toBeGreaterThan(0);
      expect(res.text).not.toMatch(/passwordHash|refreshTokenHash/);
    }
  });
});
