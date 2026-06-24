import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

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

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post()
    create(@Body() body: CreateProductDto) {
        return this.productService.create(body);
    }
}