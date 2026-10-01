# External personnel

IT can create a profile without an HR import. In Add employee choose Employment type: External personnel. Enter the external company and internal sponsor/responsible manager; both are required. Use a unique IT-managed Employee ID such as EXT-001 and the person's actual work email. Brand and Department identify the internal team supported. Start date is the engagement start.

Profiles start in Onboarding and use the same asset assignments, account register, acknowledgement forms, borrowing, returns and offboarding controls as internal employees. Creating a profile does not create an application login or provider account. At engagement end, start offboarding to recover equipment and disable access. Personal work equipment should not be entered as company-owned inventory.

Employees has an All / Internal / External personnel filter. The external company appears in the list and company/sponsor appear in the profile. Existing profiles and HR import data are not changed. HR lists should not be treated as a complete directory of external personnel; maintain these records in IT.

Migration 0018 adds external_company and internal_sponsor, both defaulting to empty. Back up before running scripts/migrate.mjs. Company and sponsor are validated on creation and editing. Standard employee events record updates. No real external profile is created automatically.

Overview headcounts are separate: Total employees excludes External personnel; The External personnel card is hidden from Overview. Total employees excludes Offboarded records. Laptop assignment counts and onboarding/offboarding work queues include both groups so IT obligations remain visible. The directory's All personnel filter includes both groups.

Employees defaults to Internal personnel each time the section opens. External personnel and All personnel remain selectable in the Personnel dropdown.
