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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("../products/product.service");
const inventory_repository_1 = require("./inventory.repository");
let InventoryService = class InventoryService {
    inventoryRepository;
    productService;
    constructor(inventoryRepository, productService) {
        this.inventoryRepository = inventoryRepository;
        this.productService = productService;
    }
    async create(data) {
        await this.productService.findById(data.productId);
        return this.inventoryRepository.create(data);
    }
    async findByProductId(productId) {
        const inventory = await this.inventoryRepository.findByProductId(productId);
        if (!inventory) {
            throw new common_1.NotFoundException(`Inventory for product with id ${productId} not found`);
        }
        return inventory;
    }
    async reserveStock(data, tx) {
        const result = await this.inventoryRepository.reserveStock(data.productId, data.quantity, tx);
        if (result.count === 0) {
            throw new common_1.BadRequestException(`Not enough stock available for product with id ${data.productId}`);
        }
        return this.findByProductId(data.productId);
    }
    async consumeReservedStock(data, tx) {
        const result = await this.inventoryRepository.consumeReservedStock(data.productId, data.quantity, tx);
        if (result.count === 0) {
            throw new common_1.BadRequestException(`Not enough reserved stock to consume for product with id ${data.productId}`);
        }
        return result;
    }
    async releaseReservedStock(data, tx) {
        const result = await this.inventoryRepository.releaseReservedStock(data.productId, data.quantity, tx);
        if (result.count === 0) {
            throw new common_1.BadRequestException(`Not enough reserved stock to release for product with id ${data.productId}`);
        }
        return result;
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [inventory_repository_1.InventoryRepository,
        product_service_1.ProductService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map