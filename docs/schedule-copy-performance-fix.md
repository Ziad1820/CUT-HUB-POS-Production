# Schedule copy performance

Production schedule copy now validates all requested records against one locked schedule snapshot. Pending copied IDs and intervals are included before subsequent records are prepared, retaining duplicate detection and overnight conflict checks. Staff scope checks run once per involved employee. The Apps Script repository writes fresh copied rows using one contiguous range instead of repeatedly scanning and appending each row.

The existing lock, schedule undo transaction, availability transaction, cache invalidation, audit and request-id replay remain in force. The new writer requires the active schedule transaction, validates headers and entity IDs, preserves positional columns, leaves unknown extension columns blank on new rows and registers every appended row for compensation before writing. It creates no sheets or headers; capacity expansion only adds blank rows when necessary.

The frontend shows “جارٍ النسخ…” while saving. Confirmed response rows render immediately after save. Subsequent refresh calls only range resolution and audit history (2 requests instead of 5). A failed display refresh clearly says that the copy was saved and must not be submitted again. Copying to another employee does not insert those records into the source employee's table.

Validation covers single schedule read / staff scope lookup counts, one batched persistence operation, idempotent replay, conflict before any write, audit failure rollback, partial Apps Script range write compensation, duplicate IDs and UUID exhaustion, overnight conflicts, and immediate frontend rendering with refresh failure. No real employee schedules are fabricated for deployment testing.
