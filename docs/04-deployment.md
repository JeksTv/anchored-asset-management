# Company-server deployment

## Decisions and prerequisites

Deployment target is a company server. Server OS, actual host/domain, administrator access, TLS certificate and backup location have not yet been supplied. These are operator steps, not completed deployment work. The application uses username/password and does not need an email service to start.

Use a dedicated service account, Node 24.13+ in the 24.x line, pnpm, persistent local disk, and an HTTPS reverse proxy. Bind port 3000 to loopback; expose only the proxy to users. Configure the firewall accordingly. Start with a staging instance and synthetic or appropriately protected copied data. Do not run tests against production.

## Install on Linux or Windows

1. Copy the source package to a controlled release folder. Do not copy local temporary credentials or node_modules. Install the pinned dependencies with `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env`. Set `APP_ORIGIN=https://your-actual-domain` (no path/trailing slash) and an absolute `DATA_DIR` outside the release folder, for example `/var/lib/anchored` or `C:/ProgramData/AnchorEd/data`. Grant only the service account and administrators access.
3. Run `pnpm db:migrate`. On a fresh empty installation, optionally run `pnpm import:snapshot /secure/path/snapshot.json` using the reviewed final migration export.
4. Run `pnpm setup:accounts`, retrieve `LOCAL-CREDENTIALS.txt` locally, deliver the three distinct passwords securely, and remove the file after handover. Alternatively create only a named Super Admin with `pnpm bootstrap your.username` and create other accounts in Manage access. Do not run both setup methods.
5. Run `pnpm typecheck`, `pnpm test`, and `pnpm build`. Configure the service environment explicitly with `NODE_ENV=production`, `APP_ORIGIN`, and `DATA_DIR`.
6. Start with `pnpm exec vinext start --hostname 127.0.0.1 --port 3000`. Run as a supervised service that restarts on failure. The service must have its working directory set to the release folder and access to the persistent data directory. `.env` alone is not a substitute for explicit service environment configuration.
7. Configure HTTPS termination and forwarding to 127.0.0.1:3000. Preserve the browser Origin header. Configure request-body limits at the proxy (5 MB) and avoid caching `/api/*` responses. Enable access logs without cookies, authorization headers, or request bodies.
8. Complete verification through the actual HTTPS URL: login, forced password change, each role, one onboarding, one return, document attachment, and backup restoration. Change initial passwords and replace generic accounts with named individual accounts before rollout.

On Linux use your company's systemd service conventions. On Windows use the company's approved Windows service manager; do not rely on an open terminal or a user session remaining signed in. The service account must have permission to write SQLite WAL/SHM files alongside the database. Configure scheduled backups through the server's scheduler.

## Container option

`Dockerfile` builds a single Node service. Build using `docker build -t anchored:release .`. Run with a persistent writable volume at `/app/data`, `APP_ORIGIN` set to your HTTPS origin, and publish only `127.0.0.1:3000:3000`. The image runs as the non-root node user; prepare bind-mount ownership accordingly. Initialize the volume with the migration/setup scripts before starting the web service. Do not scale replicas.

Example initial empty-volume setup (credentials are copied out by the operator from the setup container; they are not printed in logs):

```sh
docker volume create anchored-data
docker run --rm -v anchored-data:/app/data anchored:release node scripts/migrate.mjs
docker create --name anchored-setup -v anchored-data:/app/data anchored:release node scripts/setup-accounts.mjs
docker start -a anchored-setup
docker cp anchored-setup:/app/LOCAL-CREDENTIALS.txt ./LOCAL-CREDENTIALS.txt
docker rm anchored-setup
docker run -d --name anchored --restart unless-stopped -p 127.0.0.1:3000:3000 -v anchored-data:/app/data -e APP_ORIGIN=https://your-actual-domain anchored:release
```

Use the import script before account setup if migrating. Do not paste production passwords into command history. Container build/runtime examples require validation on the selected company server; Docker is not available in the current preparation environment.

## Release and rollback

Record the release version, dependency lockfile, checks, operator and release time. Back up the database and uploads together before upgrades. Migrations validate checksums of already-applied business migrations. Add new migrations; never edit an applied migration. Future changes to the initial auth schema must also be versioned as migrations.

Retain the previous application release and corresponding backup. Restore only during an agreed outage, after stopping writes. A backup restore loses changes made since that backup; reconcile these with IT before reopening. Keep the old hosted application available until cutover acceptance, then make it read-only or retire it through a separate authorized step.
