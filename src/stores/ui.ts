import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ActivePanel = 'list' | 'workspace' | 'agent' | 'logs';

interface UIState {
  selectedWorkspaceId: string | null;
  selectedAgentId: string | null;
  activePanel: ActivePanel;
  sidebarCollapsed: boolean;
  statusMessage: string;
  cliAvailable: boolean | null;
  outputModalAgentId: string | null;

  selectWorkspace: (workspaceId: string | null) => void;
  selectAgent: (agentId: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  toggleSidebar: () => void;
  setStatusMessage: (message: string) => void;
  setCliAvailable: (available: boolean) => void;
  showOutputModal: (agentId: string | null) => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    selectedWorkspaceId: null,
    selectedAgentId: null,
    activePanel: 'list',
    sidebarCollapsed: false,
    statusMessage: 'Ready',
    cliAvailable: null,
    outputModalAgentId: null,

    selectWorkspace: (workspaceId: string | null) => {
      set((state) => {
        state.selectedWorkspaceId = workspaceId;
        if (workspaceId) {
          state.activePanel = 'workspace';
        }
      });
    },

    selectAgent: (agentId: string | null) => {
      set((state) => {
        state.selectedAgentId = agentId;
        if (agentId) {
          state.activePanel = 'agent';
        }
      });
    },

    setActivePanel: (panel: ActivePanel) => {
      set((state) => {
        state.activePanel = panel;
      });
    },

    toggleSidebar: () => {
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      });
    },

    setStatusMessage: (message: string) => {
      set((state) => {
        state.statusMessage = message;
      });
    },

    setCliAvailable: (available: boolean) => {
      set((state) => {
        state.cliAvailable = available;
      });
    },

    showOutputModal: (agentId: string | null) => {
      set((state) => {
        state.outputModalAgentId = agentId;
      });
    },
  }))
);
