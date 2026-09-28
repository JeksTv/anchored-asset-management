# Audit reports

Admin and Super Admin can open Audit reports, choose a report, then Generate report. A paginated preview and full CSV/JSON downloads share exactly the same snapshot; changing source records afterward does not silently change an already generated export. Generate again for a fresh snapshot.

Available reports: complete inventory, employee asset assignments (including resolved history), accounts and access (including purpose, designation and confirmation notes), kit items/accessories, offboarding obligations and signed-document counts, imported movement exceptions, and administrative security activity. IDs support tracing records back to the app. Test flags are included where available; tests are not silently excluded from totals.

Every generated report has a unique ID, UTC generation time, generator, row count, scope and SHA-256. Report generation is recorded in security_events. CSV contains metadata followed by column headings and rows. CSV formula prefixes are neutralized; quoted values and line breaks are escaped. No password hashes, session tokens, credential values or attachment blobs are selected by these queries.

Verification JSON preserves raw snapshot data. To verify its hash, parse JSON, remove sha256 and verification properties, serialize the remaining object with JSON.stringify in its original property order, encode UTF-8, and calculate SHA-256. The CSV references this JSON snapshot hash; it is not a hash of the CSV file. This is an integrity checksum, not a digital signature or immutable audit archive. Store exported files in company-controlled storage according to retention policy.

Reports reflect the database at generation time, not a reconstructed historical cutoff. They include unverified imported records and manual IT confirmations as recorded. A signed-document count indicates an app record exists; the reviewer must inspect the actual form. Zero outstanding counts alone do not certify clearance. Administrative activity covers recorded security events; it is not a guaranteed complete history of every external-provider action. Actual Google/Microsoft status must be verified with provider records. Downloads occur locally after report generation; individual download clicks are not logged.

Verification: TypeScript validation and isolated tests cover role restrictions, report allowlisting, all report queries, metadata/hash consistency, unresolved clearance obligations, missing document counts, CSV formula protection, and preservation of operational data. No database schema migration is needed.
