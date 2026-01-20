import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Workspace, WorkspaceState, DrawingState, ModelId } from '../types/workspace';
import { MIN_WORKSPACE_SIZE } from '../types/workspace';

interface WorkspacesState {
  workspaces: Record<string, Workspace>;
  drawing: DrawingState;

  addWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt'>) => string;
  removeWorkspace: (workspaceId: string) => void;
  updateWorkspaceState: (workspaceId: string, state: WorkspaceState) => void;
  setWorkspaceAgent: (workspaceId: string, agentId: string | null) => void;
  updateMessiness: (workspaceId: string, messiness: number) => void;
  incrementMessiness: (workspaceId: string, amount?: number) => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  setSystemPrompt: (workspaceId: string, prompt: string | null) => void;
  setModel: (workspaceId: string, model: ModelId) => void;

  startDrawing: (x: number, y: number) => void;
  updateDrawing: (x: number, y: number) => void;
  finishDrawing: () => { x: number; y: number; width: number; height: number } | null;
  cancelDrawing: () => void;
}

let workspaceCounter = 0;

export const useWorkspacesStore = create<WorkspacesState>()(
  immer((set, get) => ({
    workspaces: {},
    drawing: {
      isDrawing: false,
      start: null,
      current: null,
    },

    addWorkspace: (workspace) => {
      const id = nanoid();
      workspaceCounter++;
      set((state) => {
        state.workspaces[id] = {
          ...workspace,
          id,
          name: workspace.name || `Workspace ${workspaceCounter}`,
          createdAt: Date.now(),
          systemPrompt: null,
          model: 'claude-sonnet-4-20250514',
        };
      });
      return id;
    },

    removeWorkspace: (workspaceId: string) => {
      set((state) => {
        delete state.workspaces[workspaceId];
      });
    },

    updateWorkspaceState: (workspaceId: string, workspaceState: WorkspaceState) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          state.workspaces[workspaceId].state = workspaceState;
        }
      });
    },

    setWorkspaceAgent: (workspaceId: string, agentId: string | null) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          state.workspaces[workspaceId].agentId = agentId;
          state.workspaces[workspaceId].state = agentId ? 'occupied' : 'empty';
        }
      });
    },

    updateMessiness: (workspaceId: string, messiness: number) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          state.workspaces[workspaceId].messiness = Math.min(100, Math.max(0, messiness));
        }
      });
    },

    incrementMessiness: (workspaceId: string, amount: number = 15) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          const current = state.workspaces[workspaceId].messiness;
          state.workspaces[workspaceId].messiness = Math.min(100, current + amount);
        }
      });
    },

    renameWorkspace: (workspaceId: string, name: string) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          state.workspaces[workspaceId].name = name;
        }
      });
    },

    setSystemPrompt: (workspaceId: string, prompt: string | null) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          state.workspaces[workspaceId].systemPrompt = prompt;
        }
      });
    },

    setModel: (workspaceId: string, model: ModelId) => {
      set((state) => {
        if (state.workspaces[workspaceId]) {
          state.workspaces[workspaceId].model = model;
        }
      });
    },

    startDrawing: (x: number, y: number) => {
      set((state) => {
        state.drawing = {
          isDrawing: true,
          start: { x, y },
          current: { x, y },
        };
      });
    },

    updateDrawing: (x: number, y: number) => {
      set((state) => {
        if (state.drawing.isDrawing) {
          state.drawing.current = { x, y };
        }
      });
    },

    finishDrawing: () => {
      const { drawing } = get();
      if (!drawing.isDrawing || !drawing.start || !drawing.current) {
        set((state) => {
          state.drawing = { isDrawing: false, start: null, current: null };
        });
        return null;
      }

      const x = Math.min(drawing.start.x, drawing.current.x);
      const y = Math.min(drawing.start.y, drawing.current.y);
      const width = Math.abs(drawing.current.x - drawing.start.x);
      const height = Math.abs(drawing.current.y - drawing.start.y);

      set((state) => {
        state.drawing = { isDrawing: false, start: null, current: null };
      });

      if (width < MIN_WORKSPACE_SIZE || height < MIN_WORKSPACE_SIZE) {
        return null;
      }

      return { x, y, width, height };
    },

    cancelDrawing: () => {
      set((state) => {
        state.drawing = { isDrawing: false, start: null, current: null };
      });
    },
  }))
);
