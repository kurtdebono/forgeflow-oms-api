import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';

import { InventoryService } from '../inventory/inventory.service';
import { ProductService } from '../products/product.service';
import { OrdersRepository } from './orders.repository';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OrderNotificationsProducer } from '../notifications/order-notifications.producer';

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly productService: ProductService,
        private readonly inventoryService: InventoryService,
        private readonly prismaService: PrismaService,
        private readonly orderNotificationsProducer: OrderNotificationsProducer
    ) {}

    async create(userId: string, data: CreateOrderDto) {
        return this.prismaService.$transaction(async (tx) => {
            const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

            let totalAmount = new Prisma.Decimal(0);

            for (const item of data.items) {
                const product:any = await this.productService.findById(item.productId, tx);

                if(!product.isActive) {
                    throw new BadRequestException(`Product with id ${item.productId} is not active.`);
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

            const orderCreateInput: Prisma.OrderCreateInput = {
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
        });        
    }

    async confirm(orderId: string) {
        const confirmedOrder: any = await this.prismaService.$transaction(async (tx) => {            
            const order = await this.ordersRepository.findById(orderId, tx);
            
            if (!order) {
                throw new NotFoundException(`Order with id ${orderId} was not found.`);
            }

            if (order.status !== OrderStatus.PENDING) {
                throw new BadRequestException(`Order with id ${orderId} cannot be confirmed because it is not in PENDING status.`);
            }

            for (const item of order.items) {
                await this.inventoryService.consumeReservedStock(
                    {
                        productId: item.productId,
                        quantity: item.quantity
                    },
                    tx
                );
            }

            const updateResult = await this.ordersRepository.tryUpdateStatus(
                orderId,
                OrderStatus.PENDING,
                OrderStatus.CONFIRMED,
                tx
            );

            if (updateResult.count === 0) {
                throw new BadRequestException('Order status has already changed.');
            }

            return this.ordersRepository.findById(orderId, tx);
        });

        if(!confirmedOrder) {
            throw new NotFoundException('Order not found');
        }

        await this.orderNotificationsProducer.enqueueOrderConfirmedNotification({
            orderId: confirmedOrder.id,
            userId: confirmedOrder.userId
        });

        return confirmedOrder;
    }

    async cancel(
        orderId: string,
        actor: {
            userId: string;
            role: UserRole;
        }
    ) {
        return this.prismaService.$transaction(async (tx) => {
            const order = await this.ordersRepository.findById(orderId, tx);

            if (!order) {
                throw new NotFoundException(`Order with id ${orderId} was not found.`);
            }

            const isAdmin = actor.role === UserRole.ADMIN;
            const isOwner = order.userId === actor.userId;

            if (!isAdmin && !isOwner) {
                throw new ForbiddenException('You cannot cancel this order.');
            }

            if (order.status !== OrderStatus.PENDING) {
                throw new BadRequestException(`Order with id ${orderId} cannot be cancelled because it is not in PENDING status.`);
            }

            for (const item of order.items) {
                await this.inventoryService.releaseReservedStock(
                    {
                        productId: item.productId,
                        quantity: item.quantity
                    },
                    tx
                );
            }

            const updateResult = await this.ordersRepository.tryUpdateStatus(
                orderId,
                OrderStatus.PENDING,
                OrderStatus.CANCELLED,
                tx
            );

            if (updateResult.count === 0) {
                throw new BadRequestException('Order status has already changed.');
            }

            return this.ordersRepository.findById(orderId, tx);
        });
    }

    findById(id: string) {
        const order = this.ordersRepository.findById(id);

        if (!order) {
            throw new NotFoundException(`Order with id ${id} was not found.`);
        }

        return order;
    }

    findByUserId(userId: string) {
        return this.ordersRepository.findByUserId(userId);
    }
}