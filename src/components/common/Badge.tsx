import type { AgentState } from '../../types/agent';
import type { WorkspaceState } from '../../types/workspace';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | AgentState | WorkspaceState;

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-gray-700 text-gray-300',
  success: 'bg-green-900 text-green-300',
  error: 'bg-red-900 text-red-300',
  warning: 'bg-yellow-900 text-yellow-300',
  info: 'bg-blue-900 text-blue-300',
  // Agent states
  idle: 'bg-gray-700 text-gray-300',
  thinking: 'bg-purple-900 text-purple-300',
  reading: 'bg-blue-900 text-blue-300',
  writing: 'bg-orange-900 text-orange-300',
  running: 'bg-green-900 text-green-300',
  searching: 'bg-yellow-900 text-yellow-300',
  // Workspace states
  empty: 'bg-gray-700 text-gray-300',
  occupied: 'bg-gray-600 text-gray-200',
  working: 'bg-blue-900 text-blue-300',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const classes = variantClasses[variant] || variantClasses.default;

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-full
        ${classes}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
