import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { UserRole } from "@prisma/client";
import * as bcrypt from 'bcrypt';
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

describe('AuthService', () => {
    let authService: AuthService;

    const userId = '430f9430-475e-408f-a7f7-3efa9688be7f';

    let storedRefreshTokenHash: string | null = null;

    const baseUser = {
        id: userId,
        email: 'testemail@example.com',
        passwordHash: '',
        refreshTokenHash: null as string | null,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const usersServiceMock = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateRefreshTokenHash: jest.fn()
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
                    useValue: usersServiceMock
                },
                JwtService
            ]
        }).compile();

        authService = moduleRef.get(AuthService);

        usersServiceMock.updateRefreshTokenHash.mockImplementation(
            async (id: string, refreshTokenHash: string | null) => {
                storedRefreshTokenHash = refreshTokenHash;

                return {
                    ...baseUser,
                    refreshTokenHash
                };
            }
        );

        usersServiceMock.findById.mockImplementation(async (id: string) => {
            return {
                ...baseUser,
                refreshTokenHash: storedRefreshTokenHash
            };
        });
    });

    it('registers a new user and returns public user data only', async () => {
        usersServiceMock.findByEmail.mockResolvedValue(null);

        usersServiceMock.create.mockResolvedValue({
            id: userId,
            email: 'testemail@example.com',
            role: UserRole.CUSTOMER,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const result = await authService.register({
            email: 'testemail@example.com',
            password: 'testpassword'
        });

        expect(usersServiceMock.findByEmail).toHaveBeenCalledWith('testemail@example.com');

        expect(usersServiceMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'testemail@example.com',
                passwordHash: expect.any(String)
            })
        );

        expect(result).toEqual(
            expect.objectContaining({
                id: userId,
                email: 'testemail@example.com',
                role: UserRole.CUSTOMER,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );

        expect(result).not.toHaveProperty('passwordHash');
        expect(result).not.toHaveProperty('refreshTokenHash');
    });

    it('does not register a user iuf the email already exists', async () => {
        usersServiceMock.findByEmail.mockResolvedValue(baseUser);

        await expect(
            authService.register({
                email: 'testemail@example.com',
                password: 'testpassword'
            })
        ).rejects.toThrow(ConflictException);

        expect(usersServiceMock.create).not.toHaveBeenCalled();
    });

    it('logs in and stores a refresh token hash', async () => {
        const passwordHash = await bcrypt.hash('testpassword', 10);

        usersServiceMock.findByEmail.mockResolvedValue({
            ...baseUser,
            passwordHash,
            refreshTokenHash: null
        });

        const result = await authService.login({
            email: 'testemail@example.com',
            password: 'testpassword'
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
            refreshTokenHash: null
        });

        const loginResult = await authService.login({
            email: 'testemail@example.com',
            password: 'testpassword'
        });

        const oldRefreshToken = loginResult.refreshToken;

        const refreshResult = await authService.refresh(oldRefreshToken);

        const newRefreshToken = refreshResult.refreshToken;

        expect(newRefreshToken).toBeDefined();
        expect(newRefreshToken).not.toEqual(oldRefreshToken);
        
        await expect(authService.refresh(oldRefreshToken)).rejects.toThrow(
            UnauthorizedException
        );

        await expect(authService.refresh(newRefreshToken)).resolves.toEqual(
            expect.objectContaining({
                accessToken: expect.any(String),
                refreshToken: expect.any(String)
            })
        );
    });

    it('does not allow refresh after logout', async () => {
        const passwordHash = await bcrypt.hash('testpassword', 10);

        usersServiceMock.findByEmail.mockResolvedValue({
            ...baseUser,
            passwordHash,
            refreshTokenHash: null
        });

        const loginResult = await authService.login({
            email: 'testemail@example.com',
            password: 'testpassword'
        });

        await authService.logout(userId);

        expect(storedRefreshTokenHash).toBeNull();

        await expect(
            authService.refresh(loginResult.refreshToken),
        ).rejects.toThrow(UnauthorizedException);
    });
});