import { CreateProductDto } from './dto/create-product.dto';
import { ProductRepository } from './product.repository';
import { Prisma } from '@prisma/client';
import { Cache } from '@nestjs/cache-manager';
export declare class ProductService {
    private readonly productRepository;
    private readonly cacheManager;
    private readonly productCacheTtlMs;
    constructor(productRepository: ProductRepository, cacheManager: Cache);
    get(): Promise<{}>;
    findById(id: string, tx?: Prisma.TransactionClient): Promise<{}>;
    create(data: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: Prisma.Decimal;
        isActive: boolean;
    }>;
    private invalidateProductCache;
}
