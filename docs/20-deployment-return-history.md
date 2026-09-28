# Deployment and return history

The ITD - 2.4 workbook is imported into a separate historical ledger, asset_movements, via migration 0010 and scripts/import-movement-history.py. It does not change current assignments, employee status, asset state, or signed forms.

Open **Deployment & returns** in the sidebar (beside Asset Inventory), where **Laptop deployment & return history** opens expanded to search all records or filter Deployment, Return, and Needs review. The same panel is available in asset details and employee profiles for matched records. Admin and Super Admin can view this ledger; the endpoint is role protected. Ordinary users cannot access the company-wide history.

Source: https://docs.google.com/spreadsheets/d/1ncftqlAH8LQW4Zf-cxJrQ4nz0yq3MHYZFAeDft2TT18/edit?gid=2034639967

The supplied workbook contains 680 qualifying records: 429 deployments and 251 returns. 666 have asset links, 268 have employee links; 419 require review of at least one asset, employee or date. Counts overlap. All source values are retained, including original names, dates, allocation notes, return reasons and remarks. Rows without an identifiable person, asset or transaction date are not considered movement entries.

Asset matching uses control number and checks for serial conflicts. When the control number is absent, only a unique serial match is accepted. Employee matching uses a unique normalized full-name or first/last-name match. These links identify historical subjects and do not assert current employment or custody. Unknown dates stay blank with their original text preserved. Source allocation does not constitute a confirmed deployment, and a resigned return reason does not complete HR offboarding.

Every row retains source tab and row. A hash of tab and original row content prevents identical reimports from adding duplicates. A corrected row is new content and must be reconciled against the prior row; this is not a bidirectional spreadsheet sync. Historical returns never automatically close newer assignments. Review flagged records before any subsequent current-custody reconciliation.

Run from the project directory after installing requirements-migration.txt:

```sh
python scripts/import-movement-history.py migration-data/deployment-return-tracker.xlsx
python scripts/import-movement-history.py migration-data/deployment-return-tracker.xlsx --apply
```

Use --database for an alternate database. The preview report is private migration-data/movement-import-report.json. Apply creates a dated online SQLite backup, holds a write lock, inserts transactionally, and checks foreign keys. XLSX, report, database and backups are excluded from the source archive.

Verification: a trial on an in-memory database imported all 680 records, imported zero on repetition, preserved every existing asset/employee/assignment/maintenance row, flagged unresolved matches, and passed foreign-key checks. TypeScript validates the new UI. No imported entry is represented as a signed acknowledgement or turnover form. Future deployments and returns continue through the existing provisioning and forms workflows; this panel is the imported historical ledger.

The company-wide history panel is no longer placed above the Asset Inventory dashboard. Asset Inventory defaults to the Laptop overview; related history remains on individual asset and employee profiles.

The imported laptop deployment/return section appears in asset details only for category Laptop. Other hardware retains its normal History tab, without an unrelated laptop ledger.
