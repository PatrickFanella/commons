import React, { useEffect, useState } from "react";
import {
  Shield,
  Flag,
  EyeOff,
  Eye,
  Check,
  Users,
  Star,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { api, dateLabel } from "../api.js";
import { ErrorMessage, useAction } from "./Forms.jsx";
export default function AdminPage({ user, navigate, refresh, notify }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Reports"),
    [loading, setLoading] = useState(true);
  const action = useAction();
  async function load() {
    setError("");
    try {
      const [r, p, u, mail] = await Promise.all([
        api("/admin/reports"),
        api("/admin/projects"),
        api("/admin/users"),
        api("/admin/email"),
      ]);
      setData({
        reports: r.reports,
        projects: p.projects,
        users: u.users,
        mail,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user?.id]);
  if (user?.role !== "admin")
    return (
      <div className="empty">
        <Shield size={32} />
        <h1>Moderator workspace.</h1>
        <p>This page is for community administrators.</p>
        <button className="primary" onClick={() => navigate("/")}>
          Back to the community
        </button>
      </div>
    );
  const mutate = (path, body) =>
    action.run(async () => {
      await api(path, { method: "PATCH", body });
      await load();
      await refresh();
      notify("Moderation update saved.");
    });
  return (
    <>
      <div className="page-heading admin-heading">
        <div>
          <span className="eyebrow">CARE FOR THE COMMUNITY</span>
          <h1>Moderation.</h1>
          <p>Review reports, manage content, and keep participation healthy.</p>
        </div>
        <button className="secondary" onClick={load}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <ErrorMessage error={error || action.error} />
      <div className="detail-tabs">
        {["Reports", "Projects", "Members", "Email"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Reports" && data
              ? ` (${data.reports.filter((r) => !r.resolved).length})`
              : ""}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="loading">Loading moderation workspace…</div>
      ) : (
        data && (
          <div className="moderation-list">
            {tab === "Email" ? (
              <section className="settings-panel">
                <h2>Account email</h2>
                <p>
                  {data.mail.configured
                    ? "Brevo is configured."
                    : "Brevo is not configured. Email features are disabled."}
                </p>
                <p>
                  Queued: {data.mail.counts.queued || 0} · Accepted by Brevo:{" "}
                  {data.mail.counts.sent || 0} · Failed:{" "}
                  {data.mail.counts.failed || 0}
                </p>
                {data.mail.errors?.map((error) => (
                  <p key={error.code}>
                    Provider error: {error.code} ({error.count})
                  </p>
                ))}
                <p>
                  Provider acceptance does not confirm inbox delivery. These
                  counts cover unexpired account links; old records are removed
                  automatically.
                </p>
              </section>
            ) : tab === "Reports" ? (
              data.reports.length ? (
                data.reports.map((r) => (
                  <article key={r.id} className={r.resolved ? "resolved" : ""}>
                    <div className="moderation-title">
                      <Flag size={17} />
                      <strong>
                        {r.updateId
                          ? "Progress update report"
                          : r.messageId
                            ? "Discussion report"
                            : "Project report"}
                      </strong>
                      <span>{r.resolved ? "Resolved" : "Open"}</span>
                    </div>
                    <p className="long-copy">{r.reason}</p>
                    {r.project && (
                      <div className="report-context">
                        <strong>Project: {r.project.name}</strong>
                        <small>
                          {r.project.hidden
                            ? "Hidden from public view"
                            : "Published"}
                        </small>
                      </div>
                    )}
                    {r.message && (
                      <div className="report-context">
                        <strong>
                          Reported message by @
                          {r.message.author?.username || "deleted account"}
                        </strong>
                        <p className="long-copy">{r.message.text}</p>
                      </div>
                    )}
                    {r.update && (
                      <div className="report-context">
                        <strong>Reported update: {r.update.title}</strong>
                        <p className="long-copy">{r.update.body}</p>
                      </div>
                    )}
                    <small>
                      Reported by {r.reporter?.username || "deleted account"} ·{" "}
                      {dateLabel(r.createdAt)}
                    </small>
                    <div className="moderation-actions">
                      {r.projectId && (
                        <>
                          <button
                            className="secondary"
                            onClick={() => navigate(`/projects/${r.projectId}`)}
                          >
                            View project <ExternalLink size={13} />
                          </button>
                          <button
                            disabled={action.busy}
                            className="secondary"
                            onClick={() =>
                              mutate(`/admin/projects/${r.projectId}`, {
                                hidden: true,
                              })
                            }
                          >
                            <EyeOff size={14} />
                            Hide project
                          </button>
                        </>
                      )}
                      {r.updateId && (
                        <button
                          className="secondary"
                          disabled={action.busy}
                          onClick={() =>
                            action.run(async () => {
                              await api(`/updates/${r.updateId}`, {
                                method: "DELETE",
                              });
                              await load();
                              notify("Update removed.");
                            })
                          }
                        >
                          Remove update
                        </button>
                      )}
                      {r.messageId && (
                        <button
                          disabled={action.busy}
                          className="secondary"
                          onClick={() =>
                            action.run(async () => {
                              await api(`/messages/${r.messageId}`, {
                                method: "DELETE",
                              });
                              await load();
                              notify("Message removed.");
                            })
                          }
                        >
                          Remove message
                        </button>
                      )}
                      <button
                        disabled={action.busy}
                        className="secondary"
                        onClick={() =>
                          mutate(`/admin/reports/${r.id}`, {
                            resolved: !r.resolved,
                          })
                        }
                      >
                        <Check size={14} />
                        {r.resolved ? "Reopen" : "Mark resolved"}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty">
                  <Check size={30} />
                  <h3>No reports to review.</h3>
                  <p>Member reports will appear here.</p>
                </div>
              )
            ) : tab === "Projects" ? (
              data.projects.length ? (
                data.projects.map((p) => (
                  <article key={p.id}>
                    <div className="moderation-title">
                      <strong>{p.name}</strong>
                      <span>{p.hidden ? "Hidden" : "Published"}</span>
                    </div>
                    <p>
                      by {p.author} · {p.category}
                    </p>
                    <div className="moderation-actions">
                      <button
                        disabled={action.busy}
                        className="secondary"
                        onClick={() =>
                          mutate(`/admin/projects/${p.id}`, {
                            hidden: !p.hidden,
                          })
                        }
                      >
                        {p.hidden ? <Eye size={14} /> : <EyeOff size={14} />}{" "}
                        {p.hidden ? "Publish" : "Hide"}
                      </button>
                      <button
                        disabled={action.busy}
                        className="secondary"
                        onClick={() =>
                          mutate(`/admin/projects/${p.id}`, {
                            featured: !p.featured,
                          })
                        }
                      >
                        <Star size={14} />
                        {p.featured ? "Unfeature" : "Feature"}
                      </button>
                      {!p.hidden && (
                        <button
                          className="secondary"
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          View project
                        </button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty">
                  <p>No projects yet.</p>
                </div>
              )
            ) : (
              data.users.map((u) => (
                <article key={u.id}>
                  <div className="moderation-title">
                    <Users size={17} />
                    <strong>{u.displayName}</strong>
                    <span>{u.suspended ? "Suspended" : u.role}</span>
                  </div>
                  <p>
                    @{u.username} · Joined {dateLabel(u.createdAt)}
                  </p>
                  <button
                    disabled={action.busy || u.id === user.id}
                    className="secondary"
                    onClick={() =>
                      mutate(`/admin/users/${u.id}`, {
                        suspended: !u.suspended,
                      })
                    }
                  >
                    {u.suspended ? "Restore access" : "Suspend member"}
                  </button>
                </article>
              ))
            )}
          </div>
        )
      )}
    </>
  );
}
