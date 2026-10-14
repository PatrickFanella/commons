import React, { useEffect, useState } from "react";
import {
  Users,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Settings,
  Shield,
} from "lucide-react";
import { api, dateLabel } from "../api.js";
import { Avatar } from "./Art.jsx";
import { ProjectCard } from "./Projects.jsx";
import { ErrorMessage, useAction } from "./Forms.jsx";
export function BuildersPage({ builders, navigate, onRegister }) {
  const [query, setQuery] = useState("");
  const visible = builders.filter((b) =>
    `${b.username} ${b.displayName} ${b.skills.join(" ")} ${b.bio}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">GOOD COMPANY, GREAT IDEAS</span>
        <h1>Meet the builders.</h1>
        <p>Different skills. A shared belief in making things open.</p>
      </div>
      <label className="people-search">
        Find your people
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, skills, or interests…"
        />
      </label>
      <div className="builders-grid">
        {visible.map((b, i) => (
          <article className="builder-card" key={b.id}>
            <Avatar name={b.displayName} index={i % 4} />
            <h2>{b.displayName}</h2>
            <small>@{b.username}</small>
            <p>{b.bio || "Here to build something open."}</p>
            <div className="tags">
              {b.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <span>
              {b.projectCount} {b.projectCount === 1 ? "project" : "projects"}{" "}
              shared
            </span>
            <button onClick={() => navigate(`/builders/${b.username}`)}>
              Meet {b.displayName.split(" ")[0]} <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="empty">
          <Users size={32} />
          <h3>
            {query ? "No builders found." : "A community starts somewhere."}
          </h3>
          <p>
            {query
              ? "Try a different name or skill."
              : "Bring your curiosity. Help shape this place from the beginning."}
          </p>
          <button
            className="primary"
            onClick={query ? () => setQuery("") : onRegister}
          >
            {query ? "Clear search" : "Join the community"}{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
export function BuilderPage({ username, user, navigate, onSave }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    setError("");
    let active = true;
    api(`/builders/${encodeURIComponent(username)}`)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [username]);
  if (error)
    return (
      <div className="empty">
        <ErrorMessage error={error} />
        <button className="primary" onClick={() => navigate("/builders")}>
          Meet other builders
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        Meeting a builder…
      </div>
    );
  const b = data.builder;
  return (
    <div className="builder-profile">
      <button className="back-link" onClick={() => navigate("/builders")}>
        ← Back to builders
      </button>
      <div className="profile-heading">
        <Avatar name={b.displayName} />
        <div>
          <span className="eyebrow">INDEPENDENT BUILDER</span>
          <h1>{b.displayName}</h1>
          <p>
            @{b.username} · Joined {dateLabel(b.createdAt)}
          </p>
        </div>
        {user?.id === b.id && (
          <button className="secondary" onClick={() => navigate("/settings")}>
            <Settings size={16} /> Edit profile
          </button>
        )}
      </div>
      <p className="profile-bio long-copy">
        {b.bio || "A new face in the commons."}
      </p>
      <div className="tags">
        {b.skills.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      {b.website && (
        <a
          className="profile-website"
          href={b.website}
          target="_blank"
          rel="noreferrer"
        >
          Visit website <ExternalLink size={15} />
        </a>
      )}
      <div className="section-heading">
        <h2>Projects by {b.displayName.split(" ")[0]}</h2>
      </div>
      <div className="project-grid">
        {data.projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            navigate={navigate}
            onSave={onSave}
          />
        ))}
      </div>
      {!data.projects.length && (
        <div className="empty compact">
          <p>No projects shared yet. Watch this space.</p>
        </div>
      )}
    </div>
  );
}
export function SettingsPage({ user, onRefresh, onDelete, onLogin, notify }) {
  const profile = useAction(),
    password = useAction();
  if (!user)
    return (
      <div className="empty">
        <Settings size={32} />
        <h1>A space of your own.</h1>
        <p>Sign in to update your profile and account.</p>
        <button className="primary" onClick={onLogin}>
          Sign in
        </button>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR PLACE IN THE COMMONS</span>
        <h1>Profile & account.</h1>
        <p>A little about you, and the keys to your account.</p>
      </div>
      <div className="settings-grid">
        <section className="settings-panel">
          <h2>Your public profile</h2>
          <p>People see your name, username, bio, skills, and website.</p>
          <form
            key={user.id}
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              data.skills = data.skills
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              profile.run(async () => {
                await api("/me", { method: "PATCH", body: data });
                await onRefresh();
                notify("Your profile is updated.");
              });
            }}
          >
            <ErrorMessage error={profile.error} />
            <label>
              Display name
              <input
                name="displayName"
                required
                minLength={2}
                maxLength={80}
                defaultValue={user.displayName}
              />
            </label>
            <label>
              Username
              <input readOnly value={user.username} />
              <small>
                Your username identifies your projects and discussions.
              </small>
            </label>
            <label>
              Bio
              <textarea
                name="bio"
                maxLength={1000}
                defaultValue={user.bio}
                placeholder="What are you curious about? What do you like building?"
              />
            </label>
            <label>
              Skills & interests
              <input
                name="skills"
                maxLength={300}
                defaultValue={user.skills.join(", ")}
                placeholder="Rust, Design, CAD…"
              />
              <small>Separate skills with commas, up to ten.</small>
            </label>
            <label>
              Website
              <input
                name="website"
                type="url"
                pattern="https://.*"
                defaultValue={user.website || ""}
                placeholder="https://your-site.com"
              />
            </label>
            <button disabled={profile.busy} className="primary">
              {profile.busy ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>
        <div>
          <section className="settings-panel">
            <h2>
              <Shield size={18} /> Change password
            </h2>
            <p>Use a passphrase you don’t use anywhere else.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  data = Object.fromEntries(new FormData(form));
                password.run(async () => {
                  await api("/auth/password", { method: "POST", body: data });
                  form.reset();
                  notify("Password changed. Other sessions were signed out.");
                });
              }}
            >
              <ErrorMessage error={password.error} />
              <label>
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
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
              <button disabled={password.busy} className="secondary">
                {password.busy ? "Updating…" : "Update password"}
              </button>
            </form>
          </section>
          <section className="settings-panel danger-zone">
            <h2>Delete your account</h2>
            <p>
              Your profile, projects, discussions, bookmarks, and memberships
              will be removed. This can’t be undone.
            </p>
            <button className="danger-text" onClick={onDelete}>
              Delete my account
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
