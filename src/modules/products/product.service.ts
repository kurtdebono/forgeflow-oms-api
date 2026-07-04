import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductRepository } from './product.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
    constructor(private readonly productRepository: ProductRepository) {

    }

    get() {
        return this.productRepository.get();
    }

    async findById(id: string, tx?: Prisma.TransactionClient) {
        const product = await this.productRepository.findById(id, tx);

        if (!product) {
            throw new NotFoundException(`Product with id ${id} not found`);
        }

        return product;
    }

    create(data: CreateProductDto) {
        return this.productRepository.create(data);
    }
}