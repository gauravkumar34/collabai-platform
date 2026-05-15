import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPending(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markPublished(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async markFailed(id: string, currentAttempts: number) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: currentAttempts >= 5 ? 'FAILED' : 'PENDING',
        attempts: currentAttempts + 1,
      },
    });
  }
}
