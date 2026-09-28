# End-to-end test report — 26 September 2026

## Verified
- Production build completed successfully.
- 42 automated tests passed with no failures.
- 140 HTTP checks passed against a disposable, separately migrated SQLite database.
- Covered authentication, role restrictions, employee ownership, account administration, session invalidation, CRUD, borrowing, procurement/invoice upload, and a signed employee departure workflow.
- Added acknowledgement upload/download checks, invalid file and date rejection, user access denial, deletion protection, and onboarding/offboarding completion history checks.
- Local sign-in page loads; light/dark toggle changes successfully.

## Defect fixed
Deleting an employee with an uploaded acknowledgement previously produced HTTP 500 from a foreign-key constraint. The deletion guard now returns HTTP 409 with the existing linked-record retention explanation. Regression check passes.

## Remaining validation
This is not a full UI acceptance sign-off. Authenticated browser navigation, mobile/tablet layouts, keyboard interactions, and every newer editing dialog still require testing. Signed-in browser checks are recorded below; no credentials were requested or exposed.
Code review also identified areas needing separate regression work: shared/location custody exclusion from employee provisioning and test-record cleanup with newer linked history tables. These are not recorded as passing.
External Google/Microsoft account provisioning and hosted deployment were not tested; these checks do not establish provider integration readiness.

## Data safety
HTTP tests use an isolated temporary database and disposable accounts. No company employee or asset records were changed by these tests. No deployment was performed.

## Signed-in browser follow-up
- Opened employee list and profile; combined laptop/account provisioning appears.
- Opened completed onboarding history with recorded completion dates.
- Verified default laptop inventory: 332 total = 3 available + 255 deployed + 20 maintenance + 54 retired (reserved/borrowed zero).
- Opened asset detail, purchase/warranty and location/borrowing tabs; inspected dark-mode screenshot at the current narrow browser width.
- Verified deployment/return switching and year filter: 2025 returns displayed 73 records.
- Navigation smoke checks reached Forms, Procurement, Suppliers, Manage Records, Resigned/Clearance and Audit Reports. Borrowing shell opened; async loaded contents need further inspection.
- Generated inventory audit snapshot successfully with 621 records, report identifier and export controls. Downloads were not exercised.
- No browser error logs were returned at the end of this pass.
- Fixed corrupted punctuation in provisioned-item and movement-history display strings; verified movement punctuation renders correctly. TypeScript check passed.

Remaining: full responsive viewport matrix, all dialog save paths through browser, export downloads, and previously noted custody/test-cleanup regressions. Imported supplier list includes entries such as “53 Zoom Licenses”; review source mapping before production use. No company asset or employee records were edited during browser checks.
