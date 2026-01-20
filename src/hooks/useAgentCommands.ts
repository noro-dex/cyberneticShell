import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAgentsStore } from '../stores/agents';
import { useWorkspacesStore } from '../stores/workspaces';
import { useUIStore } from '../stores/ui';
import type { AgentConfig } from '../types/agent';

export function useAgentCommands() {
  const { removeAgent, getAgentByWorkspace } = useAgentsStore();
  const { setWorkspaceAgent, removeWorkspace, updateWorkspaceState } = useWorkspacesStore();
  const { setStatusMessage, selectWorkspace, selectAgent } = useUIStore();

  const startTask = useCallback(
    async (workspaceId: string, prompt: string, options?: { allowedTools?: string[] }) => {
      try {
        // Check if there's an existing agent for this workspace
        const existingAgent = getAgentByWorkspace(workspaceId);
        if (existingAgent) {
          // Remove old agent before starting new one
          removeAgent(existingAgent.id);
        }

        // Get workspace settings
        const { workspaces } = useWorkspacesStore.getState();
        const workspace = workspaces[workspaceId];

        updateWorkspaceState(workspaceId, 'working');
        setStatusMessage('Starting task...');

        const config: AgentConfig = {
          workspaceId,
          prompt,
          allowedTools: options?.allowedTools,
          systemPrompt: workspace?.systemPrompt || undefined,
          model: workspace?.model || undefined,
        };

        // The backend returns the agent ID it creates
        const backendAgentId = await invoke<string>('start_agent', { config });

        // Create the agent in our store with the backend's ID
        const { agents } = useAgentsStore.getState();
        if (!agents[backendAgentId]) {
          // Manually add agent with the backend's ID
          useAgentsStore.setState((state) => ({
            agents: {
              ...state.agents,
              [backendAgentId]: {
                id: backendAgentId,
                workspaceId,
                state: 'thinking',
                task: prompt,
                progress: 0,
                logs: [],
                sessionId: null,
                model: null,
                startedAt: Date.now(),
                completedAt: null,
                error: null,
              },
            },
          }));
        }

        setWorkspaceAgent(workspaceId, backendAgentId);

        return backendAgentId;
      } catch (error) {
        setStatusMessage(`Failed to start task: ${error}`);
        throw error;
      }
    },
    [getAgentByWorkspace, removeAgent, setWorkspaceAgent, updateWorkspaceState, setStatusMessage]
  );

  const stopTask = useCallback(
    async (agentId: string) => {
      try {
        setStatusMessage('Stopping task...');
        await invoke('stop_agent', { agentId });
        setStatusMessage('Task stopped');
      } catch (error) {
        setStatusMessage(`Failed to stop task: ${error}`);
        throw error;
      }
    },
    [setStatusMessage]
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        const agent = getAgentByWorkspace(workspaceId);
        if (agent) {
          await invoke('stop_agent', { agentId: agent.id });
          removeAgent(agent.id);
        }
        removeWorkspace(workspaceId);
        selectWorkspace(null);
        selectAgent(null);
        setStatusMessage('Workspace deleted');
      } catch (error) {
        setStatusMessage(`Failed to delete workspace: ${error}`);
        throw error;
      }
    },
    [getAgentByWorkspace, removeAgent, removeWorkspace, selectWorkspace, selectAgent, setStatusMessage]
  );

  const checkCliAvailable = useCallback(async (): Promise<boolean> => {
    try {
      const available = await invoke<boolean>('check_cli_available');
      return available;
    } catch {
      return false;
    }
  }, []);

  return {
    startTask,
    stopTask,
    deleteWorkspace,
    checkCliAvailable,
  };
}
