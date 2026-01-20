export type AgentEventType =
  | 'Started'
  | 'Init'
  | 'Message'
  | 'ToolUse'
  | 'ToolResult'
  | 'Result'
  | 'Error'
  | 'Stopped';

export interface AgentEventStarted {
  type: 'Started';
  agent_id: string;
  workspace_id: string;
}

export interface AgentEventInit {
  type: 'Init';
  agent_id: string;
  session_id: string;
  model: string;
}

export interface AgentEventMessage {
  type: 'Message';
  agent_id: string;
  content: string;
}

export interface AgentEventToolUse {
  type: 'ToolUse';
  agent_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface AgentEventToolResult {
  type: 'ToolResult';
  agent_id: string;
  tool_name: string;
  success: boolean;
}

export interface AgentEventResult {
  type: 'Result';
  agent_id: string;
  success: boolean;
  duration_ms: number;
}

export interface AgentEventError {
  type: 'Error';
  agent_id: string;
  message: string;
}

export interface AgentEventStopped {
  type: 'Stopped';
  agent_id: string;
  reason: 'completed' | 'cancelled' | 'error';
}

export type AgentEvent =
  | AgentEventStarted
  | AgentEventInit
  | AgentEventMessage
  | AgentEventToolUse
  | AgentEventToolResult
  | AgentEventResult
  | AgentEventError
  | AgentEventStopped;

export function isAgentEvent(event: unknown): event is AgentEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    typeof (event as AgentEvent).type === 'string'
  );
}
