import React, { forwardRef } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

// ============================================================================
// 1. DESIGN SYSTEM TYPE DEFINITIONS & CONTANTS
// ============================================================================

export type ThemeVariant = 'olive' | 'slate' | 'blue' | 'green' | 'orange' | 'red' | 'purple';

// ============================================================================
// 2. BUTTON COMPONENT
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const baseStyle = "inline-flex items-center justify-center gap-2 font-bold uppercase transition-all duration-200 cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-[10px] h-9 rounded-lg",
    md: "px-4 py-2.5 text-xs h-11 rounded-xl",
    lg: "px-6 py-3.5 text-xs h-12 rounded-full",
  };

  const variantStyles = {
    primary: "bg-primary-olive text-white hover:bg-primary-olive-dark shadow-md shadow-primary-olive/15 border border-transparent",
    secondary: "bg-secondary-slate text-white hover:bg-slate-800 shadow-md border border-transparent",
    success: "bg-accent-green text-white hover:bg-emerald-600 shadow-md border border-transparent",
    danger: "bg-accent-red text-white hover:bg-red-600 shadow-md border border-transparent",
    warning: "bg-accent-orange text-white hover:bg-amber-600 shadow-md border border-transparent",
    info: "bg-accent-blue text-white hover:bg-blue-600 shadow-md border border-transparent",
    outline: "bg-white dark:bg-[#1a1a15] text-crm-text dark:text-[#ecece5] hover:bg-slate-50 border border-crm-border dark:border-[#8a8a70]/30",
    ghost: "bg-transparent text-crm-text dark:text-[#ecece5] hover:bg-slate-50 border border-transparent",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {!loading && icon && <span className="shrink-0">{icon}</span>}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});

Button.displayName = 'Button';

// ============================================================================
// 3. INPUT FIELD COMPONENT
// ============================================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  error,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseStyle = "w-full text-xs bg-[#F8FAFC] dark:bg-[#151510]/50 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 text-[#1F2937] dark:text-[#ecece5] transition-all font-medium uppercase placeholder-gray-400";
  const stateStyle = error
    ? "border-rose-400 focus:ring-rose-400/20 focus:border-rose-500"
    : "border-gray-200 dark:border-[#8a8a70]/30 focus:ring-accent-blue/20 focus:border-accent-blue";

  return (
    <input
      ref={ref}
      disabled={disabled}
      className={`${baseStyle} ${stateStyle} ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';

// ============================================================================
// 4. SELECT COMPONENT
// ============================================================================

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  error,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const baseStyle = "w-full text-xs bg-[#F8FAFC] dark:bg-[#151510]/50 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 text-[#1F2937] dark:text-[#ecece5] transition-all font-bold uppercase cursor-pointer";
  const stateStyle = error
    ? "border-rose-400 focus:ring-rose-400/20 focus:border-rose-500"
    : "border-gray-200 dark:border-[#8a8a70]/30 focus:ring-accent-blue/20 focus:border-accent-blue";

  return (
    <select
      ref={ref}
      disabled={disabled}
      className={`${baseStyle} ${stateStyle} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

// ============================================================================
// 5. TEXTAREA COMPONENT
// ============================================================================

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  error,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseStyle = "w-full text-xs bg-[#F8FAFC] dark:bg-[#151510]/50 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 text-[#1F2937] dark:text-[#ecece5] transition-all font-medium uppercase placeholder-gray-400 resize-none";
  const stateStyle = error
    ? "border-rose-400 focus:ring-rose-400/20 focus:border-rose-500"
    : "border-gray-200 dark:border-[#8a8a70]/30 focus:ring-accent-blue/20 focus:border-accent-blue";

  return (
    <textarea
      ref={ref}
      disabled={disabled}
      className={`${baseStyle} ${stateStyle} ${className}`}
      {...props}
    />
  );
});

TextArea.displayName = 'TextArea';

// ============================================================================
// 6. FORM GROUP WRAPPER
// ============================================================================

export interface FormGroupProps {
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  error,
  description,
  required,
  htmlFor,
  className = '',
  children
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {description && (
        <p className="text-[9px] text-gray-400 uppercase font-semibold">{description}</p>
      )}
      {error && (
        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{error}</p>
      )}
    </div>
  );
};

// ============================================================================
// 7. CARD COMPONENT
// ============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline';
  borderTopColor?: 'olive' | 'green' | 'blue' | 'red' | 'purple' | 'none';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  borderTopColor = 'none',
  className = '',
  children,
  ...props
}) => {
  const baseStyle = "rounded-[20px] p-6 transition-all duration-200";
  
  const borderTopStyles = {
    none: "border border-gray-200 dark:border-[#8a8a70]/20",
    olive: "border border-gray-200 dark:border-[#8a8a70]/20 border-t-4 border-t-primary-olive",
    green: "border border-gray-200 dark:border-[#8a8a70]/20 border-t-4 border-t-accent-green",
    blue: "border border-gray-200 dark:border-[#8a8a70]/20 border-t-4 border-t-accent-blue",
    red: "border border-gray-200 dark:border-[#8a8a70]/20 border-t-4 border-t-accent-red",
    purple: "border border-gray-200 dark:border-[#8a8a70]/20 border-t-4 border-t-accent-purple",
  };

  const variantStyles = {
    default: "bg-white dark:bg-[#20201a] shadow-md",
    flat: "bg-slate-50 dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/20",
    outline: "bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 shadow-xs",
  };

  return (
    <div
      className={`${baseStyle} ${borderTopStyles[borderTopColor]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// 8. BADGE COMPONENT
// ============================================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ThemeVariant | 'slate-muted';
  outline?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'olive',
  outline = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyle = "inline-flex items-center gap-1 font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0 border";

  const colorStyles = {
    olive: outline 
      ? "bg-transparent text-primary-olive border-primary-olive/25" 
      : "bg-primary-olive/10 text-primary-olive border-primary-olive/20",
    slate: outline
      ? "bg-transparent text-secondary-slate border-secondary-slate/25"
      : "bg-secondary-slate/10 text-secondary-slate border-secondary-slate/20",
    blue: outline
      ? "bg-transparent text-accent-blue border-accent-blue/25"
      : "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    green: outline
      ? "bg-transparent text-accent-green border-accent-green/25"
      : "bg-accent-green/10 text-accent-green border-accent-green/20",
    orange: outline
      ? "bg-transparent text-accent-orange border-accent-orange/25"
      : "bg-accent-orange/10 text-accent-orange border-accent-orange/20",
    red: outline
      ? "bg-transparent text-accent-red border-accent-red/25"
      : "bg-accent-red/10 text-accent-red border-accent-red/20",
    purple: outline
      ? "bg-transparent text-accent-purple border-accent-purple/25"
      : "bg-accent-purple/10 text-accent-purple border-accent-purple/20",
    'slate-muted': outline
      ? "bg-transparent text-gray-500 border-gray-300"
      : "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`${baseStyle} ${colorStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// ============================================================================
// 9. ALERT / BANNER COMPONENT
// ============================================================================

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  className = '',
  children,
  ...props
}) => {
  const baseStyle = "p-4 border rounded-xl flex items-start gap-2.5 text-xs leading-tight font-semibold uppercase";

  const styles = {
    success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400",
    error: "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400",
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-400",
  };

  const icons = {
    success: <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-accent-green mt-0.5" />,
    error: <AlertCircle className="w-4.5 h-4.5 shrink-0 text-accent-red mt-0.5" />,
    warning: <AlertCircle className="w-4.5 h-4.5 shrink-0 text-accent-orange mt-0.5" />,
    info: <AlertCircle className="w-4.5 h-4.5 shrink-0 text-accent-blue mt-0.5" />,
  };

  return (
    <div
      className={`${baseStyle} ${styles[variant]} ${className}`}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">{children}</div>
    </div>
  );
};
