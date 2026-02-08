import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'primary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40': variant === 'default',
            'codolio-btn-primary': variant === 'primary',
            'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25': variant === 'destructive',
            'border-2 border-orange-200 bg-white hover:bg-orange-50 text-slate-700 hover:border-orange-300': variant === 'outline',
            'hover:bg-orange-50 text-slate-700 hover:text-orange-700': variant === 'ghost',
            'text-orange-600 underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-11 px-5 py-2.5': size === 'default',
            'h-9 rounded-lg px-4 text-xs': size === 'sm',
            'h-12 rounded-xl px-8 text-base': size === 'lg',
            'h-9 w-9 p-0 rounded-lg': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
