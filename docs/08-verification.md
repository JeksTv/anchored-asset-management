# Verification and release status

## September 23, 2026 feature update

Supplier management, procurement history/private invoices and employee laptop arrangements are implemented. TypeScript and the production build passed; **11 unit tests and 104 HTTP checks passed**. Browser testing with a separate disposable database verified supplier display, procurement creation with an asset link, procurement history in asset details, gadget-loan filtering and arrangement edits. The live supplier import added **137 records from 205 source rows**, with Fire & Safety Services and Document Management excluded; a second import applied no changes. See [the feature guide](12-suppliers-procurement-laptops.md). The original September 20 figures below are the historical baseline, not current inventory totals.

Verification completed locally on September 20, 2026 using Node.js 24. The existing hosted Asset Desk was read only during export and remains unchanged.

## Completed checks

| Check | Result |
|---|---|
| TypeScript type check | Passed |
| Authentication/security unit tests | 8 passed |
| Production application build | Passed; all UI and API routes built |
| HTTP permission and ownership checks | 78 passed |
| SQLite integrity check | `ok` |
| Foreign-key validation after import | No violations |
| Local database/upload backup command | Passed |
| Employee reconciliation | 327 source / 327 destination |
| Asset reconciliation | 221 / 221 |
| Assignment reconciliation | 221 / 221 |
| General activity reconciliation | 562 / 562 |
| Asset-history reconciliation | 221 / 221 |
| Initial access setup | Super Admin, Admin and unlinked User created with separate random temporary passwords and forced change |

The HTTP suite verified unauthenticated rejection; Admin/Super Admin separation; Super Admin-only import; Admin management of User logins only; protected administrator accounts; employee/asset CRUD and history safeguards; IT turnover and clearance signing; unresolved-obligation checks; signed-document ownership; own-employee isolation; cross-employee attachment denial; Origin enforcement; temporary-password blocking; password change; logout; employee relinking; immediate session revocation; account disabling; and protection of the last active Super Admin.

## Not yet completed

- Deployment and acceptance on the company server, because its OS, domain and access have not been provided.
- HTTPS reverse-proxy, firewall, service manager, scheduled off-server backup and monitoring configuration.
- IT/HR user acceptance against the final production snapshot.
- Final source-write freeze, re-export and cutover reconciliation.
- Google Workspace or Microsoft 365 API automation. Provider provisioning remains an IT operation tracked by the app.
- Container build validation; Docker is not installed in this preparation environment.
- A clean lint/accessibility baseline. The inherited UI and generated component library currently report strict linter findings (including label/keyboard semantics, explicit `any`, and promise-handling rules). Type checking, builds, and permission tests pass, but these findings should be resolved before the formal production release gate.

## Release gate

Do not call the system production-ready until an operator completes `04-deployment.md`, a final snapshot passes `05-migration.md`, an isolated restore succeeds, and named representatives approve Admin and User workflows. Delete generic temporary accounts or convert them to individually assigned accounts before employee rollout.

## Temporary borrowing — September 24, 2026

Migration 0007 applied after local backup. Type checking and build passed. 18 service/security tests and 118 HTTP authorization/ownership checks passed, including borrowing conflicts, partial/damaged returns, clearance blocks and private signed-file access. See 16-temporary-borrowing.md for workflow and acceptance checks.

## Test record cleanup — September 24, 2026

Migration 0008 applied after a local database backup. Type checking and production build passed. Final suite: 23 service/security tests and 126 HTTP checks passed. Explicit test labels, linked-login cleanup, signed test departure document cleanup, real-employee asset protection, exact identifier confirmation, and role restrictions were verified on disposable databases. See 17-test-record-cleanup.md.
