import { randomUUID } from "node:crypto";
import { repositoryInfo, readClaimProof } from "./repository.js";

export function installCommunity(app, ctx, options = {}) {
  const {
    get,
    all,
    run,
    atomic,
    visible,
    requireUser,
    authLimiter,
    fail,
    string,
    publicUser,
    hash,
    secret,
    now,
    publicUrl,
  } = ctx;
  const record = (projectId, userId, kind, messageId = null, updateId = null) =>
    run(
      "INSERT INTO activity(project_id,user_id,kind,message_id,update_id,created_at) VALUES(?,?,?,?,?,?)",
      projectId,
      userId,
      kind,
      messageId,
      updateId,
      now(),
    );
  const updateDTO = (u) => ({
    id: u.id,
    projectId: u.project_id,
    title: u.title,
    body: u.body,
    createdAt: u.created_at,
    author: publicUser(get("SELECT * FROM users WHERE id=?", u.user_id)),
  });
  app.get("/api/activity", (req, res) => {
    const before =
      req.query.before === undefined
        ? Number.MAX_SAFE_INTEGER
        : Number(req.query.before);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    const scope = req.query.scope ?? "all";
    if (
      !Number.isSafeInteger(before) ||
      before < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      !["all", "mine"].includes(scope)
    )
      fail(400, "Invalid activity pagination or scope.");
    if (scope === "mine" && !req.user)
      fail(401, "Sign in to see your projects' activity.", "UNAUTHENTICATED");
    const rows = all(
      `SELECT a.*,p.name project_name,p.external,u.id actor_id,m.text message_text,up.title update_title,up.body update_body FROM activity a JOIN projects p ON p.id=a.project_id JOIN users u ON u.id=a.user_id LEFT JOIN users owner ON owner.id=p.owner_id LEFT JOIN messages m ON m.id=a.message_id LEFT JOIN messages parent ON parent.id=m.parent_id LEFT JOIN users parent_user ON parent_user.id=parent.user_id LEFT JOIN project_updates up ON up.id=a.update_id WHERE a.id<? AND p.hidden=0 AND u.suspended=0 AND (owner.id IS NULL OR owner.suspended=0) AND (parent_user.id IS NULL OR parent_user.suspended=0) AND (a.kind<>'member_joined' OR EXISTS(SELECT 1 FROM memberships WHERE user_id=a.user_id AND project_id=p.id)) AND (?='all' OR p.owner_id=? OR EXISTS(SELECT 1 FROM memberships WHERE project_id=p.id AND user_id=?)) ORDER BY a.id DESC LIMIT ?`,
      before,
      scope,
      req.user?.id ?? null,
      req.user?.id ?? null,
      limit + 1,
    );
    const items = rows.slice(0, limit).map((r) => ({
      id: r.id,
      kind: r.kind,
      createdAt: r.created_at,
      actor: publicUser(get("SELECT * FROM users WHERE id=?", r.actor_id)),
      project: {
        id: r.project_id,
        name: r.project_name,
        external: !!r.external,
      },
      messageId: r.message_id,
      updateId: r.update_id,
      title: r.update_title ?? null,
      excerpt: (r.message_text ?? r.update_body ?? "").slice(0, 280),
    }));
    res.json({
      activity: items,
      nextCursor: rows.length > limit ? items.at(-1).id : null,
    });
  });
  app.get("/api/projects/:id/updates", (req, res) => {
    const p = visible(req.params.id);
    res.json({
      updates: all(
        "SELECT up.* FROM project_updates up JOIN users u ON u.id=up.user_id WHERE project_id=? AND u.suspended=0 ORDER BY up.created_at DESC,up.id DESC",
        p.id,
      ).map(updateDTO),
    });
  });
  app.post("/api/projects/:id/updates", requireUser, (req, res) => {
    const p = visible(req.params.id);
    if (p.external)
      fail(409, "Claim this reference before publishing project updates.");
    if (
      p.owner_id !== req.user.id &&
      req.user.role !== "admin" &&
      !get(
        "SELECT 1 FROM memberships WHERE project_id=? AND user_id=?",
        p.id,
        req.user.id,
      )
    )
      fail(403, "Join this project before publishing an update.", "FORBIDDEN");
    const title = string(req.body.title, "Title", 120, 1),
      body = string(req.body.body, "Update", 5000, 1),
      id = randomUUID();
    atomic(() => {
      run(
        "INSERT INTO project_updates VALUES(?,?,?,?,?,?)",
        id,
        p.id,
        req.user.id,
        title,
        body,
        now(),
      );
      record(p.id, req.user.id, "update_posted", null, id);
    });
    res.status(201).json({
      update: updateDTO(get("SELECT * FROM project_updates WHERE id=?", id)),
    });
  });
  app.delete("/api/updates/:id", requireUser, (req, res) => {
    const up = get("SELECT * FROM project_updates WHERE id=?", req.params.id);
    if (!up) fail(404, "Update not found.", "NOT_FOUND");
    if (req.user.role !== "admin") {
      const p = visible(up.project_id);
      if (up.user_id !== req.user.id && p.owner_id !== req.user.id)
        fail(
          403,
          "Only the author or project owner can delete this update.",
          "FORBIDDEN",
        );
    }
    run("DELETE FROM project_updates WHERE id=?", up.id);
    res.json({ ok: true });
  });
  app.post("/api/projects/:id/claim", authLimiter, requireUser, (req, res) => {
    const p = visible(req.params.id);
    if (!p.external || p.owner_id)
      fail(409, "This project already has an owner.");
    if (!repositoryInfo(p.repo))
      fail(
        409,
        "Automatic claims support GitHub and SUBCULT Gitea repository URLs.",
      );
    const previous = get(
      "SELECT * FROM repository_claims WHERE project_id=? AND user_id=?",
      p.id,
      req.user.id,
    );
    if (previous && previous.created_at > Date.now() - 60_000)
      fail(
        429,
        "Wait a minute before creating another claim challenge.",
        "RATE_LIMITED",
      );
    const id = randomUUID(),
      expires = Date.now() + 24 * 3600_000;
    const proof = `commons-site:${publicUrl}\nproject:${p.id}\naccount:${req.user.id}\nkey:${secret()}`;
    atomic(() => {
      run(
        "DELETE FROM repository_claims WHERE expires<=? OR (project_id=? AND user_id=?)",
        Date.now(),
        p.id,
        req.user.id,
      );
      run(
        "INSERT INTO repository_claims VALUES(?,?,?,?,?,?,?)",
        id,
        p.id,
        req.user.id,
        p.repo,
        hash(proof),
        expires,
        Date.now(),
      );
    });
    res.status(201).json({
      claimId: id,
      path: `.commons/claims/${id}.txt`,
      proof,
      expiresAt: new Date(expires).toISOString(),
    });
  });
  app.post(
    "/api/projects/:id/claim/verify",
    authLimiter,
    requireUser,
    async (req, res) => {
      const p = visible(req.params.id);
      if (!p.external || p.owner_id)
        fail(409, "This project already has an owner.");
      const claimId = string(req.body.claimId, "Claim", 36, 36);
      const claim = get(
        "SELECT * FROM repository_claims WHERE id=? AND project_id=? AND user_id=? AND expires>?",
        claimId,
        p.id,
        req.user.id,
        Date.now(),
      );
      if (!claim || claim.repo !== p.repo)
        fail(
          400,
          "This claim expired or the repository changed. Start a new claim.",
          "INVALID_CLAIM",
        );
      let proof;
      try {
        proof = await readClaimProof(p.repo, claimId, options.repositoryFetch);
      } catch (error) {
        fail(
          error.message === "PROVIDER_UNAVAILABLE" ? 502 : 409,
          "Could not verify the proof file. Check its path, contents, and the repository's default branch, then try again.",
          "PROOF_UNVERIFIED",
        );
      }
      if (hash(proof) !== claim.proof_hash)
        fail(
          409,
          "The proof file does not match this account's challenge.",
          "PROOF_UNVERIFIED",
        );
      atomic(() => {
        const current = visible(p.id);
        const user = get(
          "SELECT * FROM users WHERE id=? AND suspended=0",
          req.user.id,
        );
        if (
          !user ||
          !get(
            "SELECT 1 FROM sessions WHERE token=? AND expires>?",
            req.session.token,
            Date.now(),
          )
        )
          fail(
            401,
            "Sign in again before claiming this project.",
            "UNAUTHENTICATED",
          );
        if (!current.external || current.owner_id)
          fail(409, "Another maintainer has already claimed this project.");
        if (
          current.repo !== claim.repo ||
          !get(
            "SELECT 1 FROM repository_claims WHERE id=? AND expires>?",
            claim.id,
            Date.now(),
          )
        )
          fail(
            400,
            "This claim has expired or changed. Start a new claim.",
            "INVALID_CLAIM",
          );
        run(
          "UPDATE projects SET owner_id=?,author=?,external=0,repository_verified=1,updated_at=? WHERE id=?",
          user.id,
          user.username,
          now(),
          p.id,
        );
        run("DELETE FROM repository_claims WHERE project_id=?", p.id);
        record(p.id, user.id, "project_claimed");
      });
      res.json({ ok: true });
    },
  );
  return { record };
}
