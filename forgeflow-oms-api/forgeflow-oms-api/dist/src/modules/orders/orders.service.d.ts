import { Prisma, UserRole } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { ProductService } from '../products/product.service';
import { OrdersRepository } from './orders.repository';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { OutboxService } from '../outbox/outbox.service';
export declare class OrdersService {
    private readonly ordersRepository;
    private readonly productService;
    private readonly inventoryService;
    private readonly prismaService;
    private readonly idempotencyService;
    private readonly outboxService;
    constructor(ordersRepository: OrdersRepository, productService: ProductService, inventoryService: InventoryService, prismaService: PrismaService, idempotencyService: IdempotencyService, outboxService: OutboxService);
    private createOrderInsideTransaction;
    get(): Promise<({
        user: {
            id: string;
            email: string;
            passwordHash: string;
            refreshTokenHash: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
        items: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                price: Prisma.Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        userId: string;
    })[]>;
    create(userId: string, data: CreateOrderDto, idempotencyKey: string): Promise<{
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
        items: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                price: Prisma.Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        userId: string;
    }>;
    confirm(orderId: string): Promise<any>;
    cancel(orderId: string, actor: {
        userId: string;
        role: UserRole;
    }): Promise<({
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
        items: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                price: Prisma.Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        userId: string;
    }) | null>;
    findById(id: string): Prisma.Prisma__OrderClient<({
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
        items: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                price: Prisma.Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        userId: string;
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findByUserId(userId: string): Prisma.PrismaPromise<({
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
        items: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                price: Prisma.Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        userId: string;
    })[]>;
}
