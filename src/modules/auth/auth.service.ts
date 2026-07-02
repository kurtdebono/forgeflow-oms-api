import {
    ConflictException,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ) {}

    async register(data: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(data.email);

        if (existingUser) {
            throw new ConflictException(`User with email ${data.email} already exists.`);
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        return this.usersService.create({
            email: data.email,
            passwordHash
        });
    }

    async validateCredentials(data: LoginDto) {
        const user = await this.usersService.findByEmail(data.email);

        if(!user) {
            throw new UnauthorizedException('Invalid credentials.');
        }

        const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

        if(!isValidPassword) {
            throw new UnauthorizedException('Invalid credentials.');
        }

        return user;
    }

    async refresh(refreshToken: string) {
        let payload: {
            sub: string;
            email: string;
            role: string;
            jti: string;
        }
        
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_SECRET
            });
        }
        catch {
            throw new UnauthorizedException('Invalid refresh token.');
        }

        const user = await this.usersService.findById(payload.sub);

        if(!user.refreshTokenHash) {
            throw new UnauthorizedException('Invalid refresh token.');
        }

        const isValidRefreshToken = await this.compareRefreshToken(refreshToken, user.refreshTokenHash);

        if(!isValidRefreshToken) {
            throw new UnauthorizedException('Invalid refresh token.');
        }

        const tokens = await this.generateTokens(user);

        const refreshTokenHash = await this.hashRefreshToken(tokens.refreshToken);

        await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);

        return tokens;
    }

    async login(data: LoginDto) {
        const user = await this.validateCredentials(data);

        const tokens = await this.generateTokens(user);
        
        const refreshTokenHash = await this.hashRefreshToken(tokens.refreshToken);

        await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);

        return tokens;
    }

    private async generateTokens(user: {
        id: string;
        email: string;
        role: string;
    }) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role
        };

        const accessToken = await this.jwtService.signAsync({
            ...payload,
            jti: randomUUID()
        }, {
            expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any
        });

        const refreshToken = await this.jwtService.signAsync({
            ...payload,
            jti: randomUUID()
        }, {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any
        });

        return {
            accessToken,
            refreshToken
        }
    }

    private async hashRefreshToken(refreshToken: string): Promise<string> {
        const digest = this.digestRefreshToken(refreshToken);

        return bcrypt.hash(digest, 10);
    }

    private async compareRefreshToken(refreshToken: string, storedRefreshTokenHash: string): Promise<boolean> {
        const digest = this.digestRefreshToken(refreshToken);

        return bcrypt.compare(digest, storedRefreshTokenHash);
    }

    private digestRefreshToken(refreshToken: string): string {
        return createHash('sha256').update(refreshToken).digest('hex');
    }
}