import React from 'react';

export type BadgeVariant = 
  | 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'IDLE' | 'FAULT' | 'OVERLOADED' 
  | 'STARTING' | 'MAINTENANCE' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' 
  | 'NORMAL' | 'WARNING' | 'ACKNOWLEDGED' | 'SENT' | 'REQUESTED' | 'TIMEOUT';

interface ScadaBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const ScadaBadge: React.FC<ScadaBadgeProps> = ({ status, size = 'sm', pulse = false }) => {
  const norm = status?.toUpperCase() || 'UNKNOWN';

  let bg = 'bg-[#222B35]';
  let text = 'text-[#8D9AA7]';
  let dot = 'bg-[#8D9AA7]';
  let border = 'border-[#303A44]';

  switch (norm) {
    case 'ONLINE':
    case 'RUNNING':
    case 'NORMAL':
    case 'ACKNOWLEDGED':
      bg = 'bg-[#35C98A]/10';
      text = 'text-[#35C98A]';
      dot = 'bg-[#35C98A]';
      border = 'border-[#35C98A]/30';
      break;
    case 'IDLE':
    case 'WARNING':
    case 'MEDIUM':
    case 'HIGH':
    case 'STARTING':
      bg = 'bg-[#F0B44D]/10';
      text = 'text-[#F0B44D]';
      dot = 'bg-[#F0B44D]';
      border = 'border-[#F0B44D]/30';
      break;
    case 'FAULT':
    case 'CRITICAL':
    case 'OVERLOADED':
    case 'TIMEOUT':
    case 'OFFLINE':
      bg = 'bg-[#EF5555]/10';
      text = 'text-[#EF5555]';
      dot = 'bg-[#EF5555]';
      border = 'border-[#EF5555]/30';
      break;
    case 'MAINTENANCE':
    case 'REQUESTED':
    case 'SENT':
      bg = 'bg-[#38BDF8]/10';
      text = 'text-[#38BDF8]';
      dot = 'bg-[#38BDF8]';
      border = 'border-[#38BDF8]/30';
      break;
  }

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded border ${bg} ${text} ${border} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{norm}</span>
    </span>
  );
};

export default ScadaBadge;

