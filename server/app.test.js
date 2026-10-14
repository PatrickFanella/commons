import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app.js";
import { catalog, importCatalog, products } from "./catalog.js";
import { openDatabase } from "./db.js";

const pw = "a-long-test-password-123";

test("production deep links serve the SPA beneath a hidden checkout without exposing dotfiles", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "commons-serving-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const dist = join(directory, ".worktree", "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(
    join(dist, "index.html"),
    '<!doctype html><html><head><title>Commons route test</title></head><body><!-- Commons route test --><div id="root"></div></body></html>',
  );
  writeFileSync(join(dist, ".private"), "must never be served");
  const { base } = await harness(t, {
    distPath: dist,
    production: true,
    publicUrl: "https://commons.example",
    operatorName: "Test operator",
    contactEmail: "test@example.com",
    seedCatalog: true,
  });
  for (const path of [
    "/",
    "/alternatives",
    "/alternatives/photoshop",
    "/build",
    "/projects/catalog-photocraft",
    "/guides/build-an-alternative",
    "/start/after-effects",
  ]) {
    const response = await fetch(base.replace(/\/api$/, "") + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /Commons route test/);
  }
  const hidden = await fetch(base.replace(/\/api$/, "") + "/.private");
  assert.equal(hidden.status, 404);
  assert.ok(!(await hidden.text()).includes("must never be served"));
  assert.equal((await fetch(base + "/missing")).status, 404);
  const origin = base.replace(/\/api$/, "");
  const robots = await fetch(origin + "/robots.txt");
  assert.match(robots.headers.get("content-type"), /text\/plain/);
  assert.match(
    await robots.text(),
    /Sitemap: https:\/\/commons.example\/sitemap.xml/,
  );
  const sitemapResponse = await fetch(origin + "/sitemap.xml");
  assert.match(sitemapResponse.headers.get("content-type"), /application\/xml/);
  const xml = await sitemapResponse.text();
  assert.match(xml, /\/alternatives\/photoshop<\/loc>/);
  assert.match(xml, /\/projects\/catalog-photocraft<\/loc>/);
  assert.doesNotMatch(xml, /\/admin|\/settings|\/reset-password/);
  for (const path of [
    "/alternatives/missing",
    "/projects/missing",
    "/missing",
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
  }
  const settings = await fetch(origin + "/settings");
  assert.equal(settings.headers.get("x-robots-tag"), "noindex");
  const html = await (await fetch(origin + "/alternatives/photoshop")).text();
  assert.match(html, /Open-source alternatives to Adobe Photoshop/);
  assert.match(
    html,
    /rel="canonical" href="https:\/\/commons.example\/alternatives\/photoshop"/,
  );
  assert.match(
    html,
    /property="og:image" content="https:\/\/commons.example\/og.png"/,
  );
});
const input = {
  name: "Open canvas",
  description: "Rebuild an open creative canvas.",
  details: "Coordinate here.",
  repo: "https://github.com/example/canvas",
  category: "Creative tools",
  tags: ["Canvas"],
  needs: "Web developers",
  status: "Looking for builders",
  art: "canvas",
};
async function harness(t, options = {}) {
  const proofFiles = new Map();
  const app = createApp({
    repositoryFetch: async (url) => {
      const proof = proofFiles.get(url.split("/").at(-1));
      return proof === undefined
        ? new Response("Missing", { status: 404 })
        : Response.json({
            type: "file",
            encoding: "base64",
            size: Buffer.byteLength(proof),
            content: Buffer.from(proof).toString("base64"),
          });
    },
    dbPath: ":memory:",
    quiet: true,
    rateLimit: 1000,
    authRateLimit: 1000,
    ...options,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((r) => server.close(r));
    app.locals.close();
  });
  const client = () => ({
    cookie: "",
    csrf: "",
    async call(path, method = "GET", body, headers = {}) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(this.cookie ? { Cookie: this.cookie } : {}),
          ...(this.csrf ? { "X-CSRF-Token": this.csrf } : {}),
          Origin: options.publicUrl ?? "http://localhost:5173",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const cookie = response.headers.get("set-cookie");
      if (cookie) this.cookie = cookie.split(";")[0];
      const data = await response.json();
      if (data.csrfToken) this.csrf = data.csrfToken;
      return { status: response.status, data, response };
    },
    async createOwnedProject(body) {
      const created = await this.call("/projects", "POST", body);
      assert.equal(created.status, 201, JSON.stringify(created.data));
      const id = created.data.project.id;
      await this.claimProject(id);
      created.data.project = (await this.call(`/projects/${id}`)).data.project;
      return created;
    },
    async claimProject(id) {
      const challenge = await this.call(`/projects/${id}/claim`, "POST");
      assert.equal(challenge.status, 201);
      proofFiles.set(
        challenge.data.path.split("/").at(-1),
        challenge.data.proof,
      );
      const claimed = await this.call(`/projects/${id}/claim/verify`, "POST", {
        claimId: challenge.data.claimId,
      });
      assert.equal(claimed.status, 200, JSON.stringify(claimed.data));
      return claimed;
    },
    async register(username) {
      const r = await this.call("/auth/register", "POST", {
        username,
        displayName: username,
        password: pw,
      });
      assert.equal(r.status, 201, JSON.stringify(r.data));
      this.user = r.data.user;
      this.recovery = r.data.recoveryCode;
      return r;
    },
  });
  return { app, client, base };
}

test("reviewed catalog imports once, exposes comparisons and preserves moderation across restarts", async (t) => {
  const { app, client } = await harness(t, { seedCatalog: true });
  const anon = client();
  const listings = (await anon.call("/projects")).data.projects;
  assert.equal(listings.length, 15);
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM users").get().n,
    0,
  );
  assert.ok(
    listings.every(
      (p) =>
        p.external &&
        !p.ownerId &&
        p.stars === 0 &&
        p.contributors === 0 &&
        p.catalog,
    ),
  );
  assert.equal(importCatalog(app.locals.db), 0);
  const index = (await anon.call("/catalog")).data;
  assert.equal(index.products.find((p) => p.slug === "photoshop").count, 2);
  assert.equal(index.directories.length, 5);
  const photo = listings.find((p) => p.name === "PhotoCraft");
  assert.equal(photo.catalog.maturity, "Alpha");
  assert.equal(photo.catalog.comparisons[0].coverage, "Experimental rebuild");
  assert.match(photo.catalog.comparisons[0].gaps, /not ready/);
  const member = client();
  await member.register("catalog-reader");
  assert.equal(
    (await member.call(`/projects/${photo.id}/join`, "PUT", { joined: true }))
      .status,
    409,
  );
  await member.call(`/projects/${photo.id}/save`, "PUT", { saved: true });
  await member.call(`/projects/${photo.id}/messages`, "POST", {
    text: "Testing a layered photo workflow.",
  });
  assert.equal(importCatalog(app.locals.db), 0);
  assert.equal(
    (await member.call(`/projects/${photo.id}`)).data.project.saved,
    true,
  );
  assert.equal(
    (await anon.call(`/projects/${photo.id}/messages`)).data.messages.length,
    1,
  );
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE username=?")
    .run("catalog-reader");
  assert.equal(
    (
      await member.call(`/projects/${photo.id}`, "PATCH", {
        description: "Unsupported parity claim",
      })
    ).status,
    409,
  );
  app.locals.db
    .prepare("UPDATE projects SET hidden=1 WHERE id=?")
    .run(photo.id);
  importCatalog(app.locals.db);
  assert.equal((await anon.call(`/projects/${photo.id}`)).status, 404);
  assert.equal(
    (await anon.call("/catalog")).data.products.find(
      (p) => p.slug === "photoshop",
    ).count,
    1,
  );
  const graphite = listings.find((p) => p.name === "Graphite");
  await member.call(`/projects/${graphite.id}`, "DELETE");
  importCatalog(app.locals.db);
  assert.equal((await anon.call(`/projects/${graphite.id}`)).status, 404);
  assert.equal(
    (await anon.call("/catalog")).data.products.find(
      (p) => p.slug === "illustrator",
    ).count,
    0,
  );
  assert.equal(
    app.locals.db
      .prepare("SELECT project_id FROM catalog_entries WHERE slug='graphite'")
      .get().project_id,
    null,
  );
  assert.equal(
    app.locals.db.prepare("PRAGMA foreign_key_check").all().length,
    0,
  );
});

test("catalog reuses legacy references, validates sources and rolls back partial imports", async (t) => {
  const { app } = await harness(t);
  const db = app.locals.db;
  const p = catalog.find((p) => p.slug === "photocraft");
  db.prepare(
    "INSERT INTO projects(id,author,name,description,repo,category,tags,status,art,letter,external,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    "legacy-photo",
    "storytold",
    "PhotoCraft",
    "Existing reference",
    p.repo,
    p.category,
    "[]",
    "In progress",
    "photo",
    "P",
    1,
    "2026-10-13",
    "2026-10-13",
  );
  assert.equal(importCatalog(db), 15);
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM projects WHERE repo=?").get(p.repo).n,
    1,
  );
  assert.equal(
    db
      .prepare("SELECT project_id FROM catalog_entries WHERE slug='photocraft'")
      .get().project_id,
    "legacy-photo",
  );
  assert.equal(
    db.prepare("SELECT description FROM projects WHERE id='legacy-photo'").get()
      .description,
    "Existing reference",
  );
  const productIds = new Set(products.map((p) => p.slug));
  for (const item of catalog) {
    assert.ok(
      item.metadata.comparisons.every((c) => productIds.has(c.product)),
    );
    for (const link of [
      item.repo,
      item.metadata.website,
      item.metadata.licenseUrl,
      item.metadata.activity.url,
      item.metadata.contribute,
      item.metadata.adoption,
      ...item.metadata.comparisons.map((c) => c.source),
    ])
      assert.equal(new URL(link).protocol, "https:");
  }
  const fresh = {
    ...p,
    slug: "new-entry",
    repo: "https://github.com/example/new",
  };
  const invalid = {
    ...p,
    slug: "broken-entry",
    repo: "https://github.com/example/broken",
    description: null,
  };
  assert.throws(() => importCatalog(db, [fresh, invalid]));
  assert.equal(
    db.prepare("SELECT id FROM projects WHERE id='catalog-new-entry'").get(),
    undefined,
  );
  assert.equal(
    db.prepare("SELECT slug FROM catalog_entries WHERE slug='new-entry'").get(),
    undefined,
  );
});

test("curated repositories retain canonical identity through claims, imports and moderation", async (t) => {
  const { app, client } = await harness(t, { seedCatalog: true });
  const owner = client(),
    admin = client(),
    anon = client();
  await owner.register("curated-maintainer");
  await admin.register("curated-moderator");
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE id=?")
    .run(admin.user.id);
  const photo = (await anon.call("/projects")).data.projects.find(
    (p) => p.name === "PhotoCraft",
  );
  assert.equal(
    (
      await owner.call("/projects", "POST", {
        ...input,
        repo: "https://github.com/StoryTold/PhotoCraft.git",
      })
    ).status,
    409,
  );
  await owner.claimProject(photo.id);
  const index = async () =>
    (await anon.call("/catalog")).data.products.find(
      (p) => p.slug === "photoshop",
    );
  assert.equal((await index()).commonsCount, 1);
  assert.equal(
    (
      await owner.call(`/projects/${photo.id}`, "PATCH", {
        name: "Claimed PhotoCraft",
        replaces: ["photoshop"],
      })
    ).status,
    200,
  );
  assert.equal((await index()).commonsCount, 1);
  importCatalog(app.locals.db);
  assert.equal(
    (await anon.call(`/projects/${photo.id}`)).data.project.name,
    "Claimed PhotoCraft",
  );
  assert.equal(
    app.locals.db
      .prepare("SELECT COUNT(*) n FROM projects WHERE repo_key=?")
      .get("https://github.com/storytold/photocraft").n,
    1,
  );
  await admin.call(`/admin/users/${owner.user.id}`, "PATCH", {
    suspended: true,
  });
  assert.equal((await index()).commonsCount, 0);
  assert.equal((await index()).count, 1);
});

test("catalog review updates and removal decisions survive closing and reopening the database", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "commons-catalog-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "catalog.sqlite");
  let db = openDatabase(path);
  importCatalog(db);
  db.prepare(
    "UPDATE projects SET hidden=1 WHERE id='catalog-photocraft'",
  ).run();
  db.prepare("DELETE FROM projects WHERE id='catalog-graphite'").run();
  db.close();
  db = openDatabase(path);
  try {
    const penpot = catalog.find((p) => p.slug === "penpot");
    const reviewed = {
      ...penpot,
      metadata: { ...penpot.metadata, reviewedAt: "2026-10-15" },
    };
    assert.equal(
      importCatalog(
        db,
        catalog.map((p) => (p.slug === "penpot" ? reviewed : p)),
      ),
      0,
    );
    assert.equal(
      db
        .prepare("SELECT hidden FROM projects WHERE id='catalog-photocraft'")
        .get().hidden,
      1,
    );
    assert.equal(
      db.prepare("SELECT id FROM projects WHERE id='catalog-graphite'").get(),
      undefined,
    );
    assert.equal(
      JSON.parse(
        db
          .prepare("SELECT metadata FROM catalog_entries WHERE slug='penpot'")
          .get().metadata,
      ).reviewedAt,
      "2026-10-15",
    );
    assert.equal(db.prepare("SELECT COUNT(*) n FROM projects").get().n, 14);
  } finally {
    db.close();
  }
});

test("uncovered products stay discoverable and Commons project associations respect ownership and moderation", async (t) => {
  const { app, client } = await harness(t, { seedCatalog: true });
  const anon = client(),
    owner = client(),
    admin = client();
  const counts = async (slug) =>
    (await anon.call("/catalog")).data.products.find((p) => p.slug === slug);
  assert.equal((await counts("after-effects")).count, 0);
  assert.equal((await counts("after-effects")).commonsCount, 0);
  assert.equal((await counts("photoshop")).count, 2);
  assert.equal((await counts("photoshop")).commonsCount, 0);
  await owner.register("opportunity-builder");
  await admin.register("opportunity-admin");
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE id=?")
    .run(admin.user.id);
  assert.equal(
    (
      await owner.call("/projects", "POST", {
        ...input,
        replaces: ["unknown-product"],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await owner.call("/projects", "POST", {
        ...input,
        replaces: products.slice(0, 6).map((p) => p.slug),
      })
    ).status,
    400,
  );
  const created = await owner.createOwnedProject({
    ...input,
    replaces: ["photoshop", "after-effects", "photoshop"],
  });
  assert.equal(created.status, 201);
  const id = created.data.project.id;
  assert.deepEqual(created.data.project.replaces, [
    "after-effects",
    "photoshop",
  ]);
  assert.equal((await counts("after-effects")).commonsCount, 1);
  assert.equal((await counts("after-effects")).count, 0);
  assert.equal(
    (await anon.call(`/projects/${id}`, "PATCH", { replaces: ["figma"] }))
      .status,
    401,
  );
  const other = client();
  await other.register("other-builder");
  assert.equal(
    (await other.call(`/projects/${id}`, "PATCH", { replaces: ["figma"] }))
      .status,
    403,
  );
  await owner.call(`/projects/${id}`, "PATCH", { name: "Renamed prototype" });
  assert.deepEqual((await anon.call(`/projects/${id}`)).data.project.replaces, [
    "after-effects",
    "photoshop",
  ]);
  await owner.call(`/projects/${id}`, "PATCH", { replaces: ["figma"] });
  assert.equal((await counts("photoshop")).commonsCount, 0);
  assert.equal((await counts("figma")).commonsCount, 1);
  await admin.call(`/admin/projects/${id}`, "PATCH", { hidden: true });
  assert.equal((await counts("figma")).commonsCount, 0);
  await admin.call(`/admin/projects/${id}`, "PATCH", { hidden: false });
  await admin.call(`/admin/users/${owner.user.id}`, "PATCH", {
    suspended: true,
  });
  assert.equal((await counts("figma")).commonsCount, 0);
  await admin.call(`/admin/users/${owner.user.id}`, "PATCH", {
    suspended: false,
  });
  assert.equal((await counts("figma")).commonsCount, 1);
  await admin.call(`/projects/${id}`, "DELETE");
  assert.equal((await counts("figma")).commonsCount, 0);
  assert.equal(
    app.locals.db
      .prepare("SELECT COUNT(*) n FROM project_products WHERE project_id=?")
      .get(id).n,
    0,
  );
});

test("shared project collaboration, ownership, public profiles and validation", async (t) => {
  const { client } = await harness(t);
  const a = client(),
    b = client(),
    anon = client();
  await a.register("owner");
  await b.register("builder");
  assert.deepEqual((await anon.call("/auth/session")).data, {
    user: null,
    csrfToken: null,
  });
  assert.equal((await anon.call("/projects", "POST", input)).status, 401);
  const created = await a.createOwnedProject(input);
  assert.equal(created.status, 201);
  const id = created.data.project.id;
  assert.equal(created.data.project.author, "owner");
  assert.equal(created.data.project.contributors, 1);
  assert.equal(
    (await b.call(`/projects/${id}`, "PATCH", { name: "Stolen" })).status,
    403,
  );
  assert.equal((await b.call(`/projects/${id}`, "DELETE", {})).status, 403);
  assert.equal(
    (await a.call(`/projects/${id}`, "PATCH", { name: "New canvas" })).data
      .project.name,
    "New canvas",
  );
  assert.equal(
    (
      await a.call("/projects", "POST", {
        ...input,
        repo: "javascript:alert(1)",
      })
    ).status,
    400,
  );
  assert.equal(
    (await a.call("/projects", "POST", { ...input, category: "Bogus" })).status,
    400,
  );
  assert.equal(
    (await a.call("/projects", "POST", { ...input, featured: true })).status,
    400,
  );
  for (let i = 0; i < 2; i++) {
    assert.equal(
      (await b.call(`/projects/${id}/save`, "PUT", { saved: true })).data
        .project.stars,
      1,
    );
    assert.equal(
      (
        await b.call(`/projects/${id}/join`, "PUT", {
          joined: true,
          role: "Testing",
        })
      ).data.project.contributors,
      2,
    );
  }
  const detail = (await b.call(`/projects/${id}`)).data;
  assert.equal(detail.members.length, 2);
  assert.equal(detail.project.membershipRole, "Testing");
  assert.equal(
    (await a.call(`/projects/${id}/join`, "PUT", { joined: false })).status,
    409,
  );
  const msg = (
    await b.call(`/projects/${id}/messages`, "POST", { text: "I can test." })
  ).data.message;
  assert.equal(msg.author.username, "builder");
  assert.equal(
    (await anon.call(`/projects/${id}/messages`)).data.messages.length,
    1,
  );
  const outsider = client();
  await outsider.register("outsider");
  assert.equal(
    (await outsider.call(`/messages/${msg.id}`, "DELETE", {})).status,
    403,
  );
  assert.equal(
    (
      await b.call("/reports", "POST", {
        messageId: msg.id,
        reason: "Needs review",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await b.call("/reports", "POST", {
        messageId: msg.id,
        projectId: id,
        reason: "Bad",
      })
    ).status,
    400,
  );
  assert.equal((await a.call(`/messages/${msg.id}`, "DELETE", {})).status, 200);
  assert.equal(
    (
      await b.call("/me", "PATCH", {
        bio: "Testing",
        skills: ["React"],
        website: "https://example.com",
      })
    ).status,
    200,
  );
  const profile = (await anon.call("/builders/builder")).data.builder;
  assert.equal(profile.bio, "Testing");
  assert.equal(profile.password, undefined);
  assert.equal(profile.role, undefined);
  assert.equal((await anon.call("/builders/owner")).data.projects.length, 1);
  assert.equal(
    (await b.call(`/projects/${id}/save`, "PUT", { saved: false })).data.project
      .stars,
    0,
  );
  assert.equal(
    (await b.call(`/projects/${id}/join`, "PUT", { joined: false })).data
      .project.contributors,
    1,
  );
});

test("authentication CSRF, recovery rotation, password change, logout and origin", async (t) => {
  const { client } = await harness(t);
  const a = client(),
    b = client(),
    anon = client();
  await a.register("person");
  assert.equal(
    (
      await anon.call("/auth/login", "POST", {
        username: "person",
        password: "incorrect",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await anon.call("/auth/recover", "POST", {
        username: "person",
        password: pw,
        recoveryCode: "incorrect",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await anon.call(
        "/auth/register",
        "POST",
        { username: "other", displayName: "Other", password: pw },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await a.call("/me", "PATCH", { bio: "No CSRF" }, { "X-CSRF-Token": "" }))
      .status,
    403,
  );
  assert.equal(
    (
      await a.call(
        "/me",
        "PATCH",
        { bio: "Wrong origin" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  await b.call("/auth/login", "POST", { username: "person", password: pw });
  assert.equal(
    (
      await a.call("/auth/password", "POST", {
        currentPassword: "incorrect",
        password: pw,
      })
    ).status,
    401,
  );
  const next = "new-long-test-password-456";
  assert.equal(
    (
      await a.call("/auth/password", "POST", {
        currentPassword: pw,
        password: next,
      })
    ).status,
    200,
  );
  assert.equal((await b.call("/auth/session")).data.user, null);
  const recovered = await anon.call("/auth/recover", "POST", {
    username: "person",
    recoveryCode: a.recovery,
    password: pw,
  });
  assert.equal(recovered.status, 200);
  assert.notEqual(recovered.data.recoveryCode, a.recovery);
  assert.equal((await a.call("/auth/session")).data.user, null);
  assert.equal(
    (
      await anon.call("/auth/recover", "POST", {
        username: "person",
        recoveryCode: a.recovery,
        password: pw,
      })
    ).status,
    401,
  );
  a.csrf = "";
  await a.call("/auth/login", "POST", { username: "person", password: pw });
  assert.equal((await a.call("/auth/logout", "POST", {})).status, 200);
  assert.equal((await a.call("/auth/session")).data.user, null);
});

test("moderation conceals content on every public route and invalidates suspended sessions", async (t) => {
  const { app, client } = await harness(t);
  const admin = client(),
    a = client(),
    b = client();
  await admin.register("admin");
  await a.register("author");
  await b.register("reader");
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE id=?")
    .run(admin.user.id);
  const id = (await a.createOwnedProject(input)).data.project.id;
  const msg = (
    await b.call(`/projects/${id}/messages`, "POST", { text: "Message" })
  ).data.message;
  assert.equal((await a.call("/admin/reports")).status, 403);
  await b.call("/reports", "POST", { projectId: id, reason: "Review" });
  const report = (await admin.call("/admin/reports")).data.reports[0];
  assert.equal(report.reporter.username, "reader");
  assert.equal(
    (
      await admin.call(`/admin/reports/${report.id}`, "PATCH", {
        resolved: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (await admin.call(`/admin/projects/${id}`, "PATCH", { hidden: true }))
      .status,
    200,
  );
  assert.equal((await b.call("/projects")).data.projects.length, 0);
  assert.equal((await b.call("/builders/author")).data.projects.length, 0);
  for (const [path, method, body] of [
    [`/projects/${id}`, "GET"],
    [`/projects/${id}/messages`, "GET"],
    [`/projects/${id}/save`, "PUT", { saved: true }],
    [`/projects/${id}/join`, "PUT", { joined: true }],
    [`/projects/${id}/messages`, "POST", { text: "Hidden" }],
    [`/messages/${msg.id}`, "DELETE", {}],
    ["/reports", "POST", { messageId: msg.id, reason: "Hidden" }],
  ])
    assert.equal((await b.call(path, method, body)).status, 404, path);
  assert.equal(
    (await admin.call("/admin/projects")).data.projects[0].hidden,
    true,
  );
  await admin.call(`/admin/projects/${id}`, "PATCH", { hidden: false });
  assert.equal(
    (
      await admin.call(`/admin/users/${a.user.id}`, "PATCH", {
        suspended: true,
      })
    ).status,
    200,
  );
  assert.equal((await a.call("/auth/session")).data.user, null);
  assert.equal((await b.call("/projects")).data.projects.length, 0);
  assert.equal((await b.call("/builders/author")).status, 404);
  assert.equal(
    (
      await admin.call(`/admin/users/${admin.user.id}`, "PATCH", {
        suspended: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (await admin.call("/me", "DELETE", { password: pw })).status,
    409,
  );
  await admin.call(`/admin/users/${a.user.id}`, "PATCH", { suspended: false });
  await admin.call(`/admin/users/${b.user.id}`, "PATCH", { suspended: true });
  assert.equal(
    (await admin.call(`/projects/${id}/messages`)).data.messages.length,
    0,
  );
});

test("account deletion cascades personal and owned content without dangling references", async (t) => {
  const { app, client } = await harness(t);
  const a = client(),
    b = client();
  await a.register("owner");
  await b.register("member");
  const id = (await a.createOwnedProject({ ...input, replaces: ["photoshop"] }))
    .data.project.id;
  await b.call(`/projects/${id}/join`, "PUT", { joined: true });
  await b.call(`/projects/${id}/save`, "PUT", { saved: true });
  await b.call(`/projects/${id}/messages`, "POST", {
    text: "Remove my message",
  });
  await b.call("/reports", "POST", { projectId: id, reason: "Review" });
  assert.equal(
    (await b.call("/me", "DELETE", { password: "incorrect" })).status,
    401,
  );
  assert.equal((await b.call("/me", "DELETE", { password: pw })).status, 200);
  assert.equal(
    (await a.call(`/projects/${id}/messages`)).data.messages.length,
    0,
  );
  assert.equal((await a.call(`/projects/${id}`)).data.project.stars, 0);
  assert.equal(
    app.locals.db.prepare("SELECT user_id FROM reports").get().user_id,
    null,
  );
  assert.equal((await a.call("/me", "DELETE", { password: pw })).status, 200);
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM projects").get().n,
    0,
  );
  assert.deepEqual(app.locals.db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM project_products").get().n,
    0,
  );
});

test("durable SQLite survives app restart, production cookies and configuration guard", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "commons-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const dbPath = join(directory, "app.sqlite");
  const app = createApp({ dbPath, quiet: true });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const result = await fetch(
    `http://127.0.0.1:${server.address().port}/api/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "durable",
        displayName: "Durable",
        password: pw,
      }),
    },
  );
  assert.equal(result.status, 201);
  const registration = await result.json();
  const linked = await fetch(
    `http://127.0.0.1:${server.address().port}/api/projects`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: result.headers.get("set-cookie").split(";")[0],
        "X-CSRF-Token": registration.csrfToken,
      },
      body: JSON.stringify({ ...input, replaces: ["after-effects"] }),
    },
  );
  assert.equal(linked.status, 201);
  const linkedId = (await linked.json()).project.id;
  await new Promise((r) => server.close(r));
  app.locals.close();
  const next = await harness(t, { dbPath });
  assert.deepEqual(
    (await next.client().call(`/projects/${linkedId}`)).data.project.replaces,
    ["after-effects"],
  );
  assert.equal(
    (await next.client().call("/catalog")).data.products.find(
      (p) => p.slug === "after-effects",
    ).commonsCount,
    0,
  );
  assert.equal(
    (await next.client().call("/builders")).data.builders[0].username,
    "durable",
  );
  assert.throws(
    () =>
      createApp({
        dbPath: ":memory:",
        production: true,
        publicUrl: "http://example.com",
      }),
    /HTTPS/,
  );
  const secure = await harness(t, {
    production: true,
    publicUrl: "https://community.example",
    operatorName: "Commons Test Operator",
    contactEmail: "contact@example.com",
  });
  const registered = await secure.client().register("secure");
  const cookie = registered.response.headers.get("set-cookie");
  assert.match(cookie, /__Host-commons=/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test("rate limits, unknown endpoints, malformed JSON and validation fail as JSON", async (t) => {
  const { client, base } = await harness(t, { authRateLimit: 2 });
  const anon = client();
  await anon.call("/auth/login", "POST", { username: "unknown", password: pw });
  await anon.call("/auth/login", "POST", { username: "unknown", password: pw });
  assert.equal(
    (
      await anon.call("/auth/login", "POST", {
        username: "unknown",
        password: pw,
      })
    ).status,
    429,
  );
  assert.equal((await anon.call("/unknown")).status, 404);
  const malformed = await fetch(base + "/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal(typeof (await malformed.json()).error, "string");
});

test("credential limiter allows repeated session reads and logout", async (t) => {
  const { client } = await harness(t, { authRateLimit: 2 });
  const a = client();
  await a.register("reader");
  for (let i = 0; i < 5; i++)
    assert.equal((await a.call("/auth/session")).status, 200);
  assert.equal(
    (
      await a.call("/auth/password", "POST", {
        currentPassword: pw,
        password: pw,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await a.call("/auth/password", "POST", {
        currentPassword: pw,
        password: pw,
      })
    ).status,
    429,
  );
  assert.equal((await a.call("/auth/session")).status, 200);
  assert.equal((await a.call("/auth/logout", "POST", {})).status, 200);
});

test("admin reports retain hidden and suspended context and permit message removal", async (t) => {
  const { app, client } = await harness(t);
  const admin = client(),
    owner = client(),
    reporter = client();
  await admin.register("moderator");
  await owner.register("author");
  await reporter.register("reporter");
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE id=?")
    .run(admin.user.id);
  const project = (await owner.createOwnedProject(input)).data.project;
  const message = (
    await owner.call(`/projects/${project.id}/messages`, "POST", {
      text: "Reported discussion context",
    })
  ).data.message;
  await reporter.call("/reports", "POST", {
    messageId: message.id,
    reason: "Review discussion",
  });
  await reporter.call("/reports", "POST", {
    projectId: project.id,
    reason: "Review project",
  });
  await admin.call(`/admin/projects/${project.id}`, "PATCH", { hidden: true });
  await admin.call(`/admin/users/${owner.user.id}`, "PATCH", {
    suspended: true,
  });
  assert.equal((await reporter.call("/admin/reports")).status, 403);
  assert.equal(
    (await reporter.call(`/projects/${project.id}/messages`)).status,
    404,
  );
  assert.equal(
    (await reporter.call(`/messages/${message.id}`, "DELETE", {})).status,
    404,
  );
  const reports = (await admin.call("/admin/reports")).data.reports;
  const discussion = reports.find((r) => r.messageId === message.id);
  assert.deepEqual(discussion.project, {
    id: project.id,
    name: project.name,
    hidden: true,
  });
  assert.equal(discussion.message.text, "Reported discussion context");
  assert.equal(discussion.message.author.username, "author");
  assert.equal(discussion.message.author.password, undefined);
  const projectReport = reports.find((r) => r.projectId === project.id);
  assert.equal(projectReport.message, null);
  assert.equal(projectReport.project.hidden, true);
  assert.equal(
    (await admin.call(`/messages/${message.id}`, "DELETE", {})).status,
    200,
  );
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM messages").get().n,
    0,
  );
});

test("public site metadata exposes only configured operator and safe contact", async (t) => {
  const { client } = await harness(t, {
    operatorName: "Community Operator",
    contactEmail: "contact@example.com",
  });
  assert.deepEqual((await client().call("/site")).data, {
    operatorName: "Community Operator",
    contactEmail: "contact@example.com",
    emailEnabled: false,
  });
  const local = await harness(t, { operatorName: "", contactEmail: "" });
  assert.deepEqual((await local.client().call("/site")).data, {
    operatorName: "",
    contactEmail: "",
    emailEnabled: false,
  });
  const production = {
    dbPath: ":memory:",
    production: true,
    publicUrl: "https://community.example",
  };
  assert.throws(
    () => createApp({ ...production, operatorName: "", contactEmail: "" }),
    /OPERATOR_NAME and CONTACT_EMAIL/,
  );
  assert.throws(
    () =>
      createApp({
        ...production,
        operatorName: "Operator",
        contactEmail: "bad@example.com?subject=unsafe",
      }),
    /CONTACT_EMAIL/,
  );
  assert.throws(
    () =>
      createApp({
        ...production,
        operatorName: "Operator",
        contactEmail: "contact@example.com\r\nBcc:evil@example.com",
      }),
    /CONTACT_EMAIL/,
  );
  assert.throws(
    () =>
      createApp({
        ...production,
        operatorName: "x".repeat(121),
        contactEmail: "contact@example.com",
      }),
    /OPERATOR_NAME/,
  );
});

test("development accepts matching localhost and IPv4 loopback origins only", async (t) => {
  const { client } = await harness(t, { publicUrl: "http://localhost:5173" });
  const a = client();
  assert.equal(
    (
      await a.call(
        "/auth/register",
        "POST",
        { username: "ipv4", displayName: "IPv4", password: pw },
        { Origin: "http://127.0.0.1:5173" },
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await a.call(
        "/me",
        "PATCH",
        { bio: "Local proxy" },
        { Origin: "http://127.0.0.1:5173" },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await a.call(
        "/me",
        "PATCH",
        { bio: "Wrong port" },
        { Origin: "http://127.0.0.1:5174" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await a.call(
        "/me",
        "PATCH",
        { bio: "Foreign" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  const reverse = await harness(t, { publicUrl: "http://127.0.0.1:5173" });
  assert.equal(
    (
      await reverse
        .client()
        .call(
          "/auth/register",
          "POST",
          { username: "localhost", displayName: "Localhost", password: pw },
          { Origin: "http://localhost:5173" },
        )
    ).status,
    201,
  );
  const prod = await harness(t, {
    production: true,
    publicUrl: "https://localhost:5173",
    operatorName: "Operator",
    contactEmail: "contact@example.com",
  });
  assert.equal(
    (
      await prod
        .client()
        .call(
          "/auth/register",
          "POST",
          { username: "denied", displayName: "Denied", password: pw },
          { Origin: "https://127.0.0.1:5173" },
        )
    ).status,
    403,
  );
});

test("credential route aliases share the same authentication throttle", async (t) => {
  const { client } = await harness(t, { authRateLimit: 1 });
  const anon = client();
  assert.equal(
    (
      await anon.call("/auth/login", "POST", {
        username: "missing",
        password: pw,
      })
    ).status,
    401,
  );
  for (const path of [
    "/auth/login",
    "/auth/login/",
    "/auth/LOGIN",
    "/AUTH/LOGIN/",
    "/auth/register/",
    "/auth/RECOVER/",
    "/auth/PASSWORD/",
  ])
    assert.equal(
      (await anon.call(path, "POST", { username: "missing", password: pw }))
        .status,
      429,
      path,
    );
  assert.equal((await anon.call("/auth/session")).status, 200);
});

test("whitespace-only new passwords cannot change accounts or revoke valid sessions", async (t) => {
  const { app, client } = await harness(t);
  const a = client(),
    anon = client();
  assert.equal(
    (
      await anon.call("/auth/register", "POST", {
        username: "empty-pass",
        displayName: "Empty",
        password: " ".repeat(12),
      })
    ).status,
    400,
  );
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM users").get().n,
    0,
  );
  const meaningful = "  meaningful-password  ";
  const registration = await a.call("/auth/register", "POST", {
    username: "space-pass",
    displayName: "Space",
    password: meaningful,
  });
  assert.equal(registration.status, 201);
  const recoveryCode = registration.data.recoveryCode;
  assert.equal(
    (
      await a.call("/auth/password", "POST", {
        currentPassword: meaningful,
        password: " ".repeat(12),
      })
    ).status,
    400,
  );
  assert.equal(
    (await a.call("/auth/session")).data.user.username,
    "space-pass",
  );
  assert.equal(
    (
      await anon.call("/auth/recover", "POST", {
        username: "space-pass",
        recoveryCode,
        password: "\t".repeat(12),
      })
    ).status,
    400,
  );
  assert.equal(
    (await a.call("/auth/session")).data.user.username,
    "space-pass",
  );
  assert.equal(
    (
      await anon.call("/auth/login", "POST", {
        username: "space-pass",
        password: meaningful.trim(),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await anon.call("/auth/login", "POST", {
        username: "space-pass",
        password: meaningful,
      })
    ).status,
    200,
  );
  const recovered = await a.call("/auth/recover", "POST", {
    username: "space-pass",
    recoveryCode,
    password: "  next-meaningful-password  ",
  });
  assert.equal(recovered.status, 200);
});

test("private verified email enables single-use password recovery and revokes sessions and old keys", async (t) => {
  const sent = [];
  const { app, client } = await harness(t, {
    email: {
      apiKey: "test-key",
      sender: "noreply@subcult.tv",
      fetch: async (url, options) => {
        assert.equal(url, "https://api.brevo.com/v3/smtp/email");
        sent.push(JSON.parse(options.body));
        return Response.json({ messageId: "<test-message>" }, { status: 201 });
      },
    },
  });
  const owner = client(),
    anon = client();
  await owner.register("email-owner");
  const oldRecovery = owner.recovery;
  assert.equal(
    (
      await owner.call("/me/email", "PUT", {
        email: "owner@example.com",
        password: "wrong",
      })
    ).status,
    401,
  );
  const saved = await owner.call("/me/email", "PUT", {
    email: "Owner@example.com",
    password: pw,
  });
  assert.equal(saved.data.user.email, null);
  assert.equal(saved.data.user.pendingEmail, "owner@example.com");
  const queue = app.locals.db.prepare("SELECT * FROM mail_outbox").get();
  const token = queue.body.match(/#token=([^\s]+)/)[1];
  assert.notEqual(queue.token, token);
  assert.equal((await owner.call("/me/email/resend", "POST")).status, 429);
  for (const path of [
    "/builders",
    "/builders/email-owner",
    "/activity",
    "/site",
  ])
    assert.ok(
      !JSON.stringify((await anon.call(path)).data).includes(
        "owner@example.com",
      ),
    );
  await app.locals.mail.process();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].textContent.includes(token), true);
  assert.equal(sent[0].htmlContent, undefined);
  assert.equal(
    app.locals.db.prepare("SELECT body FROM mail_outbox").get().body,
    "",
  );
  assert.equal(
    (await anon.call("/auth/verify-email", "POST", { token })).status,
    200,
  );
  assert.equal(
    (await anon.call("/auth/verify-email", "POST", { token })).status,
    400,
  );
  assert.equal(
    (await owner.call("/auth/session")).data.user.email,
    "owner@example.com",
  );
  const unknown = await anon.call("/auth/request-reset", "POST", {
    email: "missing@example.com",
  });
  const known = await anon.call("/auth/request-reset", "POST", {
    email: "owner@example.com",
  });
  assert.deepEqual(known.data, unknown.data);
  assert.equal(known.status, unknown.status);
  const reset = app.locals.db
    .prepare("SELECT * FROM mail_outbox")
    .get()
    .body.match(/#token=([^\s]+)/)[1];
  const newPw = "a-brand-new-password-456";
  const result = await anon.call("/auth/reset-password", "POST", {
    token: reset,
    password: newPw,
  });
  assert.equal(result.status, 200);
  assert.ok(result.data.recoveryCode);
  assert.equal(
    (await owner.call("/me", "PATCH", { bio: "expired" })).status,
    401,
  );
  assert.equal(
    (
      await anon.call("/auth/reset-password", "POST", {
        token: reset,
        password: newPw,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await anon.call("/auth/recover", "POST", {
        username: "email-owner",
        recoveryCode: oldRecovery,
        password: pw,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await anon.call("/auth/login", "POST", {
        username: "email-owner",
        password: newPw,
      })
    ).status,
    200,
  );
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM auth_tokens").get().n,
    0,
  );
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM mail_outbox").get().n,
    0,
  );
});

test("email expiry, replacement, removal, provider retries and disabled configuration", async (t) => {
  let failProvider = true;
  const { app, client } = await harness(t, {
    email: {
      apiKey: "test-key",
      sender: "noreply@subcult.tv",
      fetch: async () =>
        failProvider
          ? Response.json({ error: "not stored" }, { status: 429 })
          : Response.json({ messageId: "<accepted>" }, { status: 201 }),
    },
  });
  const a = client(),
    anon = client();
  await a.register("email-retry");
  await a.call("/me/email", "PUT", {
    email: "first@example.com",
    password: pw,
  });
  const firstToken = app.locals.db
    .prepare("SELECT body FROM mail_outbox")
    .get()
    .body.match(/#token=([^\s]+)/)[1];
  await app.locals.mail.process();
  assert.equal(
    app.locals.db
      .prepare("SELECT status,last_error,attempts FROM mail_outbox")
      .get().last_error,
    "HTTP_429",
  );
  app.locals.db.prepare("UPDATE mail_outbox SET next_attempt=0").run();
  failProvider = false;
  await app.locals.mail.process();
  assert.equal(app.locals.mail.status().counts.sent, 1);
  app.locals.db.prepare("UPDATE auth_tokens SET expires=0,created_at=0").run();
  assert.equal(
    (await anon.call("/auth/verify-email", "POST", { token: firstToken }))
      .status,
    400,
  );
  await a.call("/me/email", "PUT", {
    email: "second@example.com",
    password: pw,
  });
  assert.equal(
    (await anon.call("/auth/verify-email", "POST", { token: firstToken }))
      .status,
    400,
  );
  const secondToken = app.locals.db
    .prepare("SELECT body FROM mail_outbox")
    .get()
    .body.match(/#token=([^\s]+)/)[1];
  await anon.call("/auth/verify-email", "POST", { token: secondToken });
  await anon.call("/auth/request-reset", "POST", {
    email: "second@example.com",
  });
  await a.call("/me/email", "PUT", { email: "", password: pw });
  assert.equal((await a.call("/auth/session")).data.user.email, null);
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM auth_tokens").get().n,
    0,
  );
  const disabled = await harness(t, { email: { apiKey: "", sender: "" } });
  assert.equal(
    (
      await disabled
        .client()
        .call("/auth/request-reset", "POST", { email: "anything@example.com" })
    ).status,
    503,
  );
});

test("project updates, threaded replies and activity honor permissions, pagination and moderation", async (t) => {
  const { app, client } = await harness(t);
  const owner = client(),
    member = client(),
    visitor = client(),
    admin = client(),
    anon = client();
  await owner.register("community-owner");
  await member.register("community-member");
  await visitor.register("community-visitor");
  await admin.register("community-admin");
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE id=?")
    .run(admin.user.id);
  const p = (await owner.createOwnedProject(input)).data.project;
  assert.equal(
    (
      await visitor.call(`/projects/${p.id}/updates`, "POST", {
        title: "Spam",
        body: "No permission",
      })
    ).status,
    403,
  );
  await member.call(`/projects/${p.id}/join`, "PUT", { joined: true });
  await member.call(`/projects/${p.id}/join`, "PUT", { joined: true });
  const update = (
    await member.call(`/projects/${p.id}/updates`, "POST", {
      title: "Working prototype",
      body: "The first part is running.",
    })
  ).data.update;
  const root = (
    await owner.call(`/projects/${p.id}/messages`, "POST", {
      text: "A question",
    })
  ).data.message;
  const reply = (
    await member.call(`/projects/${p.id}/messages`, "POST", {
      text: "An answer",
      parentId: root.id,
    })
  ).data.message;
  assert.equal(reply.parentId, root.id);
  assert.equal(
    (
      await member.call(`/projects/${p.id}/messages`, "POST", {
        text: "Nested",
        parentId: reply.id,
      })
    ).status,
    400,
  );
  const other = (
    await visitor.createOwnedProject({
      ...input,
      repo: "https://github.com/example/other",
    })
  ).data.project;
  assert.equal(
    (
      await visitor.call(`/projects/${other.id}/messages`, "POST", {
        text: "Wrong project",
        parentId: root.id,
      })
    ).status,
    404,
  );
  await member.call(`/projects/${p.id}/save`, "PUT", { saved: true });
  await owner.call(`/projects/${p.id}`, "PATCH", { name: p.name });
  const full = (await anon.call("/activity?limit=50")).data.activity;
  assert.equal(full.filter((a) => a.kind === "member_joined").length, 1);
  assert.equal(full.filter((a) => a.kind === "project_changed").length, 0);
  assert.equal(full.length, 8);
  assert.equal((await anon.call("/activity?scope=mine")).status, 401);
  assert.equal((await anon.call("/activity?limit=0")).status, 400);
  const page1 = (await anon.call("/activity?limit=2")).data;
  const page2 = (
    await anon.call(`/activity?limit=2&before=${page1.nextCursor}`)
  ).data;
  assert.equal(
    new Set([...page1.activity, ...page2.activity].map((a) => a.id)).size,
    4,
  );
  assert.ok(
    (await member.call("/activity?scope=mine")).data.activity.every(
      (a) => a.project.id === p.id,
    ),
  );
  assert.equal(
    (await visitor.call(`/updates/${update.id}`, "DELETE")).status,
    403,
  );
  await visitor.call("/reports", "POST", {
    updateId: update.id,
    reason: "Check this update",
  });
  const report = (await admin.call("/admin/reports")).data.reports[0];
  assert.equal(report.update.title, "Working prototype");
  await admin.call(`/admin/projects/${p.id}`, "PATCH", { hidden: true });
  assert.ok(
    (await anon.call("/activity")).data.activity.every(
      (a) => a.project.id !== p.id,
    ),
  );
  assert.equal((await anon.call(`/projects/${p.id}/updates`)).status, 404);
  await admin.call(`/admin/projects/${p.id}`, "PATCH", { hidden: false });
  await admin.call(`/admin/users/${member.user.id}`, "PATCH", {
    suspended: true,
  });
  assert.ok(
    (await anon.call("/activity")).data.activity.every(
      (a) => a.actor.id !== member.user.id,
    ),
  );
  assert.equal(
    (await anon.call(`/projects/${p.id}/updates`)).data.updates.length,
    0,
  );
  await admin.call(`/admin/users/${member.user.id}`, "PATCH", {
    suspended: false,
  });
  await owner.call(`/messages/${root.id}`, "DELETE");
  assert.equal(
    (await anon.call(`/projects/${p.id}/messages`)).data.messages.length,
    0,
  );
  assert.ok(
    (await anon.call("/activity")).data.activity.every((a) => !a.messageId),
  );
  await admin.call(`/updates/${update.id}`, "DELETE");
  assert.equal(
    (await anon.call(`/projects/${p.id}/updates`)).data.updates.length,
    0,
  );
  assert.deepEqual(app.locals.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("unclaimed repositories reject duplicates and require account-bound repository proof to transfer", async (t) => {
  let proof = "wrong";
  const { app, client } = await harness(t, {
    repositoryFetch: async (url, options) => {
      assert.ok(
        url.startsWith(
          "https://api.github.com/repos/StoryTold/photocraft/contents/.commons/claims/",
        ),
      );
      assert.equal(options.redirect, "error");
      return Response.json({
        type: "file",
        encoding: "base64",
        size: Buffer.byteLength(proof),
        content: Buffer.from(proof).toString("base64"),
      });
    },
  });
  const submitter = client(),
    maintainer = client(),
    attacker = client(),
    anon = client();
  await submitter.register("reference-lister");
  await maintainer.register("repository-maintainer");
  await attacker.register("claim-attacker");
  const created = await submitter.call("/projects", "POST", {
    ...input,
    repo: "https://github.com/StoryTold/photocraft.git/",
    listingType: "reference",
  });
  assert.equal(created.status, 201);
  assert.equal(
    (
      await attacker.call("/projects", "POST", {
        ...input,
        listingType: "owned",
      })
    ).status,
    400,
  );
  const p = created.data.project;
  assert.equal(p.ownerId, null);
  assert.equal(p.external, true);
  assert.equal(p.claimable, true);
  assert.equal(p.author, "StoryTold");
  assert.equal(
    (await submitter.call(`/projects/${p.id}`, "PATCH", { name: "Hijacked" }))
      .status,
    403,
  );
  assert.equal(
    (await submitter.call(`/projects/${p.id}/join`, "PUT", { joined: true }))
      .status,
    409,
  );
  assert.equal(
    (
      await submitter.call(`/projects/${p.id}/updates`, "POST", {
        title: "Fake owner",
        body: "No",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await attacker.call("/projects", "POST", {
        ...input,
        repo: "https://github.com/storytold/PHOTOCRAFT",
      })
    ).status,
    409,
  );
  assert.equal(
    (await anon.call(`/projects/${p.id}/claim`, "POST")).status,
    401,
  );
  const challenge = (await maintainer.call(`/projects/${p.id}/claim`, "POST"))
    .data;
  assert.ok(challenge.path.startsWith(".commons/claims/"));
  assert.equal(
    (
      await attacker.call(`/projects/${p.id}/claim/verify`, "POST", {
        claimId: challenge.claimId,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await maintainer.call(`/projects/${p.id}/claim/verify`, "POST", {
        claimId: challenge.claimId,
      })
    ).status,
    409,
  );
  await submitter.call(`/projects/${p.id}/save`, "PUT", { saved: true });
  proof = challenge.proof;
  const claim = await maintainer.call(
    `/projects/${p.id}/claim/verify`,
    "POST",
    { claimId: challenge.claimId },
  );
  assert.equal(claim.status, 200);
  const claimed = (await anon.call(`/projects/${p.id}`)).data.project;
  assert.equal(claimed.repositoryVerified, true);
  assert.equal(
    (
      await maintainer.call(`/projects/${p.id}`, "PATCH", {
        repo: "https://github.com/example/stolen",
      })
    ).status,
    409,
  );
  assert.equal(claimed.ownerId, maintainer.user.id);
  assert.equal(claimed.external, false);
  assert.equal(claimed.stars, 1);
  assert.equal(
    (
      await maintainer.call(`/projects/${p.id}`, "PATCH", {
        description: "Now maintained here",
      })
    ).status,
    200,
  );
  assert.equal(
    (await attacker.call(`/projects/${p.id}/claim`, "POST")).status,
    409,
  );
  assert.equal(
    app.locals.db.prepare("SELECT COUNT(*) n FROM repository_claims").get().n,
    0,
  );
  assert.equal(
    (await anon.call("/activity")).data.activity.filter(
      (a) => a.kind === "project_claimed",
    ).length,
    1,
  );
  assert.deepEqual(app.locals.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("competing repository claims transfer once, and expiry or account suspension invalidates proof", async (t) => {
  const files = new Map();
  let release;
  let count = 0;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const { app, client } = await harness(t, {
    repositoryFetch: async (url) => {
      const id = url.split("/").at(-1);
      const content = files.get(id);
      count++;
      if (count === 2) release();
      await barrier;
      return Response.json({
        type: "file",
        encoding: "base64",
        size: Buffer.byteLength(content),
        content: Buffer.from(content).toString("base64"),
      });
    },
  });
  const a = client(),
    b = client(),
    lister = client();
  await a.register("claim-one");
  await b.register("claim-two");
  await lister.register("claim-lister");
  const p = (await lister.call("/projects", "POST", input)).data.project;
  const challengeA = (await a.call(`/projects/${p.id}/claim`, "POST")).data;
  const challengeB = (await b.call(`/projects/${p.id}/claim`, "POST")).data;
  files.set(`${challengeA.claimId}.txt`, challengeA.proof);
  files.set(`${challengeB.claimId}.txt`, challengeB.proof);
  const results = await Promise.all([
    a.call(`/projects/${p.id}/claim/verify`, "POST", {
      claimId: challengeA.claimId,
    }),
    b.call(`/projects/${p.id}/claim/verify`, "POST", {
      claimId: challengeB.claimId,
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    app.locals.db
      .prepare("SELECT COUNT(*) n FROM activity WHERE kind='project_claimed'")
      .get().n,
    1,
  );
  const other = (
    await lister.call("/projects", "POST", {
      ...input,
      repo: "https://github.com/example/expired",
    })
  ).data.project;
  const expired = (await a.call(`/projects/${other.id}/claim`, "POST")).data;
  app.locals.db
    .prepare("UPDATE repository_claims SET expires=0 WHERE id=?")
    .run(expired.claimId);
  assert.equal(
    (
      await a.call(`/projects/${other.id}/claim/verify`, "POST", {
        claimId: expired.claimId,
      })
    ).status,
    400,
  );
  const suspendedChallenge = (
    await b.call(`/projects/${other.id}/claim`, "POST")
  ).data;
  app.locals.db
    .prepare("UPDATE users SET role='admin' WHERE id=?")
    .run(lister.user.id);
  assert.equal(
    (
      await lister.call(`/admin/users/${b.user.id}`, "PATCH", {
        suspended: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await b.call(`/projects/${other.id}/claim/verify`, "POST", {
        claimId: suspendedChallenge.claimId,
      })
    ).status,
    401,
  );
  assert.equal(
    app.locals.db
      .prepare("SELECT COUNT(*) n FROM repository_claims WHERE user_id=?")
      .get(b.user.id).n,
    0,
  );
});

test("mail queue survives restart, suppresses concurrent processing and scrubs permanent errors", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "commons-mail-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "commons.sqlite");
  let attempts = 0;
  const config = {
    apiKey: "test-key",
    sender: "noreply@subcult.tv",
    fetch: async () => {
      attempts++;
      return Response.json(
        { message: "recipient and secret must not be stored" },
        { status: 401 },
      );
    },
  };
  const first = createApp({ dbPath: path, email: config, quiet: true });
  const db = first.locals.db;
  db.prepare(
    "INSERT INTO users(id,username,display_name,password,recovery,created_at) VALUES(?,?,?,?,?,?)",
  ).run(
    "mail-user",
    "mail-user",
    "Mail user",
    "hash",
    "hash",
    new Date().toISOString(),
  );
  db.prepare("INSERT INTO auth_tokens VALUES(?,?,?,?,?,?)").run(
    "link-hash",
    "mail-user",
    "verify",
    "private@example.com",
    Date.now(),
    Date.now() + 86400_000,
  );
  first.locals.mail.enqueue(
    "link-hash",
    "private@example.com",
    "Verify",
    "private-link-token",
  );
  first.locals.close();
  const second = createApp({ dbPath: path, email: config, quiet: true });
  t.after(() => second.locals.close());
  await Promise.all([
    second.locals.mail.process(),
    second.locals.mail.process(),
  ]);
  assert.equal(attempts, 1);
  const row = second.locals.db.prepare("SELECT * FROM mail_outbox").get();
  assert.equal(row.status, "failed");
  assert.equal(row.last_error, "HTTP_401");
  assert.equal(row.body, "");
  assert.equal(row.recipient, "");
  await second.locals.mail.process();
  assert.equal(attempts, 1);
  second.locals.db.prepare("UPDATE auth_tokens SET expires=0").run();
  await second.locals.mail.process();
  assert.equal(
    second.locals.db.prepare("SELECT COUNT(*) n FROM mail_outbox").get().n,
    0,
  );
});
