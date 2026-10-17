import { useState } from 'react';

type CurrencyInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  ariaLabel?: string;
};

function normalizeMoney(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [integer = '', ...decimals] = cleaned.split('.');
  const decimal = decimals.join('').slice(0, 2);
  return decimals.length > 0 ? `${integer || '0'}.${decimal}` : integer;
}

function formatMoney(value: string) {
  if (!value) return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  const decimals = value.includes('.') ? Math.min(value.split('.')[1]?.length || 0, 2) : 0;
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0.00',
  disabled = false,
  readOnly = false,
  ariaLabel,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`currency-input-shell ${disabled || readOnly ? 'is-readonly' : ''}`}>
      <span aria-hidden="true">$</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        value={focused ? value : formatMoney(value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(normalizeMoney(event.target.value))}
      />
      <small>MXN</small>
    </div>
  );
}
