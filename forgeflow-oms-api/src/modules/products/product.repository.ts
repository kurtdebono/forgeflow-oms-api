import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductRepository {
    constructor(private readonly prisma: PrismaService) {

    }

    get() {
        return this.prisma.product.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    findById(id: string, tx: Prisma.TransactionClient = this.prisma) {
        return tx.product.findUnique({
            where: {
                id
            }
        });
    }

    create(data: Prisma.ProductCreateInput) {
        return this.prisma.product.create({
            data
        });
    }
}