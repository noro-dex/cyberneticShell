export const CANVAS_COLORS = {
  background: 0x1a1a2e,
  surface: 0x16213e,
  border: 0x0f3460,
  grid: 0x252540,
  selection: 0xffd700,
  drawing: 0x4299e1,
};

export const WORKSPACE_COLORS = {
  empty: { fill: 0x2d3748, border: 0x4a5568, label: '#a0aec0' },
  occupied: { fill: 0x3d4a5c, border: 0x5a6b7c, label: '#cbd5e0' },
  working: { fill: 0x2c5282, border: 0x3182ce, label: '#90cdf4' },
  success: { fill: 0x276749, border: 0x38a169, label: '#9ae6b4' },
  error: { fill: 0x9b2c2c, border: 0xe53e3e, label: '#feb2b2' },
};

export const AGENT_COLORS = {
  idle: 0xa0aec0,
  thinking: 0x9f7aea,
  reading: 0x4299e1,
  writing: 0xed8936,
  running: 0x48bb78,
  searching: 0xecc94b,
  success: 0x38a169,
  error: 0xe53e3e,
};

export function hexToString(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

export function stringToHex(str: string): number {
  return parseInt(str.replace('#', ''), 16);
}
