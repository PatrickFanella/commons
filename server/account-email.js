import { createMailer } from "./mail.js";

export function installAccountEmail(app, context, config) {
  const {
    db,
    get,
    run,
    atomic,
    requireUser,
    authLimiter,
    fail,
    string,
    password,
    credential,
    matches,
    passwordHash,
    privateUser,
    hash,
    secret,
    publicUrl,
    sessionCookie,
    cookieOptions,
  } = context;
  const mail = createMailer(db, config);
  const email = (value) => {
    const result = string(value, "Email", 254, 1).toLowerCase();
    if (
      !/^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(
        result,
      )
    )
      fail(400, "Enter a valid email address.");
    return result;
  };
  const configured = () => {
    if (!mail.enabled)
      fail(
        503,
        "Account email is not available yet. You can still use your recovery key.",
        "EMAIL_UNAVAILABLE",
      );
  };
  const issue = (userId, recipient, purpose) => {
    const previous = get(
      "SELECT * FROM auth_tokens WHERE user_id=? AND purpose=?",
      userId,
      purpose,
    );
    if (previous && previous.created_at > Date.now() - 60_000) return false;
    run(
      "DELETE FROM auth_tokens WHERE user_id=? AND purpose=?",
      userId,
      purpose,
    );
    const token = secret(),
      tokenHash = hash(token);
    const expires =
      Date.now() + (purpose === "verify" ? 24 * 3600_000 : 30 * 60_000);
    run(
      "INSERT INTO auth_tokens VALUES(?,?,?,?,?,?)",
      tokenHash,
      userId,
      purpose,
      recipient,
      Date.now(),
      expires,
    );
    const link = `${publicUrl}/${purpose === "verify" ? "verify-email" : "reset-password"}#token=${token}`;
    mail.enqueue(
      tokenHash,
      recipient,
      purpose === "verify"
        ? "Verify your Commons email"
        : "Reset your Commons password",
      purpose === "verify"
        ? `Confirm your private account email for Commons:\n\n${link}\n\nThis link expires in 24 hours. Open it and choose Verify email. If you did not request this, ignore this message.\n\nCommons — ${publicUrl}`
        : `You requested a new Commons password:\n\n${link}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this message. Your password has not changed.\n\nCommons — ${publicUrl}`,
    );
    return true;
  };
  app.put("/api/me/email", authLimiter, requireUser, (req, res) => {
    if (!matches(credential(req.body.password, "Password"), req.user.password))
      fail(401, "Password is incorrect.", "AUTH_FAILED");
    if (req.body.email === "") {
      atomic(() => {
        run(
          "UPDATE users SET email=NULL,pending_email=NULL WHERE id=?",
          req.user.id,
        );
        run("DELETE FROM auth_tokens WHERE user_id=?", req.user.id);
      });
    } else {
      configured();
      const address = email(req.body.email);
      if (address !== req.user.email) {
        atomic(() => {
          const previous = get(
            "SELECT created_at FROM auth_tokens WHERE user_id=? AND purpose='verify'",
            req.user.id,
          );
          if (previous && previous.created_at > Date.now() - 60_000)
            fail(
              429,
              "Wait a minute before requesting another verification email.",
              "RATE_LIMITED",
            );
          run(
            "UPDATE users SET pending_email=? WHERE id=?",
            address,
            req.user.id,
          );
          issue(req.user.id, address, "verify");
        });
      }
    }
    res.json({
      user: privateUser(get("SELECT * FROM users WHERE id=?", req.user.id)),
    });
  });
  app.post("/api/me/email/resend", authLimiter, requireUser, (req, res) => {
    configured();
    if (!req.user.pending_email)
      fail(409, "There is no email awaiting verification.");
    if (!atomic(() => issue(req.user.id, req.user.pending_email, "verify")))
      fail(
        429,
        "Wait a minute before requesting another verification email.",
        "RATE_LIMITED",
      );
    res.json({ ok: true });
  });
  const tokenRecord = (req, purpose) => {
    const token = string(req.body.token, "Link", 200, 1);
    const record = get(
      "SELECT t.* FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=? AND t.purpose=? AND t.expires>? AND u.suspended=0",
      hash(token),
      purpose,
      Date.now(),
    );
    if (!record)
      fail(
        400,
        "This link is invalid or has expired. Request a new one.",
        "INVALID_TOKEN",
      );
    return record;
  };
  app.post("/api/auth/verify-email", authLimiter, (req, res) => {
    const record = tokenRecord(req, "verify");
    const u = get("SELECT * FROM users WHERE id=?", record.user_id);
    if (
      u.pending_email !== record.email ||
      get("SELECT 1 FROM users WHERE email=? AND id<>?", record.email, u.id)
    )
      fail(
        409,
        "This address could not be verified. Use another address in Settings.",
        "EMAIL_CONFLICT",
      );
    atomic(() => {
      run(
        "UPDATE users SET email=?,pending_email=NULL WHERE id=?",
        record.email,
        u.id,
      );
      run("DELETE FROM auth_tokens WHERE user_id=?", u.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/auth/request-reset", authLimiter, (req, res) => {
    configured();
    const address = email(req.body.email);
    const u = get("SELECT * FROM users WHERE email=? AND suspended=0", address);
    if (u) atomic(() => issue(u.id, address, "reset"));
    res.json({ ok: true });
  });
  app.post("/api/auth/reset-password", authLimiter, (req, res) => {
    const record = tokenRecord(req, "reset");
    const pw = password(req.body.password);
    const u = get("SELECT * FROM users WHERE id=?", record.user_id);
    if (u.email !== record.email)
      fail(
        400,
        "This link is invalid or has expired. Request a new one.",
        "INVALID_TOKEN",
      );
    const recoveryCode = secret();
    atomic(() => {
      run(
        "UPDATE users SET password=?,recovery=? WHERE id=?",
        passwordHash(pw),
        hash(recoveryCode),
        u.id,
      );
      run("DELETE FROM auth_tokens WHERE user_id=?", u.id);
      run("DELETE FROM sessions WHERE user_id=?", u.id);
    });
    res
      .clearCookie(sessionCookie, cookieOptions)
      .json({ ok: true, recoveryCode });
  });
  return mail;
}
