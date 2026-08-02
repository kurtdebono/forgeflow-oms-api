import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        stores: [
          new Keyv({
            store: new KeyvRedis(
              process.env.REDIS_URL ?? 'redis://localhost:6379',
            ),
          }),
        ],
      }),
    }),
  ],
})
export class AppCacheModule {}
