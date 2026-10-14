# Commons community upgrade

Owner: Patrick Fanella. Prepared October 14, 2026.
Status: locally qualified and ready for review. Production remains on the verified launch release.

## Intended behavior

Commons should help people discover existing open projects, meet collaborators, and follow real progress. Anyone can submit a repository as an unclaimed reference. All new listings start unclaimed; a form choice cannot grant repository ownership. A reference must never imply its maintainer participates here. Maintainers can claim listings by proving write access to the linked repository.

The first upgrade adds account email through Brevo, a public activity feed, project updates, threaded discussion replies, and unclaimed repository listings with proof-based claiming. The owner selected project updates and richer discussions as the next collaboration feature. Sender: noreply@subcult.tv. Runtime credentials will use the existing private environment file; no key belongs in Git or client code.

## Ordered implementation

1. Add transactional, versioned SQLite migrations. Preserve existing accounts, recovery keys, projects, moderation and administrator roles. Introduce private email fields, expiring account tokens, a durable mail outbox, activity, project updates, reply relationships and repository claims.
2. Add optional verified account email in Settings, password-reset requests and one-use links. Keep email private and recovery-key recovery available. Send transactional messages through Brevo with bounded retries; distinguish provider acceptance from delivery. Existing users need no email to continue using Commons.
3. Record real project creation, changes, joins, discussions, updates and verified claims in a paginated feed. Hide activity whenever its project, author or underlying content becomes unavailable. Bookmarks and account changes are private. Do not invent historical activity.
4. Let project owners and joined collaborators post titled progress updates. Add one-level discussion replies, clear reply context, and deletion/report controls. Deleted parents remove their replies. Keep text escaped; do not render arbitrary HTML.
5. Let signed-in users list unclaimed public repositories. Normalize supported repository URLs and reject duplicate listings. Generate a short-lived claim challenge, verify a proof file on the repository default branch, and transfer the listing atomically. First supported proof providers: GitHub and git.subcult.tv. A challenge proves repository write access; it does not independently establish legal ownership. Lock all unclaimed listings against ordinary ownership edits.
6. Verify migration from the launch schema, token expiry/replay/session revocation, email privacy, retry behavior, feed pagination/moderation, collaboration permissions, duplicate repositories and claim races. Review desktop and mobile flows. Prepare a release with rollback and backup requirements before changing production.

## Checks

- `rtk npm test`: backend integration, migration, provider transport, claim verification and backup/restore checks.
- `rtk npm run build` and `rtk npm run format:check`: production bundle and formatting.
- Collaborative browser: local listing/claim instructions, activity, update/reply flows, Settings and disabled-email states; inspect mobile overflow and accessibility.
- Brevo credential qualification: read-only sender/account checks; no test email without an explicitly chosen recipient.
- Release gate: verified off-host database backup before migration; email key only in the private production environment; health, public pages, owner permissions and queue status after release. Restore the pre-upgrade database together with the old release for a full rollback.

## Further improvements

After this release: project following and opt-in notifications, a weekly digest, tasks/milestones, richer update formatting, authenticated delivery/bounce/complaint webhooks, repository metadata refresh, and Git-provider OAuth for a smoother claim flow. Newsletter enrollment requires a separate opt-in. More features should support a specific community workflow and have a complete loading, error and empty state.

## Sources

Brevo transactional email API: https://developers.brevo.com/docs/send-a-transactional-email
Brevo delivery webhooks: https://developers.brevo.com/docs/transactional-webhooks
Repository proof checks must use the providers' official contents APIs, fixed hosts, bounded response sizes, no redirects and timeouts.

## Pending activation

The existing Hasanara key was located in its private runtime configuration and qualified with a read-only sender request from the production Commons container: HTTP 200, noreply@subcult.tv active. A mode-0600 production-only Brevo environment overlay is staged at `/srv/apps/projects/commons/.env.brevo.pending` on NUC. The running app and its active environment were not changed. No production key entered local development or source control.

Activate this overlay with the next approved release after the pre-migration backup. Confirm a real recipient before a manual delivery test. Actual inbox delivery remains unverified. Public deployment of this upgrade has not yet been requested.

## Verification evidence

October 14: 21 automated checks passed, including preserved launch accounts/sessions/moderation, single-use email recovery, queue persistence/retries, feed pagination, update permissions, threaded deletion, provider request bounds and competing claims. Production build passed. Browser checks passed unclaimed submission and proof instructions, update publishing, root discussion and replies. Browser collaboration used a labelled, disposable already-claimed fixture in a separate local database; no real Git repository proof was published. At 390 CSS pixels the activity page has no body overflow after fixing mobile navigation scrolling. Axe checks on activity, threaded discussion and Settings found no WCAG A/AA violations; this is automated coverage, not a complete accessibility certification.

Browser email qualification used a fake provider: saving private email, confirming the verification link, requesting a reset, setting a password, displaying/acknowledging the new recovery key, and returning to discovery passed. A replacement reset link in the same tab also passed. The browser pass caught and fixed stale recovery-lock navigation and stale fragment-token handling. No external email was sent. GitHub repository metadata and Gitea version endpoints returned HTTP 200 from NUC. Actual proof-file publication on a real repository was not performed.

Rollback needs both the old release and its pre-upgrade database snapshot. The launch release uses positional discussion inserts incompatible with the expanded schema; merely switching the image back is insufficient. Keep the database stopped while restoring and preserve any post-release writes before choosing a rollback.

The committed server/tests also passed all 21 checks under the running release’s Node 24 production image in a separate container with no network, a read-only root, and the production CPU/memory bounds. The live app remained healthy with zero restarts. Candidate review: https://git.subcult.tv/subculture-collective/commons/pulls/2.
