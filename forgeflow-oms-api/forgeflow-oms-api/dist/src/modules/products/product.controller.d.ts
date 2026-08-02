import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    get(): Promise<{}>;
    findById(id: string): Promise<{}>;
    create(body: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: import("@prisma/client/runtime/client").Decimal;
        isActive: boolean;
    }>;
}
