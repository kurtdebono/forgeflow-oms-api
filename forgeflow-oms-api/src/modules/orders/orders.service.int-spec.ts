import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';

import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

import { ProductService } from '../products/product.service';
import { ProductRepository } from '../products/product.repository';

import { InventoryService } from '../inventory/inventory.service';
import { InventoryRepository } from "../inventory/inventory.repository";

import { PrismaService } from "../../infrastructure/database/prisma/prisma.service";

describe('OrdersService Integration', () => {
    let moduleRef: TestingModule;
    let ordersService: OrdersService;
    let prisma: PrismaService;

    beforeAll(async () => {
        config({
            path: '.env.test',
            override: true
        });

        moduleRef = await Test.createTestingModule({
            providers: [
                OrdersService,
                OrdersRepository,
                ProductService,
                ProductRepository,
                InventoryService,
                InventoryRepository,
                PrismaService
            ]
        }).compile();

        ordersService = moduleRef.get(OrdersService);
        prisma = moduleRef.get(PrismaService);

        await prisma.$connect();
    });

    beforeEach(async () => {
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.inventory.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await moduleRef.close();
    });

    it('creates an order and reserves the inventory in the real database', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'customer@example.com',
                passwordHash: 'hashed-password',
                role: UserRole.CUSTOMER
            }
        });

        const product = await prisma.product.create({
            data: {
                name: 'Keyboard',
                description: 'Mechanical Keyboard',
                price: new Prisma.Decimal(50),
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

        const order = await ordersService.create(user.id, {
            items: [
                {
                    productId: product.id,
                    quantity: 2
                }
            ]
        }, 'idempotency-key-1');

        expect(order.status).toBe(OrderStatus.PENDING);
        expect(order.totalAmount.toString()).toBe('100');

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(inventory.availableQuantity).toBe(8)
        expect(inventory.reservedQuantity).toBe(2);

        const orderItems = await prisma.orderItem.findMany({
            where: {
                orderId: order.id
            }
        });

        expect(orderItems).toHaveLength(1);
        expect(orderItems[0].unitPrice.toString()).toBe('50');
    });

    it('rolls back inventory reservation if order creation fails', async () => {
        const product = await prisma.product.create({
            data: {
                name: 'Mouse',
                description: 'Wireless Mouse',
                price: new Prisma.Decimal(25),
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

        await expect(
            ordersService.create('missing-user-id', {
                items: [
                    {
                        productId: product.id,
                        quantity: 3
                    }
                ]
            }, 'idempotency-key-1')
        ).rejects.toThrow();

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(inventory.availableQuantity).toBe(10);
        expect(inventory.reservedQuantity).toBe(0);

        const orders = await prisma.order.findMany();

        expect(orders).toHaveLength(0);
    });

    it('does not change inventory when there is insufficient stock', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'customer@example.com',
                passwordHash: 'hashed-password',
                role: UserRole.CUSTOMER
            }
        });

        const product = await prisma.product.create({
            data: {
                name: 'Monitor',
                description: '4K monitor',
                price: new Prisma.Decimal(300),
                isActive: true
            }
        });

        await prisma.inventory.create({
            data: {
                productId: product.id,
                availableQuantity: 1,
                reservedQuantity: 0
            }
        });

        expect(
            ordersService.create(user.id, {
                items: [
                    {
                        productId: product.id,
                        quantity: 5
                    }
                ]
            }, 'idempotency-key-1')
        ).rejects.toThrow(BadRequestException);

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(inventory.availableQuantity).toBe(1);
        expect(inventory.reservedQuantity).toBe(0);

        const orders = await prisma.order.findMany();

        expect(orders).toHaveLength(0);
    });

    it('confirms an order and consumes reserved stock in the real database', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'custom@example.com',
                passwordHash: 'password-hashed',
                role: UserRole.CUSTOMER
            }
        });

        const product = await prisma.product.create({
            data: {
                name: 'Keyboard',
                description: 'Mechanical Keyboard',
                price: new Prisma.Decimal(50),
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

        const order = await ordersService.create(user.id, {
            items: [
                {
                    productId: product.id,
                    quantity: 3
                }
            ]
        }, 'idempotency-key-1');

        const inventoryAfterCreate = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(order.status).toBe(OrderStatus.PENDING);
        expect(inventoryAfterCreate.availableQuantity).toBe(7);
        expect(inventoryAfterCreate.reservedQuantity).toBe(3);

        const confirmedOrder = await ordersService.confirm(order.id);

        expect(confirmedOrder?.status).toBe(OrderStatus.CONFIRMED);

        const inventoryAfterConfirm = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(inventoryAfterConfirm.availableQuantity).toBe(7);
        expect(inventoryAfterConfirm.reservedQuantity).toBe(0);
    });


    it('cancels an order and releases reserved stock in the real database', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'custom@example.com',
                passwordHash: 'password-hashed',
                role: UserRole.CUSTOMER
            }
        });

        const product = await prisma.product.create({
            data: {
                name: 'Keyboard',
                description: 'Mechanical Keyboard',
                price: new Prisma.Decimal(50),
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

        const order = await ordersService.create(user.id, {
            items: [
                {
                    productId: product.id,
                    quantity: 3
                }
            ]
        }, 'idempotency-key-1');

        const inventoryAfterCreate = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(order.status).toBe(OrderStatus.PENDING);
        expect(inventoryAfterCreate.availableQuantity).toBe(7);
        expect(inventoryAfterCreate.reservedQuantity).toBe(3);

        const cancelledOrder = await ordersService.cancel(order.id, {
            userId: user.id,
            role: user.role
        });

        expect(cancelledOrder?.status).toBe(OrderStatus.CANCELLED);

        const inventoryAfterConfirm = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(inventoryAfterConfirm.availableQuantity).toBe(10);
        expect(inventoryAfterConfirm.reservedQuantity).toBe(0);
    });

    it('does not allow a confirmed order to be cancelled', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'custom@example.com',
                passwordHash: 'password-hashed',
                role: UserRole.CUSTOMER
            }
        });

        const product = await prisma.product.create({
            data: {
                name: 'Keyboard',
                description: 'Mechanical Keyboard',
                price: new Prisma.Decimal(50),
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

        const order = await ordersService.create(user.id, {
            items: [
                {
                    productId: product.id,
                    quantity: 2
                }
            ]
        }, 'idempotency-key-1');

        await ordersService.confirm(order.id);

        await expect(
            ordersService.cancel(order.id, {
                userId: user.id,
                role: user.role
            })
        ).rejects.toThrow(BadRequestException);

        const orderAfterFailedCancel = await prisma.order.findUniqueOrThrow({
            where: {
                id: order.id
            }
        });

        expect(orderAfterFailedCancel.status).toBe(OrderStatus.CONFIRMED);

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: {
                productId: product.id
            }
        });

        expect(inventory.availableQuantity).toBe(8);
        expect(inventory.reservedQuantity).toBe(0);
    })
});