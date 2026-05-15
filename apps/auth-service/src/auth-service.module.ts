import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from './auth/auth.module';
import { KafkaModule } from '@app/common/kafka';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    KafkaModule.forRoot(), // ← add this
    AuthModule,
    ScheduleModule.forRoot(),
  ],
})
export class AuthServiceModule {}
