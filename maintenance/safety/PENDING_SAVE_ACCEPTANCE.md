# Pending save recovery

Baseline: e3d0581096f48cf5d7b64f6f9fc3fd3feeedd32a.

Attendance buttons now emit a draft update after changing marks. Generic save
only updates undo history after confirmed persistence; its delayed duplicate
write is removed. Failed input is kept as a separate record with the exact base
it was edited against. A blocking recovery dialog offers retry, full export with
attachments, or returning to committed data once the separate record is durable.
Retry cannot replace a changed primary record or write from a read-only tab.
LocalStorage and IndexedDB each retain pending records under unique IDs, with no
schema version changes. Resolved records remain retained. If both stores reject
writes, the dialog explicitly warns that only the open window retains the input.
No promise of durable recovery is made in that case.

45 local checks include attendance-only draft recovery, failed general save,
retry, reload, concurrent changes and IndexedDB fallback. Browser acceptance
also exercises a complete localStorage failure, reload, retry and attendance-only
reload alongside the existing PDF and Help scenarios on four browser/viewports.

Only synthetic data used. No import or changes to Svetlana's records. The next
publication requires the already agreed backup to cover any subsequent work.
