import { useEffect, useRef } from 'react';
import { useAgentsStore } from '../../stores/agents';
import { useUIStore } from '../../stores/ui';
import type { LogEntry } from '../../types/agent';

const LOG_TYPE_STYLES: Record<LogEntry['type'], { icon: string; color: string }> = {
  info: { icon: 'ℹ️', color: 'text-blue-400' },
  tool: { icon: '🔧', color: 'text-purple-400' },
  result: { icon: '✅', color: 'text-green-400' },
  error: { icon: '❌', color: 'text-red-400' },
  message: { icon: '💬', color: 'text-gray-300' },
};

export function LogViewer() {
  const { selectedAgentId, selectedWorkspaceId } = useUIStore();
  const agents = useAgentsStore((s) => s.agents);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get logs from selected agent, or from agent in selected workspace
  let logs: LogEntry[] = [];
  if (selectedAgentId && agents[selectedAgentId]) {
    logs = agents[selectedAgentId].logs;
  } else if (selectedWorkspaceId) {
    const agent = Object.values(agents).find((a) => a.workspaceId === selectedWorkspaceId);
    if (agent) {
      logs = agent.logs;
    }
  }

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-2xl mb-2">📜</p>
        <p className="text-sm">No logs yet</p>
        <p className="text-xs mt-1">Logs will appear here when an agent runs</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div ref={containerRef} className="overflow-y-auto h-full font-mono text-xs">
      {logs.map((log) => {
        const style = LOG_TYPE_STYLES[log.type];
        return (
          <div
            key={log.id}
            className="px-3 py-1.5 border-b border-gray-800 hover:bg-gray-800/50"
          >
            <div className="flex items-start space-x-2">
              <span className="text-gray-500 flex-shrink-0">{formatTime(log.timestamp)}</span>
              <span className="flex-shrink-0">{style.icon}</span>
              <span className={`${style.color} break-all`}>{log.content}</span>
            </div>
            {log.toolName && log.toolInput && (
              <div className="mt-1 ml-16 text-gray-500 text-[10px]">
                <details>
                  <summary className="cursor-pointer hover:text-gray-400">
                    {log.toolName} input
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-900 rounded overflow-x-auto">
                    {JSON.stringify(log.toolInput, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
