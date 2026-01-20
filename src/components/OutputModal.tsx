import { Modal } from './common/Modal';
import { useUIStore } from '../stores/ui';
import { useAgentsStore } from '../stores/agents';
import { useWorkspacesStore } from '../stores/workspaces';
import { Button } from './common/Button';
import { AGENT_EMOJIS } from '../utils/emoji';

export function OutputModal() {
  const { outputModalAgentId, showOutputModal } = useUIStore();
  const agents = useAgentsStore((s) => s.agents);
  const workspaces = useWorkspacesStore((s) => s.workspaces);

  const agent = outputModalAgentId ? agents[outputModalAgentId] : null;
  const workspace = agent ? workspaces[agent.workspaceId] : null;

  if (!agent) return null;

  // Get all messages from logs
  const messages = agent.logs.filter((l) => l.type === 'message');
  const lastMessage = messages[messages.length - 1];

  // Get tool uses from logs
  const toolUses = agent.logs.filter((l) => l.type === 'tool');

  const handleCopy = () => {
    if (lastMessage) {
      navigator.clipboard.writeText(lastMessage.content);
    }
  };

  return (
    <Modal
      isOpen={!!outputModalAgentId}
      onClose={() => showOutputModal(null)}
      title={`${AGENT_EMOJIS[agent.state]} Output - ${workspace?.name || 'Agent'}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Task info */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Task</div>
          <div className="text-sm text-white">{agent.task || 'No task'}</div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              agent.state === 'success' ? 'bg-emerald-600 text-white' :
              agent.state === 'error' ? 'bg-red-600 text-white' :
              'bg-blue-600 text-white'
            }`}>
              {agent.state.toUpperCase()}
            </span>
            {agent.model && (
              <span className="text-gray-400">Model: {agent.model}</span>
            )}
            {agent.completedAt && agent.startedAt && (
              <span className="text-gray-400">
                Duration: {((agent.completedAt - agent.startedAt) / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            📋 Copy Output
          </Button>
        </div>

        {/* Tool uses summary */}
        {toolUses.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Tools Used ({toolUses.length})</div>
            <div className="flex flex-wrap gap-2">
              {toolUses.map((tool, i) => (
                <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                  {tool.toolName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main output */}
        <div className="bg-gray-800 rounded-lg p-4 min-h-[200px] max-h-[50vh] overflow-auto">
          <div className="text-xs text-emerald-400 mb-2 font-bold">Response</div>
          {lastMessage ? (
            <div className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
              {lastMessage.content}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No output yet</div>
          )}
        </div>

        {/* All logs expandable */}
        <details className="bg-gray-800/50 rounded-lg">
          <summary className="px-3 py-2 cursor-pointer text-sm text-gray-400 hover:text-white">
            View all log entries ({agent.logs.length})
          </summary>
          <div className="px-3 pb-3 max-h-[200px] overflow-auto">
            {agent.logs.map((log) => (
              <div key={log.id} className="text-xs py-1 border-b border-gray-700/50 last:border-0">
                <span className={`font-mono ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'tool' ? 'text-purple-400' :
                  log.type === 'message' ? 'text-blue-400' :
                  'text-gray-400'
                }`}>
                  [{log.type}]
                </span>
                <span className="text-gray-300 ml-2">
                  {log.content.slice(0, 100)}{log.content.length > 100 ? '...' : ''}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Modal>
  );
}
