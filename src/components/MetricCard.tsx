import React from 'react';
import { LucideIcon } from 'lucide-react';

export type MetricVariant = 'brand' | 'profit' | 'expense' | 'warning' | 'neutral';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  icon: LucideIcon;
  variant?: MetricVariant;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  variant = 'brand',
  onClick,
}) => {
  const variantStyles: Record<
    MetricVariant,
    { border: string; bg: string; iconBg: string; text: string }
  > = {
    brand: {
      border: 'border-brand-500/30',
      bg: 'bg-dark-card hover:bg-dark-cardHover',
      iconBg: 'bg-brand-500/20 text-brand-400',
      text: 'text-brand-300',
    },
    profit: {
      border: 'border-profit/30',
      bg: 'bg-profit-bg/20 hover:bg-profit-bg/30',
      iconBg: 'bg-profit/20 text-profit-light',
      text: 'text-profit-light',
    },
    expense: {
      border: 'border-expense/30',
      bg: 'bg-expense-bg/20 hover:bg-expense-bg/30',
      iconBg: 'bg-expense/20 text-expense-light',
      text: 'text-expense-light',
    },
    warning: {
      border: 'border-warning/30',
      bg: 'bg-warning-bg/20 hover:bg-warning-bg/30',
      iconBg: 'bg-warning/20 text-warning-light',
      text: 'text-warning-light',
    },
    neutral: {
      border: 'border-dark-border',
      bg: 'bg-dark-card hover:bg-dark-cardHover',
      iconBg: 'bg-white/10 text-dark-muted',
      text: 'text-white',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-2xl border ${style.border} ${style.bg} transition shadow-sm ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-dark-muted">{title}</span>
        <div className={`p-2 rounded-xl ${style.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-xl font-extrabold tracking-tight ${style.text}`}>
          {value}
        </span>
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-dark-muted font-medium">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-dark-muted line-clamp-1">{subtitle}</p>
      )}
    </div>
  );
};
