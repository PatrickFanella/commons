# Deploying Commons

Commons runs as one Node 24+ process with one SQLite database. Keep one application replica. The production service serves the built frontend and API from the same origin. The database contains accounts, password hashes, hashed recovery keys and sessions, projects, discussions, bookmarks, membership and reports. Treat backups as private account data.

The repository provides deployment artifacts; a public domain, HTTPS proxy, hosting machine and off-host backup destination must be chosen before public launch. No production host or DNS is changed by these instructions.

## Configuration

Copy `.env.example` to `.env` and set your actual HTTPS origin, for example `PUBLIC_URL=https://your-domain.example`, your public publisher/operator name in `OPERATOR_NAME`, and a monitored public account/privacy contact address in `CONTACT_EMAIL`. All example values are placeholders. Do not commit `.env`. These values are required in production. `PUBLIC_URL` controls request-origin validation; the site publishes operator/contact metadata through `/api/site` and its information pages. Serve the frontend and API on that same origin. Production session cookies are Secure, so authentication must be accessed through HTTPS.

Compose reads `.env`; direct Node execution requires exporting its environment yourself. Runtime variables are:

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | Use `production` for the production service. |
| `PUBLIC_URL` | Exact public HTTPS origin. |
| `OPERATOR_NAME` | Public publisher/operator identity displayed by the site. Required in production; 1–120 characters with no surrounding whitespace or control characters. |
| `CONTACT_EMAIL` | Monitored public account/privacy contact email displayed by the site. Required in production; a valid email address up to 254 characters. |
| `DATABASE_PATH` | SQLite path; Compose fixes it at `/data/commons.sqlite`. Direct execution defaults to `DATA_DIR/commons.sqlite`, or `./data/commons.sqlite`. |
| `HOST`, `PORT` | Direct Node defaults to `127.0.0.1:3000`; Compose uses `0.0.0.0:3000` inside the container. |
| `TRUST_PROXY` | `1` trusts one forwarding proxy hop. Leave `0` when directly accessing the service. Never expose the internal listener to untrusted clients while trusting forwarding headers. |
| `APP_PORT` | Compose's host port, bound only to `127.0.0.1`; default `3000`. |
| `IMAGE_TAG` | Local image version; use a commit ID or release tag for updates. |
| `BACKUP_DIR` | Host directory mounted at `/backups`; default `./backups`. Use an absolute path for unattended backups. |

There is no default account, password or shared session secret. Users create accounts through the site. Each registration displays a recovery key once; save it in a password manager. Recovery rotates that key and invalidates sessions. This release has no email password reset. Losing both password and recovery key prevents normal account recovery.

## Build and run

Requirements: Docker Engine with Compose, enough persistent disk space for the database and backups, and a reverse proxy terminating HTTPS. Build dependencies are installed in the build stage; the runtime contains only production dependencies and serves `dist`.

```sh
cp .env.example .env
# Edit .env before running Compose.
install -d -m 700 backups
# The image's node user has UID/GID 1000. Match your BACKUP_DIR ownership.
sudo chown 1000:1000 backups
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
curl --fail http://127.0.0.1:3000/api/health
```

Compose uses a named `data` volume, a read-only container filesystem, an unprivileged user, limited logs and a 30-second shutdown grace period. Do not run `docker compose down -v`; it deletes the database volume. The health check requests `/api/health` and expects `{ "ok": true }`.

Configure your selected reverse proxy to forward the public domain to `http://127.0.0.1:3000`. It must replace client-supplied forwarding headers, set `X-Forwarded-Proto: https`, preserve the public Host, and be the only trusted hop when `TRUST_PROXY=1`. A proxy in another container cannot use its own loopback to reach this service; configure a private shared network instead of publishing a wildcard host port. Confirm HTTPS certificates, HTTP-to-HTTPS redirects and the real domain before accepting registrations.

Visit the public HTTPS URL, create the operator's account and save its recovery key. Promote the existing account from the trusted host:

```sh
docker compose exec app node server/admin.js promote your-username
```

Log out and back in, then open `/admin`. Check report handling, project hiding and account suspension before inviting the community. No admin is seeded. The optional `node server/admin.js import-photocraft` command imports a labelled external reference; it is not an account or an affiliated project. Leave production empty unless you deliberately import it.

For direct Node hosting, run `npm ci`, `npm run build`, then export `NODE_ENV=production`, `PUBLIC_URL`, `OPERATOR_NAME`, `CONTACT_EMAIL`, `DATABASE_PATH` and any proxy settings before `npm start`. Use a service manager, an unprivileged service account and a persistent writable database directory. The service must be restarted after environment changes.

## Backups

Run backups daily and before every application update. `backup.mjs` uses SQLite `VACUUM INTO` to create a consistent snapshot even while committed writes reside in WAL. It checks SQLite integrity and foreign keys, refuses an existing destination, and writes files with mode `0600`. Never copy a running `.sqlite` file alone with `cp`, `rsync`, or a filesystem snapshot that excludes its WAL.

```sh
docker compose exec -T app node scripts/backup.mjs "/backups/open-world-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
```

For a host scheduler, use the checkout's absolute path with `docker compose --project-directory /absolute/path/to/commons`; make sure the same `.env`, project name and volume are selected. A successful command exits zero and prints the verified destination. Monitor failures and available disk space.

Keep at least 7 daily snapshots and 4 weekly snapshots; retain the pre-update snapshot until the update is accepted. Copy snapshots to the chosen off-host destination over an encrypted transport, with access limited to operators. Encrypt stored copies when the destination does not already provide protected storage. Do not prune the only verified off-host copy. The backup destination and retention scheduler are operator configuration, not provisioned by this repository. Test a restore in an isolated volume before deleting older backups.

## Restore

Restoring replaces community data with the selected snapshot and loses later writes. Stop the application and every other database writer. Keep the previous database and all sidecars together for investigation or reversal. The restore script only creates a new destination; it refuses an existing database or destination `-wal`, `-shm`, or `-journal`, and rejects a source with a WAL or journal. The `--app-stopped` acknowledgement records your operational responsibility; it does not stop a running process.

```sh
docker compose stop app
# Preserve existing database AND sidecars inside the persistent volume.
docker compose run --rm --no-deps app sh -c '
  archive="/data/pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -m 700 "$archive" || exit 1
  for file in /data/commons.sqlite /data/commons.sqlite-wal /data/commons.sqlite-shm /data/commons.sqlite-journal; do
    if [ -f "$file" ]; then mv "$file" "$archive/" || exit 1; fi
  done
'
docker compose run --rm --no-deps app node scripts/restore.mjs \
  /backups/SELECTED-BACKUP.sqlite /data/commons.sqlite --app-stopped
docker compose up -d app
docker compose ps
curl --fail http://127.0.0.1:3000/api/health
```

Replace `SELECTED-BACKUP.sqlite` with the chosen filename. If restore fails, keep the app stopped and investigate. Do not start it with a missing database: startup would create an empty one. After success, verify login, projects, discussion and moderation from HTTPS. Restored session records can resume unexpired sessions from the snapshot; for a compromise response, revoke sessions through a reviewed database operation or force affected accounts through recovery, then rotate their passwords and recovery keys.

The same tool works outside Docker:

```sh
DATABASE_PATH=/private/data/commons.sqlite node scripts/backup.mjs /private/backups/snapshot.sqlite
node scripts/restore.mjs /private/backups/snapshot.sqlite /private/new-data/commons.sqlite --app-stopped
```

## Update and rollback

Before updating, record the running image tag and back up the database. Keep the previous image locally. Check out the reviewed revision, update `IMAGE_TAG` in `.env`, build it and run `docker compose up -d app`. Verify health, HTTPS sign-in, a project page and admin access. Schema initialization runs at startup; review database changes before upgrading.

An application-only rollback can select the previous image tag and run `docker compose up -d --no-build app` when its schema remains compatible. If the schema is incompatible, stop the app and follow the restore procedure using the matching pre-update backup before starting the previous image. Preserve newer data first, and communicate the recovery point and expected loss of later writes. Never overwrite a live database or apply old sidecars to a restored snapshot.

## Launch checks and ongoing operation

Before public launch, verify the real HTTPS origin and certificate, accurate public `OPERATOR_NAME` and monitored `CONTACT_EMAIL` in `/api/site` and information pages, persistent volume survival after recreation, a real administrator with a stored recovery key, an off-host backup and tested restore, account recovery and deletion, and project/discussion moderation. Review the site's privacy and terms pages against your operator identity and jurisdiction before publishing.

Check application logs with `docker compose logs --tail 100 app`; avoid publishing logs or backups. Monitor health failures, disk space, backup age and unresolved reports. Document the real contact method shown to users. If abuse occurs, hide the affected project or suspend the account in `/admin`, preserve restricted incident evidence, and resolve the report after action. Account deletion removes the account's community records as described by the API; old backups retain historical records until their retention window ends.

## Local validation

`node --test scripts/database-tools.test.mjs` verifies a backup includes committed WAL writes, restoration preserves its content, permissions are private, corrupt snapshots fail and existing destinations/stale sidecars are refused. `docker compose config --quiet` validates configuration after `.env` is set. Consult `docs/LAUNCH-STATUS.md` for the final integrated launch gate.

Packaging verification on October 13, 2026:

- `docker build --tag open-world:verification-final-20261013 .` completed after review fixes, including production dependency installation and the frontend build with locally packaged fonts. Runtime Node version was `v24.21.0`.
- Compose configuration passed with a supplied HTTPS `PUBLIC_URL`, operator name and contact email. The verification values (`https://open-world.test`, `Disposable packaging test`, `package-test@example.org`) were fictional and used only in disposable local tests.
- The built image ran as user `node`, with a read-only root filesystem, dropped capabilities and a disposable persistent volume. Docker health reported `healthy`.
- Production HTTP smoke checks passed for `/api/health`, JavaScript/CSS assets, all fonts referenced by the compiled CSS, favicon, `/api/site` metadata, nine frontend history routes, JSON API 404s, an initially empty community, CSP, `nosniff`, and frame protection headers.
- API registration behind simulated trusted HTTPS forwarding produced an HttpOnly, Secure, SameSite=Lax cookie. Foreign Origin and missing CSRF requests were rejected. This checks server cookie generation; actual browser HTTPS behavior remains part of domain/proxy verification.
- Thirteen backend/database-tool tests passed inside the Node 24 runtime image with `NODE_ENV=test` after the final review fixes. These include authentication-path normalization and whitespace-only password rejection. The image defaults to production, so test execution must override that environment; the tests include their own production configuration cases and metadata validation.
- An account survived container restart; operator promotion succeeded; live database backup and stopped-app restoration into a new file both passed inside the image.
- The verification container and its disposable volume were removed. No public listener or production infrastructure was created.
