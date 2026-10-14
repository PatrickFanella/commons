# Commons: replacement index and builder projects

Research date: 2026-10-14. This is a product recommendation, not an implemented feature or a claim that upstream maintainers have joined Commons. The companion software-alternatives report contains candidate projects and activity evidence.

## Recommended direction

Give Commons two connected entry points:

- **Find an alternative:** start with software someone already uses, then compare open projects by the work they need to do.
- **Help build an alternative:** discover projects in development, follow their progress, and find verified upstream contribution opportunities or Commons teams.

Each project should have one canonical listing. Replacement pages point to those listings through explicit, many-to-many comparisons: Photoshop can map to photo editing, digital painting, or experimental rebuilds; these are different reasons to recommend a project.

This extends the repository's existing project discovery, profiles and discussions described in [README](../../README.md). Existing external references should keep their independent-reference label. A Commons member following a project does not become an upstream contributor merely by joining its local discussion.

## Existing indexes worth studying

- [AlternativeTo](https://alternativeto.net/about/): starts with the application someone wants to replace and uses community recommendations. Borrow the starting question and community comparison process.
- [OpenAlternative](https://openalternative.co/about): directly catalogs open-source alternatives; ranks using repository popularity, age, recent commits and maintainer verification. Borrow clear replacement relationships and verification. For Commons, show activity evidence separately from popularity.
- [selfh.st Apps](https://selfh.st/apps/): alternatives, licenses, languages, open-source filtering and SSO filters. Borrow concrete deployment filters for people considering self-hosting. Its open-source-only toggle also illustrates why self-hosted and open source should be separate properties.
- [OpenSourceAlternative.to](https://www.opensourcealternative.to/): proprietary-product pages, categories, languages and licenses. Useful reference for index navigation and recognizable software names.
- [Awesome-Selfhosted data](https://github.com/awesome-selfhosted/awesome-selfhosted-data): machine-readable discovery material. Its list is CC BY-SA 3.0; any reuse needs attribution and compliance with that license. Verify individual facts against project-owned sources before listing them.

These pages were reviewed directly. Their public descriptions do not establish permission to bulk copy their catalogs. The directory layer already has close neighbors; the contribution and migration layer is the proposed reason to choose Commons.

## What each comparison should say

Store a relationship between a familiar product and an open project, with:

- Workflow covered, such as interface prototyping, layered photo editing, or personal note taking.
- Coverage: broad alternative, selected workflows, or experimental rebuild. Avoid an unexplained percentage of feature parity.
- Known gaps and migration/import documentation, including paid features that affect the comparison.
- Comparison source, reviewer and last review date.

Keep project facts separately: source repository, website, exact license and edition, supported platforms, hosting model, release evidence, activity observation date, contribution guide, issue tracker and affiliation status. Recheck licensing at the edition level for projects with enterprise code or restricted components.

## Status and discovery

Separate **maturity** (alpha, beta, stable), **maintenance evidence** (dated release or substantive commit), and **contribution requests** (linked maintainer request, or a clearly labeled Commons initiative). A project can be active and still unsuitable for daily work. Automated dependency bumps alone should not establish substantive maintenance.

Search should accept both project names and products to replace. Offer filters for workflow, platform, desktop/web, local/offline use, self-hosting, license, maturity and recently reviewed activity. Preserve source links and dates; when evidence ages, say that review is due rather than silently treating the project as abandoned.

A replacement page should answer three questions: which project fits my workflow, what will be hard to migrate, and where can I help? Contributions can include documentation, translations, accessibility testing and design as well as code. Link upstream opportunities; do not invent requests from maintainers.

## Suggested first slice

Start with a small reviewed collection across creative tools, notes, collaboration and personal data. Include both usable software and a separately labeled experimental collection. PhotoCraft is especially close to Commons' rebuild theme, but its [own README](https://github.com/storytold/photocraft) calls it early alpha and says it is not yet a daily professional Photoshop replacement. [Graphite](https://graphite.art/) likewise labels its current vector/procedural editor alpha. Give those projects a place without implying migration readiness.

For implementation, the current single `status` and free-text tags will need structured comparison, maturity and evidence records. Keep this research separate from a live import: externally curated records should not create fictional builders, memberships, requests or community activity.
