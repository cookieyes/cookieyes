---
"@cookieyes/react": patch
---

The banner no longer fades in twice on slower devices

The banner is server-rendered inline (React cannot server-render a portal), then moves into a
`<body>` portal just after hydration so it can escape any transformed ancestor. That move replaces
its DOM node, and the replacement re-ran the CSS entry animation.

On a fast machine this was invisible: the swap lands inside the 200ms fade, so it reads as one
continuous ramp. On a slow device it was not. Measured under 20× CPU throttling, hydration landed
around a second in — long after the fade had finished — so the visitor watched a fully visible
banner **disappear and fade in again**. Opacity dropped by 0.73–1.00 at the swap.

`Banner.Root` now marks the re-parent, and the replacement keeps the banner visible instead of
re-animating. Measured opacity drop after the change: 0.000, on both a fast machine and under 20×
throttling.

Unchanged: the banner still animates when it genuinely appears, including when it reappears after
`resetConsent()`, and the exit fade still plays on accept/reject.

If you override `.cy-banner`'s `animation` in your own CSS, note the new
`.cy-banner-wrap[data-cy-entered] .cy-banner:not([data-leaving])` rule, which sets
`animation: none` for the re-parent case only.
