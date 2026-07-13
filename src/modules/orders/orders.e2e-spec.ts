import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { create } from 'domain';

describe('Auth / Products / Orders e2e', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        config({
            path: '.env.test',
            override: true
        });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true
            })
        );

        await app.init();

        prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.inventory.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        await app.close();
    });

    async function createUserAndLogin(role: UserRole) {
        const email = `${role.toLowerCase()}-${Date.now()}@example.com`;
        const password = 'Password123!';

        await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(password, 10),
                role
            }
        });

        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email,
                password
            })
            .expect(201);

        return {
            email,
            accessToken: response.body.accessToken as string,
            refreshToken: response.body.refreshToken as string
        }
    }

    it('protects product creation by role', async () => {
        const customer = await createUserAndLogin(UserRole.CUSTOMER);
        const admin = await createUserAndLogin(UserRole.ADMIN);

        const product = {
            name: 'Keyboard',
            description: 'Mechanical keyboard',
            price: 50,
            isActive: true
        };

        await request(app.getHttpServer())
            .post('/products')
            .send(product);

        await request(app.getHttpServer())
            .post('/products')
            .set('Authorization', `Bearer ${customer.accessToken}`)
            .send(product)
            .expect(403)

        const adminResponse = await request(app.getHttpServer())
            .post('/products')
            .set('Authorization', `Bearer ${admin.accessToken}`)
            .send(product)
            .expect(201)

        expect(adminResponse.body).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                name: 'Keyboard',
                description: 'Mechanical keyboard',
                isActive: true
            })
        );

        expect(adminResponse.body.price.toString()).toBe('50');
    });

    it('allows public product reads', async () => {
        const product = await prisma.product.create({
            data: {
                name: 'Mouse',
                description: 'Wireless mouse',
                price: new Prisma.Decimal(25),
                isActive: true
            }
        });

        const listResponse = await request(app.getHttpServer())
            .get('/products')
            .expect(200);

        expect(listResponse.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: product.id,
                    name: 'Mouse'
                })
            ])
        );

        const detailResponse = await request(app.getHttpServer())
            .get(`/products/${product.id}`)
            .expect(200);

        expect(detailResponse.body).toEqual(
            expect.objectContaining({
                id: product.id,
                name: 'Mouse'
            })
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
                isActive: true
            }
        });

        await request(app.getHttpServer())
            .post('/inventory')
            .send({
                productId: product.id,
                availableQuantity: 10
            })
            .expect(401);

        await request(app.getHttpServer())
            .post('/inventory')
            .set('Authorization', `Bearer ${customer.accessToken}`)
            .send({
                productId: product.id,
                availableQuantity: 10,
            })
            .expect(403);

        await request(app.getHttpServer())
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
                isActive: true
            }
        });

        await prisma.inventory.create({
            data: {
                productId: product.id,
                availableQuantity: 10,
                reservedQuantity: 0
            }
        });

        const createOrderResponse = await request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${customer.accessToken}`)
            .send({
                items: [
                    {
                        productId: product.id,
                        quantity: 2,
                    },
                ],
            })
            .expect(201);

        expect(createOrderResponse.body.status).toBe(OrderStatus.PENDING);
        expect(createOrderResponse.body.totalAmount.toString()).toBe('400');

        const inventoryAfterCreate = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id,
            },
        });

        expect(inventoryAfterCreate.availableQuantity).toBe(8);
        expect(inventoryAfterCreate.reservedQuantity).toBe(2);
  
        await request(app.getHttpServer())
            .post(`/orders/${createOrderResponse.body.id}/confirm`)
            .set('Authorization', `Bearer ${customer.accessToken}`)
            .expect(403);

        const confirmResponse = await request(app.getHttpServer())
            .post(`/orders/${createOrderResponse.body.id}/confirm`)
            .set('Authorization', `Bearer ${admin.accessToken}`)
            .expect(201);

        expect(confirmResponse.body.status).toBe(OrderStatus.CONFIRMED);

        const inventoryAfterConfirm = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id,
            }
        });

        expect(inventoryAfterConfirm.availableQuantity).toBe(8);
        expect(inventoryAfterConfirm.reservedQuantity).toBe(0);
    });
});