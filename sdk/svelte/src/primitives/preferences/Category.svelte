<script lang="ts">
import type { ConsentCategory } from "@cookieyes/core";
import { CY_PART, categoryText } from "@cookieyes/ui";
import type { Snippet } from "svelte";
import { useCategories } from "../../hooks/useCategories.js";
import { useConsent } from "../../hooks/useConsent.svelte.js";
import { useConsentActions } from "../../hooks/useConsentActions.js";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import type { CategoryRenderProps, PartProps } from "../types.js";

let {
  category,
  children,
  ...rest
}: Omit<PartProps, "children"> & {
  category: ConsentCategory;
  children?: Snippet<[CategoryRenderProps]>;
} = $props();

const runtime = _useRuntime("<Preferences.Category>");
const snapshot = useConsent();
const { updateCategory } = useConsentActions();
const categories = useCategories();
const t = useTranslations();

const render = $derived.by((): CategoryRenderProps => {
  const def = categories.list.find((c) => c.id === category);
  const required = categories.requiredIds.has(category);
  const { label, description } = categoryText(category, {
    translated: runtime.getCategoryText(category),
    configured: def,
    defaults: t.categories[category],
  });
  return {
    category,
    label,
    description,
    // A required category is always on and can't be toggled.
    checked: required ? true : snapshot.categories[category] === true,
    disabled: required,
    toggle: (next: boolean) => {
      if (required) return;
      updateCategory(category, next);
    },
  };
});
</script>

<div data-cy-part={CY_PART.dialog.category} {...rest}>{@render children?.(render)}</div>
