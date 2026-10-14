# Replacement index build verification

Verified October 14, 2026 in this worktree. This feature build has not been deployed to the public Commons service.

Implemented `/alternatives`, 21 product comparison routes, `/build`, 15 curated canonical project records, workflow gaps, sources, dated maintenance evidence, readiness and edition/license labels. Search accepts familiar product names, project names and workflows. Filters cover maturity, platforms, hosting and license scope. Project pages connect comparisons to bookmarks, discussions, adoption documentation and upstream contribution links. Five independent directory references are linked from the index.

Catalog startup/manual import is transactional, reuses legacy PhotoCraft references and refreshes reviewed metadata. It preserves existing project text, moderation, community activity and deletion decisions. No upstream member identities, requests or activity are invented. Imported references reject memberships; bookmarks and local discussions work as before.

## Checks

- `npm test`: all 17 API/database tests passed. New checks cover catalog import/reuse, sources, rollback, bookmarks/discussions, membership rejection, moderation, deleted references, persistent restart and reviewed metadata updates.
- `npm run build`, `npm run format:check`, `git diff --check`: passed.
- Browser: software/workflow search, Photoshop comparison, maturity/hosting filtering, empty results and reset, canonical PhotoCraft navigation, Airtable/Baserow lookup, anonymous bookmark sign-in, active rebuilds and all-project switching passed.
- Responsive: no horizontal overflow on the checked new flows at 320, 390, 768, 1000 and 1280 CSS pixels. Phone navigation wraps so the new entry points remain accessible.
- Axe checks: no WCAG 2 A/AA or WCAG 2.1 AA violations on the checked index, Photoshop comparison, PhotoCraft project and build pages at phone width.
- First-party adoption/contribution links checked over HTTP. Two outdated contribution paths were corrected before completion.
- Local production serving: the compiled Photoshop comparison loaded with its two projects and alpha gap notice. A deep-link bug beneath hidden checkout directories was reproduced and fixed by serving `index.html` relative to the configured distribution root. Its regression test also confirms dotfiles are not exposed and unknown API routes remain JSON 404.

Application functionality and source changes were verified locally. Upstream applications were not installed or migration-tested; the comparisons remain sourced editorial assessments. Public deployment, operator accounts and shared infrastructure were not changed by this build.
