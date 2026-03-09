import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    name?: string;
    required?: boolean;
    placeholder?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    value,
    onChange,
    className = '',
    name,
    required = false,
    placeholder = '0,00'
}) => {
    const [displayValue, setDisplayValue] = useState('');

    // Format Number to BRL string
    const formatValue = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
    };

    // Update display value when external value changes
    useEffect(() => {
        if (value === 0 && !displayValue) {
            setDisplayValue('');
            return;
        }

        const formatted = formatValue(value);
        if (displayValue !== formatted) {
            setDisplayValue(formatted);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;

        // Remove all non-digits
        const digitsOnly = rawValue.replace(/\D/g, '');

        if (!digitsOnly) {
            setDisplayValue('');
            onChange(0);
            return;
        }

        // The core "cash machine" logic: the last two digits are always the cents.
        // Convert digits to a number and divide by 100 for decimals
        const numericValue = parseInt(digitsOnly, 10) / 100;

        // Format the numeric value and update the local display
        setDisplayValue(formatValue(numericValue));

        // Propagate the numeric value to the parent
        onChange(numericValue);
    };

    return (
        <input
            type="text"
            id={name}
            name={name}
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            className={className}
            required={required}
            placeholder={placeholder}
        />
    );
};
