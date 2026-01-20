import { useState } from 'react';
import { useUIStore } from '../../stores/ui';
import { useWorkspacesStore } from '../../stores/workspaces';
import { useAgentsStore } from '../../stores/agents';
import { useAgentCommands } from '../../hooks/useAgentCommands';
import { Button } from '../common/Button';

export function TaskInput() {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { selectedWorkspaceId, cliAvailable } = useUIStore();
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const agents = useAgentsStore((s) => s.agents);
  const { startTask, stopTask } = useAgentCommands();

  const workspace = selectedWorkspaceId ? workspaces[selectedWorkspaceId] : null;
  const agent = workspace?.agentId ? agents[workspace.agentId] : null;
  const isAgentBusy = agent && !['idle', 'success', 'error'].includes(agent.state);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await startTask(selectedWorkspaceId, prompt.trim());
      setPrompt('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async () => {
    if (!agent) return;
    await stopTask(agent.id);
  };

  return (
    <div className="p-3 border-t border-canvas-border bg-gray-900/50">
      {!cliAvailable && cliAvailable !== null && (
        <div className="mb-2 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
          Claude CLI not found. Install it first.
        </div>
      )}

      {!selectedWorkspaceId ? (
        <p className="text-xs text-gray-500 text-center py-2">
          Select a workspace to assign a task
        </p>
      ) : isAgentBusy ? (
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Agent is working...</p>
            <p className="text-xs text-gray-300 truncate">{agent?.task}</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleStop}>
            Stop
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex space-x-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a task for Claude..."
              className="
                flex-1 px-3 py-2 min-h-[60px] max-h-[120px]
                bg-gray-800 border border-gray-700 rounded
                text-gray-100 text-sm
                placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                resize-y
              "
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {prompt.length > 0 ? `${prompt.length} chars` : 'Cmd+Enter to submit'}
            </span>
            <Button
              type="submit"
              disabled={!prompt.trim() || isSubmitting || !cliAvailable}
              size="sm"
            >
              {isSubmitting ? 'Starting...' : 'Run Task'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
