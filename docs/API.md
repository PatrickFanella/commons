# Commons API contract

All API paths are prefixed `/api`. JSON response objects and errors `{error: string, code?: string}`. Mutation requests send `Content-Type: application/json`. Session cookies are HttpOnly and SameSite=Lax; production uses Secure. Authenticated mutations send `X-CSRF-Token` from session response. Reject foreign Origin on every mutation, including auth. Development origin `http://localhost:5173` via Vite proxy; production PUBLIC_URL mandatory.

## Data

User public: `{id, username, displayName, bio, skills: string[], website, createdAt, projectCount}`. Private session user adds `{role: 'member'|'admin', email: string|null, pendingEmail: string|null}`. Username 3–30 characters, lowercased letters/numbers/hyphens/underscores. Never publicize email addresses, password hashes, account tokens or recovery codes. Moderator member listings omit private email fields.

Project: `{id, name, description, details, repo, category, tags: string[], needs, status, art, letter, author, ownerId: string|null, createdAt, updatedAt, stars, contributors, saved, joined, membershipRole, featured, external, claimable, repositoryVerified}`. stars counts actual bookmarks; contributors counts owner and joined members; `author` is the Commons owner's username or the repository namespace for unclaimed references. `art` one of photo/cad/audio/canvas/notes/video. category Creative tools / Developer tools / Productivity / Audio & music / Engineering. status In progress / Looking for builders / Just launched / Launched. Details plain text max 10000; description max 300; name max 80; needs max 1000. Repository HTTPS only, tags max 5 x 30 characters, art enum. `external` references have no Commons owner and cannot imply affiliation. Every new listing starts unclaimed, including a maintainer’s own submission. Claiming requires a public proof file demonstrating repository write access. Existing launch-release projects retain their original Commons owners. `repositoryVerified` records successful proof, and a verified listing cannot change its repository URL; repository moves need a separately qualified workflow. Supported listing/claim hosts: github.com and git.subcult.tv, canonical HTTPS owner/repository paths.

Message: `{id, projectId, author: User public, text, parentId: string|null, createdAt, updatedAt}`. Max 3000 chars.
Report: `{id, projectId?, messageId?, updateId?, reason, createdAt, resolved, reporter: User public}`.

## Accounts

- GET `/auth/session` -> `{user: User|null, csrfToken: string|null}`.
- POST `/auth/register` `{username, displayName, password}` -> `{user, csrfToken, recoveryCode}`; password 12–128 chars. Recovery code shown once, stored hashed.
- POST `/auth/login` `{username,password}` -> `{user,csrfToken}`.
- POST `/auth/logout` -> `{ok:true}`.
- POST `/auth/recover` `{username,recoveryCode,password}` -> `{ok:true,recoveryCode}`; revoke sessions, rotate code; avoid account enumeration on failure.
- POST `/auth/password` `{currentPassword,password}` -> `{ok:true}`; invalidate other sessions.
- PATCH `/me` `{displayName,bio,skills,website}` -> `{user}`.
- DELETE `/me` `{password}` -> `{ok:true}`; delete account, its sessions/bookmarks/memberships/messages; remove owned projects or anonymize reports consistently.

## Projects and people

- GET `/projects` -> `{projects: Project[]}` only published/non-hidden. Empty permitted, no fake content in production.
- GET `/projects/:id` -> `{project, members: User public[]}`.
- POST `/projects` project writable fields and optional `listingType: "reference"` -> `{project}` (201), unclaimed. Other listing types rejected. Supported repository duplicates return 409, including normalized case and `.git` suffix variations.
- PATCH `/projects/:id` writable fields -> `{project}` owner or admin.
- DELETE `/projects/:id` -> `{ok:true}` owner or admin.
- PUT `/projects/:id/save` `{saved:boolean}` -> `{project}`; idempotent.
- PUT `/projects/:id/join` `{joined:boolean, role?:string}` -> `{project}`; idempotent; role max 80. Owner cannot leave own project.
- GET `/projects/:id/messages` -> `{messages: Message[]}`.
- POST `/projects/:id/messages` `{text,parentId?:string}` -> `{message}` (201).
- DELETE `/messages/:id` -> `{ok:true}` author, project owner, or admin; replies cascade when a parent is deleted.
- GET `/builders` -> `{builders: User public[]}` excludes suspended; actual registered people only.
- GET `/builders/:username` -> `{builder, projects: Project[]}`.
- POST `/reports` `{projectId?,messageId?,updateId?,reason}` exactly one target; max 2000 -> `{ok:true}` (201).

## Moderation

- GET `/admin/reports` -> `{reports: (Report & {message: {id,text,author: User public,projectId}|null, project: {id,name,hidden}|null})[]}`. Includes reported content context even when its parent is hidden or suspended.
- PATCH `/admin/reports/:id` `{resolved:boolean}` -> `{ok:true}`.
- GET `/admin/projects` -> `{projects: (Project & {hidden:boolean})[]}`.
- PATCH `/admin/projects/:id` `{hidden?:boolean,featured?:boolean}` -> `{project}`.
- GET `/admin/users` -> `{users: (User & {suspended:boolean,role:string})[]}`.
- PATCH `/admin/users/:id` `{suspended:boolean}` -> `{ok:true}`; prevent self/last-admin suspension. Suspended users lose sessions and cannot participate.

Health GET `/health` -> `{ok:true}`. Serve production dist + SPA routes including `/projects/:id`, `/builders/:username`, `/saved`, `/mine`, `/about`, `/settings`, `/admin`, `/privacy`, `/terms`, `/guidelines`. Unknown `/api` always JSON 404. Frontend handles route-level 404.

## Private account email

- GET `/site` -> `{operatorName,contactEmail,emailEnabled}`; no secret or sender API credential.
- PUT `/me/email` `{email,password}` -> `{user}`. Requires current password. Address stays pending until confirmed; existing verified address remains usable meanwhile. Empty address removes both addresses and outstanding tokens.
- POST `/me/email/resend` -> `{ok:true}`, signed in; verification requests have a 60-second account cooldown in addition to the shared credential/IP limit.
- POST `/auth/verify-email` `{token}` -> `{ok:true}`. Single-use, expires after 24 hours. Addresses are lowercased and must be unique once verified.
- POST `/auth/request-reset` `{email}` -> `{ok:true}` with the same response for unknown addresses; only verified, active accounts receive queued mail. Per-account 60-second cooldown suppresses repeated requests.
- POST `/auth/reset-password` `{token,password}` -> `{ok:true,recoveryCode}`; single-use, expires after 30 minutes, signs out all sessions and rotates the recovery key.
- GET `/admin/email` -> `{configured,counts:{queued?,sent?,failed?},errors:{code,count}[]}`. Sent means provider acceptance, not delivered. Counts cover unexpired account tokens.

When Brevo is disabled, requesting account mail returns 503 `EMAIL_UNAVAILABLE`. Existing recovery-key flows remain available. Link tokens travel in the browser fragment, are removed from the address bar by the form, and are submitted only in POST bodies. No confirmation occurs on GET; mail scanners do not consume links merely by visiting. Account tokens are stored as hashes; queued message text contains the original private link until acceptance, expiry, cancellation or final failure. Queues survive app restarts; transient failures retry up to five attempts. Network timeouts can cause duplicate delivery, so the queue does not promise exactly-once sending.

## Community activity and project updates

- GET `/activity?scope=all|mine&limit=20&before=<id>` -> `{activity: Activity[],nextCursor:number|null}`. Limit 1–50; cursor is exclusive. `mine` requires sign-in and includes owned/joined projects. Rows exclude hidden projects, suspended actors/owners, and deleted or suspended discussion/update context. Bookmarks and account changes never enter the public feed. Launch history is not fabricated or backfilled.
- GET `/projects/:id/updates` -> `{updates: Update[]}`.
- POST `/projects/:id/updates` `{title,body}` -> `{update}` (201); only owner, joined collaborator or administrator, and only claimed projects. Title 1–120, body 1–5000 characters, escaped plain text.
- DELETE `/updates/:id` -> `{ok:true}`, author/owner/admin. Related activity and reports cascade.

Update: `{id,projectId,title,body,createdAt,author:User public}`. Activity: `{id,kind,createdAt,actor:User public,project:{id,name,external},messageId,updateId,title,excerpt}`. Kinds: `reference_listed`, `project_changed`, `member_joined`, `message_posted`, `reply_posted`, `update_posted`, `project_claimed`. Legacy `project_created` remains a supported display kind.

Discussion replies must target an existing root message in the same visible project. Replies to replies are rejected; conversations have one reply level. Suspending a parent author hides the thread. Deleting a root deletes its replies and related activity. Moderator reports include the full reported update context, even when its project is hidden, and moderators can remove the update directly.

## Repository claiming

- POST `/projects/:id/claim` -> `{claimId,path,proof,expiresAt}` (201). Requires sign-in, an unclaimed supported public repository and a one-minute challenge cooldown.
- POST `/projects/:id/claim/verify` `{claimId}` -> `{ok:true}`. Only the requesting account can verify its challenge. Proof lives at `.commons/claims/<claimId>.txt` on the repository default branch and expires in 24 hours. Proof content binds site origin, project, account and a random key. Commons stores only its hash.

Verification reads the providers' official contents APIs with fixed hosts, no redirects, a 10-second timeout and bounded response/file sizes. It proves repository write access, including an organization maintainer with permission to commit. It does not establish legal ownership or exclusive Git-host organization ownership. After the network read, the transfer rechecks session, suspension, repository, expiry and current ownership in one transaction. A competing claim cannot overwrite the winner. All pending challenges are removed after a successful transfer. Bookmarks, discussions and listing identity survive the claim. Proof files may be removed afterward. Unclaimed listings accept bookmarks and discussion but do not accept Commons memberships or progress updates.
