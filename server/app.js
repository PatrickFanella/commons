import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { openDatabase } from "./db.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
export const passwordHash = (value) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
};
const dummyPassword = passwordHash(secret());
const matches = (value, stored) => {
  const [salt, digest] = stored.split(":");
  const candidate = scryptSync(value, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(digest, "hex"));
};
const fail = (status, error, code = "INVALID_REQUEST") => {
  const e = new Error(error);
  e.status = status;
  e.code = code;
  throw e;
};
const string = (value, name, max, min = 0) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    fail(400, `${name} must contain ${min}–${max} characters.`);
  return value.trim();
};
const credential = (value, name) => {
  string(value, name, 128, 1);
  return value;
};
const password = (value) => {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    value.length > 128 ||
    !value.trim()
  )
    fail(400, "Password must contain 12–128 characters.");
  return value;
};
const bool = (value, name) => {
  if (typeof value !== "boolean") fail(400, `${name} must be a boolean.`);
  return value;
};
const url = (value, name, optional = false) => {
  if (optional && value === "") return "";
  string(value, name, 2000, 1);
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) throw Error();
    return u.href;
  } catch {
    fail(400, `${name} must be an HTTPS URL.`);
  }
};
const list = (value, name, count, length) => {
  if (!Array.isArray(value) || value.length > count)
    fail(400, `${name} accepts at most ${count} entries.`);
  return [...new Set(value.map((v) => string(v, name, length, 1)))];
};
const categories = [
  "Creative tools",
  "Developer tools",
  "Productivity",
  "Audio & music",
  "Engineering",
];
const statuses = [
  "In progress",
  "Looking for builders",
  "Just launched",
  "Launched",
];
const arts = ["photo", "cad", "audio", "canvas", "notes", "video"];
const choice = (value, values, name) => {
  if (!values.includes(value)) fail(400, `Invalid ${name}.`);
  return value;
};
const writable = [
  "name",
  "description",
  "details",
  "repo",
  "category",
  "tags",
  "needs",
  "status",
  "art",
];
const now = () => new Date().toISOString();

export function createApp(options = {}) {
  const production =
    options.production ?? process.env.NODE_ENV === "production";
  const publicUrl =
    options.publicUrl ?? process.env.PUBLIC_URL ?? "http://localhost:5173";
  let origin;
  try {
    const u = new URL(publicUrl);
    origin = u.origin;
    if (
      production &&
      (u.protocol !== "https:" ||
        (!process.env.PUBLIC_URL && !options.publicUrl))
    )
      throw Error();
  } catch {
    throw new Error("Production requires an HTTPS PUBLIC_URL.");
  }
  const allowedOrigins = new Set([origin]);
  const configuredOrigin = new URL(origin);
  if (
    !production &&
    ["localhost", "127.0.0.1"].includes(configuredOrigin.hostname)
  ) {
    configuredOrigin.hostname =
      configuredOrigin.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowedOrigins.add(configuredOrigin.origin);
  }
  const operatorName = options.operatorName ?? process.env.OPERATOR_NAME ?? "";
  const contactEmail = options.contactEmail ?? process.env.CONTACT_EMAIL ?? "";
  if (
    typeof operatorName !== "string" ||
    operatorName !== operatorName.trim() ||
    operatorName.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(operatorName)
  )
    throw new Error(
      "OPERATOR_NAME must contain 1–120 characters without control characters.",
    );
  if (
    typeof contactEmail !== "string" ||
    (contactEmail !== "" &&
      (contactEmail.length > 254 ||
        !/^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(
          contactEmail,
        )))
  )
    throw new Error("CONTACT_EMAIL must be a valid contact email address.");
  if (production && (!operatorName || !contactEmail))
    throw new Error("Production requires OPERATOR_NAME and CONTACT_EMAIL.");
  const db =
    options.db ??
    openDatabase(
      options.dbPath ??
        process.env.DATABASE_PATH ??
        resolve(process.env.DATA_DIR ?? "data", "commons.sqlite"),
    );
  const app = express();
  app.locals.db = db;
  app.locals.close = () => db.close();
  app.disable("x-powered-by");
  if (options.trustProxy ?? process.env.TRUST_PROXY === "1")
    app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
  app.use(express.json({ limit: "32kb" }), cookieParser());
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const atomic = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const publicUser = (u) =>
    u
      ? {
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          bio: u.bio,
          skills: JSON.parse(u.skills),
          website: u.website,
          createdAt: u.created_at,
          projectCount: Number(
            get(
              "SELECT COUNT(*) n FROM projects WHERE owner_id=? AND hidden=0",
              u.id,
            ).n,
          ),
        }
      : null;
  const privateUser = (u) => ({ ...publicUser(u), role: u.role });
  const project = (p, viewer) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    details: p.details,
    repo: p.repo,
    category: p.category,
    tags: JSON.parse(p.tags),
    needs: p.needs,
    status: p.status,
    art: p.art,
    letter: p.letter,
    author: p.author,
    ownerId: p.owner_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    stars: Number(
      get(
        "SELECT COUNT(*) n FROM bookmarks b JOIN users u ON u.id=b.user_id WHERE project_id=? AND u.suspended=0",
        p.id,
      ).n,
    ),
    contributors:
      Number(
        get(
          "SELECT COUNT(*) n FROM memberships m JOIN users u ON u.id=m.user_id WHERE project_id=? AND u.suspended=0",
          p.id,
        ).n,
      ) +
      (p.owner_id &&
      !get("SELECT suspended FROM users WHERE id=?", p.owner_id)?.suspended
        ? 1
        : 0),
    saved: !!(
      viewer &&
      get(
        "SELECT 1 FROM bookmarks WHERE project_id=? AND user_id=?",
        p.id,
        viewer.id,
      )
    ),
    joined: !!(
      viewer &&
      (viewer.id === p.owner_id ||
        get(
          "SELECT 1 FROM memberships WHERE project_id=? AND user_id=?",
          p.id,
          viewer.id,
        ))
    ),
    membershipRole:
      viewer?.id === p.owner_id
        ? "Owner"
        : viewer
          ? (get(
              "SELECT role FROM memberships WHERE project_id=? AND user_id=?",
              p.id,
              viewer.id,
            )?.role ?? "")
          : "",
    featured: !!p.featured,
    external: !!p.external,
  });
  const visible = (id) => {
    const p = get(
      "SELECT p.* FROM projects p LEFT JOIN users u ON u.id=p.owner_id WHERE p.id=? AND p.hidden=0 AND (u.id IS NULL OR u.suspended=0)",
      id,
    );
    if (!p) fail(404, "Project not found.", "NOT_FOUND");
    return p;
  };
  const owner = (p, u) => {
    if (p.owner_id !== u.id && u.role !== "admin")
      fail(403, "Only the owner can change this project.", "FORBIDDEN");
  };
  const message = (m) => ({
    id: m.id,
    projectId: m.project_id,
    text: m.text,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    author: publicUser(get("SELECT * FROM users WHERE id=?", m.user_id)),
  });
  const sessionCookie = production ? "__Host-commons" : "commons";
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
  };
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      req.body !== undefined &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return res.status(400).json({
        error: "Request body must be a JSON object.",
        code: "INVALID_REQUEST",
      });
    req.body ??= {};
    const token = req.cookies[sessionCookie];
    if (token) {
      const s = get(
        "SELECT * FROM sessions WHERE token=? AND expires>?",
        hash(token),
        Date.now(),
      );
      if (s) {
        const u = get(
          "SELECT * FROM users WHERE id=? AND suspended=0",
          s.user_id,
        );
        if (u) {
          req.user = u;
          req.session = s;
        }
      }
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("Origin") && !allowedOrigins.has(req.get("Origin")))
        return res.status(403).json({
          error: "Request origin is not allowed.",
          code: "ORIGIN_REJECTED",
        });
      if (req.user && req.get("X-CSRF-Token") !== req.session.csrf)
        return res.status(403).json({
          error: "Refresh your session and try again.",
          code: "CSRF_REJECTED",
        });
    }
    next();
  });
  const requireUser = (req, res, next) => {
    if (!req.user)
      return res
        .status(401)
        .json({ error: "Sign in to continue.", code: "UNAUTHENTICATED" });
    next();
  };
  const admin = (req, res, next) => {
    if (req.user?.role !== "admin")
      return res
        .status(403)
        .json({ error: "Administrator access required.", code: "FORBIDDEN" });
    next();
  };
  const limiter = (limit, windowMs) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res) =>
        res.status(429).json({
          error: "Too many requests. Try again later.",
          code: "RATE_LIMITED",
        }),
    });
  app.use("/api", limiter(options.rateLimit ?? 300, 60_000));
  const authLimiter = limiter(options.authRateLimit ?? 30, 15 * 60_000);
  const startSession = (u, res) => {
    run("DELETE FROM sessions WHERE expires<?", Date.now());
    const token = secret(),
      csrfToken = secret();
    run(
      "INSERT INTO sessions VALUES(?,?,?,?)",
      hash(token),
      u.id,
      csrfToken,
      Date.now() + 7 * 86400_000,
    );
    res.cookie(sessionCookie, token, {
      ...cookieOptions,
      maxAge: 7 * 86400_000,
    });
    return { user: privateUser(u), csrfToken };
  };
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/api/site", (req, res) => res.json({ operatorName, contactEmail }));
  app.get("/api/auth/session", (req, res) =>
    res.json({
      user: req.user ? privateUser(req.user) : null,
      csrfToken: req.session?.csrf ?? null,
    }),
  );
  app.post("/api/auth/register", authLimiter, (req, res) => {
    const username = string(req.body.username, "Username", 30, 3).toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(username))
      fail(
        400,
        "Username may contain letters, numbers, hyphens and underscores.",
      );
    const display = string(req.body.displayName, "Display name", 80, 1),
      pw = password(req.body.password);
    if (get("SELECT 1 FROM users WHERE username=?", username))
      fail(409, "Username is unavailable.", "USERNAME_UNAVAILABLE");
    const id = randomUUID(),
      recoveryCode = secret();
    run(
      "INSERT INTO users(id,username,display_name,password,recovery,created_at) VALUES(?,?,?,?,?,?)",
      id,
      username,
      display,
      passwordHash(pw),
      hash(recoveryCode),
      now(),
    );
    if (req.session)
      run("DELETE FROM sessions WHERE token=?", req.session.token);
    res.status(201).json({
      ...startSession(get("SELECT * FROM users WHERE id=?", id), res),
      recoveryCode,
    });
  });
  app.post("/api/auth/login", authLimiter, (req, res) => {
    const username = string(req.body.username, "Username", 30, 1).toLowerCase(),
      pw = credential(req.body.password, "Password");
    const u = get("SELECT * FROM users WHERE username=?", username);
    const authenticated = matches(pw, u?.password ?? dummyPassword);
    if (!u || !authenticated || u.suspended)
      fail(401, "Username or password is incorrect.", "AUTH_FAILED");
    if (req.session)
      run("DELETE FROM sessions WHERE token=?", req.session.token);
    res.json(startSession(u, res));
  });
  app.post("/api/auth/logout", (req, res) => {
    if (req.session)
      run("DELETE FROM sessions WHERE token=?", req.session.token);
    res.clearCookie(sessionCookie, cookieOptions).json({ ok: true });
  });
  app.post("/api/auth/recover", authLimiter, (req, res) => {
    const username = string(req.body.username, "Username", 30, 1).toLowerCase(),
      code = string(req.body.recoveryCode, "Recovery code", 200, 1),
      pw = password(req.body.password);
    const u = get("SELECT * FROM users WHERE username=?", username);
    if (
      !u ||
      u.suspended ||
      !timingSafeEqual(Buffer.from(hash(code)), Buffer.from(u.recovery))
    )
      fail(401, "Recovery details are incorrect.", "AUTH_FAILED");
    const recoveryCode = secret();
    atomic(() => {
      run(
        "UPDATE users SET password=?,recovery=? WHERE id=?",
        passwordHash(pw),
        hash(recoveryCode),
        u.id,
      );
      run("DELETE FROM sessions WHERE user_id=?", u.id);
    });
    res
      .clearCookie(sessionCookie, cookieOptions)
      .json({ ok: true, recoveryCode });
  });
  app.post("/api/auth/password", authLimiter, requireUser, (req, res) => {
    const current = credential(req.body.currentPassword, "Current password"),
      pw = password(req.body.password);
    if (!matches(current, req.user.password))
      fail(401, "Current password is incorrect.", "AUTH_FAILED");
    atomic(() => {
      run(
        "UPDATE users SET password=? WHERE id=?",
        passwordHash(pw),
        req.user.id,
      );
      run(
        "DELETE FROM sessions WHERE user_id=? AND token<>?",
        req.user.id,
        req.session.token,
      );
    });
    res.json({ ok: true });
  });
  app.patch("/api/me", requireUser, (req, res) => {
    const u = req.user;
    const display =
        req.body.displayName === undefined
          ? u.display_name
          : string(req.body.displayName, "Display name", 80, 1),
      bio =
        req.body.bio === undefined ? u.bio : string(req.body.bio, "Bio", 2000),
      skills =
        req.body.skills === undefined
          ? JSON.parse(u.skills)
          : list(req.body.skills, "Skills", 10, 40),
      website =
        req.body.website === undefined
          ? u.website
          : url(req.body.website, "Website", true);
    run(
      "UPDATE users SET display_name=?,bio=?,skills=?,website=? WHERE id=?",
      display,
      bio,
      JSON.stringify(skills),
      website,
      u.id,
    );
    res.json({
      user: privateUser(get("SELECT * FROM users WHERE id=?", u.id)),
    });
  });
  app.delete("/api/me", requireUser, (req, res) => {
    if (!matches(credential(req.body.password, "Password"), req.user.password))
      fail(401, "Password is incorrect.", "AUTH_FAILED");
    if (
      req.user.role === "admin" &&
      get("SELECT COUNT(*) n FROM users WHERE role='admin' AND suspended=0")
        .n <= 1
    )
      fail(409, "Promote another administrator before deleting this account.");
    run("DELETE FROM users WHERE id=?", req.user.id);
    res.clearCookie(sessionCookie, cookieOptions).json({ ok: true });
  });
  const projectInput = (body, existing) => {
    const data = {};
    for (const key of Object.keys(body))
      if (!writable.includes(key))
        fail(400, `Unsupported project field: ${key}.`);
    for (const key of writable)
      data[key] = body[key] === undefined ? existing?.[key] : body[key];
    return {
      name: string(data.name, "Name", 80, 1),
      description: string(data.description, "Description", 300, 1),
      details: string(data.details ?? "", "Details", 10000),
      repo: url(data.repo, "Repository"),
      category: choice(data.category, categories, "category"),
      tags: list(data.tags ?? [], "Tags", 5, 30),
      needs: string(data.needs ?? "", "Needs", 1000),
      status: choice(data.status ?? "In progress", statuses, "status"),
      art: choice(data.art ?? "canvas", arts, "art"),
    };
  };
  app.get("/api/projects", (req, res) =>
    res.json({
      projects: all(
        "SELECT p.* FROM projects p LEFT JOIN users u ON u.id=p.owner_id WHERE p.hidden=0 AND (u.id IS NULL OR u.suspended=0) ORDER BY p.created_at DESC",
      ).map((p) => project(p, req.user)),
    }),
  );
  app.get("/api/projects/:id", (req, res) => {
    const p = visible(req.params.id),
      members = all(
        "SELECT u.* FROM users u JOIN memberships m ON u.id=m.user_id WHERE m.project_id=? AND u.suspended=0",
        p.id,
      );
    if (p.owner_id)
      members.unshift(get("SELECT * FROM users WHERE id=?", p.owner_id));
    res.json({
      project: project(p, req.user),
      members: members.map((u) => ({
        ...publicUser(u),
        role:
          u.id === p.owner_id
            ? "Owner"
            : (get(
                "SELECT role FROM memberships WHERE user_id=? AND project_id=?",
                u.id,
                p.id,
              )?.role ?? ""),
      })),
    });
  });
  app.post("/api/projects", requireUser, (req, res) => {
    const d = projectInput(req.body),
      id = randomUUID(),
      date = now();
    run(
      "INSERT INTO projects(id,owner_id,author,name,description,details,repo,category,tags,needs,status,art,letter,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      req.user.id,
      req.user.username,
      d.name,
      d.description,
      d.details,
      d.repo,
      d.category,
      JSON.stringify(d.tags),
      d.needs,
      d.status,
      d.art,
      d.name[0].toUpperCase(),
      date,
      date,
    );
    res.status(201).json({ project: project(visible(id), req.user) });
  });
  app.patch("/api/projects/:id", requireUser, (req, res) => {
    const p = visible(req.params.id);
    owner(p, req.user);
    const d = projectInput(req.body, { ...p, tags: JSON.parse(p.tags) });
    run(
      "UPDATE projects SET name=?,description=?,details=?,repo=?,category=?,tags=?,needs=?,status=?,art=?,letter=?,updated_at=? WHERE id=?",
      d.name,
      d.description,
      d.details,
      d.repo,
      d.category,
      JSON.stringify(d.tags),
      d.needs,
      d.status,
      d.art,
      d.name[0].toUpperCase(),
      now(),
      p.id,
    );
    res.json({ project: project(visible(p.id), req.user) });
  });
  app.delete("/api/projects/:id", requireUser, (req, res) => {
    const p = visible(req.params.id);
    owner(p, req.user);
    run("DELETE FROM projects WHERE id=?", p.id);
    res.json({ ok: true });
  });
  app.put("/api/projects/:id/save", requireUser, (req, res) => {
    const p = visible(req.params.id);
    if (bool(req.body.saved, "Saved"))
      run("INSERT OR IGNORE INTO bookmarks VALUES(?,?)", req.user.id, p.id);
    else
      run(
        "DELETE FROM bookmarks WHERE user_id=? AND project_id=?",
        req.user.id,
        p.id,
      );
    res.json({ project: project(p, req.user) });
  });
  app.put("/api/projects/:id/join", requireUser, (req, res) => {
    const p = visible(req.params.id),
      joined = bool(req.body.joined, "Joined"),
      role = string(req.body.role ?? "", "Role", 80);
    if (p.external) fail(409, "Curated references do not accept memberships.");
    if (req.user.id === p.owner_id) {
      if (!joined) fail(409, "The owner cannot leave their project.");
    } else if (joined)
      run(
        "INSERT INTO memberships VALUES(?,?,?) ON CONFLICT(user_id,project_id) DO UPDATE SET role=excluded.role",
        req.user.id,
        p.id,
        role,
      );
    else
      run(
        "DELETE FROM memberships WHERE user_id=? AND project_id=?",
        req.user.id,
        p.id,
      );
    res.json({ project: project(p, req.user) });
  });
  app.get("/api/projects/:id/messages", (req, res) => {
    const p = visible(req.params.id);
    res.json({
      messages: all(
        "SELECT m.* FROM messages m JOIN users u ON u.id=m.user_id WHERE project_id=? AND u.suspended=0 ORDER BY m.created_at ASC",
        p.id,
      ).map(message),
    });
  });
  app.post("/api/projects/:id/messages", requireUser, (req, res) => {
    const p = visible(req.params.id),
      text = string(req.body.text, "Message", 3000, 1),
      id = randomUUID(),
      date = now();
    run(
      "INSERT INTO messages VALUES(?,?,?,?,?,?)",
      id,
      p.id,
      req.user.id,
      text,
      date,
      date,
    );
    res
      .status(201)
      .json({ message: message(get("SELECT * FROM messages WHERE id=?", id)) });
  });
  app.delete("/api/messages/:id", requireUser, (req, res) => {
    const m = get("SELECT * FROM messages WHERE id=?", req.params.id);
    if (!m) fail(404, "Message not found.", "NOT_FOUND");
    if (req.user.role !== "admin") {
      const p = visible(m.project_id);
      if (m.user_id !== req.user.id) owner(p, req.user);
    }
    run("DELETE FROM messages WHERE id=?", m.id);
    res.json({ ok: true });
  });
  app.get("/api/builders", (req, res) =>
    res.json({
      builders: all(
        "SELECT * FROM users WHERE suspended=0 ORDER BY created_at DESC",
      ).map(publicUser),
    }),
  );
  app.get("/api/builders/:username", (req, res) => {
    const u = get(
      "SELECT * FROM users WHERE username=? AND suspended=0",
      req.params.username.toLowerCase(),
    );
    if (!u) fail(404, "Builder not found.", "NOT_FOUND");
    res.json({
      builder: publicUser(u),
      projects: all(
        "SELECT * FROM projects WHERE owner_id=? AND hidden=0 ORDER BY created_at DESC",
        u.id,
      ).map((p) => project(p, req.user)),
    });
  });
  app.post("/api/reports", requireUser, (req, res) => {
    const { projectId, messageId } = req.body;
    if (!!projectId === !!messageId)
      fail(400, "Choose exactly one report target.");
    const reason = string(req.body.reason, "Reason", 2000, 1);
    if (projectId) visible(string(projectId, "Project", 100, 1));
    if (messageId) {
      const m = get(
        "SELECT m.* FROM messages m JOIN users u ON u.id=m.user_id WHERE m.id=? AND u.suspended=0",
        string(messageId, "Message", 100, 1),
      );
      if (!m) fail(404, "Message not found.", "NOT_FOUND");
      visible(m.project_id);
    }
    run(
      "INSERT INTO reports(id,project_id,message_id,user_id,reason,created_at) VALUES(?,?,?,?,?,?)",
      randomUUID(),
      projectId ?? null,
      messageId ?? null,
      req.user.id,
      reason,
      now(),
    );
    res.status(201).json({ ok: true });
  });
  app.use("/api/admin", requireUser, admin);
  app.get("/api/admin/reports", (req, res) =>
    res.json({
      reports: all("SELECT * FROM reports ORDER BY created_at DESC").map(
        (r) => {
          const reportedMessage = r.message_id
            ? get("SELECT * FROM messages WHERE id=?", r.message_id)
            : null;
          const reportedProject = get(
            "SELECT * FROM projects WHERE id=?",
            r.project_id ?? reportedMessage?.project_id ?? "",
          );
          return {
            id: r.id,
            projectId: r.project_id ?? undefined,
            messageId: r.message_id ?? undefined,
            reason: r.reason,
            createdAt: r.created_at,
            resolved: !!r.resolved,
            reporter: publicUser(
              get("SELECT * FROM users WHERE id=?", r.user_id ?? ""),
            ),
            message: reportedMessage
              ? {
                  id: reportedMessage.id,
                  text: reportedMessage.text,
                  author: publicUser(
                    get(
                      "SELECT * FROM users WHERE id=?",
                      reportedMessage.user_id,
                    ),
                  ),
                  projectId: reportedMessage.project_id,
                }
              : null,
            project: reportedProject
              ? {
                  id: reportedProject.id,
                  name: reportedProject.name,
                  hidden: !!reportedProject.hidden,
                }
              : null,
          };
        },
      ),
    }),
  );
  app.patch("/api/admin/reports/:id", (req, res) => {
    const resolved = bool(req.body.resolved, "Resolved");
    if (
      !run("UPDATE reports SET resolved=? WHERE id=?", +resolved, req.params.id)
        .changes
    )
      fail(404, "Report not found.", "NOT_FOUND");
    res.json({ ok: true });
  });
  app.get("/api/admin/projects", (req, res) =>
    res.json({
      projects: all("SELECT * FROM projects ORDER BY created_at DESC").map(
        (p) => ({ ...project(p, req.user), hidden: !!p.hidden }),
      ),
    }),
  );
  app.patch("/api/admin/projects/:id", (req, res) => {
    const p = get("SELECT * FROM projects WHERE id=?", req.params.id);
    if (!p) fail(404, "Project not found.", "NOT_FOUND");
    const hidden =
        req.body.hidden === undefined
          ? !!p.hidden
          : bool(req.body.hidden, "Hidden"),
      featured =
        req.body.featured === undefined
          ? !!p.featured
          : bool(req.body.featured, "Featured");
    run(
      "UPDATE projects SET hidden=?,featured=?,updated_at=? WHERE id=?",
      +hidden,
      +featured,
      now(),
      p.id,
    );
    res.json({
      project: {
        ...project(get("SELECT * FROM projects WHERE id=?", p.id), req.user),
        hidden,
      },
    });
  });
  app.get("/api/admin/users", (req, res) =>
    res.json({
      users: all("SELECT * FROM users ORDER BY created_at DESC").map((u) => ({
        ...privateUser(u),
        suspended: !!u.suspended,
      })),
    }),
  );
  app.patch("/api/admin/users/:id", (req, res) => {
    const u = get("SELECT * FROM users WHERE id=?", req.params.id),
      suspended = bool(req.body.suspended, "Suspended");
    if (!u) fail(404, "User not found.", "NOT_FOUND");
    if (
      suspended &&
      (u.id === req.user.id ||
        (u.role === "admin" &&
          get("SELECT COUNT(*) n FROM users WHERE role='admin' AND suspended=0")
            .n <= 1))
    )
      fail(409, "Cannot suspend yourself or the last administrator.");
    atomic(() => {
      run("UPDATE users SET suspended=? WHERE id=?", +suspended, u.id);
      if (suspended) run("DELETE FROM sessions WHERE user_id=?", u.id);
    });
    res.json({ ok: true });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found.", code: "NOT_FOUND" }),
  );
  const dist = options.distPath ?? resolve("dist");
  if (existsSync(resolve(dist, "index.html"))) {
    app.use(
      express.static(dist, { index: false, maxAge: production ? "1h" : 0 }),
    );
    app.get("/{*path}", (req, res) =>
      res.sendFile(resolve(dist, "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    if (error.status)
      res
        .status(error.status)
        .json({ error: error.message, code: error.code ?? "INVALID_REQUEST" });
    else {
      if (!options.quiet) console.error(error);
      res.status(500).json({
        error: "The server could not complete this request.",
        code: "INTERNAL_ERROR",
      });
    }
  });
  return app;
}
