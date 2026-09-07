# Lesson save repair — not released

Baseline: 3dde8891c2d32a7bc2a31e98d0e6460d80acca3f.

Scope: lesson save refusal preserves the open form and its draft; success requires
primary storage write. A changed primary record blocks a stale form even after
window takeover. Extended drafts retain solution text/PDF references, individual
feedback and attendance. PDF editor exposes opening the attachment directly.

Unchanged: primary/storage names, existing record format, methodology, attachment
bytes, OneDrive handle and backup format. No migration, cleanup or production data
access was performed. Existing draft keys remain readable; extras are additive.

Local gate: 40 checks pass. Browser gate: CI must pass before review completion.
The browser fixture uses synthetic data only and blocks external requests.

Release hold: Svetlana's current complete backup has NOT been received or tested.
Do not merge/publish until records AND attachments are preserved independently and
restored in an isolated environment. Preserve current browser state and unsaved
forms before reload; do not clear site storage or import an older backup over it.
The full backup does not export every orphaned blob or draft: preserve those
separately when capturing the affected device. No claim of recovered user data.

Before deployment capture a fresh backup again if the user continued working.
Rollback means reverting code; do not overwrite newer records with an old backup.
