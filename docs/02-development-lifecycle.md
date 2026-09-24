# Software development lifecycle

## 1. Requirements and scope

Maintain the role matrix and acceptance criteria in `01-requirements.md`. Record feature requests as small changes with a concrete user outcome, acceptance criteria, and migration impact. IT validates equipment handling; HR validates employee status and effective dates.

## 2. Design

Deployment uses a company server and application-managed username/password authentication. Preserve existing employee IDs, asset IDs, foreign keys, and historical assignments. Define API permission checks alongside each new endpoint. An employee record and a login account are different entities; a login may be linked to an employee.

## 3. Implementation

Develop on a feature branch. Keep database changes in append-only migrations. Keep credentials out of Git, browser bundles, documentation, and seed data. Separate browser components, request handlers, business services, and database access. The company-server edition uses Node SQLite and protected local storage instead of the original Cloudflare-specific adapters.

## 4. Verification

Run type checking and the production build. Test authentication failures, role restrictions, cross-employee access, file ownership, disabled accounts, logout, and privilege changes. Test representative onboarding, equipment return, maintenance, form approval, and offboarding paths. Verify duplicate import retries and conflict behavior. Use a separate test database and storage bucket; do not test destructive actions on production records.

## 5. User acceptance

Have an IT representative exercise Admin workflows and an employee representative exercise the User portal. Verify keyboard access, readable layouts, pagination, and useful validation errors. Record test identity, expected outcome, observed outcome, and any unresolved issue. Production release requires the relevant acceptance criteria to pass.

## 6. Release

Prepare an exact release commit and retain the prior release. Back up the database and uploaded objects before applying migrations. Deploy to staging, apply migrations, verify login and permission boundaries, and complete user acceptance. Deploy the same release to production during an agreed window. Confirm the intended audience, domain, identity-provider callback URLs, and secrets before enabling access.

## 7. Migration and cutover

Export the complete source database and uploaded objects, including older audit events. The existing workspace API limits some activity results and is not a complete database backup. Reconcile table counts, primary keys, foreign keys, file references, and representative employee profiles. Pause source writes during the final export and cutover to avoid losing changes. Keep the original deployment available until the destination passes reconciliation and business verification.

## 8. Operations and recovery

Assign an owner for backups, dependency updates, access reviews, incident response, and retention. Monitor server errors, failed authentication, failed imports, and storage failures without logging passwords or session tokens. Test restoration in an isolated environment. Roll back application code only when compatible with the current schema; prefer corrective forward migrations for schema changes. A deployment rollback is not a database restore.

## Documentation set

The final handoff should include a VS Code quick start, frontend and backend architecture, schema overview, role matrix, configuration reference, test instructions and results, deployment runbook, data migration runbook, backup and recovery instructions, and administrator and employee user guides.

## Current preparation status

The application source is in a separate handoff folder with username/password roles and a company-server runtime. A private staging snapshot has been migrated locally for verification. This is not yet a production deployment: no company server, domain, TLS configuration, or backup destination has been supplied, and the existing hosted application remains untouched.
