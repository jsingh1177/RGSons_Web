import React from 'react';
import { Calendar } from 'lucide-react';
import { formatDateDDMMYYYY } from './dateUtils';

const DateInputButton = React.forwardRef(({
    value,
    onChange,
    onKeyDown,
    onFocus,
    disabled = false,
    min,
    max,
    buttonRef,
    inputRef,
    placeholder = 'DD-MM-YYYY',
    wrapperClassName = '',
    buttonClassName = '',
    hiddenInputClassName = 'sr-only',
    showIcon = true
}, ref) => {
    const resolvedInputRef = inputRef || ref;

    const openPicker = () => {
        const el = resolvedInputRef?.current;
        if (!el || disabled) return;
        if (typeof el.showPicker === 'function') {
            try {
                el.showPicker();
                return;
            } catch {}
        }
        try {
            el.focus();
            el.click();
        } catch {}
    };

    return (
        <div className={wrapperClassName}>
            {showIcon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="w-4 h-4 text-slate-400" />
                </div>
            )}
            <button
                ref={buttonRef}
                type="button"
                onClick={openPicker}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                disabled={disabled}
                className={buttonClassName}
            >
                {value ? formatDateDDMMYYYY(value) : placeholder}
            </button>
            <input
                ref={resolvedInputRef}
                type="date"
                value={value || ''}
                onChange={(e) => onChange?.(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                min={min}
                max={max}
                disabled={disabled}
                className={hiddenInputClassName}
            />
        </div>
    );
});

DateInputButton.displayName = 'DateInputButton';

export default DateInputButton;
