export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

export function pageMetadata(path, data) {
  const fixed = {
    "/": [
      "Commons — Rebuild familiar tools in the open",
      "Commons is a hub for people rebuilding familiar tools in the open. Discover projects, find collaborators, and build together.",
    ],
    "/alternatives": [
      "Open-source software alternatives | Commons",
      "Find open-source alternatives to familiar creative, developer and productivity tools. Compare projects, their workflows and the work still ahead.",
    ],
    "/build": [
      "Help build open-source alternatives | Commons",
      "Find projects rebuilding familiar software in the open, see where builders are needed, and join a project.",
    ],
    "/guides/build-an-alternative": [
      "Build an open alternative | Commons",
      "Start with a familiar workflow, find an open project and choose a contribution. A practical starting guide from Commons.",
    ],
    "/about": [
      "About Commons | Open-source collaboration",
      "Commons brings people together to rebuild familiar tools in the open. Discover projects, share your work and find collaborators.",
    ],
    "/privacy": [
      "Privacy | Commons",
      "How Commons handles account, project and community data.",
    ],
    "/terms": [
      "Terms | Commons",
      "Terms for using Commons and sharing projects with the community.",
    ],
    "/guidelines": [
      "Community guidelines | Commons",
      "Community guidelines for sharing projects and working together on Commons.",
    ],
  };
  if (fixed[path])
    return {
      title: fixed[path][0],
      description: fixed[path][1],
      index: true,
      status: 200,
    };
  const match = path.match(/^\/(alternatives|start)\/([^/]+)$/);
  if (match) {
    const product = data.catalog.products.find((p) => p.slug === match[2]);
    if (product)
      return {
        title:
          match[1] === "start"
            ? `Build an alternative to ${product.name} | Commons`
            : `Open-source alternatives to ${product.name} | Commons`,
        description: `Explore open-source alternatives to ${product.name} for ${product.category ?? product.workflow ?? "familiar workflows"}. Read project details, compare the tradeoffs and find ways to contribute.`,
        index: true,
        status: 200,
      };
  }
  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    let id;
    try {
      id = decodeURIComponent(projectMatch[1]);
    } catch {
      id = null;
    }
    const project = data.projects.find((p) => p.id === id);
    if (project)
      return {
        title: `${project.name} | Commons`,
        description: project.description,
        index: true,
        status: 200,
      };
  }
  if (
    /^\/(?:(?:activity|saved|mine|builders|settings|admin|verify-email|reset-password)|builders\/[^/]+)$/.test(
      path,
    )
  ) {
    return {
      title: "Commons",
      description: fixed["/"][1],
      index: false,
      status: 200,
    };
  }
  return {
    title: "Page not found | Commons",
    description: "There is no Commons page at this address.",
    index: false,
    status: 404,
  };
}

export function renderPage(template, path, origin, data, render) {
  const meta = pageMetadata(path, data);
  const url = origin + (path === "/" ? "/" : path);
  const image = origin + "/og.png";
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta name="robots" content="${meta.index ? "index, follow, max-image-preview:large" : "noindex, follow"}">`,
    ...(meta.index ? [`<link rel="canonical" href="${escapeHtml(url)}">`] : []),
    ...[
      ["og:title", meta.title],
      ["og:description", meta.description],
      ["og:type", "website"],
      ["og:site_name", "Commons"],
      ["og:url", url],
      ["og:image", image],
    ].map(
      ([key, value]) =>
        `<meta property="${key}" content="${escapeHtml(value)}">`,
    ),
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
  ].join("\n");
  // Remove the template's metadata before inserting a single route-specific set.
  const clean = template
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(
      /<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[\s\S]*?>/gi,
      "",
    )
    .replace("</head>", `${tags}</head>`);
  return {
    html: render
      ? clean.replace(
          '<div id="root"></div>',
          () => `<div id="root">${render(path, data)}</div>`,
        )
      : clean,
    meta,
  };
}

export function sitemap(origin, data) {
  const paths = [
    "/",
    "/about",
    "/alternatives",
    "/build",
    "/guides/build-an-alternative",
    "/privacy",
    "/terms",
    "/guidelines",
    ...data.catalog.products.flatMap((p) => [
      `/alternatives/${p.slug}`,
      `/start/${p.slug}`,
    ]),
    ...data.projects.map((p) => `/projects/${encodeURIComponent(p.id)}`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escapeHtml(origin + path)}</loc></url>`).join("")}</urlset>`;
}
