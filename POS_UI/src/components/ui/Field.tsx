import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';

// Kiểu ô nhập nằm trong styles/ui.css (.input, .select) và styles/components.css (.field-*), DESIGN.md §6.5

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: ReactNode;
  isNumericMoney?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, suffix, isNumericMoney = false, style, disabled, id, className, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const describedBy = errorId || hintId || props['aria-describedby'];

    return (
      <div className="field">
        {label && <label htmlFor={inputId} className="field-label">{label}</label>}
        <div className={`field-control${suffix ? ' has-suffix' : ''}`}>
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            inputMode={isNumericMoney ? 'numeric' : props.inputMode}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`input${isNumericMoney ? ' input-money' : ''}${className ? ` ${className}` : ''}`}
            style={style}
            {...props}
          />
          {suffix && <div className="field-suffix">{suffix}</div>}
        </div>
        {error && (
          <span id={errorId} role="alert" className="field-error">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </span>
        )}
        {hint && !error && <span id={hintId} className="field-hint">{hint}</span>}
      </div>
    );
  }
);

Field.displayName = 'Field';

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, children, style, disabled, id, className, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint && !error ? `${selectId}-hint` : undefined;
    const describedBy = errorId || hintId || props['aria-describedby'];

    return (
      <div className="field">
        {label && <label htmlFor={selectId} className="field-label">{label}</label>}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`select${className ? ` ${className}` : ''}`}
          style={style}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span id={errorId} role="alert" className="field-error">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </span>
        )}
        {hint && !error && <span id={hintId} className="field-hint">{hint}</span>}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
