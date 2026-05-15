import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';

@Global()
@Module({})
export class KafkaModule {
  static forRoot(): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: 'KAFKA_BROKERS',
          useFactory: (config: ConfigService) =>
            (config.get<string>('KAFKA_BROKERS') ?? 'localhost:9092').split(
              ',',
            ),
          inject: [ConfigService],
        },
        KafkaProducerService,
      ],
      exports: [KafkaProducerService, 'KAFKA_BROKERS'],
    };
  }
}
