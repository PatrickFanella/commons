import React, { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  ExternalLink,
  Search,
} from "lucide-react";
import { dateLabel } from "../api.js";

export function SourceLink({ href, children, className = "text-link" }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children} <ExternalLink size={13} />
    </a>
  );
}

export function ReviewDate({ catalog: c }) {
  const due =
    Date.now() - new Date(`${c.reviewedAt}T00:00:00Z`).getTime() >
    90 * 86400000;
  return (
    <span>
      Reviewed {dateLabel(c.reviewedAt)}
      {due ? " · Review due" : ""}
    </span>
  );
}

function Readiness({ catalog: c }) {
  return (
    <span
      className={`catalog-readiness ${c.maturity === "Alpha" ? "experimental" : ""}`}
    >
      {c.maturity === "Alpha"
        ? "Alpha · active rebuild"
        : "Established project"}
    </span>
  );
}

function CatalogRow({ project: p, product, navigate, onSave, building }) {
  const c = p.catalog;
  const comparisons =
    c?.comparisons.filter((x) => !product || x.product === product.slug) ?? [];
  return (
    <article className="catalog-row">
      <div className="catalog-row-heading">
        <div>
          <span className="eyebrow">{p.category}</span>
          <h2>
            <a
              href={`/projects/${p.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/projects/${p.id}`);
              }}
            >
              {p.name} <ArrowUpRight size={18} />
            </a>
          </h2>
        </div>
        <button
          className={`save-button ${p.saved ? "saved" : ""}`}
          aria-label={`${p.saved ? "Unsave" : "Save"} ${p.name}`}
          onClick={() => onSave(p)}
        >
          <Bookmark size={19} fill={p.saved ? "currentColor" : "none"} />
        </button>
      </div>
      {c ? (
        <Readiness catalog={c} />
      ) : (
        <span className="catalog-readiness">
          {p.status} · {p.external ? "Unclaimed reference" : "Commons project"}
        </span>
      )}
      <p>{p.description}</p>
      {c && (
        <>
          <div className="catalog-facts">
            <span>{c.platforms.join(" / ")}</span>
            <span>{c.hosting.join(" / ")}</span>
            <span>{c.license}</span>
            <span>{c.licenseScope}</span>
          </div>
          {comparisons.map((x) => (
            <div className="workflow-fit" key={x.product}>
              <strong>{x.workflow}</strong>
              <span className="coverage-label">{x.coverage}</span>
              <p>{x.gaps}</p>
            </div>
          ))}
          <details className="catalog-evidence">
            <summary>Sources, activity & license scope</summary>
            <p>{c.licenseNote}</p>
            <div className="catalog-links">
              <SourceLink href={c.licenseUrl}>License source</SourceLink>
              <SourceLink href={c.activity.url}>
                {c.activity.kind}: {c.activity.label} ·{" "}
                {dateLabel(c.activity.date)}
              </SourceLink>
            </div>
            {c.activity.kind === "Repository activity" && (
              <p className="detail-meta">
                Repository activity may include documentation or automation; it
                is a weaker signal than a release.
              </p>
            )}
            <div className="catalog-links">
              {comparisons.map((x) => (
                <SourceLink key={x.product} href={x.source}>
                  Workflow source
                  {x.product !== product?.slug && comparisons.length > 1
                    ? ` · ${x.product.replaceAll("-", " ")}`
                    : ""}
                </SourceLink>
              ))}
            </div>
            <p className="detail-meta">
              <ReviewDate catalog={c} /> · {c.reviewer}
            </p>
          </details>
        </>
      )}
      {!c && p.needs && (
        <p>
          <strong>Looking for help:</strong> {p.needs}
        </p>
      )}
      <div className="catalog-row-actions">
        <a
          className="secondary"
          href={`/projects/${p.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/projects/${p.id}`);
          }}
        >
          Explore project <ArrowRight size={15} />
        </a>
        {c && (
          <SourceLink href={building ? c.contribute : c.adoption}>
            {building ? "Contribute upstream" : "Adoption & documentation"}
          </SourceLink>
        )}
      </div>
      <p className="detail-meta">
        {p.external
          ? "Independent curated reference · discuss it here; contribute upstream."
          : `Shared by ${p.author} · coordinate in Commons.`}
      </p>
    </article>
  );
}

export function AlternativesPage({
  slug,
  projects,
  catalog,
  navigate,
  onSave,
  onShare,
}) {
  const [query, setQuery] = useState("");
  const [maturity, setMaturity] = useState("");
  const [platform, setPlatform] = useState("");
  const [hosting, setHosting] = useState("");
  const [license, setLicense] = useState("");
  const [coverage, setCoverage] = useState("");
  const product = catalog.products.find((p) => p.slug === slug);
  const base = projects.filter(
    (p) =>
      p.catalog &&
      (!slug || p.catalog.comparisons.some((x) => x.product === slug)),
  );
  const choices = (field) =>
    [...new Set(base.flatMap((p) => p.catalog[field]))].sort();
  const productName = (key) =>
    catalog.products.find((p) => p.slug === key)?.name ?? key;
  const matched = base.filter((p) => {
    const c = p.catalog;
    return (
      (!maturity || c.maturity === maturity) &&
      (!platform || c.platforms.includes(platform)) &&
      (!hosting || c.hosting.includes(hosting)) &&
      (!license || c.licenseScope === license) &&
      [
        p.name,
        p.description,
        c.license,
        ...c.comparisons.flatMap((x) => [productName(x.product), x.workflow]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim())
    );
  });
  const hasFilters = Boolean(maturity || platform || hosting || license);
  const related = (p) =>
    matched.filter((x) =>
      x.catalog.comparisons.some((c) => c.product === p.slug),
    );
  const products = catalog.products.filter((p) => {
    const matches = related(p).length > 0;
    const textMatches =
      [p.name, p.workflow]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim()) ||
      matches ||
      projects.some(
        (x) =>
          x.replaces?.includes(p.slug) &&
          [x.name, x.description]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      );
    return (
      textMatches &&
      (!hasFilters || matches) &&
      (coverage !== "unreviewed" || p.count === 0) &&
      (coverage !== "unclaimed" || p.commonsCount === 0)
    );
  });
  const community = product
    ? projects.filter(
        (p) =>
          !p.external &&
          p.ownerId &&
          (p.replaces?.includes(product.slug) ||
            p.catalog?.comparisons.some((c) => c.product === product.slug)),
      )
    : [];
  const clear = () => {
    setQuery("");
    setMaturity("");
    setPlatform("");
    setHosting("");
    setLicense("");
    setCoverage("");
  };
  if (slug && !product)
    return (
      <div className="empty">
        <h1>That comparison isn’t available.</h1>
        <p>
          It may have been removed for review. Browse the current replacement
          index.
        </p>
        <button className="primary" onClick={() => navigate("/alternatives")}>
          Find alternatives <ArrowRight size={16} />
        </button>
      </div>
    );
  return (
    <section className="catalog-page">
      {product && (
        <button className="back-link" onClick={() => navigate("/alternatives")}>
          ← All software to replace
        </button>
      )}
      <div className="catalog-intro">
        <span className="eyebrow">THE REPLACEMENT INDEX</span>
        <h1>
          {product
            ? product.count
              ? `Open alternatives to ${product.name}.`
              : `Build an alternative to ${product.name}.`
            : "What would you like to replace?"}
        </h1>
        <p>
          {product
            ? `Compare projects for ${product.workflow.toLowerCase()}. Pick the workflow you need, then check the gaps and adoption documentation.`
            : "Start with a tool you know. Find open projects for the work you do, with honest comparisons and a way to help build them."}
        </p>
        {product?.website && (
          <SourceLink href={product.website}>
            Product website & workflow source
          </SourceLink>
        )}
        <a
          className="text-link"
          href="/build"
          onClick={(e) => {
            e.preventDefault();
            navigate("/build");
          }}
        >
          Want to help build an alternative? <ArrowRight size={15} />
        </a>
      </div>
      {(!product || base.length > 0) && (
        <div className="catalog-search-box">
          <label htmlFor="alternative-search">
            {product
              ? "Search reviewed alternatives"
              : "Software, project or workflow"}
          </label>
          <div className="search">
            <Search size={19} />
            <input
              id="alternative-search"
              placeholder={
                product
                  ? "Search by project or workflow…"
                  : "Try Photoshop, Figma, notes or photo libraries…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="catalog-filters">
            {[
              ["Maturity", maturity, setMaturity, choices("maturity")],
              ["Platform", platform, setPlatform, choices("platforms")],
              ["Hosting", hosting, setHosting, choices("hosting")],
              ["License scope", license, setLicense, choices("licenseScope")],
            ].map(([label, value, setValue, values]) => (
              <label key={label}>
                {label}
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="">All</option>
                  {values.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
            {!product && (
              <label>
                Coverage
                <select
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                >
                  <option value="">All products</option>
                  <option value="unreviewed">
                    No reviewed alternative yet
                  </option>
                  <option value="unclaimed">No Commons project yet</option>
                </select>
              </label>
            )}
          </div>
          <p className="detail-meta">
            Platforms describe available clients; self-hosted services still
            need a server. “Mixed licenses” means editions or components have
            different terms.
          </p>
        </div>
      )}
      {product && (
        <ProjectInvitation
          product={product}
          navigate={navigate}
          onShare={onShare}
        />
      )}
      <div className="result-bar">
        <span role="status">
          {product
            ? `${matched.length} ${matched.length === 1 ? "project" : "projects"} for this comparison`
            : `${products.length} tools to replace · ${matched.length} reviewed projects`}
        </span>
        <button className="text-link" onClick={clear}>
          Clear filters
        </button>
      </div>
      {(product ? base.length > 0 && !matched.length : !products.length) && (
        <div className="empty">
          <Search size={30} />
          <h2>
            {product ? "No matching alternatives." : "No products match."}
          </h2>
          <p>Try another workflow or loosen a filter.</p>
          <button className="primary" onClick={clear}>
            Clear filters
          </button>
        </div>
      )}
      {!product && (
        <div className="replacement-grid">
          {products.map((p) => (
            <article className="replacement-card" key={p.slug}>
              <a
                className="replacement-title"
                href={`/alternatives/${p.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/alternatives/${p.slug}`);
                }}
              >
                <span className="eyebrow">{p.workflow}</span>
                <h2>{p.name}</h2>
                <span>
                  {p.count === 0
                    ? "No reviewed alternative yet"
                    : `${related(p).length} reviewed ${related(p).length === 1 ? "alternative" : "alternatives"}`}{" "}
                  <ArrowRight size={16} />
                </span>
              </a>
              <p className="detail-meta">
                {p.commonsCount} Commons{" "}
                {p.commonsCount === 1 ? "project" : "projects"}
              </p>
              {p.commonsCount === 0 && (
                <a
                  className="text-link replacement-start"
                  href={`/start/${p.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/start/${p.slug}`);
                  }}
                >
                  Add yours or start one <ArrowRight size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
      {product && (
        <>
          {base.length > 0 && (
            <h2 className="catalog-section-title">
              Reviewed upstream alternatives
            </h2>
          )}
          <p className="comparison-note">
            Comparisons cover specific workflows, not complete feature parity.
            An active alpha can be worth building while still being unsuitable
            for daily work.
          </p>
          <div className="catalog-list">
            {matched.map((p) => (
              <CatalogRow
                key={p.id}
                project={p}
                product={product}
                navigate={navigate}
                onSave={onSave}
              />
            ))}
          </div>
          {community.length > 0 && (
            <section className="commons-project-section">
              <h2>Commons projects for {product.name}</h2>
              <p className="comparison-note">
                Member-owned projects. Their descriptions and replacement goals
                are supplied by their builders.
              </p>
              <div className="catalog-list">
                {community.map((p) => (
                  <CatalogRow
                    key={p.id}
                    project={p}
                    product={product}
                    navigate={navigate}
                    onSave={onSave}
                    building
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {!product && (
        <details className="directory-resources">
          <summary>Other indexes worth exploring</summary>
          <p>Use these independent directories to broaden your search.</p>
          <ul>
            {catalog.directories.map((d) => (
              <li key={d.name}>
                <SourceLink href={d.url}>{d.name}</SourceLink>
                <p>{d.description}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ProjectInvitation({ product: p, navigate, onShare }) {
  return (
    <section className="project-invitation">
      <span className="eyebrow">
        {p.commonsCount === 0 ? "A PLACE TO START" : "BRING YOUR OWN APPROACH"}
      </span>
      <h2>
        {p.count === 0
          ? "No reviewed alternative yet."
          : p.commonsCount === 0
            ? "Open alternatives exist. Start a Commons project."
            : "Building a different alternative?"}
      </h2>
      <p>
        {p.count === 0
          ? "We haven’t listed a reviewed upstream alternative for this workflow. Other projects may exist; check the wider ecosystem before choosing your first milestone."
          : "The curated references below are independent upstream projects. A member-owned Commons project is a separate place to share work and coordinate a team."}
      </p>
      <p>
        {p.commonsCount === 0
          ? `No Commons project is linked to ${p.name} yet. Add yours or use the guide to start one.`
          : `${p.commonsCount} ${p.commonsCount === 1 ? "Commons project is" : "Commons projects are"} linked here. You can add your own approach too.`}
      </p>
      <div className="catalog-row-actions">
        <button className="primary" onClick={() => onShare(p.slug)}>
          Add your project <ArrowRight size={15} />
        </button>
        <a
          className="secondary"
          href={`/start/${p.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/start/${p.slug}`);
          }}
        >
          How to start one <ArrowRight size={15} />
        </a>
      </div>
    </section>
  );
}

export function BuildPage({ projects, navigate, onSave, onShare }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("rebuilds");
  const visible = projects
    .filter(
      (p) =>
        (scope === "all" ||
          p.catalog?.maturity === "Alpha" ||
          (!p.external &&
            ["In progress", "Looking for builders"].includes(p.status))) &&
        [
          p.name,
          p.description,
          p.needs,
          ...(p.catalog?.comparisons.map((c) => c.workflow) ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="catalog-page">
      <div className="catalog-intro">
        <span className="eyebrow">THE BUILDING GROUND</span>
        <h1>Help make the next alternative.</h1>
        <p>
          Explore active rebuilds or contribute to an established project. Find
          upstream contribution guides, test a workflow, improve documentation
          or bring your own idea.
        </p>
        <button className="primary" onClick={onShare}>
          Share what you’re building <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="project-toolbar">
        <div className="tabs">
          {[
            ["rebuilds", "Active rebuilds"],
            ["all", "All projects"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={scope === value}
              className={scope === value ? "selected" : ""}
              onClick={() => setScope(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search projects to build"
            placeholder="Search projects or workflows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="comparison-note">
        Curated projects have independent maintainers. Their guides and issue
        trackers show how to contribute; a listing here does not imply a request
        or affiliation.
      </p>
      <p className="detail-meta" role="status">
        {visible.length} {visible.length === 1 ? "project" : "projects"}
      </p>
      <div className="catalog-list">
        {visible.map((p) => (
          <CatalogRow
            key={p.id}
            project={p}
            navigate={navigate}
            onSave={onSave}
            building
          />
        ))}
      </div>
      {!visible.length && (
        <div className="empty">
          <h2>No projects match.</h2>
          <p>Try another search or browse all projects.</p>
          <button
            className="primary"
            onClick={() => {
              setQuery("");
              setScope("all");
            }}
          >
            Show all projects
          </button>
        </div>
      )}
    </section>
  );
}

export function CatalogDetails({ project: p, navigate }) {
  const c = p.catalog;
  if (!c) return null;
  return (
    <section className="catalog-detail-facts">
      <div className="section-heading">
        <h2>Where it fits</h2>
        <Readiness catalog={c} />
      </div>
      <p className="comparison-note">
        These comparisons are editorial assessments of selected workflows.
        Follow the sources and try your own documents before switching.
      </p>
      {c.comparisons.map((x) => (
        <article className="workflow-fit" key={x.product}>
          <a
            href={`/alternatives/${x.product}`}
            className="text-link"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/alternatives/${x.product}`);
            }}
          >
            Compare alternatives <ArrowRight size={15} />
          </a>
          <h3>{x.workflow}</h3>
          <span className="coverage-label">{x.coverage}</span>
          <p>{x.gaps}</p>
          <SourceLink href={x.source}>Workflow source</SourceLink>
        </article>
      ))}
      <dl className="catalog-definition">
        <div>
          <dt>Platforms</dt>
          <dd>{c.platforms.join(", ")}</dd>
        </div>
        <div>
          <dt>Hosting</dt>
          <dd>{c.hosting.join(", ")}</dd>
        </div>
        <div>
          <dt>License scope</dt>
          <dd>
            {c.license} · {c.licenseScope}
            <p>{c.licenseNote}</p>
            <SourceLink href={c.licenseUrl}>License source</SourceLink>
          </dd>
        </div>
        <div>
          <dt>Maintenance evidence</dt>
          <dd>
            <SourceLink href={c.activity.url}>
              {c.activity.kind}: {c.activity.label} ·{" "}
              {dateLabel(c.activity.date)}
            </SourceLink>
            {c.activity.kind === "Repository activity" && (
              <p>
                Repository activity may include documentation or automation.
              </p>
            )}
          </dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>
            <ReviewDate catalog={c} /> · {c.reviewer}
          </dd>
        </div>
      </dl>
      <div className="catalog-links">
        <SourceLink href={c.website}>Project website</SourceLink>
        <SourceLink href={c.adoption}>Adoption & documentation</SourceLink>
        <SourceLink href={c.contribute}>Contribute upstream</SourceLink>
      </div>
    </section>
  );
}
