import React, { useState } from "react";
import { ArrowRight, Copy, Download } from "lucide-react";
import { SourceLink } from "./Catalog.jsx";

function CopyBlock({ text, label }) {
  const [status, setStatus] = useState("");
  return (
    <div className="guide-copy-block">
      <pre>
        <code>{text}</code>
      </pre>
      <button
        className="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("Copied");
          } catch {
            setStatus("Select the text above and copy it.");
          }
        }}
      >
        <Copy size={15} />
        {label}
      </button>
      <span role="status">{status}</span>
    </div>
  );
}

export function StartGuide({ slug, catalog, navigate, onShare }) {
  const product = catalog.products.find((p) => p.slug === slug);
  const [workflow, setWorkflow] = useState("");
  if (slug && !product)
    return (
      <div className="empty">
        <h1>Choose a product to rebuild.</h1>
        <button className="primary" onClick={() => navigate("/alternatives")}>
          Browse the index <ArrowRight size={15} />
        </button>
      </div>
    );
  const target = product?.name ?? "the product I want to replace";
  const feature =
    workflow.trim() ||
    "one small workflow, such as opening a document, changing it and exporting the result";
  const investigation = `Use REA to investigate ${target}, focusing on ${feature}. I will supply an authorized local target or test environment. Identify its version and the available analysis tools. Trace only the parts relevant to this workflow. Cite the evidence for each finding and separate observations, inferences and unknowns. Produce a behavior specification and test cases. Ask before running the target or changing its state.`;
  const implementation = `Build an original open implementation of ${feature}. Work from the behavior specification and public format documentation. Propose the smallest useful milestone, then implement it in my repository. Test the observable inputs and outputs, error cases, save/reopen behavior and compatibility using fixtures I can redistribute. List what works, what is missing and what remains unverified.`;
  const brief = `# Open alternative project brief\n\nProduct: ${target}\nWorkflow: ${feature}\n\n## First milestone\n- One complete input → action → output path\n- Known gaps and explicit non-goals\n\n## Evidence\n- Target version and environment\n- Public docs and permitted observations\n- Observations / inferences / unknowns\n\n## Implementation\n- Original code and assets; record dependency licenses\n- Public repository, license and build instructions\n\n## Verification\n- Reproducible fixtures and expected outputs\n- Error handling, save/reopen and import/export checks\n\n## Help wanted\n- One small issue with an acceptance check\n- Documentation, accessibility, translations and testing\n\n## Commons\n- Link this project to ${product?.name ?? "the relevant product"}\n- Describe readiness and gaps honestly\n`;
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([brief], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product?.slug ?? "open-alternative"}-project-brief.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <article className="catalog-page build-guide">
      <button
        className="back-link"
        onClick={() =>
          navigate(product ? `/alternatives/${product.slug}` : "/alternatives")
        }
      >
        ← {product ? `Back to ${product.name}` : "Back to the index"}
      </button>
      <div className="catalog-intro">
        <span className="eyebrow">FROM A FAMILIAR TOOL TO AN OPEN PROJECT</span>
        <h1>
          {product
            ? `Start an alternative to ${product.name}.`
            : "Build an open alternative."}
        </h1>
        <p>
          Choose a useful workflow, learn how it behaves, and build a small
          version people can run. This guide covers REA investigation, a project
          brief, testing and inviting collaborators.
        </p>
        <p className="detail-meta">
          REA documentation checked October 14, 2026. Commands below are
          examples for your machine; Commons does not install or run REA.
        </p>
      </div>
      <section className="project-invitation">
        <h2>Already building something?</h2>
        <p>
          Add your own public project and connect it to{" "}
          {product?.name ?? "the products it helps replace"}. A linked Commons
          project belongs to a member; it is separate from a curated upstream
          reference.
        </p>
        <button className="primary" onClick={() => onShare(product?.slug)}>
          Add your project <ArrowRight size={15} />
        </button>
      </section>
      {!product && (
        <label className="guide-product-picker">
          Choose a product for a tailored brief
          <select
            value=""
            onChange={(e) =>
              e.target.value && navigate(`/start/${e.target.value}`)
            }
          >
            <option value="">Select a product…</option>
            {catalog.products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <nav className="guide-contents" aria-label="Guide contents">
        {[
          ["scope", "Pick a workflow"],
          ["observe", "Study the behavior"],
          ["rea", "Set up REA"],
          ["investigate", "Trace a feature"],
          ["implement", "Build & verify"],
          ["publish", "Start the project"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section id="scope">
        <span className="eyebrow">01 · DEFINE THE FIRST USEFUL THING</span>
        <h2>Pick one workflow.</h2>
        <p>
          “Replace the whole product” is too broad for a first milestone. Pick
          an input, a user action and an output: import a file, adjust one
          property, then save a result. Write down who needs it and the gap
          existing tools leave.
        </p>
        <label className="guide-workflow">
          Your first workflow
          <input
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            maxLength={300}
            placeholder="For example: import a layered file, adjust opacity, export PNG"
          />
        </label>
        <p>
          Check the alternatives already listed for this product. A contribution
          to an existing tool may cover your need; a new project should explain
          the different workflow or approach it offers.
        </p>
      </section>
      <section id="observe">
        <span className="eyebrow">02 · BUILD AN EVIDENCE TRAIL</span>
        <h2>Study behavior before implementation.</h2>
        <p>
          Record the product version, environment, input fixtures, actions and
          outputs. Capture normal cases and failures. Start with public
          documentation and file-format specifications, then inspect software
          you own or are authorized to examine.
        </p>
        <p>
          Keep observations separate from guesses. Write a behavior
          specification with examples that another person can reproduce. Use
          your own or redistributable fixtures, code and assets; retain the
          licenses of dependencies and any permitted reused material.
        </p>
        <SourceLink href="https://github.com/morluto/rea">
          REA capabilities & responsible-use scope
        </SourceLink>
      </section>
      <section id="rea">
        <span className="eyebrow">03 · CONNECT YOUR ANALYSIS TOOLS</span>
        <h2>Set up REA with your coding agent.</h2>
        <p>
          <SourceLink href="https://rea.tools/">REA</SourceLink> connects an
          agent to analysis tools for binaries, applications and runtime
          behavior. It provides evidence for an investigation; the agent writes
          and tests your implementation.
        </p>
        <p>
          The documented runtime is Node.js 22.19+ in the 22.x line, 24.11+ in
          the 24.x line, or 26+, with npm. Run setup, select the agent you use,
          review its configuration changes and approve the plan. Restart that
          agent after setup.
        </p>
        <CopyBlock
          label="Copy setup command"
          text="npx rea-agents@latest setup"
        />
        <p>
          Native analysis uses a configured Hopper, Ghidra or IDA provider.
          Static JavaScript/Electron inspection needs no native analysis engine.
          Linux workflows also need a procps-compatible <code>ps</code>. Follow
          the provider’s installation and host requirements.
        </p>
        <SourceLink href="https://github.com/morluto/rea/blob/main/docs/installation.md">
          Installation, provider setup & readiness checks
        </SourceLink>
        <CopyBlock
          label="Copy readiness check"
          text="npx -y rea-agents@latest doctor --json"
        />
      </section>
      <section id="investigate">
        <span className="eyebrow">04 · TRACE ONLY WHAT YOU NEED</span>
        <h2>Investigate the feature with evidence.</h2>
        <p>
          Give your agent the target and a narrow question. REA’s guided
          investigation distinguishes observed facts, inferred behavior and
          unresolved questions. Inspect relevant strings, modules, routes,
          references or routines, then connect findings to your test cases.
        </p>
        <CopyBlock label="Copy investigation prompt" text={investigation} />
        <SourceLink href="https://github.com/morluto/rea/blob/main/docs/mcp-prompts.md">
          Guided investigation workflows
        </SourceLink>
        <details className="guide-examples">
          <summary>CLI starting points</summary>
          <p>
            For an extracted JavaScript/Electron directory or ASAR, substitute
            your actual absolute path:
          </p>
          <CopyBlock
            label="Copy JavaScript example"
            text="npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json"
          />
          <SourceLink href="https://github.com/morluto/rea/blob/main/docs/javascript-application-workflows.md">
            Application graphs & feature tracing
          </SourceLink>
          <p>
            For a native target, after configuring Ghidra, substitute the
            program path:
          </p>
          <CopyBlock
            label="Copy native example"
            text="npx -y rea-agents@latest analyze /absolute/path/to/program --provider ghidra --json"
          />
          <SourceLink href="https://github.com/morluto/rea/blob/main/docs/cli.md">
            CLI providers, evidence & limitations
          </SourceLink>
        </details>
        <p>
          Static inspection does not establish every runtime behavior. If a
          finding needs an experiment, use a disposable target and explicit
          actions, then record what happened. Analysis takes place locally, but
          tool results sent to your coding agent are subject to that model
          provider’s data policy.
        </p>
      </section>
      <section id="implement">
        <span className="eyebrow">
          05 · TURN THE SPECIFICATION INTO A RUNNABLE SLICE
        </span>
        <h2>Build and verify an original implementation.</h2>
        <p>
          Choose a stack you can maintain. Implement the smallest complete
          workflow first, including useful errors and a documented way to run
          it. Track unsupported behavior instead of filling gaps with guessed
          compatibility claims.
        </p>
        <CopyBlock label="Copy implementation prompt" text={implementation} />
        <ul>
          <li>
            Check import/export and save/reopen behavior with reproducible
            fixtures.
          </li>
          <li>
            Test undo, empty inputs, malformed files and cancellation where
            relevant.
          </li>
          <li>
            Check keyboard use, readable contrast and assistive-technology
            labels.
          </li>
          <li>
            Compare outputs and explain tolerances; a similar screenshot alone
            does not prove compatibility.
          </li>
          <li>
            Document how data stays portable and how someone can leave your
            tool.
          </li>
        </ul>
      </section>
      <section id="publish">
        <span className="eyebrow">
          06 · MAKE IT POSSIBLE FOR OTHERS TO HELP
        </span>
        <h2>Start the project in public.</h2>
        <p>
          After listing your repository, follow its claim panel to prove
          repository write access. Once verified, it becomes an owned Commons
          project with a team and progress updates.
        </p>
        <p>
          Create a repository with an explicit license, a README, setup
          instructions, an issue tracker and a small roadmap. Name the first
          milestone and write one contribution issue with a clear acceptance
          check. Invite testing, documentation, design, translation and
          accessibility work alongside code.
        </p>
        <p>
          The editable workflow above is included in this starter brief. Fill in
          its unknowns, create your repository, then share the project here with
          an honest status and the products it helps replace.
        </p>
        <CopyBlock label="Copy project brief" text={brief} />
        <div className="catalog-row-actions">
          <button className="secondary" onClick={download}>
            <Download size={16} />
            Download project brief
          </button>
          <button className="primary" onClick={() => onShare(product?.slug)}>
            Add your project to Commons <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </article>
  );
}
