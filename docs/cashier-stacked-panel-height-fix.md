# Stacked cashier service-panel height — 2026-10-09

After the layout switched to stacked panels at 1100 CSS pixels, the JavaScript still applied the account-panel height to services above 960 pixels. This overrode the automatic CSS height between 961 and 1100 pixels, leaving a large blank area below the service list.

The height synchronizer now clears its inline height at the same 1100-pixel breakpoint as the layout. The existing bounded services list retains scrolling, and side-by-side behavior above 1100 pixels is preserved. The cashier script version was refreshed to invalidate the previous browser cache.

The regression exercises resizing from a 1440-pixel side-by-side layout into 1100, 1024, 961, 960 and 375-pixel stacked layouts, then back to 1101 pixels. It passes against both repository source and the patched Production candidate script. Production candidate: `dpl_GABgnfHkFvBdzDnZFnq2KDLfw7Vb`.

The candidate preserves the previously deployed cashier script, applying only the breakpoint change; no invoice or payment behavior changed. Browser visual confirmation remains with the user's signed-in cashier page.
