// Stands in for the module the integration's Vite plugin serves to the middleware.
export const config = { mode: "cookie-only", regulation: "GDPR" } as const;
export const head = {
  scripts: ["/*head*/"],
  styles: ["/*css*/"],
  href: "/cookieyes/styles.css?v=x",
};
export const dev = false;
