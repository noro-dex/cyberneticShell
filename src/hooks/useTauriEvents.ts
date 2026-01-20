import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAgentsStore } from '../stores/agents';
import { useWorkspacesStore } from '../stores/workspaces';
import { useUIStore } from '../stores/ui';
import type { AgentEvent } from '../types/events';

export function useTauriEvents() {
  useEffect(() => {
    const unlisten = listen<AgentEvent>('agent-event', (event) => {
      const data = event.payload;

      // Get fresh state on each event to avoid stale closure issues
      const {
        updateAgentState,
        setAgentSession,
        appendLog,
        setAgentError,
        completeAgent,
        agents,
      } = useAgentsStore.getState();

      const {
        workspaces,
        updateWorkspaceState,
        incrementMessiness,
        setLastOutput,
        getDownstreamWorkspaces,
      } = useWorkspacesStore.getState();
      const { setStatusMessage } = useUIStore.getState();

      console.log('[Event]', data.type, 'agent_id:', data.agent_id, 'known agents:', Object.keys(agents));

      switch (data.type) {
        case 'Started':
          setStatusMessage(`Agent started for workspace`);
          appendLog(data.agent_id, {
            type: 'info',
            content: 'Agent started',
          });
          break;

        case 'Init':
          setAgentSession(data.agent_id, data.session_id, data.model);
          appendLog(data.agent_id, {
            type: 'info',
            content: `Session initialized with model: ${data.model}`,
          });
          break;

        case 'Message':
          appendLog(data.agent_id, {
            type: 'message',
            content: data.content,
          });
          updateAgentState(data.agent_id, 'thinking');
          break;

        case 'ToolUse': {
          const toolName = data.tool_name;
          let newState: 'reading' | 'writing' | 'running' | 'searching' = 'running';

          if (['Read', 'Glob', 'Grep'].includes(toolName)) {
            newState = 'reading';
          } else if (['Write', 'Edit'].includes(toolName)) {
            newState = 'writing';
          } else if (['WebSearch', 'WebFetch'].includes(toolName)) {
            newState = 'searching';
          }

          updateAgentState(data.agent_id, newState);
          appendLog(data.agent_id, {
            type: 'tool',
            content: `Using tool: ${toolName}`,
            toolName,
            toolInput: data.tool_input as Record<string, unknown>,
          });

          // Update workspace state
          const agent = agents[data.agent_id];
          if (agent) {
            updateWorkspaceState(agent.workspaceId, 'working');
          }
          break;
        }

        case 'ToolResult':
          appendLog(data.agent_id, {
            type: 'result',
            content: `Tool ${data.tool_name}: ${data.success ? 'success' : 'failed'}`,
            toolName: data.tool_name,
          });
          updateAgentState(data.agent_id, 'thinking');
          break;

        case 'Result': {
          console.log('[Event] Result - completing agent', data.agent_id, 'success:', data.success);
          completeAgent(data.agent_id, data.success);
          const resultAgent = agents[data.agent_id];
          console.log('[Event] Result - found agent?', !!resultAgent, resultAgent?.workspaceId);
          if (resultAgent) {
            updateWorkspaceState(
              resultAgent.workspaceId,
              data.success ? 'success' : 'error'
            );
            // Add desk clutter on task completion
            incrementMessiness(resultAgent.workspaceId, data.success ? 15 : 5);

            // Store the full output from the agent for workflow piping (concatenate all messages)
            if (data.success) {
              const logs = resultAgent.logs || [];
              const allMessages = logs.filter((l) => l.type === 'message');
              const fullOutput = allMessages.map((m) => m.content).join('\n\n');
              if (fullOutput) {
                setLastOutput(resultAgent.workspaceId, fullOutput);
              }

              // Trigger auto-run on downstream workspaces
              const downstreamIds = getDownstreamWorkspaces(resultAgent.workspaceId);
              downstreamIds.forEach((downstreamId) => {
                const downstream = workspaces[downstreamId];
                if (downstream?.autoRun && downstream.taskTemplate) {
                  // Check if all inputs are complete
                  const allInputsComplete = downstream.inputConnections?.every((inputId) => {
                    const inputWs = workspaces[inputId];
                    return inputWs?.state === 'success' && inputWs?.lastOutput;
                  });

                  if (allInputsComplete) {
                    // Emit a custom event to trigger the task
                    // This will be picked up by the app to start the task
                    window.dispatchEvent(
                      new CustomEvent('trigger-workflow-task', {
                        detail: { workspaceId: downstreamId },
                      })
                    );
                  }
                }
              });
            }
          }
          appendLog(data.agent_id, {
            type: data.success ? 'info' : 'error',
            content: `Task ${data.success ? 'completed' : 'failed'} in ${data.duration_ms}ms`,
          });
          setStatusMessage(data.success ? 'Task completed!' : 'Task failed');
          break;
        }

        case 'Error':
          setAgentError(data.agent_id, data.message);
          appendLog(data.agent_id, {
            type: 'error',
            content: data.message,
          });
          setStatusMessage(`Error: ${data.message}`);
          break;

        case 'Stopped': {
          const stoppedAgent = agents[data.agent_id];
          if (stoppedAgent) {
            if (data.reason === 'cancelled') {
              updateWorkspaceState(stoppedAgent.workspaceId, 'occupied');
              updateAgentState(data.agent_id, 'idle');
            }
          }
          appendLog(data.agent_id, {
            type: 'info',
            content: `Agent stopped: ${data.reason}`,
          });
          break;
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []); // Empty deps - we get fresh state inside the handler
}
