# Cabinet storage maintenance, 2026-09-06

This release updates the restored legacy cabinet, without DeepSeek. No user backup, student record or credentials are shipped in the repository.

Unchanged storage: localStorage `tochka-resheniya-v2`, IndexedDB `tochka-files/files`, saved File System Access handle `tochka-auto/handles/file`. The embedded methodology is unchanged. Historical missing material references remain intact and do not reject the database.

Autosave reuses the original handle, queries permission at startup and attempts a verified full backup. Changes schedule an attempt after 20 seconds of inactivity, with a 60-second maximum scheduling delay during continuous editing. Those are scheduling delays, not guaranteed completion times. File writing, browser suspension and OneDrive upload take additional time. Browser permissions cannot be granted by application code.

Full backups use JSON with a reserved `__svetlanaBackup` manifest, SHA-256 of records and each attached file, and base64 file payloads. The top-level legacy state remains readable. Large files are encoded in chunks and unchanged payloads cached while the page is open. Previous on-disk copies (three) are retained in local IndexedDB before replacement. These local versions are not a substitute for OneDrive version history or an independent backup. Missing files, denied permissions, transaction aborts, failed readback and a newer on-disk copy block overwrite and display a warning.

Imports validate integrity, preserve the previous state, stage binary files under fresh IDs, then commit the primary state. Old binary files are not overwritten by imports. Concurrent changes abort the import. Stale tabs cannot overwrite a changed primary storage value. Empty or invalid loads remain blocked. `Помощь → История и восстановление` offers preserved local copies and file import.

Scope: application-level persistence and recovery. The application has no Microsoft Graph integration; it cannot confirm OneDrive upload or configure the desktop sync client. This is not a claim of end-to-end cloud replication, zero data loss, complete security certification, or testing on Svetlana's physical machine.

Validation: deterministic Node/VM tests with a minimal DOM, transactional IndexedDB double and file-handle doubles; no real browser layout or native file-picker automation. The supplied private JSON was checked locally, preserving its 24 students, 4 groups, 165 lessons, 14 payments, 17 routes and 15 material records, including missing historical links. The private fixture is not committed. A synthetic workload matching attachment sizes (168,464,105 bytes) produced a 224,796,126-byte complete backup and passed chunked readback; initial fallback encoding/readback took about 44 seconds in Node, peaking at about 617 MiB RSS before encoding-cache optimisation. Browser native FileReader encoding and actual computer/OneDrive speed differ.

Rebuild: use baseline index.html and sw.js from commit d72c7d2e8ebab0573b3289c1f8bd726271dbe49d in `source/baseline.html` and `site/sw.js`, then run `python source/build.py`. Run `node tests/safety.cjs`; optionally pass a local private legacy backup path for additional compatibility validation.

Longer-term architecture: authenticated server database for records, private object storage for documents, offline queue, conflict detection, versioned backups and restore testing. That requires a separate migration/deployment and is not introduced during incident repair.
