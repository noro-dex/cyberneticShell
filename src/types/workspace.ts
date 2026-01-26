export type WorkspaceState = 'empty' | 'occupied' | 'working' | 'success' | 'error';

export type ModelId = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514' | 'claude-3-5-haiku-20241022';

/** CLI backend: `claude`, `cursor` (Cursor Agent), `kilo` (Kilo Code), `gemini` (Gemini CLI), `grok` (Grok CLI), or `deepseek` (DeepSeek CLI). */
export type CliType = 'claude' | 'cursor' | 'kilo' | 'gemini' | 'grok' | 'deepseek';

export interface WorkspaceConnection {
  fromId: string;      // Source workspace ID
  toId: string;        // Target workspace ID
  label?: string;      // Optional label for the connection
}

export interface Workspace {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: WorkspaceState;
  agentId: string | null;
  messiness: number;
  createdAt: number;
  systemPrompt: string | null;
  model: ModelId;
  /** `claude` (default), `cursor`, `kilo`, `gemini`, `grok`, or `deepseek`. */
  cli?: CliType;
  /** Cursor-only: `agent`, `plan`, or `ask`. Ignored for Claude and Kilo. */
  mode?: string;

  // Workflow features
  taskTemplate: string | null;      // Pre-defined task prompt for this workspace
  lastOutput: string | null;        // Output from last completed task (for piping)
  inputConnections: string[];       // IDs of workspaces that feed INTO this one
  outputConnections: string[];      // IDs of workspaces this one feeds TO
  autoRun: boolean;                 // Auto-run when all inputs complete
}

export const AVAILABLE_MODELS: { id: ModelId; name: string; description: string }[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast & capable (default)' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most powerful' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest, lightweight' },
];

export interface DrawingState {
  isDrawing: boolean;
  start: { x: number; y: number } | null;
  current: { x: number; y: number } | null;
}

export const WORKSPACE_STATE_COLORS: Record<WorkspaceState, { fill: number; border: number }> = {
  empty: { fill: 0x2d3748, border: 0x4a5568 },
  occupied: { fill: 0x3d4a5c, border: 0x5a6b7c },
  working: { fill: 0x2c5282, border: 0x3182ce },
  success: { fill: 0x276749, border: 0x38a169 },
  error: { fill: 0x9b2c2c, border: 0xe53e3e },
};

export const WORKSPACE_STATE_EMOJI: Record<WorkspaceState, string> = {
  empty: '📋',
  occupied: '🧑‍💻',
  working: '⚡',
  success: '✅',
  error: '❌',
};

export const MIN_WORKSPACE_SIZE = 100;
export const DEFAULT_WORKSPACE_SIZE = 200;
