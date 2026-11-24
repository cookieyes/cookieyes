<script lang="ts">
/** The "X" on a close button: two lines corner to corner in a `size`-pixel square. */
let { size, strokeWidth = 1.5 }: { size: number; strokeWidth?: number | undefined } = $props();
const end = $derived(size - 1);
</script>

<!-- The same icon as `@cookieyes/ui`'s markup data; `markup-parity.test.ts` compares the path. -->
<svg
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <path
    d="M1 1L{end} {end}M{end} 1L1 {end}"
    stroke="currentColor"
    stroke-width={strokeWidth}
    stroke-linecap="round"
  />
</svg>
