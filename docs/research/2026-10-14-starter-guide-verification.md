# Starter guide and uncovered products

Implemented and verified locally on October 14, 2026. Public deployment remains pending.

## Integration with updated main

PR preparation rebased this work onto the repository-claim, activity and account-email release. The complete integrated suite passes 27 tests. New submissions remain unclaimed until repository proof succeeds; only claimed projects contribute to Commons counts. A claimed curated record can edit its project text and replacement goals, retains its canonical identity across imports, and is counted only once even when both curated and owner-declared mappings apply. Suspended owners disappear from both reviewed and Commons counts. The starter guide now includes the repository-claim step. Earlier browser submission evidence below predates this integration; repository-proof and count transitions are covered by the integrated tests.

Schema version 4 adds the catalog and product-association tables transactionally. Older releases reject this version, so a deployment rollback needs a pre-upgrade database backup. No production database was migrated during this work.

## Behavior

The index now retains all 25 products even when their reviewed alternative count is zero. After Effects, Revit, SOLIDWORKS and Pro Tools are added as initially uncovered workflows, with product-owned website links. “No reviewed alternative yet” describes the current Commons collection; it does not assert that no open-source alternative exists elsewhere.

Reviewed upstream references and member-owned Commons projects have separate counts and sections. An explicit `replaces` association links a member's project to up to five products. Cards with no linked Commons project offer “Add yours or start one,” including those with existing upstream alternatives. Product pages also offer a prefilled submission and a product-specific guide.

The general guide is `/guides/build-an-alternative`; tailored guides use `/start/:slug`. The guide covers scoping, behavior observation, REA setup, evidence-based investigation, an original implementation, compatibility/accessibility tests, a public repository and contribution issues. Editing the workflow tailors prompts and a copied/downloaded Markdown project brief. Setup and analysis commands are examples, not executed by Commons.

## REA sources

The user identified [morluto/rea](https://github.com/morluto/rea). Its official [website](https://rea.tools/), [installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md), [CLI guide](https://github.com/morluto/rea/blob/main/docs/cli.md), [JavaScript application workflows](https://github.com/morluto/rea/blob/main/docs/javascript-application-workflows.md) and [guided MCP prompts](https://github.com/morluto/rea/blob/main/docs/mcp-prompts.md) were checked for the commands, runtime requirements, provider setup and evidence limitations used in the guide. The guide links these sources directly. REA was not installed and proprietary targets were not analyzed during this website change.

## Verification

- All 18 API/database tests, production build, formatting and whitespace checks passed.
- Association tests cover known-product validation, limits, duplicate removal, ownership, edit omission, retargeting, hidden projects, suspended owners, deletion, account deletion and restart persistence.
- Direct guide and starter URLs are included in the production SPA routing regression check.
- Browser coverage filtering showed the four uncovered products and their starter links. The After Effects page remained available with zero upstream and Commons projects. Photoshop retained its two upstream references and still offered a Commons-project invitation.
- Real browser sign-in resumed the product-specific submission with After Effects selected. The submitted QA project linked back to its product, appeared in the Commons section and changed its count to one. Deleting the temporary account removed the project and restored the count to zero.
- The downloaded `after-effects-project-brief.md` included the selected product and edited workflow. Source links, headings and copy/download controls were inspected.
- Phone layout checks showed no horizontal overflow. Axe found no WCAG 2 A/AA or WCAG 2.1 AA violations on the checked guide, index and Photoshop comparison pages.

The guide's REA commands were checked against documentation, not run against an installed REA environment. Upstream replacement compatibility remains a sourced editorial assessment.
