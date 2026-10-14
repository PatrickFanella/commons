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
