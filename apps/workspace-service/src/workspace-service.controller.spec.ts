import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceServiceController } from './workspace-service.controller';
import { WorkspaceServiceService } from './workspace-service.service';

describe('WorkspaceServiceController', () => {
  let workspaceServiceController: WorkspaceServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceServiceController],
      providers: [WorkspaceServiceService],
    }).compile();

    workspaceServiceController = app.get<WorkspaceServiceController>(WorkspaceServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(workspaceServiceController.getHello()).toBe('Hello World!');
    });
  });
});
