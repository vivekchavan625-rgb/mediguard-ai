import { forwardRef } from 'react';
import { classNames } from '@mediguard/shared/utils';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onValueChange, children, ...props }, ref) => (
    <div ref={ref} data-value={value} {...props}>
      {children}
    </div>
  )
);

Select.displayName = 'Select';

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={classNames(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ placeholder, ...props }, ref) => (
    <span ref={ref} className="text-gray-400" {...props}>
      {placeholder}
    </span>
  )
);

SelectValue.displayName = 'SelectValue';

export const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={classNames(
        'absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-value={value}
      className={classNames(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-white',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

SelectItem.displayName = 'SelectItem';