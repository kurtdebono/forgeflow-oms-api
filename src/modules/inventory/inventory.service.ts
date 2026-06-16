import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { ProductService } from '../products/product.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
    constructor(
        private readonly inventoryRepository: InventoryRepository,
        private readonly productService: ProductService
    ) {
        
    }

    async create(data: CreateInventoryDto) {
        await this.productService.findById(data.productId);

        return this.inventoryRepository.create(data);
    }

    async findByProductId(productId: string) {
        const inventory = await this.inventoryRepository.findByProductId(productId);

        if (!inventory) {
            throw new NotFoundException(`Inventory for product with id ${productId} not found`);
        }

        return inventory;
    }

    async reserveStock(data: ReserveStockDto) {
        const result = await this.inventoryRepository.reserveStock(
            data.productId,
            data.quantity
        );

        if (result.count === 0) {
            throw new BadRequestException(`Not enough stock available for product with id ${data.productId}`);
        }

        return this.findByProductId(data.productId);
    }
}