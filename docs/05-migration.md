# Data migration and cutover

## Prepared copy

The local private `migration-data/snapshot.json` contains business tables exported from Asset Desk. This folder and the local database are excluded from source control and the source archive. The original hosted application has not been replaced.

| Table | Exported rows |
|---|---:|
| employees | 327 |
| assets | 221 |
| assignments | 221 |
| events | 562 |
| asset_events | 221 |
| kit_templates | 1 |
| employee_kits | 1 |
| kit_tasks | 4 |
| account_requests | 0 |
| maintenance | 0 |
| employee_forms | 0 |
| form_applications | 0 |
| form_asset_links | 0 |
| form_files | 0 |

This is a staging copy, not a final cutover snapshot. Data was read in multiple requests while the original Site remained live. Source activity after the snapshot must be reconciled before going live. Historical employee events were exported directly rather than using the workspace endpoint's limited event feed. Zero form-file rows mean no corresponding uploaded files were present in this snapshot.

## Import behavior

Run `pnpm db:migrate`, then `pnpm import:snapshot /path/to/snapshot.json` against an empty destination business database. The script uses a fixed table allowlist, validates columns, imports transactionally, and checks foreign keys before committing. It preserves IDs and relationships. It refuses a nonempty business destination to avoid accidentally merging or duplicating records. Accounts are separate from employee records and are created by setup or the Super Admin.

The source export is confidential personnel and equipment information. Transfer it through company-approved encrypted storage, limit access, and follow the company's retention policy. Do not include it in a public repository or source distribution.

The later additive hardware import is documented in [Twenty-tab hardware migration](10-asset-tab-migration.md). It migrates only columns A–I from the selected tabs into an existing database.

## Final cutover sequence

1. Obtain IT/HR acceptance on the staged employee profiles, custody, statuses, missing dates and account information.
2. Schedule an outage/freeze for source edits. Record the cutoff time.
3. Export all business tables again and download every referenced upload if file records have been added. Keep original IDs and filenames. Do not assume the workspace activity feed is a full backup.
4. Take a separate immutable source backup and destination backup. Do not overwrite the only backup.
5. Import into a fresh destination database; place files under DATA_DIR/uploads with the exact form_files IDs. Create fresh application accounts, not copies of local development sessions.
6. Reconcile every table count, employee/asset/assignment ID, active custody, form-file reference, and foreign key. Spot-check Ryan Gatarin, Davin Buhay and Christian Mateo against the previously confirmed identities; do not rematch by email alone.
7. Verify each user's employee link. Google and Microsoft can use the same email but remain distinct provider records; no provider account is inferred merely from an email field.
8. Sign off and switch users to the new URL. Keep the old Site available for rollback but prevent concurrent data entry after cutover.

## Limits and cleanup

Some historical employee start dates may be missing. The existing form workflow requires complete employee information; IT should complete missing dates before submitting forms. Migration must not invent employment dates. Employee email addresses are not used as application login credentials. Imported records do not automatically create login accounts, Google accounts, or Microsoft accounts.
