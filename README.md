# Open World

A community hub for people rebuilding familiar tools in the open. Discover projects, share your work, find collaborators, and coordinate through project discussions.

## Run locally

Requires Node 24 or newer.

```sh
npm ci
npm run dev:server
```

In a second terminal:

```sh
npm run dev
```

Open **http://localhost:5173** (or the loopback URL printed by Vite). The API runs on port 3001; Vite proxies `/api` to it. Local development accepts localhost and IPv4 loopback origins at the configured port. The production API accepts only the configured public HTTPS origin.

The community starts empty. Create your own account and save the recovery key shown once during registration. To make an existing local account an administrator:

```sh
npm run admin -- promote your-username
```

An optional, labelled PhotoCraft reference can be imported with `npm run admin -- import-photocraft`. It does not create a member, claim affiliation, or invent activity. The running development preview includes this reference; production does not import it automatically.

## What works

- Public project discovery, search, categories, status filters, sorting and featured projects.
- Accounts with password login, private recovery keys, logout, password changes, and account deletion.
- Public builder profiles, skills, websites, owned projects, and profile editing.
- Project creation, editing, deletion, source links, contribution needs, and shareable URLs.
- Private bookmarks, memberships with contribution roles, and shared project discussions.
- Member reports and administrator content hiding, discussion removal, report resolution, and account suspension.
- Server persistence, owner permissions, session/CSRF protections, credential throttling, security headers, and input validation.
- Responsive layouts, keyboard access, focus management, local fonts, and privacy/terms/community pages.

Data is shared through a SQLite database, not browser local storage. No default accounts or passwords are shipped. Recovery uses a key rather than email; store it privately. External websites and source repositories open separately. There are no embedded analytics or advertising integrations.

## Check and build

```sh
npm test
npm run format:check
npm run build
npm audit --omit=dev
```

API integration tests use isolated databases and cover multi-account permissions, session/recovery behavior, route throttling, moderation, origin/CSRF, validation, deletion, and restart persistence. Database-tool tests cover consistent live backups, integrity and safe restore. The production build is served by `npm start`, with production configuration as documented below. `npm run preview` serves only the frontend build and is not a replacement for the production API.

## Deploy

The Docker/Compose package runs one unprivileged application replica with a persistent database and a health check. Production requires `PUBLIC_URL`, `OPERATOR_NAME`, and `CONTACT_EMAIL`. Place it behind HTTPS and configure private off-host backups before accepting users.

- [Deployment and backup/restore instructions](docs/DEPLOYMENT.md)
- [Launch status and remaining external steps](docs/LAUNCH-STATUS.md)
- [Implementation plan](docs/superpowers/plans/2026-10-13-launch.md)
- [API contract](docs/API.md)
- [Decision record](docs/decisions.tsv)

Public hosting, domain/DNS, operator identity/contact, a real administrator and backup destination are deployment choices. The repository does not provision or change shared infrastructure.
