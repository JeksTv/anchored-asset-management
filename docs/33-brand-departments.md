# Brand-specific departments

Add employee and employee editing forms use dependent Brand and Department dropdowns. Departments are configured in lib/brand-departments.json from the IT-provided list. AnchorEd is the canonical spelling of Anchored.

Changing brand clears the department selection. New employees require a brand and a matching department. Existing imported departments can be retained unchanged, including legacy values outside the configured list; changing the brand or department requires a valid combination. No existing employee records are bulk-updated. The API validates the combination for creation and edits.

Configured lists: AnchorEd (8), VCIS (1), Everlearn (1), Learning Plus (1), Homeschool Pilipinas (1), HGPH (16), EduNova (1), Thynker Tech (3). HGPH's Learn Touch and TLC and TLC are distinct entries as supplied.
