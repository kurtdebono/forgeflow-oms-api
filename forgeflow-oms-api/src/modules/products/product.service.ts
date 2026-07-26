import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductRepository } from './product.repository';
import { Prisma } from '@prisma/client';
import { ProductCacheKeys } from './product-cache.keys';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class ProductService {
    private readonly productCacheTtlMs = Number(
        process.env.PRODUCT_CACHE_TTL_MKS ?? 60000
    );

    constructor(
        private readonly productRepository: ProductRepository,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache
    ) {

    }

    async get() {
        const cacheKey = ProductCacheKeys.all;

        const cachedProducts = await this.cacheManager.get(cacheKey);

        if(cachedProducts) {
            return cachedProducts;
        }

        const products = await this.productRepository.get();

        await this.cacheManager.set(
            cacheKey,
            products,
            this.productCacheTtlMs
        );

        return products;
    }

    async findById(id: string, tx?: Prisma.TransactionClient) {
        if (tx) {
            const product = await this.productRepository.findById(id, tx);

            if (!product) {
                throw new NotFoundException(`Product with id ${id} not found`);
            }
            

            return product;
        }        

        const cacheKey = ProductCacheKeys.byId(id);

        const cachedProducts = await this.cacheManager.get(cacheKey);

        if(cachedProducts) {
            return cachedProducts;
        }

        const product = await this.productRepository.findById(id);

        if (!product) {
            throw new NotFoundException(`Product with id ${id} not found`);
        }
        
        await this.cacheManager.set(
                cacheKey,
                product,
                this.productCacheTtlMs
            );

        return product;
    }

    async create(data: CreateProductDto) {
        const product = await this.productRepository.create(data);

        await this.invalidateProductCache(product.id);

        return product;
    }

    private async invalidateProductCache(productId: string) {
        await this.cacheManager.del(ProductCacheKeys.all);
        await this.cacheManager.del(ProductCacheKeys.byId(productId));
    }
}