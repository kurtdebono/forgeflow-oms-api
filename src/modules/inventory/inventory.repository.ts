import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';



@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {
        type PrismaClientOrTransaction = | Prisma.TransactionClient | typeof this.prisma;
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

    reserveStock(
        productId: string, 
        quantity: number,
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.inventory.updateMany({
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