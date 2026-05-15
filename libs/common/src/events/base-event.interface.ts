export interface BaseEvent<T = unknown> {
  eventId: string; // unique — for idempotency
  eventType: string; // e.g., 'user.created'
  eventVersion: number; // schema version, start at 1
  occurredAt: string; // ISO timestamp
  payload: T;
}
