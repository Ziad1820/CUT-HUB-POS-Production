# Invoice pagination recovery — 2026-10-09

Loading another invoice page could fail with “Service Spreadsheets failed while accessing document…”. The frontend then replaced all previously loaded rows with the error, zeroed totals and hid Load More.

## Backend

Production Apps Script version 40 reads an invoice snapshot through a bounded read-only recovery function. It retries only the specific temporary Sheets access exception, at most three attempts with 250/750ms waits. Sheet lookup, header inspection and row reads are the only repeated operations; request routing, authentication, session handling and mutations are not replayed. Schema errors remain errors. Exhausted temporary failures return `INVOICE_READ_TEMPORARILY_UNAVAILABLE` without the document identifier.

Only `044_invoices_queries.gs` changed. Production version 39 and the current editor were compared to the recorded source before upload; uploaded and immutable version 40 content were read back and verified. The original query source remains in `apps-script/production/baseline/` and its original checksum remains in `source-map.json`. The build verifies both the original reconstructed baseline and separately registered current module hashes.

## Frontend

Failed Load More retains loaded invoices, their totals, selected IDs and the next-page offset. It appends a status message and enables “Retry Load More”. A user-triggered retry reads the same missing page; successful results append once. Raw Sheets document identifiers are replaced by a friendly message. Network requests are never automatically replayed.

Website deployment: `dpl_J8V1KfMMr4sW9dsWi2HGhZ8ta1CD`; Apps Script: existing Production deployment, version **40**. The website candidate preserves previously deployed files and changes only invoice page behavior and its script version.

## Validation

Regressions cover transient recovery, exhausted retries, schema errors, one authentication pass, pagination, retention of rows/totals/selection and manual retry of the same offset. The modularization regression verifies all unchanged globals against original source. A live unsigned invoice request retained `authRequired` and `sessionExpired`; no real invoice was created, changed or deleted. All **1,512** workspace tests passed. The downloaded candidate invoice script matched the local SHA-256.

Visual confirmation remains with the user's authenticated invoice page. A persistent Sheets outage still needs a later manual retry; the loaded list is retained during that failure.
