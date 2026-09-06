"use client";

import { useId, useState } from "react";
import {
  BUILT_IN_CATEGORY_IDS,
  COLOUR_SWATCHES,
  FONTS,
  type FontChoice,
  type PlaygroundConfig,
  type PlaygroundText,
  REQUIRED_CATEGORY_ID,
} from "./playground-config";
import { SegmentedControl } from "./SegmentedControl";

const FONT_OPTIONS = (Object.keys(FONTS) as FontChoice[]).map((value) => ({
  value,
  label: FONTS[value].label,
}));

const WORDING_FIELDS: { key: keyof PlaygroundText; label: string; multiline?: boolean }[] = [
  { key: "bannerTitle", label: "Title" },
  { key: "bannerDescription", label: "Description", multiline: true },
  { key: "acceptAll", label: "Accept button" },
  { key: "rejectAll", label: "Reject button" },
  { key: "managePreferences", label: "Preferences button" },
];

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** "Ad Partners" → "ad-partners". Ids are stored in the consent cookie, so keep them plain. */
function toCategoryId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ControlsPanel({
  config,
  onChange,
}: {
  config: PlaygroundConfig;
  onChange: (patch: Partial<PlaygroundConfig>) => void;
}) {
  return (
    <div className="cy-pg-controls">
      <Appearance config={config} onChange={onChange} />
      <Section title="Which law applies">
        <SegmentedControl
          label="Regulation"
          value={config.regulation}
          options={[
            { value: "GDPR", label: "GDPR" },
            { value: "CCPA", label: "US state laws" },
          ]}
          onChange={(regulation) => onChange({ regulation })}
        />
      </Section>
      <Wording config={config} onChange={onChange} />
      <Categories config={config} onChange={onChange} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cy-pg-section">
      <h3 className="cy-pg-section-title">{title}</h3>
      {children}
    </section>
  );
}

function Appearance({
  config,
  onChange,
}: {
  config: PlaygroundConfig;
  onChange: (patch: Partial<PlaygroundConfig>) => void;
}) {
  const hexId = useId();
  const radiusId = useId();
  const swatchName = useId();

  // Kept separate from config.primaryColor so a half-typed "#12" stays on screen instead
  // of being rewritten or pushed to the preview as a colour.
  const [hexDraft, setHexDraft] = useState(config.primaryColor);
  const [lastColour, setLastColour] = useState(config.primaryColor);

  // When the colour changes from outside this field — a swatch, or Reset to defaults — the
  // draft has to follow, or the box keeps showing a colour that is no longer applied.
  if (config.primaryColor !== lastColour) {
    setLastColour(config.primaryColor);
    setHexDraft(config.primaryColor);
  }

  function commitHex(next: string) {
    setHexDraft(next);
    if (HEX_PATTERN.test(next.trim())) onChange({ primaryColor: next.trim() });
  }

  return (
    <Section title="Appearance">
      <fieldset className="cy-pg-field">
        <legend className="cy-pg-label">Brand colour</legend>
        <div className="cy-pg-swatches">
          {COLOUR_SWATCHES.map((colour) => (
            <label key={colour} className="cy-pg-swatch" style={{ background: colour }}>
              <input
                type="radio"
                name={swatchName}
                checked={config.primaryColor.toLowerCase() === colour}
                onChange={() => onChange({ primaryColor: colour })}
              />
              <span className="cy-pg-visually-hidden">{colour}</span>
            </label>
          ))}
          <label className="cy-pg-visually-hidden" htmlFor={hexId}>
            Brand colour hex value
          </label>
          <input
            id={hexId}
            className="cy-pg-input cy-pg-hex"
            value={hexDraft}
            spellCheck={false}
            onChange={(event) => commitHex(event.target.value)}
          />
        </div>
      </fieldset>

      <div className="cy-pg-field">
        <label className="cy-pg-label" htmlFor={radiusId}>
          Corner rounding
        </label>
        <div className="cy-pg-slider-row">
          <input
            id={radiusId}
            type="range"
            min={0}
            max={16}
            step={1}
            value={config.borderRadius}
            onChange={(event) => onChange({ borderRadius: Number(event.target.value) })}
          />
          <output htmlFor={radiusId}>{config.borderRadius}px</output>
        </div>
      </div>

      <SegmentedControl
        label="Font"
        value={config.font}
        options={FONT_OPTIONS}
        onChange={(font) => onChange({ font })}
      />
      <SegmentedControl
        label="Mode"
        value={config.colorScheme}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        onChange={(colorScheme) => onChange({ colorScheme })}
      />
    </Section>
  );
}

function Wording({
  config,
  onChange,
}: {
  config: PlaygroundConfig;
  onChange: (patch: Partial<PlaygroundConfig>) => void;
}) {
  const prefix = useId();

  return (
    <Section title="Wording">
      {WORDING_FIELDS.map(({ key, label, multiline }) => {
        const id = `${prefix}-${key}`;
        const common = {
          id,
          className: "cy-pg-input",
          value: config.text[key],
          onChange: (event: { target: { value: string } }) =>
            onChange({ text: { ...config.text, [key]: event.target.value } }),
        };
        return (
          <div className="cy-pg-field" key={key}>
            <label className="cy-pg-label" htmlFor={id}>
              {label}
            </label>
            {multiline ? <textarea {...common} rows={3} /> : <input {...common} />}
          </div>
        );
      })}
    </Section>
  );
}

function Categories({
  config,
  onChange,
}: {
  config: PlaygroundConfig;
  onChange: (patch: Partial<PlaygroundConfig>) => void;
}) {
  const prefix = useId();
  const addId = useId();
  const [draft, setDraft] = useState("");

  // Selected ids first, then any the visitor added but has since unticked — a checkbox that
  // removed its own row would leave no way to change your mind.
  const known = [...BUILT_IN_CATEGORY_IDS];
  for (const id of config.categories) if (!known.includes(id)) known.push(id);
  for (const id of Object.keys(config.customLabels)) if (!known.includes(id)) known.push(id);

  function toggle(id: string, on: boolean) {
    // Order follows `known`, so a category re-checked later returns to its original place
    // rather than jumping to the end of the list.
    const next = known.filter((each) => (each === id ? on : config.categories.includes(each)));
    onChange({ categories: next });
  }

  function add() {
    const id = toCategoryId(draft);
    if (!id || config.categories.includes(id)) return;
    onChange({
      categories: [...config.categories, id],
      customLabels: { ...config.customLabels, [id]: draft.trim() },
    });
    setDraft("");
  }

  return (
    <Section title="Categories">
      {known.map((id) => {
        const inputId = `${prefix}-${id}`;
        const required = id === REQUIRED_CATEGORY_ID;
        return (
          <div className="cy-pg-check" key={id}>
            <input
              id={inputId}
              type="checkbox"
              checked={config.categories.includes(id)}
              disabled={required}
              onChange={(event) => toggle(id, event.target.checked)}
            />
            <label htmlFor={inputId}>{config.customLabels[id] ?? id}</label>
            {required ? <span className="cy-pg-always-on">Always on</span> : null}
          </div>
        );
      })}

      <div className="cy-pg-add-row">
        <label className="cy-pg-visually-hidden" htmlFor={addId}>
          Add your own category
        </label>
        <input
          id={addId}
          className="cy-pg-input"
          placeholder="Add your own, e.g. functional"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Otherwise Enter submits nothing and looks broken — there is no form here.
            event.preventDefault();
            add();
          }}
        />
        <button type="button" onClick={add} disabled={!toCategoryId(draft)}>
          Add
        </button>
      </div>
    </Section>
  );
}
