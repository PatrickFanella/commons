import { randomUUID } from "node:crypto";

export function createMailer(db, config = {}) {
  const apiKey = config.apiKey ?? process.env.BREVO_API_KEY ?? "";
  const sender = config.sender ?? process.env.BREVO_SENDER_EMAIL ?? "";
  const senderName =
    config.senderName ?? process.env.BREVO_SENDER_NAME ?? "Commons";
  const enabled = Boolean(apiKey && sender);
  if (
    enabled &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender) || /[\r\n]/.test(senderName))
  )
    throw new Error("Brevo sender configuration is invalid.");
  const transport = config.fetch ?? fetch;
  let processing = null;
  let timer;
  function enqueue(token, recipient, subject, body) {
    db.prepare(
      "INSERT INTO mail_outbox(id,token,recipient,subject,body,next_attempt) VALUES(?,?,?,?,?,?)",
    ).run(randomUUID(), token, recipient, subject, body, Date.now());
  }
  async function drain() {
    db.prepare("DELETE FROM auth_tokens WHERE expires<=?").run(Date.now());
    if (!enabled) return;
    const rows = db
      .prepare(
        "SELECT o.* FROM mail_outbox o JOIN auth_tokens t ON t.token=o.token JOIN users u ON u.id=t.user_id WHERE o.status='queued' AND o.next_attempt<=? AND u.suspended=0 ORDER BY o.next_attempt LIMIT 10",
      )
      .all(Date.now());
    for (const row of rows) {
      // A password change or email replacement may invalidate a queued token.
      if (
        !db
          .prepare("SELECT 1 FROM auth_tokens WHERE token=? AND expires>?")
          .get(row.token, Date.now())
      )
        continue;
      let error = "TRANSPORT",
        providerId = null,
        retry = true;
      try {
        const response = await transport(
          "https://api.brevo.com/v3/smtp/email",
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
            headers: {
              "api-key": apiKey,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: senderName, email: sender },
              to: [{ email: row.recipient }],
              subject: row.subject,
              textContent: row.body,
              tags: ["commons-account"],
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (typeof data.messageId === "string")
            providerId = data.messageId.slice(0, 300);
          else error = "INVALID_RESPONSE";
        } else {
          error = `HTTP_${response.status}`;
          retry = response.status === 429 || response.status >= 500;
        }
      } catch {
        /* Provider exceptions may include credentials or recipient data. */
      }
      if (providerId)
        db.prepare(
          "UPDATE mail_outbox SET status='sent',body='',recipient='',provider_id=?,attempts=attempts+1,last_error=NULL WHERE id=?",
        ).run(providerId, row.id);
      else {
        const attempts = row.attempts + 1;
        const failed = !retry || attempts >= 5;
        db.prepare(
          "UPDATE mail_outbox SET attempts=?,status=?,next_attempt=?,last_error=?,body=CASE WHEN ? THEN '' ELSE body END,recipient=CASE WHEN ? THEN '' ELSE recipient END WHERE id=?",
        ).run(
          attempts,
          failed ? "failed" : "queued",
          Date.now() + Math.min(60_000 * 2 ** (attempts - 1), 3600_000),
          error,
          failed ? 1 : 0,
          failed ? 1 : 0,
          row.id,
        );
      }
    }
  }
  function processQueue() {
    if (!processing)
      processing = drain().finally(() => {
        processing = null;
      });
    return processing;
  }
  return {
    enabled,
    enqueue,
    process: processQueue,
    status: () => ({
      configured: enabled,
      errors: db
        .prepare(
          "SELECT last_error code,COUNT(*) count FROM mail_outbox WHERE last_error IS NOT NULL GROUP BY last_error",
        )
        .all(),
      counts: Object.fromEntries(
        db
          .prepare("SELECT status,COUNT(*) n FROM mail_outbox GROUP BY status")
          .all()
          .map((r) => [r.status, r.n]),
      ),
    }),
    start() {
      if (timer) return;
      const tick = () =>
        processQueue().catch(() =>
          console.error("Commons mail queue processing failed."),
        );
      timer = setInterval(tick, 10_000);
      timer.unref();
      tick();
    },
    async stop() {
      clearInterval(timer);
      timer = null;
      if (processing) await processing;
    },
  };
}
