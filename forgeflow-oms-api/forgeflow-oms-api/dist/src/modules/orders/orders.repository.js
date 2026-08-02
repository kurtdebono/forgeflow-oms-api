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
exports.OrdersRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const user_select_1 = require("../users/selects/user.select");
let OrdersRepository = class OrdersRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    get() {
        return this.prisma.order.findMany({
            include: {
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    create(data, tx = this.prisma) {
        return tx.order.create({
            data,
            include: {
                user: {
                    select: user_select_1.publicUserSelect
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }
    findById(id, tx = this.prisma) {
        return tx.order.findUnique({
            where: { id },
            include: {
                user: {
                    select: user_select_1.publicUserSelect
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }
    findByUserId(userId) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: user_select_1.publicUserSelect
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }
    tryUpdateStatus(id, currentStatus, nextStatus, tx = this.prisma) {
        return tx.order.updateMany({
            where: {
                id,
                status: currentStatus
            },
            data: {
                status: nextStatus
            }
        });
    }
};
exports.OrdersRepository = OrdersRepository;
exports.OrdersRepository = OrdersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersRepository);
//# sourceMappingURL=orders.repository.js.map