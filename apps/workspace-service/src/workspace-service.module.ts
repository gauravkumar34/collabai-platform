import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '@app/database';
import { KafkaModule } from '@app/common/kafka';
import { WorkspaceController } from './workspace/workspace.controller';
import { WorkspaceService } from './workspace/workspace.service';
import { WorkspaceRepository } from './workspace/repositories/workspace.repository';
import { WorkspaceMemberRepository } from './workspace/repositories/workspace-member.repository';
import { UserEventsConsumer } from './workspace/consumers/user-events.consumer';
import { JwtAccessStrategy } from './auth/jwt-access.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    KafkaModule.forRoot(),
    PassportModule,
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    WorkspaceRepository,
    WorkspaceMemberRepository,
    JwtAccessStrategy,
    UserEventsConsumer,
  ],
})
export class WorkspaceServiceModule {}
