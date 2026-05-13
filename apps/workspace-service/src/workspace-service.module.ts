import { Module } from '@nestjs/common';
import { WorkspaceServiceController } from './workspace-service.controller';
import { WorkspaceServiceService } from './workspace-service.service';

@Module({
  imports: [],
  controllers: [WorkspaceServiceController],
  providers: [WorkspaceServiceService],
})
export class WorkspaceServiceModule {}
