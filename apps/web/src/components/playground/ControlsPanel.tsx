"use client";

import { type CSSProperties, useId, useState } from "react";
import {
  BUILT_IN_CATEGORY_IDS,
  COLOUR_SWATCHES,
  categoryLabel,
  FONTS,
  type FontChoice,
  MAX_RADIUS,
  type PlaygroundConfig,
  type PlaygroundText,
  REQUIRED_CATEGORY_ID,
} from "./playground-config";
import { SegmentedControl } from "./SegmentedControl";

const FONT_OPTIONS = (Object.keys(FONTS) as FontChoice[]).map((value) => ({
  value,
  label: FONTS[value].label,
}));

type WordingField = { key: keyof PlaygroundText; label: string; multiline?: boolean };

/**
 * Only the text the current banner actually renders.
 *
 * Under CCPA the SDK swaps `bannerDescription` for `ccpaDescription` and replaces the three
 * buttons with a single Do Not Sell link (see the SDK's CookieBanner preset). Offering the
 * GDPR fields there would put four controls on screen that change nothing — which is the
 * impression this whole page exists to avoid.
 */
const WORDING_FIELDS: Record<"GDPR" | "CCPA", WordingField[]> = {
  GDPR: [
    { key: "bannerTitle", label: "Title" },
    { key: "bannerDescription", label: "Description", multiline: true },
    { key: "acceptAll", label: "Accept button" },
    { key: "rejectAll", label: "Reject button" },
    { key: "managePreferences", label: "Preferences button" },
  ],
  CCPA: [
    { key: "bannerTitle", label: "Title" },
    { key: "ccpaDescription", label: "Description", multiline: true },
    { key: "doNotSell", label: "Do Not Sell link" },
  ],
};

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

  const hexValid = HEX_PATTERN.test(hexDraft.trim());

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
            aria-invalid={!hexValid}
            aria-describedby={hexValid ? undefined : `${hexId}-hint`}
            onChange={(event) => commitHex(event.target.value)}
          />
        </div>
        {/* Otherwise a typo just sits there while the preview keeps the old colour, and
            the two quietly disagree with no explanation. */}
        <p className="cy-pg-field-error" id={`${hexId}-hint`} hidden={hexValid}>
          Enter a hex colour, like #1863dc.
        </p>
      </fieldset>

      <div className="cy-pg-field">
        <label className="cy-pg-label" htmlFor={radiusId}>
          Corner rounding
        </label>
        <div className="cy-pg-slider-row">
          <span
            className="cy-pg-track"
            style={
              { "--cy-pg-pct": `${(config.borderRadius / MAX_RADIUS) * 100}%` } as CSSProperties
            }
          >
            <span className="cy-pg-track-rail" />
            <span className="cy-pg-track-fill" />
            <span className="cy-pg-track-knob" />
            <input
              id={radiusId}
              type="range"
              min={0}
              max={MAX_RADIUS}
              step={1}
              value={config.borderRadius}
              onChange={(event) => onChange({ borderRadius: Number(event.target.value) })}
            />
          </span>
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
      {WORDING_FIELDS[config.regulation].map(({ key, label, multiline }) => {
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
            {multiline ? <textarea {...common} /> : <input {...common} />}
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

  function remove(id: string) {
    const { [id]: _dropped, ...rest } = config.customLabels;
    onChange({ categories: config.categories.filter((each) => each !== id), customLabels: rest });
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
        const custom = !BUILT_IN_CATEGORY_IDS.includes(id);
        return (
          <div className="cy-pg-check" key={id}>
            <label htmlFor={inputId}>
              <input
                id={inputId}
                type="checkbox"
                checked={config.categories.includes(id)}
                disabled={required}
                onChange={(event) => toggle(id, event.target.checked)}
              />
              <span className="cy-pg-check-box">
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <polyline points="2,6.4 4.6,9 10,3.2" />
                </svg>
              </span>
              {categoryLabel(id, config.customLabels)}
            </label>
            {required ? <span className="cy-pg-cat-tag">Always on</span> : null}
            {custom ? <span className="cy-pg-cat-tag">Custom</span> : null}
            {/* Unchecking leaves a category the visitor can put back; removing takes it out
                of the set entirely, which is what changes the taxonomy they would ship. */}
            {custom ? (
              <button
                type="button"
                className="cy-pg-cat-remove"
                aria-label={`Remove ${categoryLabel(id, config.customLabels)}`}
                onClick={() => remove(id)}
              >
                ×
              </button>
            ) : null}
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
