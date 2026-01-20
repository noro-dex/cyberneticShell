import { useCallback, useEffect, useRef } from 'react';
import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { useWorkspacesStore } from '../stores/workspaces';
import { useAgentsStore } from '../stores/agents';
import { useUIStore } from '../stores/ui';
import { CANVAS_COLORS, WORKSPACE_COLORS } from '../utils/colors';
import { WORKSPACE_EMOJIS, AGENT_EMOJIS, getRandomConfetti } from '../utils/emoji';
import { MIN_WORKSPACE_SIZE } from '../types/workspace';

interface Particle {
  text: Text;
  vx: number;
  vy: number;
  rotationSpeed: number;
  alpha: number;
}

export function CanvasRoot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<Graphics | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const prevAgentStatesRef = useRef<Record<string, string>>({});
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const drawing = useWorkspacesStore((s) => s.drawing);
  const { startDrawing, updateDrawing, finishDrawing, addWorkspace } = useWorkspacesStore();
  const agents = useAgentsStore((s) => s.agents);
  const { selectedWorkspaceId, selectWorkspace, showOutputModal } = useUIStore();

  // Initialize PixiJS
  useEffect(() => {
    mountedRef.current = true;

    if (!containerRef.current || initializedRef.current) return;

    const container = containerRef.current;

    const initApp = async () => {
      if (initializedRef.current || !mountedRef.current) return;
      initializedRef.current = true;

      const app = new Application();

      try {
        await app.init({
          background: CANVAS_COLORS.background,
          resizeTo: container,
          antialias: true,
        });

        if (!mountedRef.current) {
          app.destroy(true, { children: true });
          return;
        }

        container.appendChild(app.canvas);
        appRef.current = app;

        const graphics = new Graphics();
        app.stage.addChild(graphics);
        graphicsRef.current = graphics;

        app.ticker.add(() => {
          if (!mountedRef.current) return;
          renderCanvas();
          updateParticles();
        });
      } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
        initializedRef.current = false;
      }
    };

    initApp();

    return () => {
      mountedRef.current = false;
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true });
        } catch (e) {
          // Ignore cleanup errors
        }
        appRef.current = null;
        graphicsRef.current = null;
      }
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    Object.values(agents).forEach((agent) => {
      const prevState = prevAgentStatesRef.current[agent.id];
      if (agent.state === 'success' && prevState !== 'success') {
        const workspace = workspaces[agent.workspaceId];
        if (workspace && appRef.current) {
          spawnConfetti(
            workspace.x + workspace.width / 2,
            workspace.y + workspace.height / 2
          );
        }
      }
      prevAgentStatesRef.current[agent.id] = agent.state;
    });
  }, [agents, workspaces]);

  const spawnConfetti = (x: number, y: number) => {
    if (!appRef.current) return;

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 4;

      const text = new Text({
        text: getRandomConfetti(),
        style: new TextStyle({ fontSize: 20 }),
      });
      text.x = x;
      text.y = y;
      text.anchor.set(0.5);

      appRef.current.stage.addChild(text);

      particlesRef.current.push({
        text,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      });
    }
  };

  const updateParticles = () => {
    if (!appRef.current) return;

    particlesRef.current = particlesRef.current.filter((p) => {
      p.text.x += p.vx;
      p.text.y += p.vy;
      p.vy += 0.15;
      p.text.rotation += p.rotationSpeed;
      p.alpha -= 0.015;
      p.text.alpha = p.alpha;

      if (p.alpha <= 0) {
        if (appRef.current) {
          appRef.current.stage.removeChild(p.text);
        }
        p.text.destroy();
        return false;
      }
      return true;
    });
  };

  const renderCanvas = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    g.clear();

    // Draw grid pattern for visual reference
    g.setStrokeStyle({ width: 1, color: 0x252540, alpha: 0.3 });
    for (let x = 0; x < 2000; x += 50) {
      g.moveTo(x, 0);
      g.lineTo(x, 2000);
    }
    for (let y = 0; y < 2000; y += 50) {
      g.moveTo(0, y);
      g.lineTo(2000, y);
    }
    g.stroke();

    // Draw workspaces
    Object.values(workspaces).forEach((workspace) => {
      const colors = WORKSPACE_COLORS[workspace.state];
      const isSelected = selectedWorkspaceId === workspace.id;

      // Fill
      g.setFillStyle({ color: colors.fill, alpha: 0.85 });
      g.rect(workspace.x, workspace.y, workspace.width, workspace.height);
      g.fill();

      // Selection glow effect (draw before border)
      if (isSelected) {
        // Outer glow layers for pulsing effect
        g.setStrokeStyle({ width: 8, color: 0xffd700, alpha: 0.15 });
        g.rect(workspace.x - 6, workspace.y - 6, workspace.width + 12, workspace.height + 12);
        g.stroke();

        g.setStrokeStyle({ width: 4, color: 0xffd700, alpha: 0.3 });
        g.rect(workspace.x - 3, workspace.y - 3, workspace.width + 6, workspace.height + 6);
        g.stroke();

        // Selection highlight fill
        g.setFillStyle({ color: 0xffd700, alpha: 0.08 });
        g.rect(workspace.x, workspace.y, workspace.width, workspace.height);
        g.fill();
      }

      // Border
      g.setStrokeStyle({
        width: isSelected ? 4 : 2,
        color: isSelected ? 0xffd700 : colors.border,
        alpha: 1,
      });
      g.rect(workspace.x, workspace.y, workspace.width, workspace.height);
      g.stroke();

      // Agent background circle
      const agent = workspace.agentId ? agents[workspace.agentId] : null;
      if (agent) {
        const cx = workspace.x + workspace.width / 2;
        const cy = workspace.y + workspace.height / 2;
        g.setFillStyle({ color: 0x1a1a2e, alpha: 0.8 });
        g.circle(cx, cy, 28);
        g.fill();
        g.setStrokeStyle({ width: 2, color: colors.border, alpha: 0.6 });
        g.circle(cx, cy, 28);
        g.stroke();
      }
    });

    // Draw workspace creation preview
    if (drawing.isDrawing && drawing.start && drawing.current) {
      const x = Math.min(drawing.start.x, drawing.current.x);
      const y = Math.min(drawing.start.y, drawing.current.y);
      const width = Math.abs(drawing.current.x - drawing.start.x);
      const height = Math.abs(drawing.current.y - drawing.start.y);

      const isValid = width >= MIN_WORKSPACE_SIZE && height >= MIN_WORKSPACE_SIZE;
      const color = isValid ? 0x4299e1 : 0xff6b6b;

      // Fill preview
      g.setFillStyle({ color, alpha: 0.15 });
      g.rect(x, y, width, height);
      g.fill();

      // Border preview (dashed effect via segments)
      g.setStrokeStyle({ width: 3, color, alpha: 1 });
      g.rect(x, y, width, height);
      g.stroke();

      // Corner handles
      const handleSize = 10;
      const corners = [
        { x, y },
        { x: x + width, y },
        { x, y: y + height },
        { x: x + width, y: y + height },
      ];

      g.setFillStyle({ color, alpha: 1 });
      for (const corner of corners) {
        g.rect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
        g.fill();
      }
    }
  }, [workspaces, drawing, selectedWorkspaceId, agents]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clickedWorkspace = Object.values(workspaces).find(
        (ws) => x >= ws.x && x <= ws.x + ws.width && y >= ws.y && y <= ws.y + ws.height
      );

      if (clickedWorkspace) {
        selectWorkspace(clickedWorkspace.id);
      } else {
        startDrawing(x, y);
      }
    },
    [workspaces, startDrawing, selectWorkspace]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing.isDrawing) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateDrawing(x, y);
    },
    [drawing.isDrawing, updateDrawing]
  );

  const handlePointerUp = useCallback(() => {
    const result = finishDrawing();
    if (result) {
      const id = addWorkspace({
        name: '',
        x: result.x,
        y: result.y,
        width: result.width,
        height: result.height,
        state: 'empty',
        agentId: null,
        messiness: Math.floor(Math.random() * 30),
      });
      selectWorkspace(id);
    }
  }, [finishDrawing, addWorkspace, selectWorkspace]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Workspace overlays - Clear Agent Card Design */}
      {Object.values(workspaces).map((workspace) => {
        const agent = workspace.agentId ? agents[workspace.agentId] : null;
        const isSelected = selectedWorkspaceId === workspace.id;
        const stateColors = WORKSPACE_COLORS[workspace.state];

        // Determine status info
        const getStatusInfo = () => {
          if (!agent) return { label: 'READY', color: '#6b7280', bg: 'bg-gray-700' };
          switch (agent.state) {
            case 'thinking': return { label: 'THINKING...', color: '#fbbf24', bg: 'bg-yellow-600' };
            case 'reading': return { label: 'READING FILES', color: '#60a5fa', bg: 'bg-blue-600' };
            case 'writing': return { label: 'WRITING CODE', color: '#a78bfa', bg: 'bg-purple-600' };
            case 'running': return { label: 'RUNNING', color: '#34d399', bg: 'bg-green-600' };
            case 'searching': return { label: 'SEARCHING', color: '#f472b6', bg: 'bg-pink-600' };
            case 'success': return { label: 'COMPLETED!', color: '#10b981', bg: 'bg-emerald-600' };
            case 'error': return { label: 'ERROR', color: '#ef4444', bg: 'bg-red-600' };
            default: return { label: 'IDLE', color: '#9ca3af', bg: 'bg-gray-600' };
          }
        };
        const status = getStatusInfo();

        // Get border color based on state and selection
        const borderColor = isSelected ? '#ffd700' :
          workspace.state === 'working' ? '#3182ce' :
          workspace.state === 'success' ? '#38a169' :
          workspace.state === 'error' ? '#e53e3e' :
          '#4a5568';

        // Get background color based on state
        const getBgColor = () => {
          if (workspace.state === 'success') return 'rgba(16, 185, 129, 0.15)'; // green tint
          if (workspace.state === 'error') return 'rgba(239, 68, 68, 0.15)'; // red tint
          if (workspace.state === 'working') return 'rgba(59, 130, 246, 0.1)'; // blue tint
          if (isSelected) return 'rgba(255, 215, 0, 0.05)'; // gold tint
          return 'rgba(26, 26, 46, 0.9)'; // default dark
        };

        // Get the last message from agent logs (the response)
        const lastMessage = agent?.logs?.filter(l => l.type === 'message').pop();

        // Generate desk clutter based on messiness
        const clutterItems = [];
        const clutterEmojis = ['☕', '📄', '📝', '📚', '🪴', '✏️', '📎', '🗂️', '💾', '🖊️'];
        const numClutter = Math.floor(workspace.messiness / 10);
        for (let i = 0; i < numClutter; i++) {
          const emoji = clutterEmojis[i % clutterEmojis.length];
          const x = 10 + (i * 17) % (workspace.width - 40);
          const y = workspace.height - 35 - Math.floor(i / 3) * 15;
          clutterItems.push({ emoji, x, y, rotation: (i * 23) % 30 - 15 });
        }

        return (
          <div
            key={workspace.id}
            className={`absolute pointer-events-none rounded-lg transition-all duration-500 ${
              isSelected ? 'shadow-lg shadow-yellow-500/30' : ''
            } ${workspace.state === 'success' ? 'shadow-lg shadow-emerald-500/30' : ''}`}
            style={{
              left: workspace.x,
              top: workspace.y,
              width: workspace.width,
              height: workspace.height,
              border: `3px solid ${borderColor}`,
              backgroundColor: getBgColor(),
            }}
          >
            {/* Main content card */}
            <div className="w-full h-full flex flex-col p-3">
              {/* Header: Title + Status */}
              <div className={`flex items-center justify-between mb-2 px-2 py-1 rounded ${
                isSelected ? 'bg-yellow-500/20' : 'bg-black/30'
              }`}>
                <span className={`text-sm font-bold ${isSelected ? 'text-yellow-400' : 'text-white'}`}>
                  {isSelected && '▸ '}
                  {workspace.name || `Workspace ${workspace.id.slice(0, 4)}`}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${status.bg}`} style={{ color: 'white' }}>
                  {status.label}
                </span>
              </div>

              {/* Center: Agent Avatar Area */}
              <div className="flex-1 flex items-center justify-center">
                {agent ? (
                  <div className="flex flex-col items-center">
                    {/* Agent Avatar with background */}
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                        agent.state === 'success' ? 'border-emerald-500 bg-emerald-900/50' :
                        agent.state === 'error' ? 'border-red-500 bg-red-900/50' :
                        agent.state === 'idle' ? 'border-gray-500 bg-gray-900/50' :
                        'border-blue-500 bg-blue-900/50'
                      }`}
                      style={{
                        animation: ['thinking', 'reading', 'writing', 'running', 'searching'].includes(agent.state)
                          ? 'pulse 2s infinite'
                          : 'none',
                      }}
                    >
                      <span className="text-3xl">{AGENT_EMOJIS[agent.state]}</span>
                    </div>

                    {/* Task preview OR Response preview */}
                    {agent.state === 'success' && lastMessage ? (
                      <div
                        className="mt-2 px-3 py-2 bg-emerald-900/50 rounded max-w-[95%] border border-emerald-700/50 cursor-pointer pointer-events-auto hover:bg-emerald-800/50 transition-colors"
                        onClick={() => showOutputModal(agent.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-emerald-400 font-bold">✓ Response:</span>
                          <span className="text-[9px] text-emerald-500">Click to expand ↗</span>
                        </div>
                        <div className="text-xs text-emerald-100 line-clamp-3 overflow-hidden"
                             style={{ maxHeight: '3.6em' }}>
                          {lastMessage.content.slice(0, 150)}{lastMessage.content.length > 150 ? '...' : ''}
                        </div>
                      </div>
                    ) : agent.task ? (
                      <div className="mt-2 px-3 py-1 bg-black/50 rounded max-w-[90%]">
                        <div className="text-[10px] text-gray-400 mb-0.5">Current Task:</div>
                        <div className="text-xs text-white truncate max-w-[180px]" title={agent.task}>
                          "{agent.task.slice(0, 40)}{agent.task.length > 40 ? '...' : ''}"
                        </div>
                      </div>
                    ) : null}

                    {/* Progress bar */}
                    {agent.state !== 'idle' && agent.state !== 'success' && agent.state !== 'error' && (
                      <div className="mt-2 w-24">
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{
                              width: agent.progress > 0 ? `${agent.progress}%` : '100%',
                              animation: agent.progress === 0 ? 'indeterminate 1.5s infinite linear' : 'none',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty workspace state */
                  <div className="flex flex-col items-center text-gray-500">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
                      <span className="text-2xl opacity-50">🤖</span>
                    </div>
                    <span className="text-xs mt-2">No agent assigned</span>
                    <span className="text-[10px] mt-1">Select & enter a task →</span>
                  </div>
                )}
              </div>

              {/* Desk clutter at bottom */}
              {clutterItems.length > 0 && (
                <div className="absolute bottom-2 left-0 right-0 h-8 overflow-hidden pointer-events-none">
                  {clutterItems.map((item, i) => (
                    <span
                      key={i}
                      className="absolute text-sm opacity-60"
                      style={{
                        left: item.x,
                        bottom: 0,
                        transform: `rotate(${item.rotation}deg)`,
                      }}
                    >
                      {item.emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer: Logs count if has agent */}
              {agent && agent.logs && agent.logs.length > 0 && (
                <div className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                  📋 {agent.logs.length}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Drawing preview border (DOM-based for visibility) */}
      {drawing.isDrawing && drawing.start && drawing.current && (() => {
        const x = Math.min(drawing.start.x, drawing.current.x);
        const y = Math.min(drawing.start.y, drawing.current.y);
        const width = Math.abs(drawing.current.x - drawing.start.x);
        const height = Math.abs(drawing.current.y - drawing.start.y);
        const isValid = width >= MIN_WORKSPACE_SIZE && height >= MIN_WORKSPACE_SIZE;
        const color = isValid ? '#4299e1' : '#ff6b6b';

        return (
          <>
            {/* Drawing rectangle */}
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                left: x,
                top: y,
                width: width,
                height: height,
                border: `3px dashed ${color}`,
                backgroundColor: isValid ? 'rgba(66, 153, 225, 0.1)' : 'rgba(255, 107, 107, 0.1)',
              }}
            >
              {/* Corner handles */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            </div>

            {/* Dimensions label */}
            <div
              className="absolute text-sm font-mono font-bold pointer-events-none px-3 py-1 rounded bg-black/80"
              style={{
                left: x + width / 2,
                top: y + height + 10,
                transform: 'translateX(-50%)',
                color: color,
              }}
            >
              {Math.round(width)} × {Math.round(height)}
              {!isValid && <span className="ml-2 text-xs opacity-70">(min {MIN_WORKSPACE_SIZE}px)</span>}
            </div>
          </>
        );
      })()}

      {/* Empty state instructions */}
      {Object.keys(workspaces).length === 0 && !drawing.isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-black/40 px-8 py-6 rounded-xl">
            <p className="text-xl mb-3 text-gray-300">Click and drag to create a workspace</p>
            <p className="text-sm text-gray-500">Each workspace can run one Claude agent task</p>
            <div className="mt-4 text-xs text-gray-600">
              Minimum size: {MIN_WORKSPACE_SIZE} × {MIN_WORKSPACE_SIZE} pixels
            </div>
          </div>
        </div>
      )}

      {/* Help tooltip */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-black/40 px-3 py-2 rounded pointer-events-none">
        <div>🖱️ Drag to create workspace</div>
        <div>👆 Click workspace to select</div>
        <div>📝 Use sidebar to assign tasks</div>
      </div>
    </div>
  );
}
