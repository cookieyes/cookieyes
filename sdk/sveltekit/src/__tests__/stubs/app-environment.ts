// `$app/environment` exists only inside a SvelteKit build. A test flips `building` to stand in
// for a prerender, and `dev` to stand in for the dev server.
export let building = false;
export let dev = true;

export function setDev(value: boolean): void {
  dev = value;
}

export function setBuilding(value: boolean): void {
  building = value;
}
