import { NestFactory } from '@nestjs/core';
import { WorkspaceServiceModule } from './workspace-service.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkspaceServiceModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.WORKSPACE_SERVICE_PORT ?? 3002);
}
void bootstrap();
