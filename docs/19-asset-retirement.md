# Retiring hardware from maintenance

Admin and Super Admin can open Asset Inventory, open the hardware details, and choose **Retire asset**. Enter a retirement date and reason, then confirm with **Retire asset**.

The action works for Ready and Maintenance hardware. It atomically closes all open service records as **Closed — retired**, records the retirement date/reason and administrator in asset activity, and changes the asset to Retired. Original service issues, work notes, costs, and assignment history are retained. A retirement closure is not labeled a successful repair. The hardware is no longer available for provisioning or borrowing.

Retirement is blocked for active assignments, unresolved imported source custody, and outstanding reservations/borrowings. Return or resolve custody first. Dates must be valid, no later than today in Philippine time, and no earlier than purchase or an open service record. Retiring an already retired asset is rejected.

Migration 0009 adds closure_outcome to maintenance. Existing records are unchanged. A backup was taken before applying it. No company assets were retired during feature development.

Verification: TypeScript validation and five isolated database tests covering service closure, retained history, repeated requests, invalid dates/reasons, roles, source custody, active assignments and reserved/borrowed hardware. Local database schema updated; no real records used as test subjects.
