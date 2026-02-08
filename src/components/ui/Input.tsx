import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={clsx(
          'flex h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm',
          'ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-slate-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-transparent',
          'hover:border-orange-200 transition-all duration-200',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
