import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Product, UserRole } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';

import { InventoryService } from '../inventory/inventory.service';
import { ProductService } from '../products/product.service';
import { OrdersRepository, OrderWithDetails } from './orders.repository';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { IdempotencyOperations } from '../idempotency/idempotency.constants';
import { OutboxService } from '../outbox/outbox.service';
import { OutboxEventTypes } from '../outbox/outbox.constants';
import { PageRequest, Paginated, toPage } from './pagination';

type OrderActor = {
  userId: string;
  role: UserRole;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly productService: ProductService,
    private readonly inventoryService: InventoryService,
    private readonly prismaService: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly outboxService: OutboxService,
  ) {}

  private async createOrderInsideTransaction(
    userId: string,
    data: CreateOrderDto,
    tx: Prisma.TransactionClient,
  ) {
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    let totalAmount = new Prisma.Decimal(0);

    for (const item of data.items) {
      const product: Product = await this.productService.findById(
        item.productId,
        tx,
      );

      if (!product.isActive) {
        throw new BadRequestException(
          `Product with id ${item.productId} is not active.`,
        );
      }

      await this.inventoryService.reserveStock(
        {
          productId: item.productId,
          quantity: item.quantity,
        },
        tx,
      );

      const lineTotal = product.price.mul(item.quantity);

      totalAmount = totalAmount.add(lineTotal);

      orderItems.push({
        product: {
          connect: {
            id: product.id,
          },
        },
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const orderCreateInput: Prisma.OrderCreateInput = {
      user: {
        connect: {
          id: userId,
        },
      },
      status: 'PENDING',
      totalAmount,
      items: {
        create: orderItems,
      },
    };

    return this.ordersRepository.create(orderCreateInput, tx);
  }

  async get(pageRequest: PageRequest): Promise<Paginated<OrderWithDetails>> {
    const { items, total } = await this.ordersRepository.findPage(
      {},
      pageRequest,
    );
    return toPage(items, total, pageRequest);
  }

  async create(userId: string, data: CreateOrderDto, idempotencyKey: string) {
    const operation = IdempotencyOperations.CREATE_ORDER;

    const requestHash = this.idempotencyService.createRequestHash({
      item: data.items,
    });

    const existResult = await this.idempotencyService.checkExisting({
      userId,
      operation,
      key: idempotencyKey,
      requestHash,
    });

    if (existResult.exists) {
      const existingOrder = await this.ordersRepository.findById(
        existResult.orderId,
      );

      if (!existingOrder) {
        throw new InternalServerErrorException(
          'Idempotency record points to an order that no longer exists.',
        );
      }

      return existingOrder;
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      const claim = await this.idempotencyService.claim({
        userId,
        operation,
        key: idempotencyKey,
        requestHash,
        tx,
      });

      if (!claim.claimed) {
        return {
          duplicate: true as const,
        };
      }

      const order = await this.createOrderInsideTransaction(userId, data, tx);

      await this.idempotencyService.complete({
        recordId: claim.recordId,
        orderId: order.id,
        tx,
      });

      return {
        deuplicate: false as const,
        order,
      };
    });

    if (result.duplicate) {
      const existingAfterRace = await this.idempotencyService.checkExisting({
        userId,
        operation,
        key: idempotencyKey,
        requestHash,
      });

      if (existingAfterRace.exists) {
        const existingOrder = await this.ordersRepository.findById(
          existingAfterRace.orderId,
        );

        if (!existingOrder) {
          throw new InternalServerErrorException(
            'Idempotency record points to an order that no longer exists.',
          );
        }

        return existingOrder;
      }

      throw new ConflictException(
        'A request with this idempotency key is already in progress.',
      );
    }

    return result.order;
  }

  async confirm(orderId: string): Promise<OrderWithDetails> {
    const confirmedOrder = await this.prismaService.$transaction(async (tx) => {
      const order = await this.ordersRepository.findById(orderId, tx);

      if (!order) {
        throw new NotFoundException(`Order with id ${orderId} was not found.`);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Order with id ${orderId} cannot be confirmed because it is not in PENDING status.`,
        );
      }

      for (const item of order.items) {
        await this.inventoryService.consumeReservedStock(
          {
            productId: item.productId,
            quantity: item.quantity,
          },
          tx,
        );
      }

      const updateResult = await this.ordersRepository.tryUpdateStatus(
        orderId,
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        tx,
      );

      if (updateResult.count === 0) {
        throw new BadRequestException('Order status has already changed.');
      }

      await this.outboxService.createEvent(
        {
          eventType: OutboxEventTypes.ORDER_CONFIRMED,
          payload: {
            orderId: order.id,
            userId: order.userId,
          },
        },
        tx,
      );

      return this.ordersRepository.findById(orderId, tx);
    });

    if (!confirmedOrder) {
      throw new NotFoundException('Order not found');
    }

    return confirmedOrder;
  }

  async cancel(
    orderId: string,
    actor: {
      userId: string;
      role: UserRole;
    },
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const order = await this.ordersRepository.findById(orderId, tx);

      if (!order) {
        throw new NotFoundException(`Order with id ${orderId} was not found.`);
      }

      const isAdmin = actor.role === UserRole.ADMIN;
      const isOwner = order.userId === actor.userId;

      if (!isAdmin && !isOwner) {
        throw new ForbiddenException('You cannot cancel this order.');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Order with id ${orderId} cannot be cancelled because it is not in PENDING status.`,
        );
      }

      for (const item of order.items) {
        await this.inventoryService.releaseReservedStock(
          {
            productId: item.productId,
            quantity: item.quantity,
          },
          tx,
        );
      }

      const updateResult = await this.ordersRepository.tryUpdateStatus(
        orderId,
        OrderStatus.PENDING,
        OrderStatus.CANCELLED,
        tx,
      );

      if (updateResult.count === 0) {
        throw new BadRequestException('Order status has already changed.');
      }

      return this.ordersRepository.findById(orderId, tx);
    });
  }

  async findById(id: string) {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order with id ${id} was not found.`);
    }

    return order;
  }

  async findByIdForActor(
    id: string,
    actor: OrderActor,
  ): Promise<OrderWithDetails> {
    const order = await this.findById(id);

    if (!this.canReadOrdersOf(order.userId, actor)) {
      throw new ForbiddenException('You cannot view this order.');
    }

    return order;
  }

  async findByUserId(
    userId: string,
    pageRequest: PageRequest,
  ): Promise<Paginated<OrderWithDetails>> {
    const { items, total } = await this.ordersRepository.findPage(
      { userId },
      pageRequest,
    );
    return toPage(items, total, pageRequest);
  }

  async findByUserIdForActor(
    userId: string,
    actor: OrderActor,
    pageRequest: PageRequest,
  ): Promise<Paginated<OrderWithDetails>> {
    // Checked before loading so a customer learns nothing about another user's orders.
    if (!this.canReadOrdersOf(userId, actor)) {
      throw new ForbiddenException('You cannot view orders of another user.');
    }

    return this.findByUserId(userId, pageRequest);
  }

  private canReadOrdersOf(ownerUserId: string, actor: OrderActor): boolean {
    return actor.role === UserRole.ADMIN || actor.userId === ownerUserId;
  }
}
