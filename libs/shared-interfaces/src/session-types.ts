/**
 * Type definitions for session and short-term memory
 */

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Session ID */
  sessionId: string;

  /** User ID */
  userId: string;

  /** Session TTL in seconds */
  ttl?: number;

  /** Maximum messages to keep in context window */
  contextWindow?: number;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  /** When the session was created */
  createdAt: number;

  /** When the session was last accessed */
  lastAccessedAt: number;

  /** Number of messages in the session */
  messageCount: number;

  /** Custom metadata */
  [key: string]: unknown;
}

/**
 * Session data stored in Redis
 */
export interface SessionData {
  /** Session configuration */
  config: SessionConfig;

  /** Session metadata */
  metadata: SessionMetadata;

  /** Additional data */
  [key: string]: unknown;
}
