import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * AN AMOUNT FIELD ALWAYS SHOWS ITS CURRENCY.
 *
 * Owner, 2026-09-07: the money fields showed no symbol at all once you started
 * typing. The planner put it in the LABEL ("Total wedding budget ($)") and in
 * the PLACEHOLDER ("$0") — both of which disappear the moment a couple has
 * typed anything, which is exactly when knowing the currency matters. The item
 * form showed "0.00" and no symbol anywhere.
 *
 * The symbol is rendered as a fixed prefix inside the field rather than as
 * text inside the input, because a value the user can select and delete is not
 * a currency indicator — it is a character they have to retype. The input
 * stays `type="number"`, so the stored value is still a number and no parsing
 * is introduced between the keyboard and the record.
 *
 * The symbol comes from the couple's own currency (CurrencyContext), not a
 * hardcoded dollar: a wedding priced in euros should not be labelled in
 * dollars anywhere, and this is the only place that decision needs to live.
 */
export default function AmountInput({
  value, onChange, placeholder = '0.00', id, required, min = '0', step = '0.01',
  style, inputStyle, symbolStyle, disabled, ariaLabel,
}) {
  const { symbol } = useCurrency();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      borderBottom: '1px solid rgba(10,10,10,0.18)',
      ...style,
    }}>
      <span
        // aria-hidden: the field's own label already says what the number is,
        // and a screen reader reading "dollar" before every amount is noise.
        // The unit is announced through aria-label on the input instead.
        aria-hidden="true"
        style={{ fontFamily: PJS, color: 'rgba(10,10,10,0.6)', flexShrink: 0, ...symbolStyle }}
      >
        {symbol}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} in ${symbol}` : undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          border: 'none', background: 'transparent', outline: 'none',
          fontFamily: PJS, width: '100%', padding: '6px 0',
          fontSize: 14, color: '#0A0A0A',
          ...inputStyle,
        }}
      />
    </div>
  );
}
