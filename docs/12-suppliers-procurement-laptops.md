# Suppliers, procurement and employee laptop arrangements

Added September 23, 2026 to the company-server VS Code project.

## Requirements and permissions

Admin and Super Admin can maintain supplier contacts, procurement history, private invoice attachments and employee laptop arrangements. Every API checks the signed-in role; regular User accounts cannot access supplier contact details, invoice documents or other employees' arrangements. Mutations require the configured application origin. Supplier, procurement and arrangement changes are recorded with actor, time and a saved snapshot. Version checks reject edits made from outdated forms.

## Supplier list

Open **Suppliers** to search, create, edit, view details, archive or reactivate a supplier. Contacts, phone numbers, emails, addresses, supplied items and categories are retained. Archived suppliers cannot be chosen for new purchases, but their existing procurement remains accessible. Existing purchases may retain an archived supplier when edited.

The source is [ITD - 3.0 Suppliers Tracker](https://docs.google.com/spreadsheets/d/1cSNeYwaYL9jyH4yR9OVEDtF-qhAy7JNEbHaOzIuSrXM/edit). The September 23 export contains **205 named source rows consolidated into 137 supplier records** across 14 included categories. **Fire & Safety Services** and **Document Management** tabs are excluded. Exact supplier names, ignoring case and repeated whitespace, are consolidated; unique contacts, addresses, items and category memberships are preserved. Similar names and abbreviations are not guessed to be the same company. Source rows are retained in import history. The source workbook remains unchanged.

Some Software entries are product/subscription names rather than legal supplier names. They remain as recorded and should be reviewed against an actual invoice before procurement use. Numeric phone cells are preserved as their digits; missing leading zeroes are not invented. Exported tab names without slashes are mapped back to Computer Peripherals/Accessories and Printing/Fabricating.

| Category | Source rows |
|---|---:|
| Laptop | 33 |
| Printers | 14 |
| Ink | 5 |
| Internet Providers | 12 |
| Headset | 7 |
| Repair Center | 5 |
| Software | 64 |
| Network | 33 |
| Computer Peripherals/Accessories | 13 |
| CCTV | 13 |
| Printing/Fabricating | 3 |
| Disposal Services | 1 |
| Training Services | 1 |
| Cyber Security | 1 |

### Repeating the import

Keep the exported workbook and generated manifest in private `migration-data/`. From the project folder:

```sh
python scripts/prepare-suppliers.py migration-data/supplier-tracker-2026-09-23.xlsx
node --env-file-if-exists=.env scripts/migrate.mjs
node --env-file-if-exists=.env scripts/import-suppliers.mjs
node --env-file-if-exists=.env scripts/import-suppliers.mjs --apply
```

Preparation is read-only and validates the seven expected column headers. Import previews by default, rejects excluded categories, backs up SQLite before insertion and inserts transactionally. Reruns skip existing names and preserve subsequent IT edits. It does not synchronize or delete supplier records. Review the manifest when a renamed supplier could produce a second record. Python requires the existing `requirements-migration.txt` dependencies.

## Procurement and invoices

Open **Procurement → Add procurement**. Choose a supplier, enter an invoice/PO reference, purchase date, description, currency and total including tax; select any existing inventory assets covered by the purchase. Save, then open **Details / invoices** to attach PDF, JPEG or PNG documents up to 10 MB each. Several assets and invoice attachments can belong to one procurement. The amount is the whole procurement total, not the cost of each linked asset. Recording procurement does not create duplicate inventory assets; add individual equipment through Asset inventory, then link it.

Supplier details show its procurement history. Linked asset details show procurement and invoice downloads. Invoice/PO references are unique per supplier (case-insensitive). Purchase totals are stored as integer cents. Edits preserve earlier snapshots; voiding requires a reason and keeps the record, asset links and invoice attachments. Voided records cannot be edited or receive new invoices. There is no hard-delete action for invoices or procurement; add a corrected document with a clear filename and edit the notes if needed.

No historical procurement transactions or invoices were invented from the supplier list. IT must enter the actual purchase records and attach existing invoices.

## Employee laptop arrangements

Open **Laptop arrangements** to view paginated employee lists and filter by Company laptop, Gadget loan, Personal laptop or Needs review. Former employees are hidden until **Include offboarded employees** is selected. Every employee profile also has an arrangement editor.

- **Company laptop:** derived from unresolved assignments of hardware categorized as Laptop. A loan or personal-use record never creates a company asset. Equipment with unlinked source custody is disclosed separately and not guessed to belong to an employee. Assignment history and returns remain the source of truth.
- **Gadget loan:** Not recorded, None, Active, Completed or Cancelled, with reference, date and device/agreement details. The Gadget loan list includes Active and Completed, so people who previously availed a loan remain visible. These records do not calculate loan balances, payroll deductions or approval decisions.
- **Personal laptop:** Not recorded, Yes or No, with device/approved-use details. This is an explicit IT record, not inferred from absence of company equipment.
- **Needs review:** employees with no linked company laptop or unrecorded loan/personal-use information. Categories can overlap; cards are not intended to sum to total employees.

Employee and asset deletion guards now retain records referenced by laptop arrangements or procurement. Normal onboarding/offboarding continues to manage company assignments. The loan/personal-use record is retained when an employee departs.

## Architecture, backup and deployment

Migration `0006_purchasing_laptop_arrangements.sql` adds suppliers, procurements, procurement_assets, procurement_invoices, employee_laptop_arrangements and purchasing_history. `server/purchasing.mjs` handles validation, transactions and audit snapshots; `/api/purchasing` and `/api/invoices` enforce access. `components/purchasing.tsx` renders the three sections, profile editor and asset history. Drizzle declarations are included in `db/schema.ts`; the versioned SQL migrations remain authoritative (including case-insensitive uniqueness).

Invoice bytes are stored in SQLite rather than a public web directory. Upload requests are bounded, allowed formats are checked by signatures, and downloads require IT authorization with attachment disposition, no-sniff and private no-store headers. Files are not malware-scanned by this application. Invoice content is never sent in list responses. Existing database backup/restore includes the invoice bytes; protect backups as company records. File storage will increase database size; monitor and set retention practices before production rollout.

Deployment: stop application writes, run the documented backup, deploy the updated source, run `pnpm db:migrate`, `pnpm typecheck`, `pnpm test`, `pnpm build`, then restart the service. Restore the pre-migration database and matching previous application version if rollback is needed. Configure reverse-proxy request limits to allow the 10 MB invoice plus multipart overhead. Supplier source data, database, backups and attachments must be excluded from distributable source archives.

## Verification

`tests/purchasing.test.mjs` verifies supplier exclusions, duplicates, optimistic edits, exact monetary storage, invalid dates/assets, rollback, retained invoice history, void restrictions and overlapping loan/personal use. `tests/http.mjs` additionally verifies role and origin restrictions, upload formats/size, authenticated downloads, history access and relationship deletion guards, alongside existing onboarding/offboarding checks. Run these against disposable databases, never the live employee inventory. UI acceptance should include adding a test purchase, attaching an invoice, viewing it from an asset, and updating an employee arrangement.
