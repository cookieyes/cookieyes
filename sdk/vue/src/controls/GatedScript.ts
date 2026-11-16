import type { ConsentCategory, ScriptEntry } from "@cookieyes/core";
import { type DefineComponent, defineComponent, onMounted, type PropType, watch } from "vue";
import { _useRuntime } from "../composables/useRuntime.js";

/** Props of `<GatedScript>`. */
export type GatedScriptProps = {
  src: string;
  category: ConsentCategory;
  id: string;
  onLoad?: () => void;
};

/**
 * Registers a script that loads only once its category is consented. Renders nothing. Changing
 * `id`, `src` or `category` registers it again; `onLoad` is read at that moment.
 */
export const GatedScript: DefineComponent<GatedScriptProps> = defineComponent({
  name: "GatedScript",
  props: {
    src: { type: String, required: true },
    category: { type: String, required: true },
    id: { type: String, required: true },
    onLoad: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    const runtime = _useRuntime("<GatedScript>");
    onMounted(() => {
      watch(
        () => [props.id, props.src, props.category],
        () => {
          const entry: ScriptEntry = {
            id: props.id,
            src: props.src,
            category: props.category,
            ...(props.onLoad !== undefined ? { onLoad: props.onLoad } : {}),
          };
          runtime.registerScript(entry);
        },
        { immediate: true },
      );
    });
    return () => null;
  },
}) as unknown as DefineComponent<GatedScriptProps>;
