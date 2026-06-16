import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';

import { InventoryService } from '../inventory/inventory.service';
import { ProductService } from '../products/product.service';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly productService: ProductService,
        private readonly inventoryService: InventoryService
    ) {}

    async create(data: CreateOrderDto) {
        const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

        for (const item of data.items) {
            const product = await this.productService.findById(item.productId);

            await this.inventoryService.reserveStock({
                productId: item.productId,
                quantity: item.quantity
            });

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

        const totalAmount = orderItems.reduce((total, item) => {
            return total + Number(item.unitPrice) * item.quantity;
        }, 0);

        const orderCreateInput: Prisma.OrderCreateInput = {
            user: {
                connect: {
                    id: data.userId
                }
            },
            totalAmount,
            items: {
                create: orderItems
            }
        };

        return this.ordersRepository.create(orderCreateInput);
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