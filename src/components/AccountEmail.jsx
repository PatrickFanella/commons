import React, { useEffect, useState } from "react";
import { Mail, ArrowRight, Check } from "lucide-react";
import { api, setCsrf } from "../api.js";
import { ErrorMessage, RecoveryKey, useAction } from "./Forms.jsx";

export function EmailSettings({ user, enabled, onRefresh, notify }) {
  const action = useAction();
  return (
    <section className="settings-panel">
      <h2>
        <Mail size={18} /> Private account email
      </h2>
      <p>
        Add a verified address for password recovery. It stays off your public
        profile. Account messages only; no newsletter signup.
      </p>
      {user.email && (
        <p className="email-status">
          <Check size={16} /> Verified: {user.email}
        </p>
      )}
      {user.pendingEmail && (
        <p className="email-status">
          Awaiting verification: {user.pendingEmail}
        </p>
      )}
      {!enabled && (
        <p className="reference-notice">
          Email is not available yet. Keep your recovery key somewhere private.
        </p>
      )}
      <form
        key={`${user.id}:${user.pendingEmail || user.email || ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            body = Object.fromEntries(new FormData(form));
          action.run(async () => {
            await api("/me/email", { method: "PUT", body });
            form.reset();
            await onRefresh();
            notify(
              body.email
                ? "Verification requested. Check your inbox and spam folder."
                : "Account email removed.",
            );
          });
        }}
      >
        <ErrorMessage error={action.error} />
        <label>
          Email address
          <input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={user.pendingEmail || user.email || ""}
            autoComplete="email"
          />
          <small>
            Leave empty to remove your account email and pending verification.
          </small>
        </label>
        <label>
          Current password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <button
          className="secondary"
          disabled={
            action.busy || (!enabled && !user.email && !user.pendingEmail)
          }
        >
          {action.busy ? "Saving…" : "Save email"}
        </button>
        {enabled && user.pendingEmail && (
          <button
            type="button"
            className="text-link"
            disabled={action.busy}
            onClick={() =>
              action.run(async () => {
                await api("/me/email/resend", { method: "POST" });
                notify("Verification requested. Check your inbox.");
              })
            }
          >
            Resend verification
          </button>
        )}
      </form>
    </section>
  );
}
export function RequestResetForm({ onMode }) {
  const action = useAction();
  const [requested, setRequested] = useState(false);
  return (
    <>
      <span className="eyebrow">A WAY BACK IN</span>
      <h2>Reset by email.</h2>
      <p className="form-intro">
        Use the address you verified in your account settings.
      </p>
      {requested ? (
        <p role="status">
          If this address belongs to an account with verified email, a reset
          link has been requested. Check your inbox and spam folder. The link
          expires in 30 minutes.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(e.currentTarget));
            action.run(async () => {
              await api("/auth/request-reset", { method: "POST", body });
              setRequested(true);
            });
          }}
        >
          <ErrorMessage error={action.error} />
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <button className="primary" disabled={action.busy}>
            {action.busy ? "Requesting…" : "Request reset link"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
      <div className="auth-links">
        <button onClick={() => onMode("recover")}>
          Use a recovery key instead
        </button>
        <button onClick={() => onMode("login")}>Back to sign in</button>
      </div>
    </>
  );
}
export function EmailLinkPage({ mode, navigate, refresh, onRecoveryChange }) {
  const action = useAction();
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || "",
  );
  const [done, setDone] = useState(false);
  const [recovery, setRecovery] = useState(null);
  useEffect(() => {
    const consumeLink = () => {
      const value = new URLSearchParams(location.hash.slice(1)).get("token");
      if (!value || recovery) return;
      setToken(value);
      setDone(false);
      action.setError("");
      history.replaceState(history.state, "", location.pathname);
    };
    consumeLink();
    window.addEventListener("hashchange", consumeLink);
    return () => window.removeEventListener("hashchange", consumeLink);
  }, [recovery]);
  const verifying = mode === "verify-email";
  if (recovery)
    return (
      <section className="settings-panel email-link-panel">
        <RecoveryKey
          code={recovery}
          onDone={() => {
            onRecoveryChange(false);
            setRecovery(null);
            navigate("/");
          }}
        />
      </section>
    );
  return (
    <section className="settings-panel email-link-panel">
      <span className="eyebrow">YOUR ACCOUNT, YOUR CONTROL</span>
      <h1>{verifying ? "Verify your email." : "Choose a new password."}</h1>
      {done ? (
        <>
          <p role="status">
            Your email is verified. You can now request password-reset links.
          </p>
          <button className="primary" onClick={() => navigate("/settings")}>
            Profile & account <ArrowRight size={16} />
          </button>
        </>
      ) : !token ? (
        <>
          <p>
            This link is missing its private token. Open the full link from your
            email, or request a new one.
          </p>
          <button className="secondary" onClick={() => navigate("/settings")}>
            Go to account settings
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            action.run(async () => {
              const result = await api(
                `/auth/${verifying ? "verify-email" : "reset-password"}`,
                { method: "POST", body: { ...fields, token } },
              );
              if (verifying) {
                setDone(true);
                await refresh();
              } else {
                setCsrf(null);
                onRecoveryChange(true);
                setRecovery(result.recoveryCode);
                await refresh();
              }
            });
          }}
        >
          <p>
            {verifying
              ? "Confirm this address for private account recovery."
              : "This signs out all sessions and replaces your recovery key. Save the new key after resetting."}
          </p>
          <ErrorMessage error={action.error} />
          {!verifying && (
            <label>
              New password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
          )}
          <button className="primary" disabled={action.busy}>
            {action.busy
              ? "Please wait…"
              : verifying
                ? "Verify email"
                : "Reset password"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </section>
  );
}
