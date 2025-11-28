export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
