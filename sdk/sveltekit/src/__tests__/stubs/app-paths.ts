// `$app/paths` exists only inside a SvelteKit build. `resolve` here is the base-path form; a test
// sets the base to stand in for `kit.paths.base`.
let base = "";

export function setBase(value: string): void {
  base = value;
}

export function resolve(pathname: string): string {
  return `${base}${pathname}`;
}
