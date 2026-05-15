import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxRepository } from './outbox.repository';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class OutboxRelayService implements OnModuleInit {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly producer: KafkaProducerService,
  ) {}

  onModuleInit() {
    this.logger.log('Outbox relay started');
  }

  @Interval(2000) // every 2 seconds
  async relay() {
    const pending = await this.outboxRepo.findPending(50);
    if (pending.length === 0) return;

    for (const event of pending) {
      try {
        await this.producer.publish(
          event.topic,
          event.payload,
          event.eventType,
          { key: event.aggregateId },
        );
        await this.outboxRepo.markPublished(event.id);
      } catch (err) {
        this.logger.error(`Failed to publish ${event.id}: ${err.message}`);
        await this.outboxRepo.markFailed(event.id, event.attempts);
      }
    }
  }
}
