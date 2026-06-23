import React from 'react';
import { Printer } from 'lucide-react';

const VoucherPrintButton = ({ onClick, disabled = false, className = '', children }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={className}
        >
            <Printer className="w-4 h-4" />
            <span>{children || 'Print'}</span>
        </button>
    );
};

export default VoucherPrintButton;
