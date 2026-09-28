# Cleaning up test employees and assets

## Manage records

Super Admins and Admins can create employees/assets in **Manage records** with the **This is a test** checkbox. Test records show a Test badge, and **Show test records only** filters the list. Existing test entries can be labeled using **Mark as test**. This requires typing the exact employee ID or asset tag; an existing name containing “Test” is not automatically labeled. For example, the local **Test Account** employee has ID `123` and is not labeled until an authorized operator marks it.

Choose **Delete test data** to review a count of linked records, any blocker, and the identifier confirmation field. This cleanup deletes the labeled test employee plus their assignments, activity, kit tasks, account requests, forms/files, temporary borrowing history, and User login/sessions. Assigned inventory assets remain. A test asset cleanup removes its own linked test assignments, maintenance, asset events and eligible test forms/borrowings. Signed departure documents for explicitly labeled test employees are included in cleanup; this is permanent, so use the preview before confirming.

The app refuses deletion when a test asset has real employee history, procurement/invoice links, an active borrowing, or a multi-item borrowing that also contains another asset. Test employee cleanup is blocked by active borrowing. Only a Super Admin can clean up a test employee linked to a User login. Admin/Super Admin logins cannot be removed through employee cleanup. Existing ordinary records still offer **Delete unused** with the original safeguards. Audit entries record the operator, identifier, and deleted record counts.

## Local installation and checks

Migration `drizzle/0008_test_records.sql` adds an explicit marker to employees and assets. The development database was backed up before applying it. No existing employee or asset was automatically marked or deleted. Run `npm run db:migrate` before using updated code on another server. The source ZIP excludes the database and backups.

Type checking, production build, 23 disposable service/security tests, and 126 HTTP authorization/ownership checks passed. A Super Admin should review and label existing test profiles before deletion; the local **Test Account** is connected to a User login and an HDMI cable assignment, so its preview should show both while preserving the cable in inventory.
