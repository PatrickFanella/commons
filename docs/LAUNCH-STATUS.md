# Open World launch status

Application implementation is complete and verified locally. Public launch is pending deployment configuration, not a known application defect.

Verification completed October 13, 2026 (America/Chicago), with Node 26 on the development host and Node 24.21.0 in the production image. The development preview is available at http://localhost:5173. It includes one clearly labelled PhotoCraft reference and no seeded community accounts or invented activity. Temporary QA accounts, their projects, messages, memberships, bookmarks and reports were removed after testing. A new production database starts empty.

## Implemented

- Shared SQLite persistence for accounts, projects, profiles, bookmarks, memberships, discussions, reports and moderation.
- Password registration/login, cookie sessions, logout, password changes, one-time recovery keys with rotation, and account deletion.
- Project discovery/search/category/status filtering/sorting, featured projects, creation/editing/deletion, source links, contribution needs and shareable project URLs.
- Public builder directory and profiles; member skills, bios, websites, and profile editing.
- Project membership with contribution roles, shared discussions, and content reports.
- Administrator reports with actual content context, project hiding/publishing, feature selection, discussion removal, and account suspension.
- Server-side ownership/administrator permissions, CSRF and Origin checks, hashed credentials/session/recovery tokens, rate limits, validation and security headers.
- Responsive layout, keyboard focus management, modal background isolation, recovery-history protection, reduced-motion support, readable contrast, locally hosted fonts, and privacy/terms/community pages.
- Production-required HTTPS origin, operator identity, and public contact email; the legal pages display configured operator contact.
- Non-root Docker/Compose package, persistent data volume, health check, graceful shutdown, consistent SQLite backup and safe stopped-app restore tooling.

## Verification evidence

| Check                               | Result                                                                                                                                                    | Evidence                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| API/database regression suite       | 13 tests passed: 12 API integration tests and 1 backup/restore test                                                                                       | `npm test`, `server/app.test.js`, `scripts/database-tools.test.mjs` |
| Production frontend build           | Passed                                                                                                                                                    | `npm run build`                                                     |
| Formatting and whitespace           | Passed                                                                                                                                                    | `npm run format:check`, `git diff --check`                          |
| Production dependency audit         | 0 vulnerabilities reported at verification time                                                                                                           | `npm audit --omit=dev`                                              |
| Independent review                  | Three read-only rounds; all seven reported defects fixed; no unresolved application launch blocker in final round                                         | Review findings below; regression tests and source                  |
| Multi-account browser flows         | Passed in separate standard/incognito browser profiles                                                                                                    | T3 collaborative preview verification described below               |
| Mobile layout                       | No horizontal overflow at 390 CSS pixels on discovery, project and moderation views                                                                       | Browser dimensions and screenshots inspected                        |
| Automated accessibility             | No axe WCAG 2 A/AA + WCAG 2.1 AA violations on checked discovery, project, builders, settings, moderation, privacy and sign-in screens                    | Browser `axe.run`; installed `axe-core` dev dependency              |
| Production package                  | Built and tested under Node 24.21.0; all 13 tests passed in image                                                                                         | `docs/DEPLOYMENT.md`                                                |
| Production serving/security         | Health, assets/fonts/favicon, metadata, 9 history paths, JSON errors, security headers, cookie flags, Origin/CSRF guards verified in disposable container | `docs/DEPLOYMENT.md`                                                |
| Persistence and recovery operations | Container restart retained data; administrator promotion, live backup and stopped restore passed                                                          | `docs/DEPLOYMENT.md`, database-tool regression                      |

Automated accessibility checks are a focused baseline, not a claim that every assistive-technology combination was tested. Full screen-reader testing and real-domain HTTPS browser behavior remain unverified.

Browser verification covered registration and recovery-key acknowledgement; project creation, owner edit, bookmarks and discussion posting; a second account joining with a contribution role and reporting both a project and discussion; public visibility and absence of owner edit controls on the second account; profile editing; administrator report context, project hiding and republishing; recovery-key rotation and sign-in with the new password; browser Back retaining the one-time key; account deletion; and incorrect deletion-password feedback preserving the valid session. Temporary fixtures were removed afterwards.

Independent review found and resolved:

1. Session reads consumed the credential rate limit during normal participation. Credential throttling now applies only to credential mutations, with a regression proving ordinary session reads continue to work.
2. Express case/trailing-slash aliases bypassed exact-path credential throttling. The limiter is now attached directly to each credential route; aliases share its limit.
3. Whitespace-only passwords could be accepted but not used to sign in. New-password validation rejects them while preserving meaningful leading/trailing spaces and keeping sessions intact on rejected requests.
4. Browser Back could discard the one-time recovery-key display and lock navigation. The display now uses a history sentinel, guarded navigation and an unload warning until acknowledged.
5. Discussion reports lacked the message/author/project context administrators need. The administrator-only response and moderation UI now include it.
6. Administrators could not remove a reported message after hiding its parent project. Authorized administrators can now remove hidden/suspended-parent messages; public visibility remains restricted.
7. Late project reads could show stale content for another route. Detail requests now cancel previous reads and guard results with a request sequence.

## Remaining external launch steps

The repository has no configured Git remote, public domain, selected hosting destination, real operator contact, production administrator, or off-host backup destination. These values were not supplied by the user; an asynchronous request for them is pending. No public infrastructure was modified and no public launch is claimed.

To launch:

1. Select the public domain and persistent host. Configure DNS and an HTTPS reverse proxy for that exact origin.
2. Set `PUBLIC_URL`, `OPERATOR_NAME`, `CONTACT_EMAIL`, proxy settings, and the private backup path in the production environment. Review the site’s policies against the actual operator’s practices and chosen retention schedule.
3. Follow `docs/DEPLOYMENT.md` to start the application on a persistent volume.
4. Create the real operator account through HTTPS, save its recovery key, and promote it using the trusted-host CLI. No administrator password is pre-created.
5. Configure off-host backups, test a restore in isolation, and verify registration/login/recovery/project collaboration/moderation from the actual public HTTPS URL.
6. Choose a repository remote if source hosting or hosted CI is wanted. No remote was invented or pushed to during this work.

## Product boundaries

This release is a simple community hub. Recovery uses private keys instead of email. There is no SMTP, social sign-in, repository scraping, file upload service, chat integration, third-party analytics, or automatic notification delivery. Projects link to their source and coordinate through discussions. Run a single application replica; the SQLite design is intended for an initial community deployment, not an unverified multi-node setup.
