# Cashier responsive layout — 2026-10-09

The current-account panel's intrinsic content width could consume most of the two-column layout, compressing the services panel into a narrow strip. Both tracks now use zero-minimum fractional sizing, and the panels can shrink inside their tracks.

At widths up to 1100 CSS pixels the panels stack vertically. Service cards adapt to the available width, while the list retains a bounded vertical scroll area. At 1101–1280 pixels, the services use two columns. Service toolbar and result text can wrap without squeezing the panel.

The isolated Production candidate changes only the embedded cashier CSS. JavaScript script tags and inline code were compared with the previous deployed page and remained identical; inline scripts parsed successfully. The downloaded candidate HTML matched the local file's SHA-256. Deployment: `dpl_DpVS62zhF8wjnNFGX6rrtWvhi9jE`.

The browser could not reach the local fixture, and data-URL previews are blocked by browser policy. Visual verification at different screen widths remains with the user's signed-in cashier page; no screenshot or completed visual check is claimed. No transaction was created for validation.
