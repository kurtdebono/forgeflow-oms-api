import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';


@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {

    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(
        @CurrentUser() user: CurrentUser,
        @Body() body: CreateOrderDto) {        
        return this.ordersService.create(user.userId, body);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my')
    findMyOrders(@CurrentUser() user: CurrentUser) {
        return this.ordersService.findByUserId(user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findById(@Param('id') id: string) {
        return this.ordersService.findById(id);
    }

    @Get('user/:userId')
    findByUserId(@Param('userId') userId: string) {
        return this.ordersService.findByUserId(userId);
    }
}