import { NestFactory } from '@nestjs/core';
import { WorkspaceServiceModule } from './workspace-service.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkspaceServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
