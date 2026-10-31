import React from 'react';

interface ScadaCardProps {
  title?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const ScadaCard: React.FC<ScadaCardProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  noPadding = false
}) => {
  return (
    <div className={`bg-[#1C242C] border border-[#303A44] rounded shadow-sm overflow-hidden ${className}`}>
      {(title || action || badge) && (
        <div className="px-4 py-3 border-b border-[#303A44] bg-[#182027] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {typeof title === 'string' ? (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8EDF2] truncate font-mono">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <span className="text-[11px] text-[#8D9AA7] hidden sm:inline">
                {subtitle}
              </span>
            )}
            {badge}
          </div>
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
};

export default ScadaCard;

