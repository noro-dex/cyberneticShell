import type { AgentState } from '../types/agent';
import type { WorkspaceState } from '../types/workspace';

export const AGENT_EMOJIS: Record<AgentState, string> = {
  idle: '🧑‍💻',
  thinking: '🤔',
  reading: '📖',
  writing: '✍️',
  running: '🏃',
  searching: '🔍',
  success: '🎉',
  error: '😵',
};

export const WORKSPACE_EMOJIS: Record<WorkspaceState, string> = {
  empty: '📋',
  occupied: '🧑‍💻',
  working: '⚡',
  success: '✅',
  error: '❌',
};

export const DESK_CLUTTER_EMOJIS = ['☕', '📄', '🪴', '📝', '📚', '🖊️', '📎', '🗂️', '💾', '🎧'];

export const CONFETTI_EMOJIS = ['🎉', '✨', '🌟', '💫', '🎊', '⭐', '🔥', '💥'];

export function getRandomDeskClutter(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * DESK_CLUTTER_EMOJIS.length);
    result.push(DESK_CLUTTER_EMOJIS[idx]);
  }
  return result;
}

export function getRandomConfetti(): string {
  return CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
}
