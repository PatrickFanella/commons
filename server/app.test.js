import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app.js";

const pw = "a-long-test-password-123";
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
  const app = createApp({
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
  const created = await a.call("/projects", "POST", input);
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
  const id = (await a.call("/projects", "POST", input)).data.project.id;
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
  const id = (await a.call("/projects", "POST", input)).data.project.id;
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
});

test("durable SQLite survives app restart, production cookies and configuration guard", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "open-world-test-"));
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
  await new Promise((r) => server.close(r));
  app.locals.close();
  const next = await harness(t, { dbPath });
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
    operatorName: "Open World Test Operator",
    contactEmail: "contact@example.com",
  });
  const registered = await secure.client().register("secure");
  const cookie = registered.response.headers.get("set-cookie");
  assert.match(cookie, /__Host-openworld=/);
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
  const project = (await owner.call("/projects", "POST", input)).data.project;
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
  });
  const local = await harness(t, { operatorName: "", contactEmail: "" });
  assert.deepEqual((await local.client().call("/site")).data, {
    operatorName: "",
    contactEmail: "",
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
