import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
export declare class InventoryRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: CreateInventoryDto): Prisma.Prisma__InventoryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        availableQuantity: number;
        reservedQuantity: number;
        productId: string;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findByProductId(productId: string): Prisma.Prisma__InventoryClient<({
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
        updatedAt: Date;
        availableQuantity: number;
        reservedQuantity: number;
        productId: string;
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    reserveStock(productId: string, quantity: number, tx?: Prisma.TransactionClient): Prisma.PrismaPromise<Prisma.BatchPayload>;
    consumeReservedStock(productId: string, quantity: number, tx?: Prisma.TransactionClient): Prisma.PrismaPromise<Prisma.BatchPayload>;
    releaseReservedStock(productId: string, quantity: number, tx?: Prisma.TransactionClient): Prisma.PrismaPromise<Prisma.BatchPayload>;
}
