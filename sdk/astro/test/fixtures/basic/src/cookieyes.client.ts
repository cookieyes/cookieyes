// Function-valued options, which cannot go in astro.config.mjs. The browser tests read the flag.
export default {
  onConsentUpdate: () => {
    (window as unknown as { __cyUpdated?: boolean }).__cyUpdated = true;
  },
};
