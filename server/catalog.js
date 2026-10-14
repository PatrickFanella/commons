import { repositoryKey } from "./repository.js";

export const products = [
  ["photoshop", "Adobe Photoshop", "Photo editing & painting"],
  ["figma", "Figma", "Interface design"],
  ["illustrator", "Adobe Illustrator", "Vector design"],
  ["clip-studio-paint", "Clip Studio Paint", "Digital painting"],
  ["premiere-pro", "Adobe Premiere Pro", "Video editing"],
  ["lightroom", "Adobe Lightroom", "RAW photography"],
  ["miro", "Miro", "Whiteboards & diagrams"],
  ["dropbox", "Dropbox", "Files & collaboration"],
  ["google-drive", "Google Drive", "Files & collaboration"],
  ["google-photos", "Google Photos", "Photo libraries"],
  ["evernote", "Evernote", "Personal notes"],
  ["onenote", "Microsoft OneNote", "Personal notes"],
  ["airtable", "Airtable", "Shared databases"],
  ["jira", "Jira", "Project management"],
  ["linear", "Linear", "Project management"],
  ["slack", "Slack", "Team messaging"],
  ["teams", "Microsoft Teams", "Team messaging"],
  ["discord", "Discord", "Community messaging"],
  ["github", "GitHub", "Code hosting"],
  ["gitlab", "GitLab", "Code hosting"],
  ["notion", "Notion", "Documents & knowledge"],
  [
    "after-effects",
    "Adobe After Effects",
    "Motion graphics & compositing",
    "https://www.adobe.com/products/aftereffects.html",
  ],
  [
    "revit",
    "Autodesk Revit",
    "Building information modeling",
    "https://www.autodesk.com/products/revit/overview",
  ],
  [
    "solidworks",
    "SOLIDWORKS",
    "Parametric mechanical design",
    "https://www.solidworks.com/product/solidworks-design",
  ],
  [
    "pro-tools",
    "Pro Tools",
    "Audio recording & mixing",
    "https://www.avid.com/pro-tools",
  ],
].map(([slug, name, workflow, website]) => ({
  slug,
  name,
  workflow,
  ...(website ? { website } : {}),
}));

export const directories = [
  {
    name: "AlternativeTo",
    url: "https://alternativeto.net/about/",
    description:
      "Community recommendations organized around the software you want to replace.",
  },
  {
    name: "OpenAlternative",
    url: "https://openalternative.co/about",
    description:
      "An open-source alternatives index with repository activity and maintainer verification.",
  },
  {
    name: "selfh.st Apps",
    url: "https://selfh.st/apps/",
    description:
      "Self-hosted apps with alternatives, license and deployment filters.",
  },
  {
    name: "Awesome-Selfhosted",
    url: "https://github.com/awesome-selfhosted/awesome-selfhosted-data",
    description:
      "A community catalog with machine-readable data, licensed CC BY-SA 3.0.",
  },
  {
    name: "OpenSourceAlternative.to",
    url: "https://www.opensourcealternative.to/",
    description:
      "Open-source options grouped by familiar proprietary products.",
  },
];

function entry(slug, name, repo, category, art, description, metadata) {
  return {
    slug,
    name,
    repo,
    category,
    art,
    description,
    author: new URL(repo).pathname.split("/").filter(Boolean)[0],
    metadata: {
      reviewedAt: "2026-10-14",
      reviewer: "Commons editorial research",
      maturity: "Established",
      licenseScope: "Open source",
      ...metadata,
    },
  };
}
const comparison = (
  product,
  workflow,
  gaps,
  source,
  coverage = "Selected workflows",
) => ({ product, workflow, gaps, source, coverage });
const activity = (date, label, url, kind = "Release") => ({
  date,
  label,
  url,
  kind,
});

export const catalog = [
  entry(
    "penpot",
    "Penpot",
    "https://github.com/penpot/penpot",
    "Creative tools",
    "canvas",
    "An open design platform for interfaces, prototypes and shared design systems.",
    {
      website: "https://penpot.app/",
      license: "MPL-2.0 · core",
      licenseUrl: "https://github.com/penpot/penpot",
      licenseNote:
        "Paid Enterprise governance is offered. Compare the edition you plan to use.",
      platforms: ["Web"],
      hosting: ["Self-hosted", "Hosted"],
      activity: activity(
        "2026-10-06",
        "2.18.3",
        "https://github.com/penpot/penpot/releases/tag/2.18.3",
      ),
      contribute:
        "https://github.com/penpot/penpot/blob/develop/CONTRIBUTING.md",
      adoption: "https://help.penpot.app/",
      comparisons: [
        comparison(
          "figma",
          "UI design, interactive prototypes and design systems",
          "Check design-file import, plugins and handoff requirements before moving a team.",
          "https://penpot.app/",
        ),
      ],
    },
  ),
  entry(
    "photocraft",
    "PhotoCraft",
    "https://github.com/storytold/photocraft",
    "Creative tools",
    "photo",
    "A Rust rebuild of familiar layered photo-editing workflows, with masks, adjustments and PSD support.",
    {
      website: "https://getartcraft.com/apps/photocraft",
      maturity: "Alpha",
      license: "MIT OR Apache-2.0",
      licenseUrl: "https://github.com/storytold/photocraft",
      licenseNote: "Code is dual-licensed; assets have their own licenses.",
      platforms: ["Windows", "macOS", "Linux", "Web"],
      hosting: ["Local", "Self-hosted"],
      activity: activity(
        "2026-10-12",
        "v0.8.2",
        "https://github.com/storytold/photocraft/releases/tag/v0.8.2",
      ),
      contribute: "https://github.com/storytold/photocraft/issues",
      adoption: "https://github.com/storytold/photocraft",
      comparisons: [
        comparison(
          "photoshop",
          "Layered photo editing, masks and PSD experimentation",
          "Early alpha. Maintainers say it is not ready for daily professional Photoshop work. Gaps include AI, missing tools, typography depth and plugin compatibility.",
          "https://github.com/storytold/photocraft",
          "Experimental rebuild",
        ),
      ],
    },
  ),
  entry(
    "graphite",
    "Graphite",
    "https://github.com/GraphiteEditor/Graphite",
    "Creative tools",
    "canvas",
    "A procedural vector editor combining nondestructive layers with node-based design.",
    {
      website: "https://graphite.art/",
      maturity: "Alpha",
      license: "Apache-2.0",
      licenseUrl: "https://github.com/GraphiteEditor/Graphite",
      licenseNote: "Current capabilities focus on procedural vector editing.",
      platforms: ["Web"],
      hosting: ["Local"],
      activity: activity(
        "2026-10-14",
        "Repository activity observed",
        "https://github.com/GraphiteEditor/Graphite/commits/master/",
        "Repository activity",
      ),
      contribute: "https://github.com/GraphiteEditor/Graphite/issues",
      adoption: "https://graphite.art/",
      comparisons: [
        comparison(
          "illustrator",
          "Procedural vector graphics and generative design",
          "Alpha. Raster tools, collaboration and broader creative-suite ambitions should not be treated as delivered parity.",
          "https://graphite.art/",
          "Experimental rebuild",
        ),
      ],
    },
  ),
  entry(
    "krita",
    "Krita",
    "https://github.com/KDE/krita",
    "Creative tools",
    "canvas",
    "A digital painting and illustration application developed in the open.",
    {
      website: "https://krita.org/",
      license: "GPL-3.0",
      licenseUrl: "https://github.com/KDE/krita",
      licenseNote:
        "The comparison focuses on painting, not all image-editing workflows.",
      platforms: ["Windows", "macOS", "Linux"],
      hosting: ["Local"],
      activity: activity(
        "2026-03-31",
        "5.3.1 / 6.0.1",
        "https://krita.org/en/posts/2026/krita-5.3.1-released/",
      ),
      contribute: "https://krita.org/en/get-involved/",
      adoption: "https://docs.krita.org/",
      comparisons: [
        comparison(
          "photoshop",
          "Digital painting and illustration",
          "Photography, print production and Photoshop plugins need a separate comparison.",
          "https://krita.org/en/about/",
        ),
        comparison(
          "clip-studio-paint",
          "Digital painting and illustration",
          "Check comics, animation and asset workflows against your own projects.",
          "https://krita.org/en/about/",
        ),
      ],
    },
  ),
  entry(
    "kdenlive",
    "Kdenlive",
    "https://github.com/KDE/kdenlive",
    "Creative tools",
    "video",
    "An open video editor for multitrack editing and independent production.",
    {
      website: "https://kdenlive.org/",
      license: "GPL-3.0",
      licenseUrl: "https://github.com/KDE/kdenlive",
      licenseNote: "Compare production workflows and file exchange separately.",
      platforms: ["Windows", "macOS", "Linux"],
      hosting: ["Local"],
      activity: activity(
        "2026-10-13",
        "26.08.2",
        "https://kdenlive.org/categories/release/",
      ),
      contribute: "https://kdenlive.org/get-involved/",
      adoption: "https://docs.kdenlive.org/",
      comparisons: [
        comparison(
          "premiere-pro",
          "Multitrack video editing",
          "Premiere projects, plugins, advanced grading and studio pipelines need separate checks.",
          "https://kdenlive.org/",
        ),
      ],
    },
  ),
  entry(
    "darktable",
    "darktable",
    "https://github.com/darktable-org/darktable",
    "Creative tools",
    "photo",
    "Nondestructive RAW development and a photography workflow on your own computer.",
    {
      website: "https://www.darktable.org/",
      license: "GPL-3.0",
      licenseUrl: "https://github.com/darktable-org/darktable",
      licenseNote: "RAW processing is the relevant replacement workflow.",
      platforms: ["Windows", "macOS", "Linux"],
      hosting: ["Local"],
      activity: activity(
        "2026-10-04",
        "5.6.2",
        "https://github.com/darktable-org/darktable/releases/tag/release-5.6.2",
      ),
      contribute: "https://www.darktable.org/development/",
      adoption: "https://docs.darktable.org/",
      comparisons: [
        comparison(
          "lightroom",
          "RAW development and local photo workflows",
          "Cloud services, catalog migration and edit-history compatibility need separate evaluation.",
          "https://www.darktable.org/about/",
        ),
      ],
    },
  ),
  entry(
    "excalidraw",
    "Excalidraw",
    "https://github.com/excalidraw/excalidraw",
    "Productivity",
    "canvas",
    "A sketch-style whiteboard for diagrams and quick visual collaboration.",
    {
      website: "https://excalidraw.com/",
      license: "MIT · editor",
      licenseUrl: "https://github.com/excalidraw/excalidraw",
      licenseNote:
        "The open editor is separate from the commercial Excalidraw+ service.",
      platforms: ["Web"],
      hosting: ["Local", "Self-hosted", "Hosted"],
      activity: activity(
        "2026-10-13",
        "Repository activity observed",
        "https://github.com/excalidraw/excalidraw/commits/master/",
        "Repository activity",
      ),
      contribute:
        "https://github.com/excalidraw/excalidraw/blob/master/CONTRIBUTING.md",
      adoption: "https://docs.excalidraw.com/",
      comparisons: [
        comparison(
          "miro",
          "Sketching diagrams and quick shared whiteboards",
          "A narrower match than Miro's full workspace, facilitation and enterprise features.",
          "https://github.com/excalidraw/excalidraw",
        ),
      ],
    },
  ),
  entry(
    "nextcloud",
    "Nextcloud",
    "https://github.com/nextcloud/server",
    "Productivity",
    "notes",
    "Self-hosted files and an extensible workspace for team collaboration.",
    {
      website: "https://nextcloud.com/",
      license: "AGPL-3.0 · server",
      licenseUrl: "https://github.com/nextcloud/server",
      licenseNote:
        "Talk, Office and extensions are separate components to review.",
      platforms: ["Web", "Windows", "macOS", "Linux", "Android", "iOS"],
      hosting: ["Self-hosted", "Hosted"],
      activity: activity(
        "2026-09-24",
        "35.0.1",
        "https://github.com/nextcloud/server/releases/tag/v35.0.1",
      ),
      contribute: "https://nextcloud.com/contribute/",
      adoption: "https://docs.nextcloud.com/",
      comparisons: [
        comparison(
          "dropbox",
          "File sync, sharing and collaboration",
          "Plan storage, administration and client migration. Extensions may require additional services.",
          "https://nextcloud.com/",
        ),
        comparison(
          "google-drive",
          "File sync, sharing and collaboration",
          "Office editing requires additional components; do not assume Google Workspace-wide parity.",
          "https://nextcloud.com/",
        ),
      ],
    },
  ),
  entry(
    "immich",
    "Immich",
    "https://github.com/immich-app/immich",
    "Productivity",
    "photo",
    "Self-hosted photo and video libraries with mobile backup and search.",
    {
      website: "https://immich.app/",
      license: "AGPL-3.0",
      licenseUrl: "https://github.com/immich-app/immich",
      licenseNote:
        "Operating the server and safeguarding the library remain your responsibility.",
      platforms: ["Web", "Android", "iOS"],
      hosting: ["Self-hosted"],
      activity: activity(
        "2026-10-08",
        "3.3.1",
        "https://github.com/immich-app/immich/releases/tag/v3.3.1",
      ),
      contribute: "https://docs.immich.app/developer/setup/",
      adoption: "https://docs.immich.app/",
      comparisons: [
        comparison(
          "google-photos",
          "Personal photo libraries and mobile backup",
          "Plan hosting, storage, backups and import. The project cautions against using it as your only photo storage.",
          "https://github.com/immich-app/immich",
        ),
      ],
    },
  ),
  entry(
    "joplin",
    "Joplin",
    "https://github.com/laurent22/joplin",
    "Productivity",
    "notes",
    "Personal notes, Markdown, attachments and synchronization across devices.",
    {
      website: "https://joplinapp.org/",
      license: "AGPL-3.0-or-later · clients",
      licenseScope: "Mixed licenses",
      licenseUrl: "https://github.com/laurent22/joplin/blob/dev/LICENSE",
      licenseNote:
        "Joplin Server uses a separate Personal Use License. The client and server should not be treated as one AGPL product.",
      platforms: ["Windows", "macOS", "Linux", "Android", "iOS"],
      hosting: ["Local", "Self-hosted", "Hosted"],
      activity: activity(
        "2026-09-25",
        "3.7.21",
        "https://github.com/laurent22/joplin/releases/tag/v3.7.21",
      ),
      contribute: "https://joplinapp.org/help/dev/",
      adoption: "https://joplinapp.org/help/apps/import_export/",
      comparisons: [
        comparison(
          "evernote",
          "Personal notes, attachments and web clipping",
          "Review note import and synchronization. Client and server licensing differ.",
          "https://joplinapp.org/",
        ),
        comparison(
          "onenote",
          "Personal notes and attachments",
          "Check import fidelity and collaboration; not a complete OneNote feature match.",
          "https://joplinapp.org/",
        ),
      ],
    },
  ),
  entry(
    "baserow",
    "Baserow",
    "https://github.com/baserow/baserow",
    "Productivity",
    "notes",
    "A no-code database and application builder with an open-source edition.",
    {
      website: "https://baserow.io/",
      license: "MIT · Open Source Edition",
      licenseScope: "Mixed licenses",
      licenseUrl: "https://github.com/baserow/baserow/blob/develop/LICENSE",
      licenseNote:
        "Premium and Enterprise components have separate licenses. Compare permissions, automation and integrations by edition.",
      platforms: ["Web"],
      hosting: ["Self-hosted", "Hosted"],
      activity: activity(
        "2026-10-13",
        "2.4.1",
        "https://github.com/baserow/baserow/releases/tag/2.4.1",
      ),
      contribute: "https://github.com/baserow/baserow/issues",
      adoption: "https://baserow.io/docs/",
      comparisons: [
        comparison(
          "airtable",
          "Collaborative databases and no-code applications",
          "Check the edition's permissions, automation, integrations and import support before switching.",
          "https://github.com/baserow/baserow",
        ),
      ],
    },
  ),
  entry(
    "plane",
    "Plane",
    "https://github.com/makeplane/plane",
    "Productivity",
    "notes",
    "An open project-management workspace for issues, sprints, documents and triage.",
    {
      website: "https://plane.so/",
      license: "AGPL-3.0 · Community",
      licenseUrl: "https://github.com/makeplane/plane",
      licenseNote:
        "Hosted and commercial offerings need their own edition comparison.",
      platforms: ["Web"],
      hosting: ["Self-hosted", "Hosted"],
      activity: activity(
        "2026-08-23",
        "1.4.2 · stable release",
        "https://github.com/makeplane/plane/releases/tag/v1.4.2",
      ),
      contribute:
        "https://github.com/makeplane/plane/blob/preview/CONTRIBUTING.md",
      adoption: "https://developers.plane.so/",
      comparisons: [
        comparison(
          "jira",
          "Issues, sprints, documents and triage",
          "Complex Jira workflows, plugins and migration need independent review.",
          "https://github.com/makeplane/plane",
        ),
        comparison(
          "linear",
          "Issues, sprints and project planning",
          "Compare your integrations and required edition before importing a team.",
          "https://github.com/makeplane/plane",
        ),
      ],
    },
  ),
  entry(
    "element",
    "Element Web",
    "https://github.com/element-hq/element-web",
    "Productivity",
    "notes",
    "A Matrix client for federated team and community messaging.",
    {
      website: "https://element.io/",
      license: "AGPL-3.0 · web client",
      licenseUrl: "https://github.com/element-hq/element-web",
      licenseNote: "A Matrix homeserver is separate from the client.",
      platforms: ["Web"],
      hosting: ["Self-hosted", "Hosted"],
      activity: activity(
        "2026-10-13",
        "1.12.31",
        "https://github.com/element-hq/element-web/releases/tag/v1.12.31",
      ),
      contribute:
        "https://github.com/element-hq/element-web/blob/develop/CONTRIBUTING.md",
      adoption: "https://github.com/element-hq/element-web",
      comparisons: [
        comparison(
          "slack",
          "Federated team messaging",
          "Review homeserver operation, bots and integrations.",
          "https://github.com/element-hq/element-web",
        ),
        comparison(
          "teams",
          "Team messaging",
          "Meetings, Microsoft 365 integrations and administration are separate requirements.",
          "https://github.com/element-hq/element-web",
        ),
        comparison(
          "discord",
          "Federated community messaging",
          "Check voice communities, bots and moderation rather than assuming Discord-wide parity.",
          "https://github.com/element-hq/element-web",
        ),
      ],
    },
  ),
  entry(
    "forgejo",
    "Forgejo",
    "https://codeberg.org/forgejo/forgejo",
    "Developer tools",
    "cad",
    "Community-developed code hosting for repositories, issues and pull requests.",
    {
      website: "https://forgejo.org/",
      license: "GPL-3.0-or-later · current code",
      licenseUrl: "https://forgejo.org/2024-08-gpl/",
      licenseNote:
        "Historical MIT code remains. Review integrations and runners separately.",
      platforms: ["Web"],
      hosting: ["Self-hosted"],
      activity: activity(
        "2026-10-12",
        "16.0.6 / 15.0.10",
        "https://forgejo.org/releases/",
      ),
      contribute: "https://forgejo.org/docs/latest/developer/",
      adoption: "https://forgejo.org/docs/latest/",
      comparisons: [
        comparison(
          "github",
          "Repositories, issues, pull requests and collaboration",
          "Integrations, actions runners and migration need planning.",
          "https://forgejo.org/",
        ),
        comparison(
          "gitlab",
          "Repositories, issues and code collaboration",
          "Compare CI, runners and enterprise features for your own workflow.",
          "https://forgejo.org/",
        ),
      ],
    },
  ),
  entry(
    "affine",
    "AFFiNE",
    "https://github.com/toeverything/AFFiNE",
    "Productivity",
    "canvas",
    "Documents, knowledge organization and an edgeless canvas in one workspace.",
    {
      website: "https://affine.pro/",
      license: "MIT / MPL-2.0 / Enterprise terms",
      licenseScope: "Mixed licenses",
      licenseUrl: "https://github.com/toeverything/AFFiNE/blob/canary/LICENSE",
      licenseNote:
        "The root, backend and native components have different license scopes. Backend Community and Enterprise editions differ.",
      platforms: ["Web", "Windows", "macOS", "Linux"],
      hosting: ["Local", "Self-hosted", "Hosted"],
      activity: activity(
        "2026-07-15",
        "0.27 · July update",
        "https://affine.pro/blog/tag/release-note",
      ),
      contribute: "https://github.com/toeverything/AFFiNE/issues",
      adoption: "https://docs.affine.pro/",
      comparisons: [
        comparison(
          "notion",
          "Documents, knowledge organization and databases",
          "Compare integrations and team workflows. Check licenses by component and edition.",
          "https://github.com/toeverything/AFFiNE",
        ),
        comparison(
          "miro",
          "An edgeless canvas alongside documents",
          "Not full Miro facilitation parity. Hosted and self-hosted feature availability can differ.",
          "https://github.com/toeverything/AFFiNE",
        ),
      ],
    },
  ),
];

export function importCatalog(db, entries = catalog) {
  let imported = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of entries) {
      const recorded = db
        .prepare("SELECT project_id,metadata FROM catalog_entries WHERE slug=?")
        .get(item.slug);
      if (recorded) {
        if (
          recorded.project_id &&
          recorded.metadata !== JSON.stringify(item.metadata)
        )
          db.prepare("UPDATE catalog_entries SET metadata=? WHERE slug=?").run(
            JSON.stringify(item.metadata),
            item.slug,
          );
        continue;
      }
      const existing = db
        .prepare(
          "SELECT id FROM projects WHERE (repo_key IS NOT NULL AND repo_key=?) OR repo=? ORDER BY created_at LIMIT 1",
        )
        .get(repositoryKey(item.repo), item.repo);
      const id = existing?.id ?? `catalog-${item.slug}`;
      const date = new Date().toISOString();
      if (!existing) {
        db.prepare(
          "INSERT INTO projects(id,owner_id,author,name,description,details,repo,repo_key,category,tags,needs,status,art,letter,external,created_at,updated_at) VALUES(?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          item.author,
          item.name,
          item.description,
          "Independent curated reference. Review the workflow comparisons and upstream documentation before switching.",
          item.repo,
          repositoryKey(item.repo),
          item.category,
          JSON.stringify(item.metadata.platforms.slice(0, 5)),
          "",
          item.metadata.maturity === "Alpha" ? "In progress" : "Launched",
          item.art,
          item.name[0].toUpperCase(),
          1,
          date,
          date,
        );
      }
      db.prepare(
        "INSERT INTO catalog_entries(slug,project_id,metadata) VALUES(?,?,?)",
      ).run(item.slug, id, JSON.stringify(item.metadata));
      imported++;
    }
    db.exec("COMMIT");
    return imported;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
