import React, { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cleanAmountText, formatAmountWithSeparators, keepTypedAmountChars } from '@/lib/amountText';

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
 *
 * ── `separated`: ONE OPT-IN VARIANT, FOR THE BUDGET PLANNER ─────────────────
 *
 * Owner walkthrough 2026-10-08, item 10: the planner's amounts needed
 * thousands separators, and an `<input type="number">` cannot hold a comma.
 * The browser rejects the character outright, so the only route to a grouped
 * figure in a field a couple types into is a text input that parses.
 *
 * It is a PROP, not a rewrite, because the paragraph above is still the rule
 * for every other money field in the product. `type="number"` gives the vendor
 * and expense forms a numeric keypad, a step, a min and browser validation for
 * free, and nothing about them was wrong. Default off means a field has to ask
 * for the parsing before it gets it: nine call sites exist today, two of them
 * are the planner's, and the other seven are untouched by this change and keep
 * every attribute they had.
 *
 * WHAT THE VARIANT ACTUALLY DOES. It shows the value grouped while nobody is
 * typing in it, and while the couple IS typing it shows exactly the characters
 * they typed, separators and all, so a comma does not vanish from under the
 * cursor. Either way `onChange` is handed the plain number: a parsed value,
 * never the display string. Everything downstream, including the save path's
 * parseFloat, sees what it saw before.
 *
 * ONE CONTRACT DIFFERENCE, stated here because a surprise is worse than a
 * restriction: in `separated` mode the object passed to `onChange` is a plain
 * `{ target: { value, id } }`, not the DOM event, because the value being
 * reported is not the value in the field. Every caller reads `e.target.value`
 * and nothing more; a caller that needs `preventDefault` needs the numeric
 * mode, which still hands over the real event untouched.
 */
export default function AmountInput({
  value, onChange, placeholder = '0.00', id, required, min = '0', step = '0.01',
  style, inputStyle, symbolStyle, disabled, ariaLabel, separated = false,
}) {
  const { symbol } = useCurrency();
  // The characters currently under the cursor, or null when the field is not
  // focused. NULL, not '', is what distinguishes "being typed into, currently
  // empty" from "not being typed into" — an empty string in both states would
  // make a cleared field re-render its old grouped value on the next keystroke.
  const [typing, setTyping] = useState(null);

  const onSeparatedChange = (e) => {
    const kept = keepTypedAmountChars(e.target.value);
    setTyping(kept);
    onChange?.({ target: { value: cleanAmountText(kept), id } });
  };

  const separatedProps = separated ? {
    type: 'text',
    autoComplete: 'off',
    value: typing !== null ? typing : formatAmountWithSeparators(value),
    onChange: onSeparatedChange,
    onFocus: () => setTyping(value === null || value === undefined ? '' : String(value)),
    onBlur: () => setTyping(null),
  } : {
    type: 'number',
    step,
    min,
    value,
    onChange,
  };

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
        // A HANDLE, SO THE MODAL SCALE CAN REACH IT. The symbol carries no
        // size of its own and inherits the page's, which is how it came to
        // paint at 16px beside a 12px amount inside "Add vendor" and "Add
        // expense" — the field obeyed .oi-modal-scale and the prefix in front
        // of it did not. The rule that sizes it lives with the rest of the
        // modal scale in index.css; outside a modal this class selects
        // nothing and the symbol still inherits, unchanged.
        className="oi-amount-symbol"
        style={{ fontFamily: PJS, color: 'rgba(10,10,10,0.6)', flexShrink: 0, ...symbolStyle }}
      >
        {symbol}
      </span>
      <input
        id={id}
        inputMode="decimal"
        required={required}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} in ${symbol}` : undefined}
        placeholder={placeholder}
        {...separatedProps}
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
