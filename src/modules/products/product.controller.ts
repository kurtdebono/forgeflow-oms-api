import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {
        
    }

    @Get()
    get() {
        return this.productService.get();
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.productService.findById(id);
    }

    @Post()
    create(@Body() body: CreateProductDto) {
        return this.productService.create(body);
    }
}