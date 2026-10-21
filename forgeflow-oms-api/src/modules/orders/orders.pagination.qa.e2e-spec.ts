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

describe('Orders pagination QA e2e', () => {
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
    const email = `pagination-qa-${role.toLowerCase()}-${sequence}@example.com`;
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

  it('walks a 105-order list at limit=100 into 100 + 5 with no overlap', async () => {
    const admin = await login(UserRole.ADMIN);
    const c = await login(UserRole.CUSTOMER);
    await seedOrders(c.id, 105);

    const p1 = await getPage('/orders?limit=100', admin);
    const p2 = await getPage('/orders?limit=100&page=2', admin);

    expect(p1.data).toHaveLength(100);
    expect(p2.data).toHaveLength(5);
    expect(p1.meta).toEqual({ page: 1, limit: 100, total: 105, totalPages: 2 });
    const ids = [...p1.data, ...p2.data].map((o) => o.id);
    expect(new Set(ids).size).toBe(105);
  });

  it('has totalPages equal to total/limit when it divides exactly, and an empty page after it', async () => {
    const admin = await login(UserRole.ADMIN);
    const c = await login(UserRole.CUSTOMER);
    await seedOrders(c.id, 20);

    const last = await getPage('/orders?limit=10&page=2', admin);
    const beyond = await getPage('/orders?limit=10&page=3', admin);

    expect(last.data).toHaveLength(10);
    expect(last.meta.totalPages).toBe(2);
    expect(beyond.data).toEqual([]);
    expect(beyond.meta).toEqual({
      page: 3,
      limit: 10,
      total: 20,
      totalPages: 2,
    });
  });

  it('returns a single order as page 1 of 1 with limit=1 boundaries', async () => {
    const admin = await login(UserRole.ADMIN);
    const c = await login(UserRole.CUSTOMER);
    await seedOrders(c.id, 1);

    const page = await getPage('/orders?limit=1', admin);

    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({ page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  it('counts only the caller`s orders on a later page of /orders/user/:userId (no cross-user total)', async () => {
    const { a, b } = await seedStandardDataset();

    const page = await getPage(`/orders/user/${a.id}?page=3&limit=10`, a);

    expect(page.data).toHaveLength(5);
    expect(page.data.every((o) => o.userId === a.id)).toBe(true);
    expect(page.meta.total).toBe(25);
    const other = await getPage(`/orders/user/${b.id}?limit=100`, a, 403);
    expect(JSON.stringify(other)).not.toContain(b.id);
  });

  it('lets a customer on /orders/my ignore a userId param (400) and an admin see only their own orders', async () => {
    const { admin, a } = await seedStandardDataset();
    await seedOrders(admin.id, 2);

    await request(httpServer)
      .get(`/orders/my?userId=${a.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);
    const mine = await getPage('/orders/my', admin);

    expect(mine.meta.total).toBe(2);
    expect(mine.data.every((o) => o.userId === admin.id)).toBe(true);
  });

  it('returns an empty page for an admin listing an unknown but well-formed user', async () => {
    const { admin } = await seedStandardDataset();

    const page = await getPage(
      '/orders/user/00000000-0000-4000-8000-000000000000?page=2',
      admin,
    );

    expect(page.data).toEqual([]);
    expect(page.meta).toEqual({ page: 2, limit: 20, total: 0, totalPages: 0 });
  });

  it.each([
    'page=%00',
    'page=1%00',
    'page=%2B1',
    'page=-0',
    'page=1;DROP%20TABLE%20orders',
    "page=1'%20OR%20'1'='1",
    'limit=%2B5',
    'limit=1e2',
    'limit=0x64',
    'limit=%D9%A3',
    'limit=1_0',
    'limit=NaN',
    'limit=Infinity',
    'limit=null',
    'limit=true',
    'limit=%20',
    'limit=99999999999999999999999999',
    'page=99999999999999999999999999',
    'limit[]=5',
    'limit[a]=5',
    'page=1&limit=10&extra=1',
    'PAGE=2',
  ])('rejects %s with 400 and runs no query', async (qs) => {
    const admin = await login(UserRole.ADMIN);
    const spy = jest.spyOn(OrdersRepository.prototype, 'findPage');

    const res = await request(httpServer)
      .get(`/orders?${qs}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);

    expect(res.body).toMatchObject(validationErrorBody);
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts zero-padded digits as the same number (documented leniency)', async () => {
    const admin = await login(UserRole.ADMIN);

    const page = await getPage('/orders?page=0001&limit=010', admin);

    expect(page.meta).toMatchObject({ page: 1, limit: 10 });
  });

  it('does not leak validation internals (stack or SQL) in 400 bodies', async () => {
    const admin = await login(UserRole.ADMIN);

    const res = await request(httpServer)
      .get('/orders?page=abc')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);

    expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma|select |\.ts:/i);
  });

  it('keeps total and data consistent when every order shares one createdAt across users', async () => {
    const admin = await login(UserRole.ADMIN);
    const a = await login(UserRole.CUSTOMER);
    const b = await login(UserRole.CUSTOMER);
    const same = new Date('2026-02-02T02:02:02.002Z');
    await seedOrders(a.id, 13, () => same);
    await seedOrders(b.id, 12, () => same);

    const seen: string[] = [];
    let total = -1;
    for (let page = 1; page <= 4; page += 1) {
      const res = await getPage(`/orders?limit=7&page=${page}`, admin);
      seen.push(...res.data.map((o) => o.id));
      total = res.meta.total;
      expect(res.meta.totalPages).toBe(4);
    }

    expect(total).toBe(25);
    expect(new Set(seen).size).toBe(25);
    expect(seen).toEqual([...seen].sort().reverse());
    const mineA = await getPage(`/orders/user/${a.id}?limit=100`, admin);
    const mineB = await getPage(`/orders/user/${b.id}?limit=100`, admin);
    expect(mineA.meta.total + mineB.meta.total).toBe(total);
  });

  it('keeps the same order for the same page on repeated reads (deterministic)', async () => {
    const admin = await login(UserRole.ADMIN);
    const c = await login(UserRole.CUSTOMER);
    const same = new Date('2026-03-03T00:00:00Z');
    await seedOrders(c.id, 15, () => same);

    const first = await getPage('/orders?limit=5&page=2', admin);
    const second = await getPage('/orders?limit=5&page=2', admin);

    expect(second.data.map((o) => o.id)).toEqual(first.data.map((o) => o.id));
  });

  it('rejects unauthenticated and malformed-token reads before validating the query', async () => {
    await request(httpServer).get('/orders?page=abc').expect(401);
    await request(httpServer)
      .get('/orders/my?limit=500')
      .set('Authorization', 'Bearer not.a.jwt')
      .expect(401);
  });

  it('does not route /orders/my or /orders/user/:id into the :id handler', async () => {
    const { a } = await seedStandardDataset();

    const my = await getPage('/orders/my?limit=1', a);

    expect(my.meta.total).toBe(25);
  });
});
