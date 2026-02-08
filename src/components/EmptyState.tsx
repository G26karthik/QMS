import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  size = 'md' 
}: EmptyStateProps) {
  return (
    <div className={clsx(
      'text-center glass rounded-2xl',
      {
        'py-8 px-6': size === 'sm',
        'py-12 px-8': size === 'md',
        'py-16 px-10': size === 'lg',
      }
    )}>
      <div className={clsx(
        'inline-flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4',
        {
          'w-12 h-12': size === 'sm',
          'w-16 h-16': size === 'md',
          'w-20 h-20': size === 'lg',
        }
      )}>
        {icon}
      </div>
      <h3 className={clsx(
        'font-semibold text-slate-800 mb-2',
        {
          'text-base': size === 'sm',
          'text-lg': size === 'md',
          'text-xl': size === 'lg',
        }
      )}>
        {title}
      </h3>
      {description && (
        <p className={clsx(
          'text-slate-500 mb-4 max-w-sm mx-auto',
          {
            'text-sm': size === 'sm',
            'text-base': size === 'md' || size === 'lg',
          }
        )}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
