import { ClaimProject, ProjectUpdates } from "./ProjectCommunity.jsx";
import React, { useEffect, useState, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Star,
  Users,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Compass,
  Plus,
  Check,
  ExternalLink,
  Github,
  Flag,
  Trash2,
  Pencil,
  MessageSquare,
  Copy,
} from "lucide-react";
import { api, categories, dateLabel } from "../api.js";
import { Avatar, WorldArt, ProjectArt } from "./Art.jsx";
import { Mark } from "./Mark.jsx";
import { ErrorMessage, useAction } from "./Forms.jsx";
export function ProjectCard({ project: p, navigate, onSave }) {
  return (
    <article className="project-card">
      <button
        className="art-button"
        aria-label={"Open " + p.name}
        onClick={() => navigate(`/projects/${p.id}`)}
      >
        <ProjectArt type={p.art} />
        {p.featured && (
          <span className="featured-label">
            <Star size={11} /> Featured
          </span>
        )}
        <span
          className={
            "status-badge " +
            (p.status === "Looking for builders" ? "looking" : "")
          }
        >
          <span />
          {p.status}
        </span>
      </button>
      <div className="card-body">
        <div className="card-title">
          <button onClick={() => navigate(`/projects/${p.id}`)}>
            <span className={"project-icon " + p.art}>
              {p.letter || p.name[0]}
            </span>
            <h3>{p.name}</h3>
            <ArrowUpRight size={16} />
          </button>
          <button
            className={"save-button " + (p.saved ? "saved" : "")}
            aria-label={(p.saved ? "Unsave " : "Save ") + p.name}
            onClick={() => onSave(p)}
          >
            <Bookmark size={18} fill={p.saved ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="byline">
          {p.external ? "Curated reference" : "by"}{" "}
          <button
            onClick={() =>
              p.external
                ? navigate(`/projects/${p.id}`)
                : navigate(`/builders/${p.author}`)
            }
          >
            {p.author}
          </button>
        </div>
        <p>{p.description}</p>
        <div className="tags">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="card-footer">
          <span title="Community bookmarks">
            <Star size={14} />
            {p.stars}
          </span>
          <span title="Community collaborators">
            <Users size={14} />
            {p.contributors}
          </span>
          <button
            className="card-open"
            onClick={() => navigate(`/projects/${p.id}`)}
          >
            Explore <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function ProjectsPage({
  page,
  projects,
  user,
  category,
  setCategory,
  navigate,
  onShare,
  onSave,
  onLogin,
}) {
  const [filter, setFilter] = useState("Trending"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("Popular");
  useEffect(() => {
    setFilter("Trending");
    setQuery("");
  }, [page]);
  useEffect(() => {
    const shortcut = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector('[aria-label="Search projects"]')?.focus();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  const visible = projects
    .filter(
      (p) =>
        (category === "All projects" || p.category === category) &&
        (page !== "saved" || p.saved) &&
        (page !== "mine" || p.ownerId === user?.id || p.joined) &&
        (filter !== "Looking for builders" ||
          p.status === "Looking for builders") &&
        `${p.name} ${p.description} ${p.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "A–Z"
        ? a.name.localeCompare(b.name)
        : filter === "Newest" || sort === "Newest"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : Number(b.featured) - Number(a.featured) ||
            b.stars - a.stars ||
            new Date(b.createdAt) - new Date(a.createdAt),
    );
  if (page !== "explore" && !user)
    return (
      <div className="empty">
        <Bookmark size={32} />
        <h1>
          {page === "saved"
            ? "Keep your discoveries close."
            : "Your corner of the commons."}
        </h1>
        <p>
          Sign in to see{" "}
          {page === "saved"
            ? "your saved projects"
            : "projects you share and join"}
          .
        </p>
        <button className="primary" onClick={onLogin}>
          Sign in <ArrowRight size={16} />
        </button>
      </div>
    );
  return (
    <>
      {page === "explore" && (
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              BUILT IN THE OPEN
            </div>
            <h1>
              Big ideas.
              <br />
              Built together.
            </h1>
            <p>
              A home for people rebuilding what’s possible. <br />
              Discover open projects, find your people, and get building.
            </p>
            <button className="primary" onClick={onShare}>
              Share your project <ArrowUpRight size={17} />
            </button>
            <div className="hero-community">
              <Mark size={20} />
              <span>Independent builders. Shared possibilities.</span>
            </div>
          </div>
          <WorldArt />
          <span className="hero-footnote">SHARED GROUND. KEPT TOGETHER.</span>
        </section>
      )}
      <section className="projects-section">
        <div className="section-heading">
          <div>
            <h2>
              {page === "explore"
                ? "Discover your next rabbit hole."
                : page === "saved"
                  ? "Your next rabbit holes."
                  : "Your corner of the commons."}
            </h2>
            <p>
              {page === "explore"
                ? "Familiar ideas. Fresh starts. Entirely open."
                : page === "saved"
                  ? "Projects you want to come back to."
                  : "Projects you shared or joined."}
            </p>
          </div>
          <div className="sample-label">
            <span />
            Built in the open
          </div>
        </div>
        <div className="project-toolbar">
          <div className="tabs">
            {["Trending", "Newest", "Looking for builders"].map((t) => (
              <button
                key={t}
                className={filter === t ? "selected" : ""}
                onClick={() => setFilter(t)}
              >
                {t === "Trending" && <Sparkles size={14} />} {t}
                {t === "Looking for builders" && <span className="tab-dot" />}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search projects"
              placeholder="Search projects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span>{/Mac/.test(navigator.platform) ? "⌘ K" : "Ctrl K"}</span>
          </label>
        </div>
        <div className="result-bar">
          <div>
            <button
              className={
                "filter-chip " + (category === "All projects" ? "active" : "")
              }
              onClick={() => setCategory("All projects")}
            >
              All projects
            </button>
            {category !== "All projects" && (
              <button
                className="filter-chip active"
                onClick={() => setCategory("All projects")}
              >
                {category} ×
              </button>
            )}
            <span>
              {visible.length} {visible.length === 1 ? "project" : "projects"}{" "}
              to explore
            </span>
          </div>
          <label className="sort">
            <SlidersHorizontal size={14} />
            <select
              aria-label="Sort projects"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option>Popular</option>
              <option>Newest</option>
              <option>A–Z</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
        <div className="mobile-categories">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>All projects</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="project-grid">
          {visible.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              navigate={navigate}
              onSave={onSave}
            />
          ))}
        </div>
        {!visible.length && (
          <div className="empty">
            <Compass size={32} />
            <h3>
              {query ? "No projects found" : "A little room for possibility."}
            </h3>
            <p>
              {query || category !== "All projects"
                ? "Try another search or category."
                : page === "explore"
                  ? "Be one of the first to share what you’re building."
                  : "Save, join, or share a project to see it here."}
            </p>
            <button
              className="primary"
              onClick={
                query || category !== "All projects"
                  ? () => {
                      setQuery("");
                      setCategory("All projects");
                      setFilter("Trending");
                    }
                  : page === "explore"
                    ? onShare
                    : () => navigate("/")
              }
            >
              {query || category !== "All projects"
                ? "Clear filters"
                : page === "explore"
                  ? "Share a project"
                  : "Explore projects"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="bottom-invite">
          <Mark size={20} />
          <span>The next great open project could be yours.</span>
          <button onClick={onShare}>
            Let’s build it <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </>
  );
}
export function ProjectPage({
  id,
  user,
  navigate,
  onSave,
  onJoin,
  onEdit,
  onDelete,
  onReport,
  onLogin,
  notify,
  refresh,
  revision,
}) {
  const [data, setData] = useState(null),
    [messages, setMessages] = useState([]),
    [updates, setUpdates] = useState([]),
    [replyTo, setReplyTo] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("Overview");
  const action = useAction();
  const request = useRef(0),
    controller = useRef(null);
  async function load() {
    const seq = ++request.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setError("");
    try {
      const [d, m, u] = await Promise.all([
        api(`/projects/${encodeURIComponent(id)}`, { signal: current.signal }),
        api(`/projects/${encodeURIComponent(id)}/messages`, {
          signal: current.signal,
        }),
        api(`/projects/${encodeURIComponent(id)}/updates`, {
          signal: current.signal,
        }),
      ]);
      if (seq === request.current) {
        setData(d);
        setMessages(m.messages);
        setUpdates(u.updates);
        setReplyTo((previous) =>
          previous && m.messages.some((message) => message.id === previous.id)
            ? previous
            : null,
        );
      }
    } catch (e) {
      if (seq === request.current && e.name !== "AbortError") {
        setError(e.message);
        setData(null);
      }
    } finally {
      if (seq === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("tab");
    setTab(
      requested === "updates"
        ? "Updates"
        : requested === "discussion"
          ? "Discussion"
          : "Overview",
    );
    setReplyTo(null);
  }, [id]);
  useEffect(() => {
    setLoading(true);
    load();
    return () => {
      request.current++;
      controller.current?.abort();
    };
  }, [id, revision]);
  useEffect(() => {
    if (!data || loading) return;
    const target = location.hash.slice(1);
    if (!target.startsWith("message-") && !target.startsWith("update-")) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [data, loading, tab]);
  const selectTab = (next) => {
    setTab(next);
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${next === "Overview" ? "" : `?tab=${next.toLowerCase()}`}`,
    );
  };
  if (loading)
    return (
      <div className="loading" role="status">
        Opening the project…
      </div>
    );
  if (error)
    return (
      <div className="empty">
        <ErrorMessage error={error} />
        <button className="primary" onClick={() => navigate("/")}>
          Back to discovery
        </button>
      </div>
    );
  if (!data) return null;
  const p = data.project,
    owner = user && (p.ownerId === user.id || user.role === "admin");
  return (
    <div className="project-detail">
      <button className="back-link" onClick={() => navigate("/")}>
        ← Back to discovery
      </button>
      <div className="project-detail-top">
        <ProjectArt type={p.art} />
        <div className="project-detail-summary">
          <span className="eyebrow">{p.category.toUpperCase()}</span>
          <h1>{p.name}</h1>
          <div className="detail-author">
            {p.external ? "Unclaimed reference · " : "Built by "}
            <button
              onClick={() => !p.external && navigate(`/builders/${p.author}`)}
            >
              {p.author}
            </button>
          </div>
          <p>{p.description}</p>
          <div className="tags">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="detail-stats">
            <span>
              <Bookmark size={15} />
              {p.stars} bookmarks
            </span>
            <span>
              <Users size={15} />
              {p.contributors} collaborators
            </span>
            <span className="detail-status">{p.status}</span>
            {p.repositoryVerified && (
              <span className="verified-repo">
                <Check size={15} /> Repository access verified
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="detail-action-bar">
        <div className="detail-actions">
          <button
            className="primary"
            disabled={p.ownerId === user?.id || p.external}
            title={
              p.external
                ? "Visit the source repository to contribute"
                : p.ownerId === user?.id
                  ? "You own this project"
                  : undefined
            }
            onClick={() => (p.joined ? onJoin(p, false) : onJoin(p, true))}
          >
            {p.joined ? <Check size={17} /> : <Plus size={17} />}{" "}
            {p.external
              ? "Contribute upstream"
              : p.ownerId === user?.id
                ? "Your project"
                : p.joined
                  ? "Leave project"
                  : "Join the project"}
          </button>
          <button className="secondary" onClick={() => onSave(p)}>
            <Bookmark size={16} fill={p.saved ? "currentColor" : "none"} />
            {p.saved ? "Saved" : "Save project"}
          </button>
          <a
            className="secondary"
            href={p.repo}
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} />
            View source <ExternalLink size={13} />
          </a>
        </div>
        <div className="owner-actions">
          {owner && (
            <>
              <button onClick={() => onEdit(p)}>
                <Pencil size={15} /> Edit
              </button>
              <button onClick={() => onDelete(p)}>
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                notify("Project link copied.");
              } catch {
                notify("Copy the project URL from your address bar.");
              }
            }}
            aria-label="Copy project link"
          >
            <Copy size={15} />
          </button>
          <button
            onClick={() => onReport({ projectId: p.id })}
            aria-label="Report project"
          >
            <Flag size={15} />
          </button>
        </div>
      </div>
      {p.external && (
        <div className="reference-notice">
          <Mark size={18} />
          <p>
            This is an unclaimed repository listing. No maintainer has claimed
            it on Commons. Collaboration and bookmark counts reflect activity
            here; visit the source repository to contribute upstream.
          </p>
        </div>
      )}
      {p.external && (
        <ClaimProject
          key={p.id}
          project={p}
          user={user}
          onLogin={onLogin}
          refresh={refresh}
          notify={notify}
        />
      )}
      <ErrorMessage error={action.error} />
      <div className="detail-tabs">
        {["Overview", "Updates", "Discussion", "Builders"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => selectTab(t)}
          >
            {t}
            {t === "Updates" && ` (${updates.length})`}
            {t === "Discussion" && ` (${messages.length})`}
            {t === "Builders" && ` (${data.members.length})`}
          </button>
        ))}
      </div>
      {tab === "Overview" ? (
        <div className="overview-grid">
          <section>
            <h2>The project</h2>
            <p className="long-copy">{p.details || p.description}</p>
            <div className="detail-meta">
              Shared {dateLabel(p.createdAt)} · Updated{" "}
              {dateLabel(p.updatedAt || p.createdAt)}
            </div>
          </section>
          <section className="help-box">
            <h3>
              <Users size={18} /> There’s a place for you here.
            </h3>
            <p>{p.needs}</p>
            <button
              className="text-link"
              onClick={() => selectTab("Discussion")}
            >
              Start a conversation <ArrowRight size={15} />
            </button>
          </section>
        </div>
      ) : tab === "Updates" ? (
        <ProjectUpdates
          project={p}
          updates={updates}
          user={user}
          owner={owner}
          load={load}
          onReport={onReport}
          notify={notify}
        />
      ) : tab === "Builders" ? (
        <section className="members-list">
          {data.members.length ? (
            data.members.map((m, i) => (
              <button
                key={m.id}
                onClick={() => navigate(`/builders/${m.username}`)}
              >
                <Avatar name={m.displayName} index={i % 4} />
                <span>
                  <strong>{m.displayName}</strong>
                  <small>
                    @{m.username}{" "}
                    {m.membershipRole || m.role
                      ? ` · ${m.membershipRole || m.role}`
                      : ""}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))
          ) : (
            <div className="empty compact">
              <Users size={28} />
              <h3>A team starts with one person.</h3>
              <p>Join and tell people how you’d like to contribute.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="project-discussion">
          <div className="discussion">
            {messages.length ? (
              messages
                .filter((m) => !m.parentId)
                .flatMap((root) => [
                  root,
                  ...messages.filter((m) => m.parentId === root.id),
                ])
                .map((m) => (
                  <article
                    key={m.id}
                    id={`message-${m.id}`}
                    className={m.parentId ? "discussion-reply" : ""}
                  >
                    <Avatar name={m.author.displayName} />
                    <div>
                      <div className="message-heading">
                        <button
                          onClick={() =>
                            navigate(`/builders/${m.author.username}`)
                          }
                        >
                          {m.author.displayName}
                        </button>
                        <small>{dateLabel(m.createdAt)}</small>
                        <span className="message-actions">
                          {user && (user.id === m.author.id || owner) && (
                            <button
                              aria-label="Delete message"
                              onClick={() => onDelete(null, m.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <button
                            aria-label="Report message"
                            onClick={() => onReport({ messageId: m.id })}
                          >
                            <Flag size={13} />
                          </button>
                        </span>
                      </div>
                      {m.parentId && (
                        <small className="reply-context">
                          Reply to{" "}
                          {
                            messages.find((parent) => parent.id === m.parentId)
                              ?.author.displayName
                          }
                        </small>
                      )}
                      <p className="long-copy">{m.text}</p>
                      {!m.parentId && (
                        <button
                          className="text-link"
                          onClick={() => {
                            if (!user) {
                              onLogin();
                              return;
                            }
                            setReplyTo(m);
                            document
                              .querySelector("textarea[name=message]")
                              ?.focus();
                          }}
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </article>
                ))
            ) : (
              <div className="discussion-empty">
                <MessageSquare size={26} />
                <h3>Start the conversation.</h3>
                <p>Share an idea, ask a question, or introduce yourself.</p>
              </div>
            )}
          </div>
          {user ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  text = new FormData(form).get("message").trim();
                if (!text) return;
                action.run(async () => {
                  await api(`/projects/${id}/messages`, {
                    method: "POST",
                    body: { text, parentId: replyTo?.id ?? null },
                  });
                  form.reset();
                  setReplyTo(null);
                  await load();
                  notify("Message posted.");
                });
              }}
            >
              <ErrorMessage error={action.error} />
              {replyTo && (
                <div className="reply-target">
                  <p>
                    Replying to <strong>{replyTo.author.displayName}</strong>
                  </p>
                  <p className="long-copy">{replyTo.text.slice(0, 200)}</p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel reply
                  </button>
                </div>
              )}
              <label>
                {replyTo ? "Your reply" : "Your message"}
                <textarea
                  name="message"
                  required
                  maxLength={3000}
                  placeholder="What would you like to build together?"
                />
              </label>
              <button disabled={action.busy} className="primary">
                {action.busy ? "Posting…" : "Post message"}{" "}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="sign-in-prompt">
              <p>Good conversations start with an introduction.</p>
              <button className="primary" onClick={onLogin}>
                Sign in to join in <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
