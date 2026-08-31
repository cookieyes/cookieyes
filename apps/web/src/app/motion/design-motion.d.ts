/**
 * Types for the ported motion module. `design-motion.js` is the design file's own
 * component script, kept as plain JavaScript so it can be re-ported mechanically when
 * the design changes; this declaration is the typed boundary React talks to.
 */
export declare class DesignMotion {
  /** @param root The page wrapper the design's selectors are scoped to. */
  constructor(root: HTMLElement);

  /** Starts every canvas painter, cycle, scroll reveal and the globe. */
  componentDidMount(): void;

  /** Cancels timers, animation frames, observers and the WebGL renderer. */
  componentWillUnmount(): void;

  /**
   * The element the globe renders into. Set to null to make an in-flight, asynchronous
   * globe build abandon itself — the design's own code guards on this reference.
   */
  _globeMount: HTMLElement | null;
}
