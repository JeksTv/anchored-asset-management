# Employee provisioning and account register

The employee profile is the lifecycle record for hardware, accessories, software/licenses, work identities, and system access. New items can be added during onboarding or later employment. The existing Current and Returned/deactivated views retain their history. Offboarding must resolve equipment, kit items, borrowings, and outstanding/active account requests before clearance.

## Work accounts

Employee accounts & access supports Google Workspace, Microsoft 365, Google / Gmail, and Other system. For Other system, enter its name in Required services and licenses and the actual username (case is preserved). Record a separate entry for each identity/provider; Google and Teams may share an email address but require separate deactivation confirmation.

Each entry includes an account designation (Primary, Secondary, Additional, Shared access, or Unspecified), mandatory business purpose, requester/source, services, reference, and status. More than one secondary/additional account may exist. One open Primary entry per employee/provider is enforced for Google Workspace, Microsoft 365, and Google / Gmail. Existing records remain Unspecified rather than guessing which account is primary.

- New request follows Submitted, Approved, Active, then Disabled when confirmed by IT.
- Record existing account records a verified account directly as Active and requires an IT verification reference. This does not create credentials or send messages.
- Edit designation / purpose changes metadata, retaining a before/after purpose and designation message in employee activity. It does not change the username, provider, or activation status.
- The employee's All provisioned items list displays provider, designation and business purpose with the account identifier.
- A shared-access entry tracks this employee's entitlement. At offboarding remove that employee's access; do not disable a shared identity needed by other people. IT must record the actual action in its deactivation note.

Passwords must not be entered in purposes or references. Actual creation/deactivation remains manual in the provider's admin console until integrations are configured. Ordinary users cannot edit the administrative account register. Existing role/origin protection applies to all new workspace actions.

## Verification and migration

Migration 0011 adds account_role and the primary-per-provider constraint. A database backup preceded the schema update. Tests cover separate Google/Microsoft identities using the same address, additional accounts, required purpose/verification, duplicate-primary rejection, metadata edits, case-sensitive system usernames, blocked provisioning for departing employees, and retained records after deactivation. No real company accounts were created or disabled during development.
