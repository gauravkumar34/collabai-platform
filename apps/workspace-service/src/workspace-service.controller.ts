import { Controller, Get } from '@nestjs/common';
import { WorkspaceServiceService } from './workspace-service.service';

@Controller()
export class WorkspaceServiceController {
  constructor(private readonly workspaceServiceService: WorkspaceServiceService) {}

  @Get()
  getHello(): string {
    return this.workspaceServiceService.getHello();
  }
}
