# Section action cleanup

- Header creation actions are explicitly limited to Overview, Employees, Onboarding and Asset inventory.
- Offboarding has no Add employee action. Its empty state links to Find employee.
- Empty employee and inventory lists no longer repeat the header creation button.
- Offboarding no longer shows a status filter that duplicates its In progress / Completed history controls.
- Temporary borrowing displays due/overdue/reservation counts within the tracker, replacing the duplicate summary panel and self-link.
- Dedicated supplier, procurement, forms, account and record-management actions remain owned by their respective sections.

Validation: TypeScript check; browser verification of Onboarding and Offboarding actions. No operational data changes.
