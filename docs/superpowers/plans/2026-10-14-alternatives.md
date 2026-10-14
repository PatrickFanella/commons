# Commons replacement index

Approved scope: implement the researched collection and connect finding alternatives with helping build open projects.

1. Add structured, sourced catalog metadata to canonical project records. Import the 15 reviewed references at application startup, reuse the existing PhotoCraft reference, and preserve moderation, bookmarks, discussions and deletion decisions across restarts. Never create upstream accounts or activity. Check with import/restart/visibility integration tests.
2. Add `/alternatives`, product comparison routes and `/build`. Search familiar products and workflows; filter by maturity, platform, hosting and license scope. Project pages show dated activity, known gaps, upstream contribution links and adoption documentation. Preserve the workshop design. Verify real navigation, filtering and empty states in the browser.
3. Run the API/database suite, formatting, production build and responsive/accessibility checks. Update README/API documentation. This build does not change public infrastructure.

Compatibility: schema version 4 adds catalog and product-association tables. Existing projects remain valid. Catalog imports are transactional and tracked separately so deleted references are not recreated; backups include the entire database. Disabling catalog import does not delete existing data. Older releases reject schema version 4, so rollback requires restoring a pre-upgrade backup with the application stopped.

## Approved follow-up: starter guide and uncovered products

The user requested a guide for morluto/rea, products without listed alternatives, and add/start invitations when upstream alternatives exist but no Commons project is linked. Implemented an additive `project_products` association table, API validation and visibility-aware counts, 25 persistent product entries, coverage filters, `/start/:slug`, the general build guide and product-prefilled submission. Auth completion resumes the intended submission. A copied/downloaded project brief and REA examples are sourced from official documentation; no REA installation or target analysis is part of this website build.

Verification covers product association ownership/retargeting/moderation/deletion, uncovered product routes, real anonymous-to-sign-in submission, resulting product page and fixture cleanup, downloaded brief content, responsive layout and axe checks.
