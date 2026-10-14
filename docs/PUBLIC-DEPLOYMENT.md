# Commons public deployment

The user authorized deployment at https://commons.subcult.tv on October 14, 2026, superseding the earlier hold. Operator: Patrick Fanella; public contact: info@subcult.tv.

## Plan and placement

- NUC: `/srv/apps/projects/commons`, immutable release archive under `releases/<revision>`, `current` symlink, one `commons-app` container, Compose project `commons`, 512 MiB / 1 CPU limit, network `10.252.84.0/28`.
- Persistent named database volume: `commons_data`; the production database starts empty. No development accounts or data are copied.
- Backend: NUC loopback and `10.0.0.56:3086`. A dedicated DOCKER-USER chain allows Almaz `10.0.0.200` and drops other LAN requests to this backend. It does not change other services’ rules.
- Almaz: new `/etc/caddy/sites/commons.Caddyfile` import, using the existing wildcard Cloudflare Tunnel/DNS route. Caddy preserves its trusted-proxy visitor policy and supplies the application’s HTTPS and client-IP headers.
- Production configuration: `PUBLIC_URL=https://commons.subcult.tv`, `OPERATOR_NAME=Patrick Fanella`, `CONTACT_EMAIL=info@subcult.tv`, `TRUST_PROXY=1`.
- Backups: consistent SQLite snapshots on NUC, encrypted off-host in the existing NUC restic repository on Kvant. A Commons-specific daily timer and snapshot tag leave existing backup jobs unchanged.

## Gate before publication

Run source tests; build the selected revision; validate effective Compose and Caddy configuration; verify backend health and empty data; install the scoped ingress guard; create and independently restore a consistent snapshot. Preserve the pre-change Caddyfile and firewall evidence. Then append only the dedicated site import and reload Caddy without restarting its container.

Verify real HTTPS assets, public metadata and policies, Origin/CSRF/cookie behavior, registration and account deletion with a labelled disposable test account. Remove that fixture after verification. A real operator account and recovery key are created by the owner; no operator password is invented.

## Scoped rollback

Remove only the Commons import and validate/reload Caddy, comparing the current file to the saved checkpoint so later unrelated edits are preserved. Stop only Compose project `commons` using its two Compose files. Keep `commons_data`, release artifacts, and backups. Disable only Commons’ backup/ingress units, and remove only the `COMMONS-INGRESS` jump/chain if retiring the service. Never run Compose `down -v`, restore an old whole Caddyfile over unrelated changes, or flush another firewall chain.

Deployment results and exact recovery paths are recorded below after live checks. Source and application checks do not substitute for public-path verification.

## Verified live result — October 14, 2026

- Public HTTPS: https://commons.subcult.tv; HTTP redirects to HTTPS. Root, scripts/styles/fonts, `/api/health` and `/api/site` passed. Metadata shows Patrick Fanella and info@subcult.tv.
- Runtime: source/release `ff1e21baea4b`, image `commons:ff1e21baea4b`, image configuration digest `sha256:6552c8b8b317d483e02a922050b71fb635a3bf3148c3a362d1664e4ac05c3bfc`. NUC container `commons-app` is healthy with zero restarts.
- `COMMONS-INGRESS` and UFW allow Almaz to backend3086. Almaz health probe passed; Sputnik direct LAN request timed out as expected. Loopback on NUC also passes.
- Candidate Caddy validation, source-hash and inode checks, and reload passed. Caddy container `ca3ed87989a1` retains restart count0. A local Almaz loopback80 probe failed because its listener binds the LAN address; subsequent edge-backend and public-path checks passed.
- Browser registration, one-time recovery-key display, actual HTTPS session persistence, source-project submission and missing-CSRF denial passed. Deleting the test account removed its project; the fixture is gone.
- Owner-authorized account `patrick__eff` was promoted and its administrator role read back from SQLite. Refresh Commons to see Moderation; no owner password or recovery key was handled by the agent.
- `commons-backup.timer` is enabled for daily03:55 plus jitter. Manual encrypted off-host snapshots passed, including after owner promotion. First snapshot `4b84d6c7` was independently retrieved and restored in an isolated container. The naturally scheduled next run is pending observation.
- Edge recovery: `/opt/server/management/data/commons-recovery/20261014`, containing the prior Caddyfile and before/after hashes plus inode evidence. NUC recovery: `/srv/apps/projects/commons/recovery`, including prior firewall evidence and off-host restore qualification. Both release directories and the persistent database are retained.
- Operational service/route/host records were updated in canonical Machinum on Kvant. Full fleet health or unrelated application correctness is not implied by these checks.

The root-owned active backup helper is `/srv/apps/projects/commons/operations/backup-homelab.sh`, copied from the tracked deployment source. Restic retention explicitly groups by host/tags so timestamped snapshot paths do not defeat the Commons-specific retention policy. Application release files remain unchanged.
