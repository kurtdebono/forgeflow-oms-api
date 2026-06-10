import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
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

    findById(id: string) {
        return this.prisma.product.findUnique({
            where: {
                id
            }
        });
    }

    create(data: CreateProductDto) {
        return this.prisma.product.create({
            data
        });
    }
}