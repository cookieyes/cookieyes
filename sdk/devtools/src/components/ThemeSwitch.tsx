"use client";

import type { DevtoolsTheme } from "../types.js";
import { Icon } from "./Icon.js";

export type ThemeSwitchProps = {
  value: DevtoolsTheme;
  onChange: (theme: DevtoolsTheme) => void;
};

const OPTIONS: { value: DevtoolsTheme; label: string }[] = [
  { value: "system", label: "System theme" },
  { value: "light", label: "Light theme" },
  { value: "dark", label: "Dark theme" },
];

/** Segmented System / Light / Dark control for the panel header. */
export function ThemeSwitch({ value, onChange }: ThemeSwitchProps) {
  return (
    <div
      className="cyd-seg"
      role="radiogroup"
      aria-label="Devtools theme"
      data-cyd-part="theme-switch"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          title={option.label}
          className={`cyd-seg-btn${value === option.value ? " cyd-seg-btn-active" : ""}`}
          data-cyd-part={`theme-${option.value}`}
          onClick={() => onChange(option.value)}
        >
          <Icon name={option.value} />
        </button>
      ))}
    </div>
  );
}
