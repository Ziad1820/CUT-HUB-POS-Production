# Cashier second performance pass

The six-second target is a measured objective, not a timeout or a promise about external-provider latency. No successful sale is acknowledged before persistence. Write replay, request concurrency and authorization protections were not loosened. No financial summary cache was added.

Production Apps Script v53 and frontend dpl_Dod1SB9bvjBLqQzBNrj7e8TeSFe2 were verified and activated on the existing deployment/domain. The frontend cashier asset is tagged 20261014-cashier-six-3.

One shared catalog request supplies services, the cashier-only staff projection and optionally the fixed last-five invoice projection, using the already validated backend request context. Client body permissions cannot authorize it and client filters cannot expand its invoice scope. Failure of the optional invoice read leaves catalog services available. Startup now has two requests instead of five. Later invoice refreshes retain their existing endpoint. Inventory loads on selecting Products and refreshes after use/restore; pending/failed refresh replaces product buttons with a clear status.

The cashier day summary reads bounded native ranges for DATA, EXPENSES and WITHDRAWLS once each and skips unused closing history. Date objects are compared to two separately parsed Cairo midnights; 23/25-hour DST days are preserved. String dates retain the existing parser. All amounts, tips, payment categories and outgoings keep their existing semantics. Full closing previews retain their history and original calculation path. Native read errors fall back rather than return partial totals.

The invoice reader retains filters, counts, options, ordering and stable PDF IDs but formats only the requested page. A last-five query formats five records instead of the entire DATA history. On-demand PDF protections remain intact.

Before this pass (2026-10-13): services 4.245 s, staff 5.078 s, day totals 10.417 s, products 9.574 s, latest invoices 18.429 s, including client queue.

Latest live checks on 2026-10-14, including queue:

| Operation | Measured seconds |
| --- | ---: |
| Catalog with staff, services and latest five invoices, two rounds | 5.705 / 3.969 |
| Day summary, populated previous day | 5.276 |
| Day summary, startup, two rounds | 6.405 / 5.825 |
| Products on demand, two reads | 4.333 / 5.982 |
| Customer lookup with cleared synthetic input | 2.526 |

Day summary internal native read/calculation measured 1.053–1.273 s. In the 6.405 s startup request, Google execution plus response retrieval was 4.170 s; remaining elapsed time also includes client transport/provider waiting. These samples do not isolate all latency to Vercel or to Sheets and are not a percentile or a universal upper bound. The six-second goal is not met for every sample.

The experimental advanced Sheets grid approach was discarded after live measurements showed a 27.733 s grid read and failed/slow totals requests. Final v53 contains no advanced grid request. Successful deployment source snapshots and rollback evidence are held in the ignored deployment workspace.

Regression validation: 1568 tests passed, including shared-request behavior, server-owned authorization, fixed invoice scope, equivalence against the prior invoice reader, native date boundaries on a DST day, monetary totals and exactly-once checkout/PDF protections. The isolated deployed cashier source also passed its 18 targeted tests. Browser checks covered rendering, on-demand product loading, lookup, service addition, premium pricing, discount and payment selection; the draft was cleared. No production sale, money approval or PDF was created. Consequently real production save/PDF wall-clock time is not established by this audit.
