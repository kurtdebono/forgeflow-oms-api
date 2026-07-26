import { ProductService } from '../products/product.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryRepository } from './inventory.repository';
import { Prisma } from '@prisma/client';
export declare class InventoryService {
    private readonly inventoryRepository;
    private readonly productService;
    constructor(inventoryRepository: InventoryRepository, productService: ProductService);
    create(data: CreateInventoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        availableQuantity: number;
        reservedQuantity: number;
        productId: string;
    }>;
    findByProductId(productId: string): Promise<{
        product: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            price: Prisma.Decimal;
            isActive: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        availableQuantity: number;
        reservedQuantity: number;
        productId: string;
    }>;
    reserveStock(data: ReserveStockDto, tx?: Prisma.TransactionClient): Promise<{
        product: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            price: Prisma.Decimal;
            isActive: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        availableQuantity: number;
        reservedQuantity: number;
        productId: string;
    }>;
    consumeReservedStock(data: {
        productId: string;
        quantity: number;
    }, tx?: Prisma.TransactionClient): Promise<Prisma.BatchPayload>;
    releaseReservedStock(data: {
        productId: string;
        quantity: number;
    }, tx?: Prisma.TransactionClient): Promise<Prisma.BatchPayload>;
}
