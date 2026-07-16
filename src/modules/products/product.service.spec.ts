import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { ProductCacheKeys } from './product-cache.keys';

type ProductRepositoryMock = jest.Mocked<
    Pick<
        ProductRepository, 
        'get' | 'findById' | 'create'
    >
>;

type CacheManagerMock = jest.Mocked<
    Pick<
        Cache,
        'get' | 'set' | 'del'
    >
>;

describe('ProductService', () => {
    let productService: ProductService;

    let productRepositoryMock: ProductRepositoryMock;
    let cacheManagerMock: CacheManagerMock;

    const product = {
        id: 'product-1',
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: new Prisma.Decimal(50),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(async () => {
        process.env.PRODUCT_CACHE_TTL_MKS = '60000';

        productRepositoryMock = {
            get: jest.fn(),
            findById: jest.fn(),
            create: jest.fn()
        };

        cacheManagerMock = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: ProductRepository,
                    useValue: productRepositoryMock
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManagerMock
                }
            ]
        }).compile();

        productService = moduleRef.get(ProductService);
    });

    afterEach( () => {
        delete process.env.PRODUCT_CACHE_TTL_MKS;
    });

    it('returns products from cache when findAll cache exists', async () => {
        const cachedProducts = [product];
            
        cacheManagerMock.get.mockResolvedValue(cachedProducts);

        const result = await productService.get();

        expect(cacheManagerMock.get).toHaveBeenCalledWith(ProductCacheKeys.all);
        expect(productRepositoryMock.get).not.toHaveBeenCalled();
        expect(cacheManagerMock.set).not.toHaveBeenCalled();

        expect(result).toBe(cachedProducts);
    });

    it('loads products from repository and caches them when get cache is missing', async () => {
        const products = [ product ];

        cacheManagerMock.get.mockResolvedValue(undefined);
        productRepositoryMock.get.mockResolvedValue(products);

        const result = await productService.get();

        expect(cacheManagerMock.get).toHaveBeenCalledWith(ProductCacheKeys.all);
        expect(productRepositoryMock.get).toHaveBeenCalledTimes(1);

        expect(cacheManagerMock.set).toHaveBeenCalledWith(
            ProductCacheKeys.all,
            products,
            60000
        );

        expect(result).toBe(products);
    });

    it('returns a product from cache when findById cache exists', async () => {
        cacheManagerMock.get.mockResolvedValue(product);

        const result = await productService.findById(product.id);

        expect(cacheManagerMock.get).toHaveBeenCalledWith(
            ProductCacheKeys.byId(product.id)
        );

        expect(productRepositoryMock.findById).not.toHaveBeenCalled();
        expect(cacheManagerMock.set).not.toHaveBeenCalled();

        expect(result).toBe(product);
    });

    it('loads a product from repository and caches it when findById cache is missing', async () => {
        cacheManagerMock.get.mockResolvedValue(undefined);
        productRepositoryMock.findById.mockResolvedValue(product);

        const result = await productService.findById(product.id);
        
        expect(cacheManagerMock.get).toHaveBeenCalledWith(
            ProductCacheKeys.byId(product.id)
        );

        expect(productRepositoryMock.findById).toHaveBeenCalledWith(product.id);

        expect(cacheManagerMock.set).toHaveBeenCalledWith(
            ProductCacheKeys.byId(product.id),
            product,
            60000
        );

        expect(result).toBe(product);
    });

    it('throws NotFoundException when product does not exist', async () => {
        cacheManagerMock.get.mockResolvedValue(undefined);
        productRepositoryMock.findById.mockResolvedValue(null);

        await expect(productService.findById('missing-product-id')).rejects.toThrow(
            NotFoundException
        );

        expect(cacheManagerMock.set).not.toHaveBeenCalled();
    });

    it('bypasses cache when findById is called with a transaction client', async () => {
        const tx = {} as Prisma.TransactionClient;

        productRepositoryMock.findById.mockResolvedValue(product);

        const result = await productService.findById(product.id, tx);

        expect(cacheManagerMock.get).not.toHaveBeenCalled();

        expect(productRepositoryMock.findById).toHaveBeenCalledWith(
            product.id,
            tx
        );

        expect(cacheManagerMock.set).not.toHaveBeenCalled();

        expect(result).toBe(product);
    });

    it('creates a product and invalidates product cache', async () => {
        const createDto = {
            name: 'Keyboard',
            description: 'Mechanical Keyboard',
            price: 50,
            isActive: true
        };

        productRepositoryMock.create.mockResolvedValue(product);

        const result = await productService.create(createDto);

        expect(productRepositoryMock.create).toHaveBeenCalledWith(createDto);

        expect(cacheManagerMock.del).toHaveBeenCalledWith(ProductCacheKeys.all);
        expect(cacheManagerMock.del).toHaveBeenCalledWith(
            ProductCacheKeys.byId(product.id)
        );

        expect(result).toBe(product);
    });
});