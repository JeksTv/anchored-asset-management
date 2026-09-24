# Twenty-tab hardware migration

## Completed migration

On September 22, 2026, the Google workbook **ITD - 2.0 ASSET MONITORING TRACKER** was exported to XLSX. Only columns A through I were migrated from these tabs:

| Source tab | Imported |
|---|---:|
| MONITOR | 31 |
| MOUSE | 96 |
| DESKTOP | 14 |
| TABLET | 12 |
| HEADSET | 8 |
| KEYBOARD | 14 |
| WEBCAM | 8 |
| HDMI | 20 |
| VGA | 7 |
| EXTERNAL HDD | 4 |
| SSD | 10 |
| RAM | 5 |
| WIFI ADAPTER | 2 |
| PRINTER | 4 |
| IPAD | 4 |
| SMART TV | 4 |
| CONFERENCE MIC | 3 |
| TAPO CAMERA | 34 |
| VGA-HDMI | 3 |
| NOTEBOOK COOLER | 6 |
| **Total** | **289** |

The migration created 289 hardware records and 46 active employee assignments. Another 101 assets have a value in Released to but no safe employee match. They retain the source custodian and appear as deployed without being attached to the wrong employee. The remaining 142 have no Released to value. After migration, the local database contains 510 assets and 267 assignments. Foreign-key validation returned no violations.

The backup made immediately before the first asset insert is `backups/2026-09-22T10-29-53-asset-tabs`. The backup made before enforcing the final A–I-only mapping is `backups/2026-09-22T10-33-24-asset-tabs`. Backups contain private company data and login hashes and must remain access-restricted.

## Included columns

| Column | Tracker field | AnchorEd destination |
|---|---|---|
| A | # | Source row reference |
| B | Control Number | Unique asset tag |
| C | Asset | Asset name |
| D | Model | Hardware model |
| E | Serial Number | Serial number; NA and dash placeholders become blank |
| F | Brandnew / Old | Source condition metadata |
| G | Condition | Normalized condition and lifecycle status |
| H | Date Released | Employee assignment or source custody date |
| I | Released to | Employee assignment when confidently matched; otherwise source custodian |

Columns J onward are intentionally ignored and are not stored in the imported asset details. Every asset stores its source sheet and row and receives an asset activity entry so the record remains traceable to the workbook.

## Identity and custody rules

The importer uses exact full-name matches, a unique first-and-last-name match, and identities already confirmed during the laptop migration. It links only Active or Onboarding employees and never creates an employee from a Released to cell.

Ambiguous names, departments, and shared locations stay in the asset's `custodian` field. The Asset Inventory dashboard treats that field as deployed, and the asset detail identifies it as imported source custody requiring employee-link review.

Because the migration is limited to A–I, any nonempty Released to cell is treated as current source custody. Non-working or damaged assets are imported as Retired. Other tagged rows are Ready.

## Re-running with a newer export

Install Python 3 and the locked migration dependency:

```sh
python -m pip install -r requirements-migration.txt
```

Export the tracker as XLSX, keep it in the private `migration-data` directory, and preview it:

```sh
pnpm migrate:asset-tabs migration-data/asset-tracker.xlsx
```

Review `migration-data/asset-tab-migration-report.csv`, then apply:

```sh
pnpm migrate:asset-tabs migration-data/asset-tracker.xlsx --apply
```

The command stops without database changes for duplicate source tags, tag/type conflicts, serial conflicts, or custody conflicts. Apply mode creates a dated online SQLite backup, uses one transaction, validates foreign keys, and rolls back the whole batch on failure. Re-running the same export is idempotent.

The source workbook, identity decisions, report, database, and backups are confidential migration material. They are excluded from the source distribution.
