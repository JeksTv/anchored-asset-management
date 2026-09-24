# Administration and operations

## Access administration

Super Admin (all roles) or Admin (User logins only) opens Manage access to create individual username-based logins, add optional emails, choose roles and link employees. An unlinked User sees no employee records. Select the correct employee before distributing that user's account. One employee can be linked to one login. Linking a different employee revokes existing sessions.

Reset password generates a unique temporary password shown once in the interface. It revokes all sessions and requires a password change. Disable blocks access immediately. A Super Admin cannot change their own role/access through this interface; another Super Admin must make the change. At least one active Super Admin must remain. Keep a second named Super Admin for recovery. There is no email reset service in this release.

Never store Google/Microsoft passwords in asset notes or document fields. Provider account status and application access are separate: disabling an AnchorEd login does not disable Gmail or Teams. IT must perform and verify external deactivation separately.

## Backups

Pause application writes (stop the web service for the safest complete backup), then run `pnpm backup` with the same DATA_DIR as production. The script creates a timestamped directory under backups containing anchored.sqlite and any uploads. It uses SQLite's backup API rather than copying a live database file. Database and upload copying are separate operations, so stopping writes is necessary for a consistent set.

Schedule daily backups and a backup before every release/import. Copy backups to protected off-server storage, encrypt them according to company policy, restrict service-account access, and define retention with IT/HR. Verify the scheduler and backup failures are monitored. The application does not provision off-server backup storage or alerting automatically.

## Restore drill

1. Stop the application and preserve the current data directory as a separate rollback copy.
2. Create an empty recovery data directory; copy the selected backup's anchored.sqlite and uploads there. Do not mix old WAL/SHM files with a restored database.
3. Use the matching application release and set DATA_DIR to the restored directory. Restrict folder permissions.
4. Clear app_sessions in the restored database to invalidate backed-up logins. Run database integrity and foreign-key checks.
5. Start an isolated instance; verify counts, logins, profiles, history and document downloads.
6. Record restore duration and findings. Switch production only after IT approves the recovery point and possible data loss since backup.

## Maintenance

Review accounts and employee links monthly and immediately at departure. Review failed logins and security activity; avoid logging passwords, session cookies or full request bodies. Login attempts have both per-username and global limits, so coordinated abuse can temporarily limit other logins; add company perimeter controls where appropriate. Establish storage alerts and log retention outside the app. Remove orphan uploads only after reconciling references and retention needs.

Run dependency/security reviews on a regular schedule and validate updates in staging. Do not delete employee or assignment history to simulate offboarding. Use return/clearance workflows and disable the separate application login. No automated Google/Microsoft integration or email notification delivery is enabled by this release.
