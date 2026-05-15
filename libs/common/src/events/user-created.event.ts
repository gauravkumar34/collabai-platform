import { BaseEvent } from './base-event.interface';

export interface UserCreatedPayload {
  userId: string;
  email: string;
  name?: string;
  createdAt: string;
}

export type UserCreatedEvent = BaseEvent<UserCreatedPayload>;
