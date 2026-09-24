# Testing record management and IT clearance

Use clearly named test records, such as TEST Employee and TEST-LAPTOP-001. Test assignments and signed documents retain history; they cannot be deleted as unused records afterward. Use a separate DATA_DIR for a fully disposable environment.

1. Sign in as Super Admin or Admin. Open Manage records and create a test employee and laptop. Edit their details and verify search and pagination.
2. In Manage access, create a User login and link it to the test employee. Store the temporary password securely. Admins can manage User accounts only; Super Admins can manage all roles.
3. Assign the laptop to the employee. Add accessories and external account records if needed. Verify everything appears on the employee profile. Google/Microsoft account creation is still performed in the provider's administration tools.
4. Start offboarding from the profile, selecting Resignation and the last working day. Find the employee in Resigned & clearance.
5. Check that outstanding items block IT sign-off. Record the laptop return and resolve provisioned accessories. Sign the Turnover form with your own current password and explicit confirmation.
6. Resolve all remaining software, kit and external account obligations. Disable the linked application login in Manage access. Verify that Clearance stays blocked until these obligations are resolved.
7. Sign Clearance. Open both signed forms and use View / print. Confirm the employee, equipment, signer, remarks and timestamp are correct.
8. Complete offboarding from the profile. The employee remains in the departed list with both documents. A User linked to another employee must not be able to open these forms.

## Automated regression checks

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, then `node tests/http.mjs`. The HTTP suite creates and removes its own disposable database and tests permissions, record editing/deletion safeguards, account administration and the return-to-clearance flow. It does not modify the local business database.
