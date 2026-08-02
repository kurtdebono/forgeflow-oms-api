import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
export declare class OrdersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(): Prisma.PrismaPromise<({
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
    create(data: Prisma.OrderCreateInput, tx?: Prisma.TransactionClient): Prisma.Prisma__OrderClient<{
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
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findById(id: string, tx?: Prisma.TransactionClient): Prisma.Prisma__OrderClient<({
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
    tryUpdateStatus(id: string, currentStatus: OrderStatus, nextStatus: OrderStatus, tx?: Prisma.TransactionClient): Prisma.PrismaPromise<Prisma.BatchPayload>;
}
