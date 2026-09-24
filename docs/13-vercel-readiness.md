# Vercel deployment readiness

Assessment: September 23, 2026. Requested target is Vercel for an unfinished staging version. No deployment, subscription purchase or cloud data transfer has been performed.

## Hosting decision

Vercel restricts Hobby to personal, non-commercial use. A company IT operations application should not assume eligibility merely because it is in testing. Confirm appropriate eligibility with Vercel or use an appropriate company plan. The user requested free hosting; a paid plan requires a separate budget decision.

Source: https://vercel.com/docs/limits/fair-use-guidelines (commercial usage).

## Current application and required changes

The application uses React 19 with vinext, Node 24, synchronous node:sqlite access, server-side sessions and a persistent local data directory. Procurement invoice bytes live in SQLite. Employee form images live in data/uploads. Both must remain durable across deployments and parallel server instances.

Vercel functions cannot provide the persistent shared local filesystem required by this database design. Copying anchored.sqlite into a deployment or into temporary storage is not a safe database migration.

Source: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel

Before deploying the complete app:

1. Select the hosting account/plan and a durable managed database and private file store, including their own quotas and costs.
2. Create an isolated staging copy and backup the current database and uploaded documents. Keep the working local app available.
3. Adapt database access, authentication, audit logs and transactions to the selected remote database. The current synchronous SQLite calls cannot be replaced by setting a connection URL alone.
4. Adapt employee document and procurement invoice storage. Check Vercel request/response limits and use authenticated direct-to-storage uploads/downloads when needed to preserve existing attachment limits.
5. Validate a deployment adapter for the installed vinext version. Upstream vinext documents Nitro as a deployment path; do not assume a static Vite export includes the application's API and authentication routes. Pin and verify compatible dependencies before deployment.
6. Run migrations and automated tests against an isolated staging database. Verify role restrictions, employee visibility, invoice downloads, concurrent edits, onboarding/offboarding, backup restoration and persistence after redeploy.
7. Configure secrets in the hosting service, set APP_ORIGIN to the actual HTTPS domain and provision a named staging administrator. Exclude LOCAL-CREDENTIALS.txt, local databases, migration-data, backups and raw exports from deployment uploads.
8. Deploy staging and verify the real HTTPS URL. Use synthetic records initially; transfer company data only to the selected company-authorized storage and reconcile counts before opening access to IT.

Technical references:

- https://vercel.com/docs/functions/limitations
- https://github.com/cloudflare/vinext (deployment adapters)

## Zero-cost assessment — September 24, 2026

The user selected a zero-cost hosting budget. No paid subscription is authorized. Vercel is not the selected deployment target while this budget remains in place.

| Option | Fit for this application | Limitation |
|---|---|---|
| Existing company server or dedicated always-on PC | Recommended if available. Current Node/SQLite and private file storage can be retained. | No additional hosting subscription, but electricity, hardware, network access, updates and backups still need company support. Availability and OS have not been confirmed. |
| Oracle Always Free VM | Best candidate among assessed free cloud options for retaining the current architecture. | Regional capacity may be unavailable; idle instances may be reclaimed. Account verification typically requires a phone and card. Use only Always Free resources and do not upgrade to paid service. |
| Cloudflare Workers with remote storage | Possible redesign candidate, not a direct deployment of this version. | Free Workers have a 10 ms CPU limit per request. Current scrypt password authentication and synchronous SQLite transactions require redesign/validation. R2 requires a subscription checkout and bills beyond its free allowance; zero cost is conditional on usage. |
| Render Free | Not suitable for this app unchanged. | No persistent disk on free web services; service sleeps after 15 idle minutes. Database and attachments would need external persistent services. |

The assessment does not promise perpetual free or guaranteed-availability cloud hosting. A company-controlled existing server is the recommended next step if it is available. For off-network access, assess the company's existing VPN or approved HTTPS access rather than exposing the development server directly.

Sources checked September 24, 2026:

- https://render.com/docs/free
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/r2/pricing/

## Next information required

Confirm whether an existing company server or dedicated always-on computer is available, and its operating system. If none is available, evaluate Oracle account eligibility and regional capacity before preparing a cloud VM deployment. No hosting account or external resource has been created and no company data has been uploaded.

## Original decision context

Keep a zero-cost hosting budget and evaluate another provider, or prepare Vercel using an appropriate company plan. No paid resource should be created merely from the original request to use a free service. Hosting selection determines the database and storage implementation; these changes have not yet been made.
