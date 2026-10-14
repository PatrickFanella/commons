# Commons

A community hub for people rebuilding familiar tools in the open. Software made by people, for people, in public. Discover projects, share your work, find collaborators, and coordinate through progress updates and threaded discussions.

This checkout includes the next community release. Its features are locally verified; public rollout is pending. See [launch status](docs/LAUNCH-STATUS.md).

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

An optional, labelled PhotoCraft reference can be imported with `npm run admin -- import-photocraft`. It does not create a member, claim affiliation, or invent activity. Production does not import it automatically.

## What works

- Public project discovery, search, categories, status filters, sorting and featured projects.
- Accounts with password login, private recovery keys, logout, password changes, and account deletion.
- Public builder profiles, skills, websites, owned projects, and profile editing.
- Public repository listings that start unclaimed, duplicate detection, and account-bound GitHub/Gitea proof-file claiming. Verified maintainers manage projects, source links, contribution needs, and shareable URLs.
- Private bookmarks, memberships with contribution roles, progress updates, and shared discussions with replies.
- A paginated community activity feed with everyone/my-project filters and links to the exact update or conversation.
- Optional private verified account email and password reset through a durable Brevo transactional queue, with retries and moderator queue diagnostics.
- Member reports and administrator content hiding, discussion removal, report resolution, and account suspension.
- Server persistence, owner permissions, session/CSRF protections, credential throttling, security headers, and input validation.
- Responsive layouts, keyboard access, focus management, local fonts, and privacy/terms/community pages.

Data is shared through a SQLite database, not browser local storage. No default accounts or passwords are shipped. Recovery keys remain available with or without email; store yours privately. Optional email must be verified before it can recover an account. External websites and source repositories open separately. There are no embedded analytics or advertising integrations.

## Check and build

```sh
npm test
npm run format:check
npm run build
npm audit --omit=dev
```

API integration tests use isolated databases and cover multi-account permissions, session/recovery behavior, route throttling, moderation, origin/CSRF, validation, deletion, and restart persistence. Tests also cover launch-schema migrations, claim races, email privacy/token expiry, queue restart/retries, discussion cascades, and feed moderation. Database-tool tests cover consistent live backups, integrity and safe restore. The production build is served by `npm start`, with production configuration as documented below. `npm run preview` serves only the frontend build and is not a replacement for the production API.

## Transactional email

Production configuration accepts `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`. Store the key in the existing private production `.env`, mode 0600; never commit it or use it in the client. The intended sender is `Commons <noreply@subcult.tv>`. Empty credentials keep email features disabled. Local tests use fake provider responses and send no mail. The mail worker runs in the single application process; it clears private message contents after acceptance, final failure, cancellation or expiry. Provider acceptance does not guarantee inbox delivery.

## Deploy

The Docker/Compose package runs one unprivileged application replica with a persistent database and a health check. Production requires `PUBLIC_URL`, `OPERATOR_NAME`, and `CONTACT_EMAIL`. Place it behind HTTPS and configure private off-host backups before accepting users.

- [Brand and design system](docs/BRAND.md)
- [Deployment and backup/restore instructions](docs/DEPLOYMENT.md)
- [Launch status and remaining external steps](docs/LAUNCH-STATUS.md)
- [Implementation plan](docs/superpowers/plans/2026-10-13-launch.md)
- [Community upgrade plan and activation status](docs/superpowers/plans/2026-10-14-community-upgrade.md)
- [API contract](docs/API.md)
- [Decision record](docs/decisions.tsv)

## License

Code is released under the MIT License; brand assets are CC BY 4.0; bundled fonts are under the SIL Open Font License. See `docs/BRAND.md` for the full table.

Public hosting, domain/DNS, operator identity/contact, a real administrator and backup destination are deployment choices. The repository does not provision or change shared infrastructure.
