# Employee lifecycle priorities

The employee profile is the central review surface, with hardware, accessories, accounts/access and software/licenses shown separately. Current items display the action IT should take during offboarding. Software access and assigned licenses must be reclaimed; shared access must be removed for the departing employee without disabling access for others.

Pending account requests and active accounts missing designation or business purpose are highlighted. These are review prompts, not automated provider actions. Temporary borrowing and reservations from workspace inventory are highlighted separately and remain managed in Temporary Borrowing. Existing server clearance rules continue to enforce outstanding assignments, kit tasks, accounts, borrowing, application logins and signed documents.

New departure snapshots preserve account IDs, provider, username, designation, services, purpose, status, IT review notes and timestamps. Existing signed snapshots are not rewritten. Account records are explicitly labeled as IT records; Google/Microsoft status is not synchronized.

Next development stages: subscription purchase/renewal register with seats and costs; links between account entitlements and license assignments; provider verification integrations. These stages are not yet implemented. A request or IT record must never be represented as automatic external provisioning.

Employee profiles place Acknowledgement & employee documents immediately below All provisioned items. The list is restricted to the selected employee; acknowledgement entries display equipment tags/names and approval status. Open an entry for its recorded details and print action, or use New form (Acknowledgement is the initial default). The same forms remain accessible from Forms & Documents; records are not duplicated.

## Existing signed acknowledgements

Employee profile documents support uploading existing PDF/JPG/PNG signed acknowledgements (up to 8 MB) with signed date and covered asset references in notes. Admin/Super Admin can download them. Contents are stored in SQLite and included in database backups. Uploads retain employee linkage and uploader identity, do not mutate assignments, and do not auto-approve digital forms. Missing uploads are labeled as missing files, not proof of missing employee signatures. File signatures are validated; files download as attachments.

Asset details distinguish office/site, room/area and optional responsible person/team. These fields are editable through Edit asset. Location custody displays as shared office equipment rather than an unresolved employee match. TV001 was corrected to SC4 with room pending IT confirmation; prior Tektite details are retained in its change history. Its shared custody marker remains populated so existing inventory counts continue to treat it as deployed.

Laptop arrangements Needs review flags missing/Unknown personal or loan details, or absence of any recorded company, personal, or active/completed gadget-loan arrangement. A confirmed personal laptop with loan status None is complete even without a company laptop. The category cards may overlap.

Laptop arrangement cards explicitly count employees (once per category), not devices. A separate live inventory total includes all laptop states. Category membership can overlap, and the Include offboarded employees option changes employee scope only.

Employees list now uses Currently provisioned, counting active records from the same combined helper as the employee profile. It includes separate account records, unlinked issued kit items, software/hardware assignments and active borrowed assets. Linked kit records are not duplicated; borrowed equipment already counted as an active assignment is not added again. Pending accounts and reservations remain separate. Counts represent records, with accessory quantities displayed inside the profile. The older action tab is labeled Inventory assignments to identify its narrower scope.

Edit employee is available directly in the employee profile for IT administrators. Full-name/surname, employee code, email, department, job title and start date updates retain the internal employee ID and all linked records. Name changes record old/new names in employee history. Updating contact email does not rename provider accounts or app login credentials. Existing signed departure-document identity locking remains enforced; signed snapshots are not rewritten.

## Employee profile layout

The employee drawer uses a compact identity block and task tabs: Provisioned items (default), Acknowledgements & forms, Accounts & access, Onboarding kit, Borrowing, and Deployment history. Laptop arrangements are expandable inside the default tab. Employee editing and profile metadata stay visible above the tabs. Inventory return/revocation actions and clearance controls remain in the default view. The prior placement of documents directly below provisioned items is superseded by a dedicated adjacent tab. Tab state resets for each employee; responsive controls wrap for small screens and use shared light/dark theme tokens.

Deployment & returns uses separate Deployments and Returns buttons, with a shared year selector (newest year first). Records sort by movement date descending. Unknown dates have a separate option rather than guessing from workbook titles. Section counts reflect the chosen year before search/review filters; pagination count reflects all filters. The same controls apply to employee and laptop movement history.

Movement history edits: IT Admin/Super Admin may correct date, categorized reason, explanation and allocation note. Every edit requires a correction reason and retains before/after snapshots with actor/time in movement_edits. Original spreadsheet payload and matching links remain unchanged. Stale versions are rejected. Change Laptop and completed gadget loan + three-year transition require explanatory notes; eligibility is an IT attestation, not an automatic calculation. These edits do not alter custody or clear source matching exceptions.

## Completed workflow history

Onboarding and Offboarding have In progress and Completed history views. History uses explicit completion events, not current employee status, supports year/search/pagination, and opens the employee profile for supporting records. Completion events are retained in workspace responses beyond the recent-100 activity limit. Older imported active/departed employees without completion events are not invented as completions; departed records remain in Resigned & Clearance. Dates in employee columns reflect current profile data, not immutable completion snapshots. Historical events do not contain reliable IT actor IDs, so no completer is inferred.
