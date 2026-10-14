import React, { useState } from "react";
import {
  Copy,
  Check,
  Flag,
  Trash2,
  ArrowRight,
  GitBranch,
  Newspaper,
} from "lucide-react";
import { api, dateLabel } from "../api.js";
import { ErrorMessage, useAction } from "./Forms.jsx";

export function ClaimProject({ project, user, onLogin, refresh, notify }) {
  const action = useAction();
  const [claim, setClaim] = useState(null);
  const [copied, setCopied] = useState(false);
  if (!project.claimable) return null;
  return (
    <section className="claim-panel settings-panel">
      <h2>
        <GitBranch size={20} /> Maintain this repository?
      </h2>
      <p>
        Claim this listing to manage it and coordinate work here. Commons checks
        a one-time proof file on the repository’s default branch. You need
        permission to commit to that branch.
      </p>
      <ErrorMessage error={action.error} />
      {!user ? (
        <button className="secondary" onClick={onLogin}>
          Sign in to claim
        </button>
      ) : !claim ? (
        <button
          className="secondary"
          disabled={action.busy}
          onClick={() =>
            action.run(async () =>
              setClaim(
                await api(`/projects/${project.id}/claim`, { method: "POST" }),
              ),
            )
          }
        >
          {action.busy ? "Preparing…" : "Start repository verification"}{" "}
          <ArrowRight size={16} />
        </button>
      ) : (
        <>
          <ol>
            <li>
              Create this file in the repository:{" "}
              <code className="claim-path">{claim.path}</code>
            </li>
            <li>
              Paste the exact contents below, then commit to the default branch.
            </li>
            <li>
              Choose Verify repository. After success, you can remove the proof
              file.
            </li>
          </ol>
          <pre className="claim-proof">{claim.proof}</pre>
          <p className="form-note">
            This challenge belongs to your Commons account and expires{" "}
            {new Date(claim.expiresAt).toLocaleString()}. Verification
            establishes repository write access.
          </p>
          <div className="detail-actions">
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(claim.proof);
                  setCopied(true);
                } catch {
                  notify("Select and copy the proof text above.");
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy proof"}
            </button>
            <button
              className="primary"
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await api(`/projects/${project.id}/claim/verify`, {
                    method: "POST",
                    body: { claimId: claim.claimId },
                  });
                  await refresh();
                  notify("Repository verified. You now manage this project.");
                })
              }
            >
              {action.busy ? "Checking repository…" : "Verify repository"}
            </button>
          </div>
          <button
            className="text-link"
            disabled={action.busy}
            onClick={() => {
              setClaim(null);
              action.setError("");
            }}
          >
            Discard this challenge
          </button>
        </>
      )}
    </section>
  );
}
export function ProjectUpdates({
  project,
  updates,
  user,
  owner,
  load,
  onReport,
  notify,
}) {
  const action = useAction();
  const [deleting, setDeleting] = useState(null);
  const canPost = !project.external && user && (project.joined || owner);
  return (
    <section className="project-updates">
      {canPost && (
        <form
          className="settings-panel update-composer"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              body = Object.fromEntries(new FormData(form));
            action.run(async () => {
              await api(`/projects/${project.id}/updates`, {
                method: "POST",
                body,
              });
              form.reset();
              await load();
              notify("Progress update published.");
            });
          }}
        >
          <h2>Share progress</h2>
          <p>What changed, what did you learn, and where could someone help?</p>
          <ErrorMessage error={action.error} />
          <label>
            Update title
            <input
              name="title"
              required
              maxLength={120}
              placeholder="A first working prototype"
            />
          </label>
          <label>
            Your update
            <textarea
              name="body"
              required
              maxLength={5000}
              rows={6}
              placeholder="Tell the team what’s moving forward…"
            />
          </label>
          <button className="primary" disabled={action.busy}>
            {action.busy ? "Publishing…" : "Publish update"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
      {!canPost && (
        <p className="form-note">
          {project.external
            ? "Repository maintainers can publish progress after claiming this listing."
            : "Project collaborators can publish updates. Join the project to share your progress."}
        </p>
      )}
      {!canPost && <ErrorMessage error={action.error} />}
      <div className="updates-list">
        {updates.map((update) => (
          <article
            className="update-card"
            key={update.id}
            id={`update-${update.id}`}
          >
            <div className="update-meta">
              <span>{update.author.displayName}</span>
              <time dateTime={update.createdAt}>
                {dateLabel(update.createdAt)}
              </time>
            </div>
            <h2>{update.title}</h2>
            <p className="long-copy">{update.body}</p>
            <div className="owner-actions">
              <button onClick={() => onReport({ updateId: update.id })}>
                <Flag size={14} /> Report update
              </button>
              {user && (owner || user.id === update.author.id) && (
                <button
                  disabled={action.busy}
                  onClick={() => setDeleting(update.id)}
                >
                  <Trash2 size={14} /> Delete update
                </button>
              )}
            </div>
            {deleting === update.id && (
              <div className="delete-confirm">
                <p>Remove this update and its activity entry?</p>
                <button className="secondary" onClick={() => setDeleting(null)}>
                  Keep update
                </button>
                <button
                  className="danger-text"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      await api(`/updates/${update.id}`, { method: "DELETE" });
                      setDeleting(null);
                      await load();
                      notify("Update removed.");
                    })
                  }
                >
                  Remove update
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!updates.length && (
        <div className="empty compact">
          <Newspaper size={28} />
          <h3>No progress updates yet.</h3>
          <p>Small discoveries and working prototypes belong here, too.</p>
        </div>
      )}
    </section>
  );
}
