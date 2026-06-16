import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {
    
    }

    create(data: CreateInventoryDto) {
        return this.prisma.inventory.create({
            data
        });
    }

    findByProductId(productId: string) {
        return this.prisma.inventory.findUnique({
            where: { productId },
            include: { product: true }
        });
    }

    reserveStock(productId: string, quantity: number) {
        return this.prisma.inventory.updateMany({
            where: {
                productId,
                availableQuantity: {
                    gte: quantity
                }
            },
            data: {
                availableQuantity: {
                    decrement: quantity
                },
                reservedQuantity: {
                    increment: quantity
                }
            }
        });
    }
}