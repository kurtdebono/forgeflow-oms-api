import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
export declare class OrdersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(): Prisma.PrismaPromise<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            passwordHash: string;
            refreshTokenHash: string | null;
            role: import("@prisma/client").$Enums.UserRole;
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
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(data: Prisma.OrderCreateInput, tx?: Prisma.TransactionClient): Prisma.Prisma__OrderClient<{
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
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
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findById(id: string, tx?: Prisma.TransactionClient): Prisma.Prisma__OrderClient<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
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
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findByUserId(userId: string): Prisma.PrismaPromise<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
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
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    tryUpdateStatus(id: string, currentStatus: OrderStatus, nextStatus: OrderStatus, tx?: Prisma.TransactionClient): Prisma.PrismaPromise<Prisma.BatchPayload>;
}
