import adapter from "@sveltejs/adapter-node";

// The build lands in `.output`, which the repository already ignores for the Nuxt fixtures.
export default { kit: { adapter: adapter({ out: ".output" }) } };
