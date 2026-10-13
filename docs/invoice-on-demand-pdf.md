# Invoice PDF on demand

Checkout now persists the invoice, inventory movements and audit without converting a PDF or publishing a Drive file. Its successful response includes the persisted invoice request ID. Existing request-key and fingerprint replay checks remain unchanged. Browser printing still follows confirmed invoice save.

The cashier invoice details and invoice listing/details expose “تجهيز PDF” for a saved invoice with stable identity and no document yet. Clicking requests the PDF; a successful response replaces the button with “فتح PDF”. Existing document links continue to open directly. Legacy imported rows without stable identity and without a PDF remain disabled, as before; no legacy data migration is performed.

The authenticated `getInvoicePdf` action requires cashier or invoice-view permission, reads the saved row rather than accepting client invoice contents, and requires exactly one persisted request-ID match. Snapshot capture and link publication use short sections under the script lock. Drive conversion happens outside that lock. Before publication the server resolves the stable identity again and rejects edited/deleted/ambiguous sources. A competing published document is reused; the extra newly-created unlinked file is trashed. An uncertain publication failure never trashes a possibly attached file.

Invoice edit and delete now use the same script lock, preventing races with publication. Editing an invoice with a stable request ID clears its current document link so the next request regenerates from the new saved data; prior Drive files remain intact. Older rows without a stable request ID retain existing edit/link behavior. No totals, inventory or customer records are modified by PDF preparation; a document-generation failure leaves the completed sale intact.

The PDF uses the saved invoice timestamp. The pre-existing PDF formatting and Drive sharing policy remain unchanged. No background trigger, automatic request retry, production test sale or database migration is added.

Validation: checkout without any Drive call, invoice replay exactly once, PDF conversion outside the checkout lock, repeat document reuse, row relocation, concurrent publication, edited/deleted/duplicate identities, generation failure, uncertain publication, permissions, edit invalidation, client duplicate-click protection and URL allowlist. All production module baselines are preserved for rollback.
