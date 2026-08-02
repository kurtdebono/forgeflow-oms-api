import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    create(body: CreateInventoryDto): Promise<{
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
            price: import("@prisma/client/runtime/client").Decimal;
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
}
