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

  // Get all messages from logs and concatenate them (Claude sends multiple message events)
  const messages = agent.logs.filter((l) => l.type === 'message');
  const fullOutput = messages.map((m) => m.content).join('\n\n');

  // Get tool uses from logs
  const toolUses = agent.logs.filter((l) => l.type === 'tool');

  const handleCopy = () => {
    if (fullOutput) {
      navigator.clipboard.writeText(fullOutput);
    }
  };

  return (
    <Modal
      isOpen={!!outputModalAgentId}
      onClose={() => showOutputModal(null)}
      title={`${AGENT_EMOJIS[agent.state]} Output - ${workspace?.name || 'Agent'}`}
      size="xl"
    >
      <div className="space-y-5">
        {/* Task info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Task</div>
          <div className="text-base text-white">{agent.task || 'No task'}</div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-5">
            <span className={`px-3 py-1.5 rounded text-sm font-bold ${
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
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-3">Tools Used ({toolUses.length})</div>
            <div className="flex flex-wrap gap-2">
              {toolUses.map((tool, i) => (
                <span key={i} className="text-sm bg-gray-700 px-3 py-1.5 rounded text-gray-300">
                  {tool.toolName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main output */}
        <div className="bg-gray-800 rounded-lg p-5 min-h-[200px] max-h-[50vh] overflow-auto">
          <div className="text-sm text-emerald-400 mb-3 font-bold">
            Response {messages.length > 1 && `(${messages.length} parts)`}
          </div>
          {fullOutput ? (
            <div className="text-base text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
              {fullOutput}
            </div>
          ) : (
            <div className="text-gray-500 text-base">No output yet</div>
          )}
        </div>

        {/* All logs expandable */}
        <details className="bg-gray-800/50 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-base text-gray-400 hover:text-white">
            View all log entries ({agent.logs.length})
          </summary>
          <div className="px-4 pb-4 max-h-[250px] overflow-auto">
            {agent.logs.map((log) => (
              <div key={log.id} className="text-sm py-2 border-b border-gray-700/50 last:border-0">
                <span className={`font-mono ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'tool' ? 'text-purple-400' :
                  log.type === 'message' ? 'text-blue-400' :
                  'text-gray-400'
                }`}>
                  [{log.type}]
                </span>
                <span className="text-gray-300 ml-2">
                  {log.content.slice(0, 150)}{log.content.length > 150 ? '...' : ''}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Modal>
  );
}
