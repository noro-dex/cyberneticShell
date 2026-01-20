import { useState } from 'react';
import { useWorkspacesStore } from '../../stores/workspaces';
import { useAgentsStore } from '../../stores/agents';
import { useUIStore } from '../../stores/ui';
import { useAgentCommands } from '../../hooks/useAgentCommands';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { WORKSPACE_EMOJIS } from '../../utils/emoji';
import { AGENT_EMOJIS } from '../../utils/emoji';
import { AVAILABLE_MODELS, ModelId } from '../../types/workspace';

export function WorkspacePanel() {
  const { selectedWorkspaceId, selectAgent, showOutputModal } = useUIStore();
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const { renameWorkspace, setSystemPrompt, setModel } = useWorkspacesStore();
  const agents = useAgentsStore((s) => s.agents);
  const { deleteWorkspace } = useAgentCommands();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState('');

  const workspace = selectedWorkspaceId ? workspaces[selectedWorkspaceId] : null;
  const agent = workspace?.agentId ? agents[workspace.agentId] : null;

  if (!workspace) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-2xl mb-2">🖥️</p>
        <p className="text-sm">No workspace selected</p>
        <p className="text-xs mt-1">Select a workspace from the list or canvas</p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditName(workspace.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      renameWorkspace(workspace.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this workspace? Any running task will be stopped.')) {
      await deleteWorkspace(workspace.id);
    }
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <div className="flex-1 flex items-center space-x-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
              className="text-sm"
            />
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-medium text-gray-200 flex items-center">
              <span className="mr-2">{WORKSPACE_EMOJIS[workspace.state]}</span>
              {workspace.name}
            </h3>
            <Button size="sm" variant="ghost" onClick={handleStartEdit}>
              Edit
            </Button>
          </>
        )}
      </div>

      {/* Status */}
      <div className="mb-4">
        <Badge variant={workspace.state} className="text-sm">
          {workspace.state}
        </Badge>
      </div>

      {/* Dimensions */}
      <div className="mb-4 text-sm text-gray-400">
        <p>
          Position: ({Math.round(workspace.x)}, {Math.round(workspace.y)})
        </p>
        <p>
          Size: {Math.round(workspace.width)} × {Math.round(workspace.height)}px
        </p>
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Model
        </label>
        <select
          value={workspace.model}
          onChange={(e) => setModel(workspace.id, e.target.value as ModelId)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.description}
            </option>
          ))}
        </select>
      </div>

      {/* System Prompt */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-400">
            System Prompt
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!showSystemPrompt) {
                setEditingPrompt(workspace.systemPrompt || '');
              }
              setShowSystemPrompt(!showSystemPrompt);
            }}
          >
            {showSystemPrompt ? 'Hide' : workspace.systemPrompt ? 'Edit' : 'Add'}
          </Button>
        </div>
        {showSystemPrompt ? (
          <div className="space-y-2">
            <textarea
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              placeholder="Give your agent a personality or specific instructions..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
              rows={4}
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => {
                  setSystemPrompt(workspace.id, editingPrompt || null);
                  setShowSystemPrompt(false);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSystemPrompt(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : workspace.systemPrompt ? (
          <p className="text-xs text-gray-500 italic truncate">
            "{workspace.systemPrompt.slice(0, 50)}..."
          </p>
        ) : (
          <p className="text-xs text-gray-600">No system prompt set</p>
        )}
      </div>

      {/* Desk Clutter indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Desk Clutter</span>
          <span>{workspace.messiness}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-600 transition-all duration-500"
            style={{ width: `${workspace.messiness}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-1">Accumulates as tasks complete</p>
      </div>

      {/* Agent info */}
      {agent && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-200">
              {AGENT_EMOJIS[agent.state]} Agent
            </span>
            <Badge variant={agent.state}>{agent.state}</Badge>
          </div>

          {agent.task && (
            <p className="text-xs text-gray-400 mb-2 truncate">Task: {agent.task}</p>
          )}

          {agent.progress > 0 && agent.progress < 100 && (
            <ProgressBar progress={agent.progress} size="sm" />
          )}

          <div className="flex space-x-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => selectAgent(agent.id)}
            >
              View Details →
            </Button>
            {(agent.state === 'success' || agent.state === 'error') && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => showOutputModal(agent.id)}
              >
                📄 Output
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          Delete Workspace
        </Button>
      </div>
    </div>
  );
}
