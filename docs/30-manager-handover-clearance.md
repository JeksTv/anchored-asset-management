# Manager account-handover clearance

IT records manager approval in Resigned & Clearance or the employee clearance panel. Managers do not need app access.

1. Start offboarding and verify that all employee accounts and system access are recorded.
2. For each account/access item, record the manager name, approval date, and either Transfer business resources or No handover required.
3. For transfers, select an active receiving employee and describe the resources and instructions. For no handover, record the reason.
4. Attach PDF/JPG/PNG approval evidence (up to 8 MB) or record an approval email/document reference. Existing attachments are retained.
5. IT performs the transfer outside this app, then confirms completion with a note.
6. Deactivate access according to the departure schedule. Pending handovers do not block deactivation, but do block new final clearance signatures.

Recorded approvals are IT attestations of externally obtained approval, not manager authentication or electronic signatures. No passwords should be entered. Transfer business resources through the provider's administrative tools, not by sharing an employee password.

Account metadata changes require renewed review. Completed transfers and signed clearance evidence retain history. Existing signed clearances are not retrospectively invalidated. Historical disabled/cleared access may appear for review; record No handover with evidence when appropriate.

The signed clearance snapshot includes handover decisions and completion details. Offboarding audit exports include handover item and pending counts. Accounts absent from the register cannot be discovered automatically.

## Deployment

Run the normal database backup, then `node scripts/migrate.mjs` before starting the updated app. Migration 0017 creates manager_handovers and manager_handover_events. Approval attachments are stored in SQLite and included in database backups. No new environment variables are needed. Only administrators can read or modify this workflow.

## Verification

Unit tests cover permissions, invalid approval data, optimistic versioning, account metadata changes, handover completion and clearance blockers. Production typecheck/build and existing HTTP regression suite should run before deployment.
