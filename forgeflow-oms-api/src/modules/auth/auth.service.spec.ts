import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;

  const userId = '430f9430-475e-408f-a7f7-3efa9688be7f';

  type UsersServiceMock = jest.Mocked<
    Pick<
      UsersService,
      'findByEmail' | 'findById' | 'create' | 'updateRefreshTokenHash'
    >
  >;

  let storedRefreshTokenHash: string | null = null;
  const usersServiceMock: UsersServiceMock = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
  };

  const baseUser = {
    id: userId,
    email: 'testemail@example.com',
    passwordHash: '',
    refreshTokenHash: null as string | null,
    role: UserRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    storedRefreshTokenHash = null;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        JwtService,
      ],
    }).compile();

    authService = moduleRef.get(AuthService);

    usersServiceMock.updateRefreshTokenHash.mockImplementation(
      (id: string, refreshTokenHash: string | null) => {
        storedRefreshTokenHash = refreshTokenHash;

        return Promise.resolve({
          ...baseUser,
          id,
          refreshTokenHash: storedRefreshTokenHash,
        });
      },
    );

    usersServiceMock.findById.mockImplementation((id: string) => {
      return Promise.resolve({
        ...baseUser,
        id,
        refreshTokenHash: storedRefreshTokenHash,
      });
    });
  });

  it('registers a new user and returns public user data only', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(null);

    const createdAt = new Date(),
      updatedAt = new Date();

    usersServiceMock.create.mockResolvedValue({
      id: userId,
      email: 'testemail@example.com',
      role: UserRole.CUSTOMER,
      createdAt: createdAt,
      updatedAt: updatedAt,
    });

    const result = await authService.register({
      email: 'testemail@example.com',
      password: 'testpassword',
    });

    expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
      'testemail@example.com',
    );

    const createCall = usersServiceMock.create.mock.calls[0];

    if (!createCall) {
      throw new Error('Expected usersService.create to be called.');
    }

    const createCallInput = createCall[0];

    expect(createCallInput.email).toBe('testemail@example.com');
    expect(typeof createCallInput.passwordHash).toBe('string');
    expect(createCallInput.passwordHash.length).toBeGreaterThan(0);

    expect(result).toEqual(
      expect.objectContaining({
        id: userId,
        email: 'testemail@example.com',
        role: UserRole.CUSTOMER,
        createdAt: createdAt,
        updatedAt: updatedAt,
      }),
    );

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('refreshTokenHash');
  });

  it('does not register a user iuf the email already exists', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(baseUser);

    await expect(
      authService.register({
        email: 'testemail@example.com',
        password: 'testpassword',
      }),
    ).rejects.toThrow(ConflictException);

    expect(usersServiceMock.create).not.toHaveBeenCalled();
  });

  it('logs in and stores a refresh token hash', async () => {
    const passwordHash = await bcrypt.hash('testpassword', 10);

    usersServiceMock.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash,
      refreshTokenHash: null,
    });

    const result = await authService.login({
      email: 'testemail@example.com',
      password: 'testpassword',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    expect(usersServiceMock.updateRefreshTokenHash).toHaveBeenCalledTimes(1);
  });

  it('rotates refresh tokens and rejects the old refresh token', async () => {
    const passwordHash = await bcrypt.hash('testpassword', 10);

    usersServiceMock.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash,
      refreshTokenHash: null,
    });

    const loginResult = await authService.login({
      email: 'testemail@example.com',
      password: 'testpassword',
    });

    const oldRefreshToken = loginResult.refreshToken;

    const refreshResult = await authService.refresh(oldRefreshToken);

    const newRefreshToken = refreshResult.refreshToken;

    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toEqual(oldRefreshToken);

    await expect(authService.refresh(oldRefreshToken)).rejects.toThrow(
      UnauthorizedException,
    );

    const secondRefreshResult = await authService.refresh(newRefreshToken);

    expect(typeof secondRefreshResult.accessToken).toBe('string');
    expect(secondRefreshResult.accessToken.length).toBeGreaterThan(0);

    expect(typeof secondRefreshResult.refreshToken).toBe('string');
    expect(secondRefreshResult.refreshToken.length).toBeGreaterThan(0);
    expect(secondRefreshResult.refreshToken).not.toEqual(newRefreshToken);
  });

  it('does not allow refresh after logout', async () => {
    const passwordHash = await bcrypt.hash('testpassword', 10);

    usersServiceMock.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash,
      refreshTokenHash: null,
    });

    const loginResult = await authService.login({
      email: 'testemail@example.com',
      password: 'testpassword',
    });

    await authService.logout(userId);

    expect(storedRefreshTokenHash).toBeNull();

    await expect(authService.refresh(loginResult.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
