"use client";

import { useId } from "react";

/**
 * A row of mutually exclusive choices, built on real radio inputs.
 *
 * It looks like a group of buttons, but buttons would leave a screen reader without the
 * "1 of 3" reading and without arrow-key movement — both of which come free from radios
 * sharing a name. The inputs are visually hidden; the labels carry the appearance.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();

  return (
    <fieldset className="cy-pg-segmented">
      <legend className="cy-pg-label">{label}</legend>
      <div className="cy-pg-segmented-track">
        {options.map((option) => (
          <label key={option.value} className="cy-pg-segment">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
