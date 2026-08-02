"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async register(data) {
        const existingUser = await this.usersService.findByEmail(data.email);
        if (existingUser) {
            throw new common_1.ConflictException(`User with email ${data.email} already exists.`);
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        return this.usersService.create({
            email: data.email,
            passwordHash
        });
    }
    async validateCredentials(data) {
        const user = await this.usersService.findByEmail(data.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
        if (!isValidPassword) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        return user;
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_SECRET
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token.');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user.refreshTokenHash) {
            throw new common_1.UnauthorizedException('Invalid refresh token.');
        }
        const isValidRefreshToken = await this.compareRefreshToken(refreshToken, user.refreshTokenHash);
        if (!isValidRefreshToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token.');
        }
        const tokens = await this.generateTokens(user);
        const refreshTokenHash = await this.hashRefreshToken(tokens.refreshToken);
        await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);
        return tokens;
    }
    async login(data) {
        const user = await this.validateCredentials(data);
        const tokens = await this.generateTokens(user);
        const refreshTokenHash = await this.hashRefreshToken(tokens.refreshToken);
        await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);
        return tokens;
    }
    async logout(userId) {
        await this.usersService.updateRefreshTokenHash(userId, null);
        return {
            message: 'Logged out successfully.'
        };
    }
    getJwtSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined.');
        }
        return secret;
    }
    async generateTokens(user) {
        const secret = this.getJwtSecret();
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role
        };
        const accessToken = await this.jwtService.signAsync({
            ...payload,
            jti: (0, crypto_1.randomUUID)()
        }, {
            secret,
            expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m')
        });
        const refreshToken = await this.jwtService.signAsync({
            ...payload,
            jti: (0, crypto_1.randomUUID)()
        }, {
            secret,
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d')
        });
        return {
            accessToken,
            refreshToken
        };
    }
    async hashRefreshToken(refreshToken) {
        const digest = this.digestRefreshToken(refreshToken);
        return bcrypt.hash(digest, 10);
    }
    async compareRefreshToken(refreshToken, storedRefreshTokenHash) {
        const digest = this.digestRefreshToken(refreshToken);
        return bcrypt.compare(digest, storedRefreshTokenHash);
    }
    digestRefreshToken(refreshToken) {
        return (0, crypto_1.createHash)('sha256').update(refreshToken).digest('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map