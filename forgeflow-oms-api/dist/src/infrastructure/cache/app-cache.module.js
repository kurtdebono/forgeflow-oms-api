"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppCacheModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const redis_1 = __importDefault(require("@keyv/redis"));
const keyv_1 = require("keyv");
let AppCacheModule = class AppCacheModule {
};
exports.AppCacheModule = AppCacheModule;
exports.AppCacheModule = AppCacheModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                useFactory: async () => ({
                    stores: [
                        new keyv_1.Keyv({
                            store: new redis_1.default(process.env.REDIS_URL ?? 'redis://localhost:6379')
                        })
                    ]
                })
            })
        ]
    })
], AppCacheModule);
//# sourceMappingURL=app-cache.module.js.map