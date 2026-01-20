import { useAgentsStore } from '../../stores/agents';
import { useWorkspacesStore } from '../../stores/workspaces';
import { useUIStore } from '../../stores/ui';

export function StatusBar() {
  const agents = useAgentsStore((s) => s.agents);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const { statusMessage, cliAvailable } = useUIStore();

  const workspaceCount = Object.keys(workspaces).length;
  const agentCount = Object.keys(agents).length;
  const activeAgents = Object.values(agents).filter(
    (a) => !['idle', 'success', 'error'].includes(a.state)
  ).length;

  return (
    <div className="h-10 bg-canvas-surface border-t border-canvas-border flex items-center justify-between px-5 text-sm">
      <div className="flex items-center space-x-5">
        <span className="text-gray-400">
          <span className="text-gray-200 font-medium">{workspaceCount}</span> workspace
          {workspaceCount !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-400">
          <span className="text-gray-200 font-medium">{agentCount}</span> agent{agentCount !== 1 ? 's' : ''}
          {activeAgents > 0 && (
            <span className="ml-1 text-green-400">({activeAgents} active)</span>
          )}
        </span>
      </div>

      <div className="flex items-center space-x-5">
        <span className="text-gray-400">{statusMessage}</span>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              cliAvailable === null
                ? 'bg-yellow-500'
                : cliAvailable
                  ? 'bg-green-500'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-gray-400">
            {cliAvailable === null ? 'Checking CLI...' : cliAvailable ? 'CLI Ready' : 'CLI Not Found'}
          </span>
        </div>
      </div>
    </div>
  );
}
