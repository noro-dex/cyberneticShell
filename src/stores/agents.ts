import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Agent, AgentState, LogEntry } from '../types/agent';

const MAX_LOG_ENTRIES = 500;

interface AgentsState {
  agents: Record<string, Agent>;

  addAgent: (workspaceId: string) => string;
  removeAgent: (agentId: string) => void;
  updateAgentState: (agentId: string, state: AgentState) => void;
  setAgentTask: (agentId: string, task: string) => void;
  setAgentSession: (agentId: string, sessionId: string, model: string) => void;
  appendLog: (agentId: string, entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateProgress: (agentId: string, progress: number) => void;
  setAgentError: (agentId: string, error: string) => void;
  completeAgent: (agentId: string, success: boolean) => void;
  getAgentByWorkspace: (workspaceId: string) => Agent | undefined;
}

export const useAgentsStore = create<AgentsState>()(
  immer((set, get) => ({
    agents: {},

    addAgent: (workspaceId: string) => {
      const id = nanoid();
      set((state) => {
        state.agents[id] = {
          id,
          workspaceId,
          state: 'idle',
          task: null,
          progress: 0,
          logs: [],
          sessionId: null,
          model: null,
          startedAt: null,
          completedAt: null,
          error: null,
        };
      });
      return id;
    },

    removeAgent: (agentId: string) => {
      set((state) => {
        delete state.agents[agentId];
      });
    },

    updateAgentState: (agentId: string, agentState: AgentState) => {
      set((state) => {
        if (state.agents[agentId]) {
          state.agents[agentId].state = agentState;
        }
      });
    },

    setAgentTask: (agentId: string, task: string) => {
      set((state) => {
        if (state.agents[agentId]) {
          state.agents[agentId].task = task;
          state.agents[agentId].startedAt = Date.now();
          state.agents[agentId].state = 'thinking';
          state.agents[agentId].progress = 0;
          state.agents[agentId].error = null;
          state.agents[agentId].completedAt = null;
        }
      });
    },

    setAgentSession: (agentId: string, sessionId: string, model: string) => {
      set((state) => {
        if (state.agents[agentId]) {
          state.agents[agentId].sessionId = sessionId;
          state.agents[agentId].model = model;
        }
      });
    },

    appendLog: (agentId: string, entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
      set((state) => {
        if (state.agents[agentId]) {
          const log: LogEntry = {
            ...entry,
            id: nanoid(),
            timestamp: Date.now(),
          };
          state.agents[agentId].logs.push(log);
          if (state.agents[agentId].logs.length > MAX_LOG_ENTRIES) {
            state.agents[agentId].logs = state.agents[agentId].logs.slice(-MAX_LOG_ENTRIES);
          }
        }
      });
    },

    updateProgress: (agentId: string, progress: number) => {
      set((state) => {
        if (state.agents[agentId]) {
          state.agents[agentId].progress = Math.min(100, Math.max(0, progress));
        }
      });
    },

    setAgentError: (agentId: string, error: string) => {
      set((state) => {
        if (state.agents[agentId]) {
          state.agents[agentId].error = error;
          state.agents[agentId].state = 'error';
          state.agents[agentId].completedAt = Date.now();
        }
      });
    },

    completeAgent: (agentId: string, success: boolean) => {
      set((state) => {
        if (state.agents[agentId]) {
          state.agents[agentId].state = success ? 'success' : 'error';
          state.agents[agentId].completedAt = Date.now();
          state.agents[agentId].progress = 100;
        }
      });
    },

    getAgentByWorkspace: (workspaceId: string) => {
      const state = get();
      return Object.values(state.agents).find((a) => a.workspaceId === workspaceId);
    },
  }))
);
