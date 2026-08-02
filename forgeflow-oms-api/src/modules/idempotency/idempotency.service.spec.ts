import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdempotencyStatus } from '@prisma/client';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';

type IdempotencyRepositoryMock = jest.Mocked<
  Pick<
    IdempotencyRepository,
    'findByUserOperationAndKey' | 'tryCreateInProgress' | 'markCompleted'
  >
>;

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let repositoryMock: IdempotencyRepositoryMock;

  beforeEach(async () => {
    repositoryMock = {
      findByUserOperationAndKey: jest.fn(),
      tryCreateInProgress: jest.fn(),
      markCompleted: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: IdempotencyRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(IdempotencyService);
  });

  it('creates the same request hash for the same data', () => {
    const data = {
      items: [
        {
          productId: 'product-1',
          quantity: 2,
        },
      ],
    };

    const hash1 = service.createRequestHash(data);
    const hash2 = service.createRequestHash(data);

    expect(hash1).toBe(hash2);
  });

  it('returns exists false when no idempotency record exists', async () => {
    repositoryMock.findByUserOperationAndKey.mockResolvedValue(null);

    const result = await service.checkExisting({
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'hash-1',
    });

    expect(result).toEqual({
      exists: false,
    });
  });

  it('throws ConflicException when same key is used with different request body', async () => {
    repositoryMock.findByUserOperationAndKey.mockResolvedValue({
      id: 'record-1',
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'different-hash',
      status: IdempotencyStatus.COMPLETED,
      orderId: 'order-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.checkExisting({
        userId: 'user-1',
        operation: 'CREATE_ORDER',
        key: 'key-1',
        requestHash: 'hash-1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when matching record is still in progress', async () => {
    repositoryMock.findByUserOperationAndKey.mockResolvedValue({
      id: 'record-1',
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'different-hash',
      status: IdempotencyStatus.IN_PROGRESS,
      orderId: 'order-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.checkExisting({
        userId: 'user-1',
        operation: 'CREATE_ORDER',
        key: 'key-1',
        requestHash: 'hash-1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('returns existing orderId when matching completed record exists', async () => {
    repositoryMock.findByUserOperationAndKey.mockResolvedValue({
      id: 'record-1',
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'hash-1',
      status: IdempotencyStatus.COMPLETED,
      orderId: 'order-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.checkExisting({
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'hash-1',
    });

    expect(result).toEqual({
      exists: true,
      orderId: 'order-1',
    });
  });

  it('throws InternalServerErrorException when completed record has no orderId', async () => {
    repositoryMock.findByUserOperationAndKey.mockResolvedValue({
      id: 'record-1',
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'hash-1',
      status: IdempotencyStatus.COMPLETED,
      orderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.checkExisting({
        userId: 'user-1',
        operation: 'CREATE_ORDER',
        key: 'key-1',
        requestHash: 'hash-1',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('returns claimed true when repository creates idempotency record', async () => {
    repositoryMock.tryCreateInProgress.mockResolvedValue({
      created: true,
      record: {
        id: 'record-1',
        userId: 'user-1',
        operation: 'CREAATE_ORDER',
        key: 'key-1',
        requestHash: 'hash-1',
        status: IdempotencyStatus.IN_PROGRESS,
        orderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const result = await service.claim({
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'hash-1',
      tx: {} as never,
    });

    expect(result).toEqual({
      claimed: true,
      recordId: 'record-1',
    });
  });

  it('returns claimed fales when repository reports duplicate key', async () => {
    repositoryMock.tryCreateInProgress.mockResolvedValue({
      created: false,
      reason: 'DUPLICATE_KEY',
    });

    const result = await service.claim({
      userId: 'user-1',
      operation: 'CREATE_ORDER',
      key: 'key-1',
      requestHash: 'hash-1',
      tx: {} as never,
    });

    expect(result).toEqual({
      claimed: false,
      reason: 'DUPLICATE_KEY',
    });
  });

  it('marks idempotency record as completed', async () => {
    repositoryMock.markCompleted.mockResolvedValue({} as never);

    await service.complete({
      recordId: 'record-1',
      orderId: 'order-1',
      tx: {} as never,
    });

    expect(repositoryMock.markCompleted).toHaveBeenCalledWith(
      'record-1',
      'order-1',
      {},
    );
  });
});
