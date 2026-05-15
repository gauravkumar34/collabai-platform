import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceService } from '../workspace.service';
import { KafkaConsumerService } from '@app/common/kafka';
import { KAFKA_TOPICS, UserCreatedEvent } from '@app/common/events';

@Injectable()
export class UserEventsConsumer extends KafkaConsumerService {
  constructor(
    @Inject('KAFKA_BROKERS') brokers: string[],
    private readonly workspaceService: WorkspaceService,
  ) {
    super(brokers);
  }

  get groupId() {
    return 'workspace-service.user-events';
  }

  get topics() {
    return [KAFKA_TOPICS.USER_CREATED];
  }

  registerHandlers() {
    this.on<UserCreatedEvent['payload']>('user.created', async (event) => {
      this.logger.log(
        `Provisioning workspace for user ${event.payload.userId}`,
      );
      await this.workspaceService.createDefaultWorkspaceForUser(
        event.payload.userId,
        event.payload.email,
      );
    });
  }
}
