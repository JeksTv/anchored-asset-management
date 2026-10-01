# Cancel a mistaken onboarding or offboarding

Open the employee record and select Cancel onboarding or Cancel offboarding. Enter a reason and confirm that completed actions remain unchanged.

For mistaken onboarding of an existing employee, cancellation marks the employee Active. A withdrawn new hire should instead go through offboarding to recover provisioned equipment and revoke access.

Offboarding cancellation restores Active by default; choose Onboarding if that was the original state. Departure date and reason are cleared from the current profile and preserved in the cancellation event. Returned assets, disabled accounts, forms, and completed tasks are not reversed. IT must review any necessary reprovisioning separately.

Cancellation is restricted to IT administrators, only applies to in-progress workflows, and is blocked when signed departure documents exist. Cancellation reasons, actor and time are retained in employee events and workflow history. Refresh the employee before attempting another action.

No database migration is required. Three regression tests cover access and required confirmation, cancellation state changes, audit records and stale retries. Genesis Tabiliran Alegata (THYNKERTECH334) was restored to Active by an explicitly user-authorized local correction after a database backup.

Completed workflow history excludes cancellation events. Cancellation evidence remains in employee events and security audit records.
