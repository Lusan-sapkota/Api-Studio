import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function SidebarItem({ icon: Icon, label, active, onClick, badge }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-colors ${
        active
          ? 'bg-primary-500/10 text-primary-500 dark:bg-primary-500/20'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-dark/50 dark:hover:bg-surface-darker hover:text-neutral-900 dark:hover:text-neutral-200'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent-500 text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
