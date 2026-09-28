# Physical asset verification and QR labels

Open a hardware asset in Asset Inventory. Physical verification & QR label provides a printable label, inspection entry, and historical findings.

IT records observed serial, custodian, location, condition and notes. The server saves a snapshot of recorded details alongside observations and the signed-in IT identity and timestamp. Differences create an Open finding. IT resolves each finding with an explanation; original observations remain preserved. Resolution does not change inventory, assignments or maintenance: use those workflows separately. Inspection records cannot be edited or deleted through this feature. Missing recorded values can create discrepancies requiring investigation.

QR labels include the control number, asset name and serial. The QR contains only the app URL and asset ID. Viewing the label and inspection endpoints requires Admin or Super Admin. Scanning opens the asset after authentication. Print with the browser print command. Generate labels from the final company network/hosting address: localhost links cannot be used from another device and labels must be reprinted when the origin changes.

Migration 0012 adds inspection history; it does not alter existing custody. Tests cover authorization, validation, snapshots, resolution, inventory preservation and SVG generation. This initial version supports text notes and evidence references, not photo uploads or audit campaigns. QR scanning uses the device camera; no dedicated scanning app is required.

Audit Reports > Physical asset verification exports inspections, open findings and resolutions in CSV or dated verification JSON.
