import React, { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { api, categories, statuses } from "../api.js";

export function ErrorMessage({ error }) {
  return error ? (
    <div className="error-message" role="alert">
      <AlertCircle size={17} />
      <span>{error}</span>
    </div>
  ) : null;
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
function RecoveryKey({ code, onDone }) {
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  const download = () => {
    const blob = new Blob(
      [
        `Commons recovery key\n\n${code}\n\nKeep this key private. It can reset your password. It is shown only once.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commons-recovery-key.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <span className="eyebrow">
        <KeyRound size={14} /> KEEP THIS SOMEWHERE SAFE
      </span>
      <h2>Your recovery key.</h2>
      <p className="form-intro">
        This key lets you reset your password. We don’t send recovery emails.
        It’s shown only once, and anyone with it can access your account.
      </p>
      <div className="recovery-code">
        <code>{code}</code>
      </div>
      <div className="detail-actions">
        <button
          className="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
          {copied ? "Copied" : "Copy key"}
        </button>
        <button className="secondary" onClick={download}>
          <Download size={16} /> Save key
        </button>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />{" "}
        I saved my recovery key somewhere private.
      </label>
      <button className="primary" disabled={!ack} onClick={onDone}>
        Continue to Commons <ArrowRight size={16} />
      </button>
    </>
  );
}
export function AuthForm({
  mode,
  onMode,
  onSession,
  onDone,
  onRecoveryChange,
}) {
  const action = useAction();
  const [recovery, setRecovery] = useState(null);
  const rememberRecovery = (code) => {
    setRecovery(code);
    onRecoveryChange?.(true);
  };
  if (recovery)
    return (
      <RecoveryKey
        code={recovery}
        onDone={() => {
          onRecoveryChange?.(false);
          onDone();
        }}
      />
    );
  const register = mode === "register",
    recover = mode === "recover";
  return (
    <>
      <span className="eyebrow">THERE’S A PLACE FOR YOU HERE</span>
      <h2>
        {register
          ? "Join the commons."
          : recover
            ? "Find your way back."
            : "Welcome back."}
      </h2>
      <p className="form-intro">
        {register
          ? "Meet fellow builders and make something worth sharing."
          : recover
            ? "Use the private recovery key you saved when you joined."
            : "Sign in to save projects and join the work."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          action.run(async () => {
            const result = await api(
              `/auth/${register ? "register" : recover ? "recover" : "login"}`,
              { method: "POST", body: data },
            );
            if (recover) {
              rememberRecovery(result.recoveryCode);
              return;
            }
            onSession(result);
            if (register) rememberRecovery(result.recoveryCode);
            else await onDone();
          });
        }}
      >
        <ErrorMessage error={action.error} />
        {register && (
          <label>
            Display name
            <input
              name="displayName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="What should we call you?"
            />
          </label>
        )}
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_-]+"
            placeholder="yourname"
            autoCapitalize="none"
            spellCheck="false"
          />
          <small>3–30 letters, numbers, underscores, or hyphens.</small>
        </label>
        {recover && (
          <label>
            Recovery key
            <input
              name="recoveryCode"
              required
              autoComplete="off"
              placeholder="Your private recovery key"
              spellCheck="false"
            />
          </label>
        )}
        <label>
          {recover ? "New password" : "Password"}
          <input
            name="password"
            type="password"
            required
            minLength={register || recover ? 12 : 1}
            maxLength={128}
            autoComplete={
              register || recover ? "new-password" : "current-password"
            }
          />
          {(register || recover) && (
            <small>At least 12 characters. A passphrase works well.</small>
          )}
        </label>
        {register && (
          <p className="form-note">
            By joining, you agree to the{" "}
            <a href="/terms" target="_blank" rel="noreferrer">
              Terms
            </a>{" "}
            and{" "}
            <a href="/guidelines" target="_blank" rel="noreferrer">
              Community Guidelines
            </a>
            . We store your account and the content you share as described in
            our{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Privacy page
            </a>
            .
          </p>
        )}
        <button disabled={action.busy} className="primary" type="submit">
          {action.busy
            ? "Please wait…"
            : register
              ? "Create account"
              : recover
                ? "Reset password"
                : "Sign in"}{" "}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="auth-links">
        {!register && (
          <button onClick={() => onMode("register")}>
            New here? Create an account
          </button>
        )}
        {!recover && (
          <button onClick={() => onMode("recover")}>
            Forgot your password?
          </button>
        )}
        {mode !== "login" && (
          <button onClick={() => onMode("login")}>Back to sign in</button>
        )}
      </div>
    </>
  );
}
export function ProjectForm({ project, onSuccess }) {
  const action = useAction();
  const editing = Boolean(project);
  return (
    <>
      <span className="eyebrow">MAKE ROOM FOR YOUR IDEA</span>
      <h2>{editing ? "Keep the commons updated." : "Share a project."}</h2>
      <p className="form-intro">
        Share your own open-source work. Tell people what’s possible and where
        they can help.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          data.tags = data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          action.run(async () => {
            const result = await api(
              editing ? `/projects/${project.id}` : "/projects",
              { method: editing ? "PATCH" : "POST", body: data },
            );
            await onSuccess(result.project);
          });
        }}
      >
        <ErrorMessage error={action.error} />
        <label>
          Project name
          <input
            name="name"
            defaultValue={project?.name}
            required
            maxLength={80}
            placeholder="What are you building?"
          />
        </label>
        <label>
          Source repository
          <input
            name="repo"
            type="url"
            defaultValue={project?.repo}
            required
            pattern="https://.*"
            placeholder="https://github.com/you/project"
          />
          <small>Use an HTTPS link to your public source code.</small>
        </label>
        <label>
          A short introduction
          <textarea
            name="description"
            defaultValue={project?.description}
            required
            maxLength={300}
            placeholder="What does it do? What makes it worth rebuilding?"
          />
        </label>
        <label>
          The story and next steps
          <textarea
            name="details"
            defaultValue={project?.details}
            maxLength={10000}
            className="tall-textarea"
            placeholder="What works already? What are you building next? How can someone contribute?"
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              name="category"
              defaultValue={project?.category || categories[0]}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              name="status"
              defaultValue={project?.status || "Looking for builders"}
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Tags
          <input
            name="tags"
            defaultValue={project?.tags?.join(", ")}
            maxLength={150}
            placeholder="Rust, Design, Local-first"
          />
          <small>Up to five tags, separated by commas.</small>
        </label>
        <label>
          Who are you looking for?
          <textarea
            name="needs"
            defaultValue={project?.needs}
            required
            maxLength={1000}
            placeholder="Developers, designers, testers… Tell them how they can help."
          />
        </label>
        <label>
          Project illustration
          <select name="art" defaultValue={project?.art || "canvas"}>
            {[
              ["canvas", "Design canvas"],
              ["photo", "Photo editor"],
              ["cad", "Engineering"],
              ["audio", "Music studio"],
              ["notes", "Notes workspace"],
              ["video", "Video editor"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button disabled={action.busy} className="primary">
          {action.busy ? "Saving…" : editing ? "Save changes" : "Share project"}{" "}
          <ArrowUpRight size={16} />
        </button>
      </form>
    </>
  );
}
export function ReportForm({ target, onDone }) {
  const action = useAction();
  return (
    <>
      <span className="eyebrow">HELP KEEP THIS PLACE GOOD</span>
      <h2>Report content.</h2>
      <p className="form-intro">
        Tell the moderators what needs attention. Your report is private.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const reason = new FormData(e.currentTarget).get("reason");
          action.run(async () => {
            await api("/reports", {
              method: "POST",
              body: { ...target, reason },
            });
            await onDone();
          });
        }}
      >
        <ErrorMessage error={action.error} />
        <label>
          What’s the concern?
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={2000}
            placeholder="Spam, harassment, licensing concerns, or something else…"
          />
        </label>
        <button disabled={action.busy} className="primary">
          {action.busy ? "Sending…" : "Send report"} <ArrowRight size={16} />
        </button>
      </form>
    </>
  );
}
export function JoinForm({ project, onDone }) {
  const action = useAction();
  return (
    <>
      <span className="eyebrow">LET’S BUILD SOMETHING</span>
      <h2>Join {project.name}.</h2>
      <p className="form-intro">
        Let the team know how you’d like to help. Joining records your interest
        here; introduce yourself in the discussion, too.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const role = new FormData(e.currentTarget).get("role");
          action.run(async () => {
            await api(`/projects/${project.id}/join`, {
              method: "PUT",
              body: { joined: true, role },
            });
            await onDone();
          });
        }}
      >
        <ErrorMessage error={action.error} />
        <label>
          How would you like to contribute?
          <input
            name="role"
            required
            maxLength={80}
            placeholder="Design, Rust development, testing…"
          />
        </label>
        <button disabled={action.busy} className="primary">
          {action.busy ? "Joining…" : "Join project"} <ArrowRight size={16} />
        </button>
      </form>
    </>
  );
}
export function ConfirmForm({
  title,
  description,
  label = "Confirm",
  onConfirm,
  password = false,
}) {
  const action = useAction();
  return (
    <>
      <span className="eyebrow">ONE LAST CHECK</span>
      <h2>{title}</h2>
      <p className="form-intro">{description}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const pass = new FormData(e.currentTarget).get("password");
          action.run(() => onConfirm(pass));
        }}
      >
        <ErrorMessage error={action.error} />
        {password && (
          <label>
            Confirm your password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
        )}
        <button disabled={action.busy} className="primary danger">
          {action.busy ? "Please wait…" : label}
        </button>
      </form>
    </>
  );
}
