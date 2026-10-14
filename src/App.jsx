import ActivityPage from "./components/Activity.jsx";
import { RequestResetForm, EmailLinkPage } from "./components/AccountEmail.jsx";
import { Mark } from "./components/Mark.jsx";
import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  Compass,
  Users,
  Bookmark,
  Layers,
  ChevronRight,
  Shield,
  Settings,
  LogOut,
  X,
  Check,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Activity,
} from "lucide-react";
import { api, setCsrf, categories } from "./api.js";
import {
  AuthForm,
  ProjectForm,
  ReportForm,
  JoinForm,
  ConfirmForm,
  ErrorMessage,
} from "./components/Forms.jsx";
import { ProjectsPage, ProjectPage } from "./components/Projects.jsx";
import {
  BuildersPage,
  BuilderPage,
  SettingsPage,
} from "./components/People.jsx";
import { AboutPage, InfoPage } from "./components/Info.jsx";
import AdminPage from "./components/Admin.jsx";
function routeFrom(path) {
  try {
    const parts = path.replace(/\/$/, "").split("/").filter(Boolean);
    if (!parts.length) return { page: "explore" };
    if (parts[0] === "projects" && parts.length === 2)
      return { page: "project", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "builders" && parts.length === 2)
      return { page: "builder", username: decodeURIComponent(parts[1]) };
    if (
      parts.length === 1 &&
      [
        "activity",
        "verify-email",
        "reset-password",
        "saved",
        "mine",
        "builders",
        "about",
        "settings",
        "admin",
        "privacy",
        "terms",
        "guidelines",
      ].includes(parts[0])
    )
      return { page: parts[0] };
  } catch {}
  return { page: "404" };
}
function Modal({ children, title, onClose, locked }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const nodes = () =>
      [
        ...ref.current.querySelectorAll("button,a,input,textarea,select"),
      ].filter((n) => !n.disabled);
    const handle = (e) => {
      if (e.key === "Escape" && !locked) onClose();
      if (e.key === "Tab") {
        const list = nodes(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nodes()[0]?.focus();
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [locked]);
  return (
    <div className="modal-backdrop" onClick={() => !locked && onClose()}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {!locked && (
          <button
            className="close-modal"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </section>
    </div>
  );
}
export default function App() {
  const [path, setPath] = useState(location.pathname),
    [user, setUser] = useState(null),
    [projects, setProjects] = useState([]),
    [builders, setBuilders] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [category, setCategory] = useState("All projects"),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [revision, setRevision] = useState(0),
    [recoveryLocked, setRecoveryLocked] = useState(false),
    [menu, setMenu] = useState(false),
    [site, setSite] = useState({ operatorName: "", contactEmail: "" });
  const recoveryRef = useRef(false),
    pathRef = useRef(path);
  pathRef.current = path;
  const setRecoveryLock = (value) => {
    if (value && !recoveryRef.current) history.pushState({}, "", location.href);
    recoveryRef.current = value;
    setRecoveryLocked(value);
  };
  const route = routeFrom(path);
  const closeModal = () => {
    if (!recoveryLocked) setModal(null);
  };
  const navigate = (url) => {
    if (recoveryRef.current) return;
    history.pushState({}, "", url);
    setPath(location.pathname);
    setCategory("All projects");
    setModal(null);
    setMenu(false);
    window.scrollTo(0, 0);
    document.querySelector("main")?.focus();
  };
  async function refresh() {
    const session = await api("/auth/session");
    setUser(session.user);
    setCsrf(session.csrfToken);
    const [p, b, config] = await Promise.all([
      api("/projects"),
      api("/builders"),
      api("/site"),
    ]);
    setSite(config);
    setProjects(p.projects);
    setBuilders(b.builders);
    setRevision((r) => r + 1);
    setError("");
  }
  async function initialLoad() {
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    initialLoad();
    const pop = () => {
      if (recoveryRef.current) {
        history.pushState({}, "", pathRef.current);
        return;
      }
      setPath(location.pathname);
      setModal(null);
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!recoveryLocked) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recoveryLocked]);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      setCsrf(null);
      setModal({ type: "login" });
      setToast("Your session expired. Sign in to continue.");
    };
    window.addEventListener("commons:session-expired", expire);
    return () => window.removeEventListener("commons:session-expired", expire);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const title =
      route.page === "project"
        ? projects.find((p) => p.id === route.id)?.name || "Project"
        : {
            explore: "Rebuild familiar tools in the open",
            builders: "Meet the builders",
            builder: route.username,
            saved: "Saved projects",
            mine: "My projects",
            about: "The idea",
            settings: "Profile & account",
            activity: "Around the commons",
            "verify-email": "Verify email",
            "reset-password": "Reset password",
            admin: "Moderation",
            privacy: "Privacy",
            terms: "Terms",
            guidelines: "Community guidelines",
            404: "Page not found",
          }[route.page];
    document.title = `${title} — Commons`;
  }, [path, projects]);
  const notify = (message) => setToast(message);
  const login = () => setModal({ type: "login" });
  const requireUser = (action) => {
    if (!user) {
      login();
      return false;
    }
    action();
    return true;
  };
  const share = () => requireUser(() => setModal({ type: "share" }));
  const save = (p) =>
    requireUser(async () => {
      try {
        await api(`/projects/${p.id}/save`, {
          method: "PUT",
          body: { saved: !p.saved },
        });
        await refresh();
        notify(p.saved ? "Project removed from saved." : "Project saved.");
      } catch (e) {
        notify(e.message);
      }
    });
  const join = (p, joining) =>
    requireUser(() => {
      if (joining) setModal({ type: "join", project: p });
      else setModal({ type: "leave", project: p });
    });
  const report = (target) =>
    requireUser(() => setModal({ type: "report", target }));
  const destroy = (p, messageId) =>
    requireUser(() =>
      setModal({
        type: messageId ? "delete-message" : "delete-project",
        project: p,
        messageId,
      }),
    );
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      setUser(null);
      setCsrf(null);
      setMenu(false);
      await refresh();
      notify("You’re signed out.");
    } catch (e) {
      notify(e.message);
    }
  };
  const authSuccess = (result) => {
    setUser(result.user);
    setCsrf(result.csrfToken);
    refresh().catch((e) => notify(e.message));
  };
  const authDone = () => {
    setModal(null);
    refresh().catch((e) => notify(e.message));
    notify(
      user
        ? "Welcome to the commons."
        : "Your password was reset. Sign in with your new password.",
    );
  };
  const navigation = [
    ["Explore", "/", Compass],
    ["Activity", "/activity", Activity],
    ["My projects", "/mine", Layers],
    ["Saved projects", "/saved", Bookmark],
    ["Builders", "/builders", Users],
  ];
  const isSelected = (url) =>
    url === "/" ? route.page === "explore" : path === url;
  const pageProps = {
    user,
    navigate,
    emailEnabled: !!site.emailEnabled,
    onSave: save,
    onLogin: login,
    notify,
    refresh,
  };
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="header" inert={Boolean(modal)}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <Mark size={28} />
          <span>commons</span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <button
            className={route.page === "explore" ? "active" : ""}
            onClick={() => navigate("/")}
          >
            Discover
          </button>
          <button
            className={
              ["builders", "builder"].includes(route.page) ? "active" : ""
            }
            onClick={() => navigate("/builders")}
          >
            Builders
          </button>
          <button
            className={route.page === "about" ? "active" : ""}
            onClick={() => navigate("/about")}
          >
            The idea <ArrowUpRight size={13} />
          </button>
        </nav>
        <div className="header-right">
          <span className="open-label">
            <span />
            Built in the open
          </span>
          <button
            className="primary small"
            onClick={share}
            aria-label="Share a project"
          >
            <Plus size={16} /> Share a project
          </button>
          {user ? (
            <div className="profile-menu">
              <button
                className="profile"
                aria-label="Account menu"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                {user.displayName[0].toUpperCase()}
              </button>
              {menu && (
                <div className="account-dropdown">
                  <strong>{user.displayName}</strong>
                  <small>@{user.username}</small>
                  <button onClick={() => navigate("/settings")}>
                    <Settings size={15} /> Profile & account
                  </button>
                  <button
                    onClick={() => navigate(`/builders/${user.username}`)}
                  >
                    <Users size={15} /> Your public profile
                  </button>
                  {user.role === "admin" && (
                    <button onClick={() => navigate("/admin")}>
                      <Shield size={15} /> Moderation
                    </button>
                  )}
                  <button onClick={logout}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="sign-in" onClick={login}>
              Sign in <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>
      <div className="app-shell" inert={Boolean(modal)}>
        <aside className="sidebar">
          <div className="nav-section">
            <span className="sidebar-label">WORKSPACE</span>
            {navigation.map(([name, url, Icon]) => (
              <button
                key={name}
                className={"side-link " + (isSelected(url) ? "selected" : "")}
                onClick={() => navigate(url)}
              >
                <Icon size={18} />
                {name}
                {name === "Saved projects" &&
                  projects.filter((p) => p.saved).length > 0 && (
                    <span className="nav-count">
                      {projects.filter((p) => p.saved).length}
                    </span>
                  )}
                {name === "Explore" && (
                  <ChevronRight size={14} className="end-icon" />
                )}
              </button>
            ))}
          </div>
          <div className="category-section">
            <span className="sidebar-label">EXPLORE BY CATEGORY</span>
            {categories.map((name, i) => (
              <button
                key={name}
                className={
                  "category-link " + (category === name ? "chosen" : "")
                }
                onClick={() => {
                  if (route.page !== "explore") {
                    history.pushState({}, "", "/");
                    setPath("/");
                  }
                  setCategory(name);
                  window.scrollTo(0, 0);
                }}
              >
                <span className={"category-dot dot" + i} />
                {name}
                <span>
                  {projects
                    .filter((p) => p.category === name)
                    .length.toString()
                    .padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          <div className="sidebar-card">
            <div className="little-globe">
              <Mark size={22} />
              <Sparkles size={13} />
            </div>
            <h3>
              Good things happen
              <br />
              when we build together.
            </h3>
            <p>
              Bring an idea. Find your people.
              <br />
              Make it open.
            </p>
            <button onClick={() => navigate("/about")}>
              What is Commons? <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-footer">
            <span>Shared ground, kept together.</span>
            <div>
              <button onClick={() => navigate("/guidelines")}>
                Community guidelines
              </button>
              <span>↗</span>
            </div>
            <small>© {new Date().getFullYear()} Commons</small>
          </div>
        </aside>
        <main id="main-content" tabIndex={-1}>
          {loading ? (
            <div className="loading" role="status">
              <Mark size={22} /> Opening the commons…
            </div>
          ) : error ? (
            <div className="empty">
              <AlertCircle size={30} />
              <h1>We couldn’t connect.</h1>
              <p>{error}</p>
              <button className="primary" onClick={initialLoad}>
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          ) : (
            <>
              {["explore", "saved", "mine"].includes(route.page) && (
                <ProjectsPage
                  {...pageProps}
                  page={route.page}
                  projects={projects}
                  category={category}
                  setCategory={setCategory}
                  onShare={share}
                />
              )}{" "}
              {route.page === "activity" && (
                <ActivityPage {...pageProps} revision={revision} />
              )}
              {["verify-email", "reset-password"].includes(route.page) && (
                <EmailLinkPage
                  key={route.page}
                  {...pageProps}
                  mode={route.page}
                  onRecoveryChange={setRecoveryLock}
                />
              )}
              {route.page === "project" && (
                <ProjectPage
                  {...pageProps}
                  id={route.id}
                  revision={revision}
                  onJoin={join}
                  onEdit={(p) => setModal({ type: "edit", project: p })}
                  onDelete={destroy}
                  onReport={report}
                />
              )}{" "}
              {route.page === "builders" && (
                <BuildersPage
                  builders={builders}
                  navigate={navigate}
                  onRegister={() =>
                    user
                      ? navigate("/settings")
                      : setModal({ type: "register" })
                  }
                />
              )}{" "}
              {route.page === "builder" && (
                <BuilderPage
                  {...pageProps}
                  key={revision}
                  username={route.username}
                />
              )}{" "}
              {route.page === "settings" && (
                <SettingsPage
                  {...pageProps}
                  onRefresh={refresh}
                  onDelete={() => setModal({ type: "delete-account" })}
                />
              )}{" "}
              {route.page === "about" && (
                <AboutPage onShare={share} navigate={navigate} />
              )}{" "}
              {["privacy", "terms", "guidelines"].includes(route.page) && (
                <InfoPage page={route.page} navigate={navigate} site={site} />
              )}{" "}
              {route.page === "admin" && <AdminPage {...pageProps} />}{" "}
              {route.page === "404" && (
                <div className="empty">
                  <Compass size={32} />
                  <h1>A path less traveled.</h1>
                  <p>We couldn’t find this page.</p>
                  <button className="primary" onClick={() => navigate("/")}>
                    Back to discovery <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>Made for people who make things.</span>
            <div>
              <button onClick={() => navigate("/guidelines")}>
                Guidelines
              </button>
              <button onClick={() => navigate("/privacy")}>Privacy</button>
              <button onClick={() => navigate("/terms")}>Terms</button>
            </div>
          </footer>
        </main>
      </div>
      {modal && (
        <Modal
          title={modal.type.replaceAll("-", " ")}
          onClose={closeModal}
          locked={recoveryLocked}
        >
          {modal.type === "request-reset" && (
            <RequestResetForm onMode={(type) => setModal({ type })} />
          )}
          {["login", "register", "recover"].includes(modal.type) && (
            <AuthForm
              key={modal.type}
              mode={modal.type}
              onMode={(type) => setModal({ type })}
              onSession={authSuccess}
              onDone={authDone}
              onRecoveryChange={setRecoveryLock}
              emailEnabled={!!site.emailEnabled}
            />
          )}{" "}
          {["share", "edit"].includes(modal.type) && (
            <ProjectForm
              project={modal.project}
              onSuccess={async (p) => {
                setModal(null);
                await refresh();
                navigate(`/projects/${p.id}`);
                notify(
                  modal.type === "edit"
                    ? "Project updated."
                    : "Your project is in the commons.",
                );
              }}
            />
          )}{" "}
          {modal.type === "join" && (
            <JoinForm
              project={modal.project}
              onDone={async () => {
                setModal(null);
                await refresh();
                notify(
                  "You joined the project. Introduce yourself in the discussion.",
                );
              }}
            />
          )}{" "}
          {modal.type === "report" && (
            <ReportForm
              target={modal.target}
              onDone={() => {
                setModal(null);
                notify("Your report was sent to the moderators.");
              }}
            />
          )}{" "}
          {modal.type === "leave" && (
            <ConfirmForm
              title={`Leave ${modal.project.name}?`}
              description="You’ll leave this project’s collaborator list. Your discussion messages will remain, and you can join again later."
              label="Leave project"
              onConfirm={async () => {
                await api(`/projects/${modal.project.id}/join`, {
                  method: "PUT",
                  body: { joined: false },
                });
                setModal(null);
                await refresh();
                notify("You left the project.");
              }}
            />
          )}{" "}
          {modal.type === "delete-project" && (
            <ConfirmForm
              title={`Delete ${modal.project.name}?`}
              description="This will permanently remove the project, its discussion, bookmarks, memberships, and associated reports."
              label="Delete project"
              onConfirm={async () => {
                await api(`/projects/${modal.project.id}`, {
                  method: "DELETE",
                });
                setModal(null);
                await refresh();
                navigate("/mine");
                notify("Project deleted.");
              }}
            />
          )}{" "}
          {modal.type === "delete-message" && (
            <ConfirmForm
              title="Remove this message?"
              description="This message and its replies will be permanently removed."
              label="Delete message"
              onConfirm={async () => {
                await api(`/messages/${modal.messageId}`, { method: "DELETE" });
                setModal(null);
                await refresh();
                notify("Message removed.");
              }}
            />
          )}{" "}
          {modal.type === "delete-account" && (
            <ConfirmForm
              title="Delete your account?"
              description="Your profile, owned projects, messages, bookmarks, and memberships will be removed permanently. Moderation records may remain anonymized. Make sure you’ve saved any work you want to keep."
              label="Delete my account"
              password
              onConfirm={async (password) => {
                await api("/me", { method: "DELETE", body: { password } });
                setModal(null);
                setCsrf(null);
                setUser(null);
                await refresh();
                navigate("/");
                notify("Your account has been deleted.");
              }}
            />
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
