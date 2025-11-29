export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

export interface MasumiAgentState {
  isActive: boolean;
  isProcessing: boolean;
  messages: AgentMessage[];
  error: string | null;
}

