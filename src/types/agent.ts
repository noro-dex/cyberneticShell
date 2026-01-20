export type AgentState =
  | 'idle'
  | 'thinking'
  | 'reading'
  | 'writing'
  | 'running'
  | 'searching'
  | 'success'
  | 'error';

export interface Agent {
  id: string;
  workspaceId: string;
  state: AgentState;
  task: string | null;
  progress: number;
  logs: LogEntry[];
  sessionId: string | null;
  model: string | null;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'tool' | 'result' | 'error' | 'message';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
}

/** CLI backend: `claude` (default) or `cursor` (Cursor Agent CLI). */
export type CliType = 'claude' | 'cursor';

export interface AgentConfig {
  workspaceId: string;
  prompt: string;
  /** `claude` (default) or `cursor`. See https://cursor.com/docs/cli/overview */
  cli?: CliType;
  /** Cursor-only: `agent`, `plan`, or `ask`. Ignored for Claude. */
  mode?: string;
  allowedTools?: string[];
  workingDirectory?: string;
  systemPrompt?: string;
  model?: string;
}

export const AGENT_STATE_EMOJI: Record<AgentState, string> = {
  idle: '🧑‍💻',
  thinking: '🤔',
  reading: '📖',
  writing: '✍️',
  running: '🏃',
  searching: '🔍',
  success: '🎉',
  error: '😵',
};

export const AGENT_STATE_COLORS: Record<AgentState, string> = {
  idle: '#a0aec0',
  thinking: '#9f7aea',
  reading: '#4299e1',
  writing: '#ed8936',
  running: '#48bb78',
  searching: '#ecc94b',
  success: '#38a169',
  error: '#e53e3e',
};
