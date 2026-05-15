import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { randomUUID } from 'crypto';
import { BaseEvent } from '../events/base-event.interface';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(@Inject('KAFKA_BROKERS') private readonly brokers: string[]) {}

  async onModuleInit() {
    this.kafka = new Kafka({
      clientId: process.env.SERVICE_NAME ?? 'collabai-service',
      brokers: this.brokers,
      retry: { retries: 5, initialRetryTime: 300 },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      idempotent: true, // dedup at broker level
    });

    await this.producer.connect();
    this.logger.log(`Kafka producer connected to ${this.brokers.join(',')}`);
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async publish<T>(
    topic: string,
    payload: T,
    eventType: string,
    options?: { key?: string; eventVersion?: number },
  ): Promise<void> {
    const event: BaseEvent<T> = {
      eventId: randomUUID(),
      eventType,
      eventVersion: options?.eventVersion ?? 1,
      occurredAt: new Date().toISOString(),
      payload,
    };

    await this.producer.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: [
        {
          key: options?.key, // same key → same partition → ordered
          value: JSON.stringify(event),
          headers: {
            eventType,
            eventId: event.eventId,
          },
        },
      ],
    });

    this.logger.debug(
      `📤 Published ${eventType} (${event.eventId}) to ${topic}`,
    );
  }
}
