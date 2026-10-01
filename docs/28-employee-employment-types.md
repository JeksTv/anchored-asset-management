# Employee employment types

Source: Active team members (Tech Copy), **Master data**, Column **N — Employee status**.
https://docs.google.com/spreadsheets/d/1iPeq5SulGmiDQ-nOnZpI_eKZusWl-j8i7sbdnfw4Qnc/edit?gid=10353738

The application displays this HR classification as Employment type, separately from Active/Onboarding/Offboarding/Offboarded workflow status. Values preserve the source labels: Full time, Probationary, Prob-Reg, Consultant, Reliever, Project-based, Part-time, Part-time Reg. Blank means Not recorded.

Employee list and profile display the field. Add employee, Edit employee and Manage records support it. Server validation rejects unknown values. Older edit clients that omit the field preserve the saved value. Changes are logged to employee history.

Migration 0015 adds the optional field with an empty default. Run the existing migration command before using the updated app on another environment.

The September 30 import matched 327 populated rows by employee ID, exact name, exact email or previously IT-confirmed identity mappings. One source row is blank and remains unrecorded. No unmatched populated source rows. The earlier Sheet1/Column G import was reverted before this import.

The reusable import script previews by default and applies only with --apply. It creates a SQLite backup, rejects duplicate targets and updates only employment_type in a transaction. Source data and detailed reconciliation stay in excluded migration-data; backups stay in excluded backups.

Validation: TypeScript and isolated HTTP tests cover create, edit, omitted-field preservation, invalid values and unchanged workflow status.

Validation results: production build successful; 148 HTTP checks passed; all 327 imported values reconciled against the source.
