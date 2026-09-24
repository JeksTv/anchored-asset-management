# Temporary borrowing

## Scope and user workflow

Temporary borrowing tracks short-term hardware loans separately from permanent assignments and gadget financing. Open **Temporary borrowing** in the workspace navigation.

1. Choose **New borrowing**, an employee, start and expected return date/time, purpose, and available hardware. Record issue condition and accessories/quantities for each item.
2. **Reserve items** holds the hardware immediately. A future start does not permit another overlapping loan: reservations are exclusive until cancelled or returned. This release does not implement future booking windows or a waitlist.
3. On handover, open **Details / forms > Release items** and confirm receipt. Release is allowed only during the requested period and for an active/onboarding employee.
4. Print the borrowing/return form, obtain the borrower and IT signatures, and attach a signed PDF, PNG or JPEG (maximum 5 MB each). Printing alone does not sign a form. Uploaded copies are retained, downloaded as attachments and never publicly served.
5. Record each returned item with condition and IT notes. Confirm all listed accessories have been received. Items with missing accessories remain outstanding; do not mark them returned. Partial returns keep the remaining items open.
6. Damaged returns require notes and automatically open a maintenance inspection. They become available only after maintenance is completed. The authenticated IT operator is recorded as receiver.
7. Attach the signed return acknowledgement. Cancellation is available only before release, requires a reason, and preserves history.

## Tracking and employee connections

Search by employee, reference, asset name or tag. Filter Reserved, Borrowed, Due today, Overdue, Returned and Cancelled; records are paginated. The Overview shows reservations and due/overdue counts. Status refreshes every minute while a borrowing view is open. There are no email reminders or background notifications in this release.

Employee profiles and the employee self-service portal include borrowing history and documents. Asset details include linked borrowing records. Inventory shows Reserved and Borrowed separately from Deployed and excludes held hardware from availability. Permanent assignment paths are also protected at database level against borrowing conflicts.

Outstanding reservations and released loans prevent IT turnover/clearance signing and completion of offboarding. Cancel unissued reservations or receive outstanding items first. Signed loan copies are managed by IT; their upload is not a cryptographic signature or automatic validation of the signatures on the document.

Times entered/displayed in the tracker use the device's local timezone and are stored in UTC. Due-today classification and printable dates use Philippine time (Asia/Manila).

## Architecture and retention

- Migration: `drizzle/0007_temporary_borrowing.sql` adds borrowings, items, immutable application history and signed-file tables. Foreign keys retain links to employees and assets.
- Service: `server/borrowing.mjs` handles validation, atomic reservation/release/return/cancel, optimistic version checks, audit events, files and escaped printable HTML.
- API: `/api/borrowing`; authenticated reads, own-employee-only reads for Users, Admin/Super Admin writes, and same-origin checks. File downloads repeat ownership checks. Request and file sizes are bounded; only supported file signatures are accepted.
- UI: `components/borrowing.tsx` is reused in the tracker, employee profile, asset profile and employee portal.
- Files are stored in SQLite, included in database backups. No delete action is exposed for loan history or signed copies. Printouts use saved employee/asset snapshots; action history saves state snapshots. Keep access and backup retention consistent with company HR/asset policy.

## Installation and deployment

Back up the database first, then run `npm run db:migrate` before starting updated code. Migration 0007 was applied to the local development database after a backup on September 24, 2026. No existing employee or asset business records were changed for testing. Apply the same migration on any deployment target; do not copy test databases into production. Source ZIP excludes live data, signed files, backups and credentials.

## Verification

- Seven borrowing service tests: reservations/conflicts, clearance blockers, confirmation/date/version checks, partial returns and damage inspection, cancellation, date/employee validation, due status, file validation and HTML escaping.
- Existing service/security tests remain part of the test suite.
- HTTP coverage includes unauthenticated access, User write denial, origin checks, own-record/print/file isolation, admin attachment uploads and inventory loan status.
- Desktop tracker and phone new-loan form checked in the local app without saving test loans into company data. Test lifecycle records are confined to disposable databases.

Before rollout, IT should perform acceptance with a designated test employee and test hardware, print and sign a form, attach it, then exercise release and partial/final return. Check the company retention policy and train operators not to clear missing accessories.

Final automated results: TypeScript check and production build passed; 18 service/security tests and 118 HTTP checks passed. The tracker had no page-wide horizontal overflow at 390px.
