import { isTauri, getApiBaseUrl } from './env';
import type { AgentConfig, AgentEvent, AgentId } from '../types/agent';
import type { SkillInfo, SkillDetail } from '../types/skill';

// Tauri imports (only used when in Tauri mode)
let tauriInvoke: typeof import('@tauri-apps/api/core').invoke;
let tauriListen: typeof import('@tauri-apps/api/event').listen;

if (isTauri) {
  // Dynamically import Tauri APIs only when needed
  Promise.all([
    import('@tauri-apps/api/core'),
    import('@tauri-apps/api/event'),
  ]).then(([core, event]) => {
    tauriInvoke = core.invoke;
    tauriListen = event.listen;
  });
}

/**
 * WebSocket connection for web mode
 */
let ws: WebSocket | null = null;
let wsEventListeners: Set<(event: AgentEvent) => void> = new Set();
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectWebSocket() {
  if (isTauri || ws?.readyState === WebSocket.OPEN) {
    return;
  }

  const wsUrl = getApiBaseUrl().replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      wsReconnectAttempts = 0;
    };
    
    ws.onmessage = (event) => {
      try {
        const agentEvent: AgentEvent = JSON.parse(event.data);
        wsEventListeners.forEach(listener => listener(agentEvent));
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
    
    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      ws = null;
      
      // Attempt to reconnect
      if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        wsReconnectAttempts++;
        setTimeout(() => connectWebSocket(), 1000 * wsReconnectAttempts);
      }
    };
  } catch (error) {
    console.error('[WebSocket] Failed to connect:', error);
  }
}

/**
 * API abstraction layer
 */
export const api = {
  /**
   * Start an agent
   */
  async startAgent(config: AgentConfig): Promise<AgentId> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return await tauriInvoke<AgentId>('start_agent', { config });
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error(`Failed to start agent: ${response.statusText}`);
      }
      return await response.json();
    }
  },

  /**
   * Stop an agent
   */
  async stopAgent(agentId: AgentId): Promise<void> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await tauriInvoke('stop_agent', { agentId });
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to stop agent: ${response.statusText}`);
      }
    }
  },

  /**
   * Stop all agents
   */
  async stopAllAgents(): Promise<void> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await tauriInvoke('stop_all_agents');
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/agents/all`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to stop all agents: ${response.statusText}`);
      }
    }
  },

  /**
   * List all agents
   */
  async listAgents(): Promise<AgentId[]> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return await tauriInvoke<AgentId[]>('list_agents');
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/agents`);
      if (!response.ok) {
        throw new Error(`Failed to list agents: ${response.statusText}`);
      }
      return await response.json();
    }
  },

  /**
   * Check if a CLI is available
   */
  async checkCliAvailable(cli: 'claude' | 'cursor' | 'kilo' | 'gemini' | 'grok' | 'deepseek'): Promise<boolean> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const commandMap: Record<string, string> = {
        claude: 'check_cli_available',
        cursor: 'check_cursor_cli_available',
        kilo: 'check_kilo_cli_available',
        gemini: 'check_gemini_cli_available',
        grok: 'check_grok_cli_available',
        deepseek: 'check_deepseek_cli_available',
      };
      return await tauriInvoke<boolean>(commandMap[cli]);
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/cli/check/${cli}`);
      if (!response.ok) {
        return false;
      }
      return await response.json();
    }
  },

  /**
   * List skills
   */
  async listSkills(): Promise<SkillInfo[]> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return await tauriInvoke<SkillInfo[]>('list_skills');
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/skills`);
      if (!response.ok) {
        throw new Error(`Failed to list skills: ${response.statusText}`);
      }
      return await response.json();
    }
  },

  /**
   * Get skill detail
   */
  async getSkill(skillName: string): Promise<SkillDetail> {
    if (isTauri) {
      if (!tauriInvoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return await tauriInvoke<SkillDetail>('get_skill', { skillName });
    } else {
      const response = await fetch(`${getApiBaseUrl()}/api/skills/${encodeURIComponent(skillName)}`);
      if (!response.ok) {
        throw new Error(`Failed to get skill: ${response.statusText}`);
      }
      return await response.json();
    }
  },

  /**
   * Listen to agent events
   */
  async listenToEvents(callback: (event: AgentEvent) => void): Promise<() => void> {
    if (isTauri) {
      // Wait for Tauri APIs to load
      while (!tauriListen) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const unlisten = await tauriListen<AgentEvent>('agent-event', (event) => {
        callback(event.payload);
      });
      return () => {
        unlisten.then(fn => fn()).catch(() => {});
      };
    } else {
      // Web mode: use WebSocket
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        // Wait for connection (with timeout)
        let attempts = 0;
        await new Promise<void>((resolve, reject) => {
          const checkConnection = () => {
            attempts++;
            if (ws?.readyState === WebSocket.OPEN) {
              resolve();
            } else if (attempts > 50) {
              reject(new Error('WebSocket connection timeout'));
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }
      
      wsEventListeners.add(callback);
      
      return () => {
        wsEventListeners.delete(callback);
      };
    }
  },
};

// Initialize WebSocket connection in web mode
if (!isTauri && typeof window !== 'undefined') {
  connectWebSocket();
}
