import { BaseEvent } from './base-event.interface';

export interface WorkspaceCreatedPayload {
  workspaceId: string;
  ownerId: string;
  name: string;
  createdAt: string;
}

export type WorkspaceCreatedEvent = BaseEvent<WorkspaceCreatedPayload>;
