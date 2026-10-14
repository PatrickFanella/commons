# Commons API contract

All API paths are prefixed `/api`. JSON response objects and errors `{error: string, code?: string}`. Mutation requests send `Content-Type: application/json`. Session cookies are HttpOnly and SameSite=Lax; production uses Secure. Authenticated mutations send `X-CSRF-Token` from session response. Reject foreign Origin on every mutation, including auth. Development origin `http://localhost:5173` via Vite proxy; production PUBLIC_URL mandatory.

## Data

User public: `{id, username, displayName, bio, skills: string[], website, createdAt, projectCount}`. Private session user adds `{role: 'member'|'admin'}`. Username 3–30 characters, lowercased letters/numbers/hyphens/underscores. Never publicize password hashes or recovery codes.

Project: `{id, name, description, details, repo, category, tags: string[], needs, status, art, letter, author, ownerId: string|null, createdAt, updatedAt, stars, contributors, saved, joined, membershipRole, featured, external}`. stars counts actual bookmarks; contributors counts owner and joined members; `author` is owner's username or curated attribution. `art` one of photo/cad/audio/canvas/notes/video. category Creative tools / Developer tools / Productivity / Audio & music / Engineering. status In progress / Looking for builders / Just launched / Launched. Details plain text max 10000; description max 300; name max 80; needs max 1000. Repository HTTPS only, tags max 5 x 30 characters, art enum. `external` curated references have no owner and cannot claim affiliation; UI explains this. Real projects default owner author automatically.

Message: `{id, projectId, author: User public, text, createdAt, updatedAt}`. Max 3000 chars.
Report: `{id, projectId?, messageId?, reason, createdAt, resolved, reporter: User public}`.

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
- POST `/projects` project writable fields -> `{project}` (201).
- PATCH `/projects/:id` writable fields -> `{project}` owner or admin.
- DELETE `/projects/:id` -> `{ok:true}` owner or admin.
- PUT `/projects/:id/save` `{saved:boolean}` -> `{project}`; idempotent.
- PUT `/projects/:id/join` `{joined:boolean, role?:string}` -> `{project}`; idempotent; role max 80. Owner cannot leave own project.
- GET `/projects/:id/messages` -> `{messages: Message[]}`.
- POST `/projects/:id/messages` `{text}` -> `{message}` (201).
- DELETE `/messages/:id` -> `{ok:true}` author, project owner, or admin.
- GET `/builders` -> `{builders: User public[]}` excludes suspended; actual registered people only.
- GET `/builders/:username` -> `{builder, projects: Project[]}`.
- POST `/reports` `{projectId?,messageId?,reason}` exactly one target; max 2000 -> `{ok:true}` (201).

## Moderation

- GET `/admin/reports` -> `{reports: (Report & {message: {id,text,author: User public,projectId}|null, project: {id,name,hidden}|null})[]}`. Includes reported content context even when its parent is hidden or suspended.
- PATCH `/admin/reports/:id` `{resolved:boolean}` -> `{ok:true}`.
- GET `/admin/projects` -> `{projects: (Project & {hidden:boolean})[]}`.
- PATCH `/admin/projects/:id` `{hidden?:boolean,featured?:boolean}` -> `{project}`.
- GET `/admin/users` -> `{users: (User & {suspended:boolean,role:string})[]}`.
- PATCH `/admin/users/:id` `{suspended:boolean}` -> `{ok:true}`; prevent self/last-admin suspension. Suspended users lose sessions and cannot participate.

Health GET `/health` -> `{ok:true}`. Serve production dist + SPA routes including `/projects/:id`, `/builders/:username`, `/saved`, `/mine`, `/about`, `/settings`, `/admin`, `/privacy`, `/terms`, `/guidelines`. Unknown `/api` always JSON 404. Frontend handles route-level 404.
