// Centralize topic names. Never hard-code them in services.
export const KAFKA_TOPICS = {
  USER_CREATED: 'user.created',
  USER_DELETED: 'user.deleted',
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_MEMBER_ADDED: 'workspace.member.added',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
