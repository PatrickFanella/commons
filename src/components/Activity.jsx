import React, { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, RefreshCw } from "lucide-react";
import { api, dateLabel } from "../api.js";
import { Avatar } from "./Art.jsx";
import { ErrorMessage } from "./Forms.jsx";

const verbs = {
  project_created: "shared a project",
  reference_listed: "listed an unclaimed project",
  project_changed: "updated the project",
  member_joined: "joined the project",
  message_posted: "started a conversation",
  reply_posted: "replied to a conversation",
  update_posted: "posted a progress update",
  project_claimed: "claimed the project through repository verification",
};
export default function ActivityPage({ user, navigate, revision }) {
  const [scope, setScope] = useState("all");
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const controller = useRef(null);
  const effectiveScope = user ? scope : "all";
  async function load(before = null) {
    const request = ++generation.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError("");
    try {
      const data = await api(
        `/activity?scope=${effectiveScope}${before ? `&before=${before}` : ""}`,
        { signal: current.signal },
      );
      if (request !== generation.current) return;
      setItems((previous) =>
        before ? [...previous, ...data.activity] : data.activity,
      );
      setCursor(data.nextCursor);
    } catch (e) {
      if (request === generation.current && e.name !== "AbortError")
        setError(e.message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    setItems([]);
    setCursor(null);
    load();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [effectiveScope, user?.id, revision, reload]);
  const destination = (item) =>
    `/projects/${item.project.id}${item.updateId ? `?tab=updates#update-${item.updateId}` : item.messageId ? `?tab=discussion#message-${item.messageId}` : ""}`;
  const link = (e, url) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      navigate(url);
    }
  };
  return (
    <>
      <div className="page-heading activity-heading">
        <div>
          <span className="eyebrow">WORK IN THE OPEN</span>
          <h1>Around the commons.</h1>
          <p>
            New projects, conversations, and progress from the people building
            here.
          </p>
        </div>
        <button
          className="secondary"
          disabled={loading}
          onClick={() => setReload((r) => r + 1)}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <div className="detail-tabs" aria-label="Activity scope">
        <button
          className={effectiveScope === "all" ? "active" : ""}
          aria-pressed={effectiveScope === "all"}
          onClick={() => setScope("all")}
        >
          Everyone
        </button>
        {user && (
          <button
            className={effectiveScope === "mine" ? "active" : ""}
            aria-pressed={effectiveScope === "mine"}
            onClick={() => setScope("mine")}
          >
            My projects
          </button>
        )}
      </div>
      <ErrorMessage error={error} />
      {error && (
        <button
          className="secondary"
          onClick={() => load(items.length ? cursor : null)}
        >
          Try again
        </button>
      )}
      <div className="activity-list" aria-busy={loading}>
        {items.map((item) => (
          <article className="activity-entry" key={item.id}>
            <Avatar name={item.actor.displayName} />
            <div>
              <p className="activity-byline">
                <a
                  href={`/builders/${item.actor.username}`}
                  onClick={(e) => link(e, `/builders/${item.actor.username}`)}
                >
                  {item.actor.displayName}
                </a>{" "}
                {verbs[item.kind] || "contributed to the project"}
              </p>
              <h2>
                <a
                  href={destination(item)}
                  onClick={(e) => link(e, destination(item))}
                >
                  {item.project.name}
                </a>
              </h2>
              {item.title && <h3>{item.title}</h3>}
              {item.excerpt && (
                <p className="long-copy activity-excerpt">{item.excerpt}</p>
              )}
              <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
              {item.project.external && (
                <span className="unclaimed-label">Unclaimed reference</span>
              )}
            </div>
            <a
              className="activity-open"
              href={destination(item)}
              onClick={(e) => link(e, destination(item))}
              aria-label={`Open ${item.project.name}`}
            >
              <ArrowRight size={18} />
            </a>
          </article>
        ))}
      </div>
      {loading && (
        <div className="loading" role="status">
          Loading activity…
        </div>
      )}
      {!loading && !error && !items.length && (
        <div className="empty">
          <Activity size={32} />
          <h2>
            {effectiveScope === "mine"
              ? "Your projects are quiet for now."
              : "The next chapter starts here."}
          </h2>
          <p>
            Project listings, updates, and conversations appear here as people
            contribute.
          </p>
          <button className="primary" onClick={() => navigate("/")}>
            Explore projects <ArrowRight size={16} />
          </button>
        </div>
      )}
      {cursor && !error && (
        <button
          className="secondary feed-more"
          disabled={loading}
          onClick={() => load(cursor)}
        >
          {loading ? "Loading…" : "Older activity"}
        </button>
      )}
    </>
  );
}
