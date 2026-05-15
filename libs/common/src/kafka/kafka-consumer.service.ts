import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { BaseEvent } from '../events/base-event.interface';

export type EventHandler<T = unknown> = (event: BaseEvent<T>) => Promise<void>;

@Injectable()
export abstract class KafkaConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(this.constructor.name);
  protected kafka: Kafka;
  protected consumer: Consumer;
  protected handlers = new Map<string, EventHandler<any>>();

  abstract get groupId(): string;
  abstract get topics(): string[];
  abstract registerHandlers(): void;

  constructor(@Inject('KAFKA_BROKERS') private readonly brokers: string[]) {}

  async onModuleInit() {
    this.kafka = new Kafka({
      clientId: `${this.groupId}-client`,
      brokers: this.brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 30000,
    });

    this.registerHandlers();

    await this.consumer.connect();
    for (const topic of this.topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: (payload) => this.handleMessage(payload),
    });

    this.logger.log(
      `Consumer ${this.groupId} subscribed to: ${this.topics.join(', ')}`,
    );
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect();
  }

  protected on<T>(eventType: string, handler: EventHandler<T>) {
    this.handlers.set(eventType, handler);
  }

  private async handleMessage({
    topic,
    partition,
    message,
  }: EachMessagePayload) {
    // Kafka tombstone messages have a null value — skip them
    if (!message.value) {
      this.logger.debug(`Skipping tombstone message on ${topic}[${partition}]`);
      return;
    }

    try {
      const event: BaseEvent = JSON.parse(
        message.value.toString(),
      ) as BaseEvent;
      const handler = this.handlers.get(event.eventType);

      if (!handler) {
        this.logger.warn(`No handler for ${event.eventType}, skipping`);
        return;
      }

      this.logger.debug(`📥 ${event.eventType} (${event.eventId})`);
      await handler(event);
    } catch (err) {
      const message_ = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Failed to process message from ${topic}[${partition}]: ${message_}`,
        stack,
      );
      // Do NOT re-throw — throwing inside eachMessage crashes the entire consumer.
      // Phase 9 will route failed messages to a Dead Letter Queue instead.
    }
  }
}
