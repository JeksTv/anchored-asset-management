# Employee brand

Master data Column B (Serving Brand) is the source. Brand is independent of department, employment type and onboarding/offboarding status.

| Source | App brand |
|---|---|
| Shared Services | AnchorEd |
| VCIS | VCIS |
| HP | Homeschool Pilipinas |
| HGPH | HGPH |
| EduNova | EduNova |
| EL | Everlearn |
| TT | Thynker Tech |
| LP | Learning Plus |

Employee list and profiles display Brand. Add employee, Edit employee and Manage records allow selection. Validation accepts the eight brands or Not recorded. Omitted values on existing edit requests preserve the saved brand. Changes are recorded in employee history.

Migration 0016 adds the field. Run the normal database migration before deployment. Import script scripts/import-employee-brands.py previews by default; --apply creates a backup and saves matched values in a transaction. Detailed source and reconciliation files remain in excluded migration-data.

327 source rows matched existing profiles. One source employee had no match and was left pending; no employee profile was created automatically. Employment types continue to use Master data Column N.

Validation: TypeScript and production build passed; 154 isolated HTTP checks passed. All 327 imported brand values reconciled against source. Browser preview timed out, so visual verification remains pending.
