import { useAgentsStore } from '../../stores/agents';
import { useWorkspacesStore } from '../../stores/workspaces';
import { useUIStore } from '../../stores/ui';
import { useAgentCommands } from '../../hooks/useAgentCommands';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { AGENT_STATE_COLORS } from '../../types/agent';
import { AGENT_EMOJIS } from '../../utils/emoji';

export function AgentDetail() {
  const { selectedAgentId, selectWorkspace } = useUIStore();
  const agents = useAgentsStore((s) => s.agents);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const { stopTask } = useAgentCommands();

  const agent = selectedAgentId ? agents[selectedAgentId] : null;
  const workspace = agent ? workspaces[agent.workspaceId] : null;

  if (!agent) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-2xl mb-2">🤖</p>
        <p className="text-sm">No agent selected</p>
        <p className="text-xs mt-1">Select an agent from a workspace</p>
      </div>
    );
  }

  const isActive = !['idle', 'success', 'error'].includes(agent.state);
  const duration = agent.startedAt
    ? agent.completedAt
      ? agent.completedAt - agent.startedAt
      : Date.now() - agent.startedAt
    : 0;
  const durationStr = duration > 0 ? `${(duration / 1000).toFixed(1)}s` : '-';

  const handleStop = async () => {
    await stopTask(agent.id);
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-200 flex items-center">
          <span className="mr-2 text-2xl">{AGENT_EMOJIS[agent.state]}</span>
          Agent
        </h3>
        <Badge variant={agent.state}>{agent.state}</Badge>
      </div>

      {/* Progress */}
      {isActive && (
        <div className="mb-4">
          <ProgressBar
            progress={agent.progress}
            label="Progress"
            color={`bg-[${AGENT_STATE_COLORS[agent.state]}]`}
          />
        </div>
      )}

      {/* Task */}
      {agent.task && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Current Task</label>
          <p className="text-sm text-gray-200 bg-gray-800 p-2 rounded border border-gray-700">
            {agent.task}
          </p>
        </div>
      )}

      {/* Session info */}
      <div className="mb-4 space-y-2 text-sm">
        {agent.sessionId && (
          <div className="flex justify-between">
            <span className="text-gray-400">Session</span>
            <span className="text-gray-300 font-mono text-xs">{agent.sessionId.slice(0, 12)}...</span>
          </div>
        )}
        {agent.model && (
          <div className="flex justify-between">
            <span className="text-gray-400">Model</span>
            <span className="text-gray-300">{agent.model}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Duration</span>
          <span className="text-gray-300">{durationStr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Log entries</span>
          <span className="text-gray-300">{agent.logs.length}</span>
        </div>
      </div>

      {/* Error display */}
      {agent.error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded">
          <label className="block text-xs font-medium text-red-400 mb-1">Error</label>
          <p className="text-sm text-red-300">{agent.error}</p>
        </div>
      )}

      {/* Workspace link */}
      {workspace && (
        <div className="mb-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selectWorkspace(workspace.id)}
            className="w-full"
          >
            View Workspace: {workspace.name}
          </Button>
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <Button variant="danger" size="sm" onClick={handleStop} className="w-full">
            Stop Task
          </Button>
        </div>
      )}
    </div>
  );
}
