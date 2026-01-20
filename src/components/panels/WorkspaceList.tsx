import { useWorkspacesStore } from '../../stores/workspaces';
import { useAgentsStore } from '../../stores/agents';
import { useUIStore } from '../../stores/ui';
import { Badge } from '../common/Badge';
import { WORKSPACE_EMOJIS } from '../../utils/emoji';

export function WorkspaceList() {
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const agents = useAgentsStore((s) => s.agents);
  const { selectedWorkspaceId, selectWorkspace } = useUIStore();

  const workspaceList = Object.values(workspaces).sort((a, b) => b.createdAt - a.createdAt);

  if (workspaceList.length === 0) {
    return (
      <div className="p-5 text-center text-gray-500">
        <p className="text-3xl mb-3">📋</p>
        <p className="text-base">No workspaces yet</p>
        <p className="text-sm mt-2">Click and drag on the canvas to create one</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {workspaceList.map((workspace) => {
        const agent = workspace.agentId ? agents[workspace.agentId] : null;
        const isSelected = selectedWorkspaceId === workspace.id;

        return (
          <button
            key={workspace.id}
            onClick={() => selectWorkspace(workspace.id)}
            className={`
              w-full p-4 text-left border-b border-canvas-border
              transition-colors duration-150
              ${isSelected ? 'bg-blue-900/30' : 'hover:bg-gray-800'}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-200 text-base flex items-center">
                <span className="mr-2 text-lg">{WORKSPACE_EMOJIS[workspace.state]}</span>
                {workspace.name}
              </span>
              <Badge variant={workspace.state}>{workspace.state}</Badge>
            </div>

            {agent && (
              <div className="text-sm text-gray-400 mt-2">
                {agent.task ? (
                  <p className="truncate">Task: {agent.task}</p>
                ) : (
                  <p>Agent idle</p>
                )}
              </div>
            )}

            <div className="text-sm text-gray-500 mt-2">
              {Math.round(workspace.width)} × {Math.round(workspace.height)}px
            </div>
          </button>
        );
      })}
    </div>
  );
}
