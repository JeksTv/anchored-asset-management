# AnchorEd Asset Management

Company-server edition of Asset Desk. Open `AnchorEd.code-workspace` in VS Code.

Employee profiles bring together equipment, software assignments, account requests, onboarding kits, returns, incidents, and history. Google Workspace and Microsoft 365 account provisioning is currently recorded by IT; this release does not create accounts in either provider automatically.

## Local development

Install Node.js 24.13 or later in the 24.x line and pnpm. From this folder:

```sh
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env`. Keep `APP_ORIGIN=http://localhost:3000` for local development.

```sh
pnpm db:migrate
pnpm setup:accounts
pnpm dev
```

Open http://localhost:3000. The setup command creates `superadmin`, `admin`, and `user`, each with a different random temporary password in `LOCAL-CREDENTIALS.txt`. All must change their passwords on first sign-in. No email is required. The User initially sees no employee data; an Admin or Super Admin must link the correct employee in **Manage access**. Never share one production login among multiple people. Create named accounts before rollout.

For the prepared local copy, migrations, data import, and account setup may already be completed; these commands intentionally refuse to overwrite existing accounts or records. Use the local credential file to sign in. Generate fresh accounts on the company server.

After securely delivering credentials, remove the plaintext credential file. Do not commit it, database files, migration exports, `.env`, or uploaded documents. Email can be added or changed later in Manage access and is not the login identifier.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

`tests/http.mjs` exercises the running HTTP routes against a disposable database and starts its own development server; run `node tests/http.mjs` separately. See the test report for actual results.

## Documentation

- [Requirements and roles](docs/01-requirements.md)
- [Software development lifecycle](docs/02-development-lifecycle.md)
- [Frontend, backend, and database architecture](docs/03-architecture.md)
- [Server deployment](docs/04-deployment.md)
- [Data migration and cutover](docs/05-migration.md)
- [Administration, backups, and recovery](docs/06-operations.md)
- [User guide](docs/07-user-guide.md)
- [Verification and release status](docs/08-verification.md)
- [Test CRUD and signed offboarding forms](docs/09-testing-and-clearance.md)
- [Twenty-tab hardware migration](docs/10-asset-tab-migration.md)
- [Hardware sections and inventory overview](docs/11-inventory-sections.md)
- [Suppliers, procurement invoices and laptop arrangements](docs/12-suppliers-procurement-laptops.md)
- [Vercel deployment readiness and pending hosting decision](docs/13-vercel-readiness.md)
- [Official AnchorEd branding](docs/14-branding.md)

This is a prepared company-server application, not a completed deployment to your company server. The existing hosted Site remains separate. Confirm the server OS, domain, TLS setup, backup destination, and access arrangements before production installation.

- [Responsive layout and device checks](docs/15-responsive-layout.md)

- [Temporary borrowing, signed forms and returns](docs/16-temporary-borrowing.md)
