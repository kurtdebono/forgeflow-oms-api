import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    get(): Promise<({
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
                price: import("@prisma/client/runtime/client").Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(user: CurrentUser, body: CreateOrderDto, idempotencyKey?: string): Promise<{
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
                price: import("@prisma/client/runtime/client").Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findMyOrders(user: CurrentUser): import("@prisma/client").Prisma.PrismaPromise<({
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
                price: import("@prisma/client/runtime/client").Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    confirm(id: string): Promise<any>;
    cancel(id: string, user: CurrentUser): Promise<({
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
                price: import("@prisma/client/runtime/client").Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findById(id: string): import("@prisma/client").Prisma.Prisma__OrderClient<({
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
                price: import("@prisma/client/runtime/client").Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
        updatedAt: Date;
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findByUserId(userId: string): import("@prisma/client").Prisma.PrismaPromise<({
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
                price: import("@prisma/client/runtime/client").Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
