"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const product_repository_1 = require("./product.repository");
const product_cache_keys_1 = require("./product-cache.keys");
const cache_manager_1 = require("@nestjs/cache-manager");
let ProductService = class ProductService {
    productRepository;
    cacheManager;
    productCacheTtlMs = Number(process.env.PRODUCT_CACHE_TTL_MKS ?? 60000);
    constructor(productRepository, cacheManager) {
        this.productRepository = productRepository;
        this.cacheManager = cacheManager;
    }
    async get() {
        const cacheKey = product_cache_keys_1.ProductCacheKeys.all;
        const cachedProducts = await this.cacheManager.get(cacheKey);
        if (cachedProducts) {
            return cachedProducts;
        }
        const products = await this.productRepository.get();
        await this.cacheManager.set(cacheKey, products, this.productCacheTtlMs);
        return products;
    }
    async findById(id, tx) {
        if (tx) {
            const product = await this.productRepository.findById(id, tx);
            if (!product) {
                throw new common_1.NotFoundException(`Product with id ${id} not found`);
            }
            return product;
        }
        const cacheKey = product_cache_keys_1.ProductCacheKeys.byId(id);
        const cachedProducts = await this.cacheManager.get(cacheKey);
        if (cachedProducts) {
            return cachedProducts;
        }
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new common_1.NotFoundException(`Product with id ${id} not found`);
        }
        await this.cacheManager.set(cacheKey, product, this.productCacheTtlMs);
        return product;
    }
    async create(data) {
        const product = await this.productRepository.create(data);
        await this.invalidateProductCache(product.id);
        return product;
    }
    async invalidateProductCache(productId) {
        await this.cacheManager.del(product_cache_keys_1.ProductCacheKeys.all);
        await this.cacheManager.del(product_cache_keys_1.ProductCacheKeys.byId(productId));
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [product_repository_1.ProductRepository,
        cache_manager_1.Cache])
], ProductService);
//# sourceMappingURL=product.service.js.map