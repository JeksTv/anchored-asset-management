# AnchorEd Asset Management — requirements

## Purpose

Provide an employee-centered record of company equipment, software access, onboarding, offboarding, acknowledgements, returns, incidents, and maintenance.

## Existing scope to preserve

- Employee directory and employee profiles with current and historical assignments.
- Hardware details, acquisition information, warranty, condition, and maintenance.
- Inventory summaries and paginated employee and asset lists.
- Onboarding kits and separate Google Workspace and Microsoft 365 account requests.
- Offboarding clearance checks for outstanding equipment, licenses, accounts, and kit tasks.
- Employee-linked acknowledgement, turnover, and incident forms with IT review.
- Incident photo storage and printable forms.
- Reviewed imports with duplicate and custody-conflict checks.

## Access model

| Capability | Super Admin | Admin | User |
|---|---|---|---|
| Manage application accounts and roles | All roles | User accounts only | No |
| Disable accounts and revoke application sessions | All roles | User accounts only | Own sign-out only |
| Manage all employee and inventory records | Yes | Yes | No |
| Manage onboarding and offboarding | Yes | Yes | No |
| Review and approve forms | Yes | Yes | No |
| Sign IT turnover and clearance documents | Yes | Yes | No |
| View own equipment and account records | Yes | Yes | Yes |
| View another employee's records | Yes | Yes | No |
| Submit or review forms in IT workspace | Yes | Yes | No |
| Run imports and exports | Yes | No | No |

These are application roles. Google Workspace or Microsoft 365 administrator privileges do not automatically grant an application role.

## Acceptance criteria

1. All business-data APIs reject unauthenticated requests.
2. Role and record-ownership checks run on the server for every protected action.
3. Users cannot read another employee's records by changing IDs or query parameters.
4. File downloads enforce the same ownership rules as their linked forms.
5. Admins cannot promote themselves or manage Super Admin accounts.
6. Disabling a login prevents use of existing sessions.
7. Role changes and administrative account actions have an audit trail.
8. Existing inventory and employee data remain recoverable during migration.
9. The source can be opened, installed, tested, and run from VS Code using documented commands.
10. Deployment documentation distinguishes completed verification from operator steps that require company credentials.

## External integrations

Google Workspace and Microsoft 365 account provisioning is currently recorded manually. Application login and external employee account provisioning are separate features. Adding login does not establish automated Google or Microsoft provisioning.

## Confirmed decisions and remaining deployment inputs

- Deployment ownership: company server.
- Authentication: case-insensitive username and password; email is optional and editable later.
- Initial setup creates separate Super Admin, Admin, and unlinked User credentials with forced password change. Replace generic accounts with named individual accounts before rollout.
- Remaining operator inputs are the company-server OS, HTTPS domain, backup destination, and server access method.
