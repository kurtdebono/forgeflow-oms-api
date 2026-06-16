import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {

    }

    @Post()
    create(@Body() body: CreateOrderDto) {        
        return this.ordersService.create(body);
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.ordersService.findById(id);
    }

    @Get('user/:userId')
    findByUserId(@Param('userId') userId: string) {
        return this.ordersService.findByUserId(userId);
    }
}