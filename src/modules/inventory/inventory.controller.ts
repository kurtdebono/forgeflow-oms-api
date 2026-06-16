import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {
    
    }

    @Post()
    create(@Body() body: CreateInventoryDto) {
        debugger;
        return this.inventoryService.create(body);
    }

    @Get(':productId')
    findByProductId(@Param('productId') productId: string) {
        return this.inventoryService.findByProductId(productId);
    }

    @Post('reserve')
    reserveStock(@Body() body: ReserveStockDto) {
        return this.inventoryService.reserveStock(body);
    }
}    