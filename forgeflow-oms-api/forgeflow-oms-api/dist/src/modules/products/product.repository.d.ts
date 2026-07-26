import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class ProductRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(): Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: Prisma.Decimal;
        isActive: boolean;
    }[]>;
    findById(id: string, tx?: Prisma.TransactionClient): Prisma.Prisma__ProductClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: Prisma.Decimal;
        isActive: boolean;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.ProductCreateInput): Prisma.Prisma__ProductClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: Prisma.Decimal;
        isActive: boolean;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}
