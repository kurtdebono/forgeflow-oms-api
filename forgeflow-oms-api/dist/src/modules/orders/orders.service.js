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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const inventory_service_1 = require("../inventory/inventory.service");
const product_service_1 = require("../products/product.service");
const orders_repository_1 = require("./orders.repository");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const idempotency_constants_1 = require("../idempotency/idempotency.constants");
const outbox_service_1 = require("../outbox/outbox.service");
const outbox_constants_1 = require("../outbox/outbox.constants");
let OrdersService = class OrdersService {
    ordersRepository;
    productService;
    inventoryService;
    prismaService;
    idempotencyService;
    outboxService;
    constructor(ordersRepository, productService, inventoryService, prismaService, idempotencyService, outboxService) {
        this.ordersRepository = ordersRepository;
        this.productService = productService;
        this.inventoryService = inventoryService;
        this.prismaService = prismaService;
        this.idempotencyService = idempotencyService;
        this.outboxService = outboxService;
    }
    async createOrderInsideTransaction(userId, data, tx) {
        const orderItems = [];
        let totalAmount = new client_1.Prisma.Decimal(0);
        for (const item of data.items) {
            const product = await this.productService.findById(item.productId, tx);
            if (!product.isActive) {
                throw new common_1.BadRequestException(`Product with id ${item.productId} is not active.`);
            }
            await this.inventoryService.reserveStock({
                productId: item.productId,
                quantity: item.quantity
            }, tx);
            const lineTotal = product.price.mul(item.quantity);
            totalAmount = totalAmount.add(lineTotal);
            orderItems.push({
                product: {
                    connect: {
                        id: product.id
                    }
                },
                quantity: item.quantity,
                unitPrice: product.price
            });
        }
        const orderCreateInput = {
            user: {
                connect: {
                    id: userId
                }
            },
            status: 'PENDING',
            totalAmount,
            items: {
                create: orderItems
            }
        };
        return this.ordersRepository.create(orderCreateInput, tx);
    }
    async get() {
        return this.ordersRepository.get();
    }
    async create(userId, data, idempotencyKey) {
        const operation = idempotency_constants_1.IdempotencyOperations.CREATE_ORDER;
        const requestHash = this.idempotencyService.createRequestHash({
            item: data.items
        });
        const existResult = await this.idempotencyService.checkExisting({
            userId,
            operation,
            key: idempotencyKey,
            requestHash
        });
        if (existResult.exists) {
            const existingOrder = await this.ordersRepository.findById(existResult.orderId);
            if (!existingOrder) {
                throw new common_1.InternalServerErrorException('Idempotency record points to an order that no longer exists.');
            }
            return existingOrder;
        }
        const result = await this.prismaService.$transaction(async (tx) => {
            const claim = await this.idempotencyService.claim({
                userId,
                operation,
                key: idempotencyKey,
                requestHash,
                tx
            });
            if (!claim.claimed) {
                return {
                    duplicate: true
                };
            }
            const order = await this.createOrderInsideTransaction(userId, data, tx);
            await this.idempotencyService.complete({
                recordId: claim.recordId,
                orderId: order.id,
                tx
            });
            return {
                deuplicate: false,
                order
            };
        });
        if (result.duplicate) {
            const existingAfterRace = await this.idempotencyService.checkExisting({
                userId,
                operation,
                key: idempotencyKey,
                requestHash
            });
            if (existingAfterRace.exists) {
                const existingOrder = await this.ordersRepository.findById(existingAfterRace.orderId);
                if (!existingOrder) {
                    throw new common_1.InternalServerErrorException('Idempotency record points to an order that no longer exists.');
                }
                return existingOrder;
            }
            throw new common_1.ConflictException('A request with this idempotency key is already in progress.');
        }
        return result.order;
    }
    async confirm(orderId) {
        const confirmedOrder = await this.prismaService.$transaction(async (tx) => {
            const order = await this.ordersRepository.findById(orderId, tx);
            if (!order) {
                throw new common_1.NotFoundException(`Order with id ${orderId} was not found.`);
            }
            if (order.status !== client_1.OrderStatus.PENDING) {
                throw new common_1.BadRequestException(`Order with id ${orderId} cannot be confirmed because it is not in PENDING status.`);
            }
            for (const item of order.items) {
                await this.inventoryService.consumeReservedStock({
                    productId: item.productId,
                    quantity: item.quantity
                }, tx);
            }
            const updateResult = await this.ordersRepository.tryUpdateStatus(orderId, client_1.OrderStatus.PENDING, client_1.OrderStatus.CONFIRMED, tx);
            if (updateResult.count === 0) {
                throw new common_1.BadRequestException('Order status has already changed.');
            }
            await this.outboxService.createEvent({
                eventType: outbox_constants_1.OutboxEventTypes.ORDER_CONFIRMED,
                payload: {
                    orderId: order.id,
                    userId: order.userId
                }
            }, tx);
            return this.ordersRepository.findById(orderId, tx);
        });
        if (!confirmedOrder) {
            throw new common_1.NotFoundException('Order not found');
        }
        return confirmedOrder;
    }
    async cancel(orderId, actor) {
        return this.prismaService.$transaction(async (tx) => {
            const order = await this.ordersRepository.findById(orderId, tx);
            if (!order) {
                throw new common_1.NotFoundException(`Order with id ${orderId} was not found.`);
            }
            const isAdmin = actor.role === client_1.UserRole.ADMIN;
            const isOwner = order.userId === actor.userId;
            if (!isAdmin && !isOwner) {
                throw new common_1.ForbiddenException('You cannot cancel this order.');
            }
            if (order.status !== client_1.OrderStatus.PENDING) {
                throw new common_1.BadRequestException(`Order with id ${orderId} cannot be cancelled because it is not in PENDING status.`);
            }
            for (const item of order.items) {
                await this.inventoryService.releaseReservedStock({
                    productId: item.productId,
                    quantity: item.quantity
                }, tx);
            }
            const updateResult = await this.ordersRepository.tryUpdateStatus(orderId, client_1.OrderStatus.PENDING, client_1.OrderStatus.CANCELLED, tx);
            if (updateResult.count === 0) {
                throw new common_1.BadRequestException('Order status has already changed.');
            }
            return this.ordersRepository.findById(orderId, tx);
        });
    }
    findById(id) {
        const order = this.ordersRepository.findById(id);
        if (!order) {
            throw new common_1.NotFoundException(`Order with id ${id} was not found.`);
        }
        return order;
    }
    findByUserId(userId) {
        return this.ordersRepository.findByUserId(userId);
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        product_service_1.ProductService,
        inventory_service_1.InventoryService,
        prisma_service_1.PrismaService,
        idempotency_service_1.IdempotencyService,
        outbox_service_1.OutboxService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map