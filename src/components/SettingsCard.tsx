import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface SettingsCardProps {
  id?: string;
  icon: React.ElementType;
  iconBg?: string;
  title: string;
  description: string;
  badge?: {
    text: string;
    variant?: 'comingSoon' | 'archived' | 'neutral' | 'success' | 'warning' | 'info';
  };
  onClick?: () => void;
  clickable?: boolean;
  disabled?: boolean;
  rightElement?: React.ReactNode;
}

export default function SettingsCard({
  id,
  icon: Icon,
  iconBg = 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  title,
  description,
  badge,
  onClick,
  clickable = true,
  disabled = false,
  rightElement
}: SettingsCardProps) {
  const isClickable = clickable && !disabled;

  const getBadgeStyle = () => {
    if (!badge) return '';
    switch (badge.variant) {
      case 'comingSoon':
        return 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-gray-200/60 dark:border-zinc-700/60';
      case 'archived':
        return 'bg-amber-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-500/20';
      case 'neutral':
      default:
        return 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  if (!isClickable) {
    return (
      <div 
        id={id}
        className="w-full flex items-center justify-between p-4 bg-gray-50/60 dark:bg-[#20201a]/40 border border-gray-200/50 dark:border-[#8a8a70]/10 rounded-xl opacity-65 cursor-not-allowed select-none"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-gray-200/60 dark:bg-zinc-800 text-gray-500 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-700 dark:text-gray-300 uppercase">
                {title}
              </span>
              {badge && (
                <span className={getBadgeStyle()}>
                  {badge.text}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
              {description}
            </p>
          </div>
        </div>
        {rightElement}
      </div>
    );
  }

  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-[#20201a] hover:bg-amber-50/60 dark:hover:bg-amber-950/20 border border-gray-200/80 dark:border-[#8a8a70]/20 hover:border-amber-400/50 rounded-xl transition-all duration-200 cursor-pointer group text-left shadow-2xs hover:shadow-md active:scale-[0.995] outline-none focus:ring-2 focus:ring-amber-500/40"
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-gray-900 dark:text-gray-100 uppercase group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {title}
            </span>
            {badge && (
              <span className={getBadgeStyle()}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase mt-0.5">
            {description}
          </p>
        </div>
      </div>
      {rightElement || (
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
      )}
    </div>
  );
}
