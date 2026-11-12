import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg'; // sm: 40px, md: 48px (min touch), lg: 56px (main actions)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabledReason?: string; // Chú thích lý do khi thiếu quyền hoặc vô hiệu
  children: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
}

// Kiểu nút nằm trong styles/ui.css (.btn*) để có hover, nhấn, vô hiệu và focus nhất quán (DESIGN.md §6.1)
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabledReason,
      children,
      icon,
      fullWidth = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading || !!disabledReason;
    const classes = ['btn', `btn-${variant}`, size === 'lg' && 'btn-lg', size === 'sm' && 'btn-sm', fullWidth && 'btn-block', className]
      .filter(Boolean)
      .join(' ');

    const buttonElement = (
      <button
        ref={ref}
        disabled={isDisabled}
        title={disabledReason}
        aria-busy={isLoading || undefined}
        className={classes}
        {...props}
      >
        {isLoading ? <Loader2 className="spin" size={20} aria-hidden="true" /> : icon}
        <span>{children}</span>
      </button>
    );

    if (disabledReason) {
      return (
        <div style={{ display: fullWidth ? 'block' : 'inline-block' }}>
          {buttonElement}
          <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--color-danger)', marginTop: 4, textAlign: 'center' }}>
            {disabledReason}
          </div>
        </div>
      );
    }

    return buttonElement;
  }
);

Button.displayName = 'Button';
