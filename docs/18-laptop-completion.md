# Laptop inventory completion

## Result - September 24, 2026

Source: ITD - 2.0 ASSET MONITORING TRACKER, LAPTOPS tab, exported on September 24, 2026:
https://docs.google.com/spreadsheets/d/1lzeEcogivYmEB8h99dZE2E3L9Hl5U-rnGbfKD7R-tr4/edit?gid=149168871

The original approved-assignment migration did not import the entire inventory. The current local database had 221 laptops, of which 218 tags matched the current tracker. Three separately entered laptops (HW-001, HW-MC-001, HW-MC-002) are outside the tracker and were preserved.

The additive import created **114 laptops**. All **332 unique tracker tags** now exist, and the app contains **335 laptops** and **624 total assets**. Existing assets, assignments, employee records, and other business tables were preserved without updates. This imports inventory, not new handovers or signed acknowledgements.

| Missing source records | Added |
|---|---:|
| Deployed | 39 |
| For Retirement | 54 |
| For Repair | 7 |
| For evaluation / For Evaluation | 6 |
| For Upgrade | 4 |
| Reserved | 3 |
| Available | 1 |
| Total | 114 |

## Field and status handling

This importer reads the laptop register columns C-Y (tag through remarks), following the original laptop mapping. It ignores the separate summary table to the right. The earlier A-I restriction applied to the twenty accessory tabs, whose importer is unchanged. Model, serial, source condition/status, original custody, dates, company, bag, accessories, and remarks are retained. Parsed purchase/warranty dates populate the normal asset fields. Ambiguous dates remain original source text; no date is invented.

- Deployed records are Ready with source custody recorded. They count as deployed, even when employee linking remains unresolved.
- Available records are Ready without active custody.
- For Retirement records are in the app's non-deployable Retired bucket. The original **For Retirement** wording and an explicit note remain visible; this does not certify disposal or completed retirement.
- For Repair, evaluation, upgrade and Reserved records are blocked from provisioning using 20 open maintenance/inspection holds. Reserved means a source reservation hold, not a fabricated borrowing contract. The hold is logged on the import date and explicitly says the original start date is unknown. IT must review and complete the hold before release.

The original source status and exceptions appear in asset notes and import activity. Existing records were not refreshed from the latest sheet; any changed custody/status for those 218 laptops requires a separate reconciliation.

## Employee links and source quality

No new employee assignments were created. All 39 added deployed records retain the source custodian and require employee/date review. Missing custodians are explicitly labeled unconfirmed. The importer never creates employees from names, departments or locations and never guesses a partial-name match. It accepts an active non-test employee only when an exact full name or a prior tag-specific user-confirmed decision matches the current source recipient, with a complete release date.

Two duplicate serial pairs are preserved and flagged for review: LT016/LT095 and LT024/LT079. Tags are distinct, so they are not silently merged. Numeric serial cells ending in .0 are normalized; unknown placeholders become empty serials. Real serial conflicts with existing assets stop the import.

## Runbook

Use the Python dependency in requirements-migration.txt. Keep the XLSX and reports in the private migration-data directory.

Preview:

```sh
pnpm migrate:laptops migration-data/laptop-tracker-2026-09-24.xlsx
```

Review migration-data/laptop-completion-report.json, then apply:

```sh
pnpm migrate:laptops migration-data/laptop-tracker-2026-09-24.xlsx --apply
```

Optional flags: --database, --decisions, --report. This command does not use DATA_DIR or a remote database automatically; explicitly pass --database for a different destination. Existing records are matched by case-insensitive tag and retained. Duplicate source tags, unknown statuses, category conflicts, and serial conflicts stop the operation. A repeat run adds zero records.

Apply obtains a SQLite write lock before planning, creates a dated online database backup before inserting, inserts in one transaction and validates foreign keys before commit. This migration does not modify upload files. Its backup is a database-only restore point; retain existing uploads alongside it.

Applied backup: backups/2026-09-24T23-46-38-laptop-completion/anchored.sqlite. The source workbook, report, backup, and database contain private company data and are excluded from the source ZIP.

## Verification

A trial on an in-memory copy verified 114 additions, all 332 tracker tags, 335 total laptops, 20 holds, 39 source custodians, unchanged pre-existing rows across every table, clean foreign keys, an idempotent rerun, and rejection of a deliberate serial conflict. The same counts and foreign keys were checked after the live import.

## September 25 custody follow-up

With user approval, five clear source-name matches were linked to existing employee profiles, preserving source release dates. One of the original 39 records had already been assigned manually and was left unchanged; 33 remain unlinked for review. Current custody is an initial sheet baseline, not a verified new handover. A database backup was taken first. Private migration-data/laptop-custody-applied.json records the matches and remaining exceptions; link-laptop-baseline.py checks identity, state and existing custody and avoids duplicate assignments.
